#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const MATRIX_PATH = resolve(ROOT, 'config/mcp-hub/named-lane-hardening.json');
const FLEET_PATH = resolve(ROOT, 'config/mcp-hub/fleet.json');
const DISCOVERY_PACKS_PATH = resolve(ROOT, 'config/mcp-hub/discovery-packs.json');
const PACKAGE_PATH = resolve(ROOT, 'package.json');
const GENERATED_DOC_PATH = resolve(ROOT, 'docs/MCP_HUB_NAMED_LANE_HARDENING.generated.md');

const command = process.argv[2] ?? 'check';
const live = process.argv.includes('--live');
const jsonOutput = process.argv.includes('--json');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

async function main() {
  if (!['check', 'generate'].includes(command)) {
    console.error('Usage: node scripts/mcp-hub-named-lane-hardening.mjs [check|generate] [--live] [--json]');
    process.exit(2);
  }

  const result = await run();

  if (command === 'generate') {
    writeFileSync(GENERATED_DOC_PATH, result.generatedDoc, 'utf8');
    console.log(`Wrote ${relative(GENERATED_DOC_PATH)}`);
    process.exit(0);
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          ok: result.errors.length === 0,
          errors: result.errors,
          warnings: result.warnings,
          lanes: result.laneSummaries,
        },
        null,
        2,
      ),
    );
  } else if (result.errors.length > 0) {
    console.error('Hub named-lane hardening check failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    if (result.warnings.length > 0) {
      console.error('Warnings:');
      for (const warning of result.warnings) console.error(`- ${warning}`);
    }
  } else {
    console.log(
      `Hub named-lane hardening check passed (${result.laneSummaries.length} lane${result.laneSummaries.length === 1 ? '' : 's'}${live ? ', live health included' : ', static matrix only'}).`,
    );
    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      for (const warning of result.warnings) console.warn(`- ${warning}`);
    }
  }

  process.exit(result.errors.length === 0 ? 0 : 1);
}

async function run() {
  const errors = [];
  const warnings = [];

  const matrix = readJson(MATRIX_PATH, errors);
  const fleet = readJson(FLEET_PATH, errors);
  const discoveryPacks = readJson(DISCOVERY_PACKS_PATH, errors);
  const packageJson = readJson(PACKAGE_PATH, errors);
  if (!matrix || !fleet || !discoveryPacks || !packageJson) {
    return { errors, warnings, laneSummaries: [], generatedDoc: '' };
  }

  validatePackageScripts(packageJson, errors);

  const laneEntries = Object.entries(matrix.lanes ?? {});
  if (matrix.version !== 1) errors.push(`${relative(MATRIX_PATH)}: version must be 1.`);
  if (laneEntries.length === 0) errors.push(`${relative(MATRIX_PATH)}: lanes must not be empty.`);

  const laneSummaries = [];
  for (const [laneId, lane] of laneEntries) {
    const summary = validateLane({
      laneId,
      lane,
      fleet,
      discoveryPacks,
      errors,
      warnings,
    });
    laneSummaries.push(summary);
  }

  const generatedDoc = renderDoc(laneSummaries, matrix);
  if (existsSync(GENERATED_DOC_PATH)) {
    const current = readFileSync(GENERATED_DOC_PATH, 'utf8');
    if (current !== generatedDoc) {
      errors.push(
        `${relative(GENERATED_DOC_PATH)} is out of date. Run pnpm mcp:hub:hardening:matrix:generate.`,
      );
    }
  } else {
    errors.push(
      `${relative(GENERATED_DOC_PATH)} is missing. Run pnpm mcp:hub:hardening:matrix:generate.`,
    );
  }

  if (live) {
    for (const [laneId, lane] of laneEntries) {
      await validateLiveHealth(laneId, lane, errors, warnings);
    }
  }

  return { errors, warnings, laneSummaries, generatedDoc };
}

function validatePackageScripts(packageJson, errors) {
  const expected = {
    'mcp:hub:hardening:matrix:generate': 'node scripts/mcp-hub-named-lane-hardening.mjs generate',
    'mcp:hub:hardening:matrix:check': 'node scripts/mcp-hub-named-lane-hardening.mjs check',
    'mcp:hub:hardening:check': 'node scripts/mcp-hub-named-lane-hardening.mjs check --live',
  };
  for (const [name, commandText] of Object.entries(expected)) {
    if (packageJson.scripts?.[name] !== commandText) {
      errors.push(`${relative(PACKAGE_PATH)}: script ${name} must be "${commandText}".`);
    }
  }
}

function validateLane({ laneId, lane, fleet, discoveryPacks, errors, warnings }) {
  const fleetId = lane.fleetId ?? laneId;
  const deployment = fleet.deployments?.[fleetId];
  const pack = discoveryPacks.packs?.[lane.discoveryPack];
  const runbookPath = lane.runbook ? resolve(ROOT, lane.runbook) : null;

  if (!deployment) {
    errors.push(`${laneId}: fleet deployment ${fleetId} is missing.`);
  } else {
    expectEqual(errors, `${laneId}: fleet type`, deployment.type, 'policy_os_hub');
    expectEqual(errors, `${laneId}: fleet status`, deployment.status, 'deployed');
    expectEqual(errors, `${laneId}: fleet url`, deployment.url, lane.targetUrl);
    expectEqual(errors, `${laneId}: auth type`, deployment.auth?.type, 'bearer');
    if (lane.expectedTenant) expectEqual(errors, `${laneId}: fleet tenant`, deployment.tenant, lane.expectedTenant);
    if (Array.isArray(lane.fleetToolkits)) {
      expectSetEqual(errors, `${laneId}: fleet toolkits`, deployment.toolkits ?? [], lane.fleetToolkits);
    }
  }

  if (!pack) {
    errors.push(`${laneId}: discovery pack ${lane.discoveryPack} is missing.`);
  } else {
    expectEqual(errors, `${laneId}: discovery pack mode`, pack.mode, lane.discoveryMode);
    expectSetEqual(errors, `${laneId}: discovery pack activeServers`, pack.activeServers ?? [], lane.enabledServers ?? []);
    if (pack.maxProxyTools !== null) {
      warnings.push(`${laneId}: discovery pack ${lane.discoveryPack} caps proxy tools at ${pack.maxProxyTools}.`);
    }
  }

  if (lane.classification === 'named_lane') {
    const expectedUrl = `https://${laneId}.mcp.createsomething.agency/mcp`;
    expectEqual(errors, `${laneId}: canonical named-lane URL`, lane.targetUrl, expectedUrl);
    expectEqual(errors, `${laneId}: host key`, lane.hostKey, laneId);
    expectEqual(errors, `${laneId}: bearer issue scope`, lane.bearerIssueScope, 'partner_managed_named_lane_bearer');
  }

  if (lane.classification === 'client_hub') {
    expectEqual(errors, `${laneId}: bearer issue scope`, lane.bearerIssueScope, 'operator_runtime_bearer');
  }

  if (!runbookPath || !existsSync(runbookPath)) {
    errors.push(`${laneId}: runbook is missing at ${lane.runbook ?? '<unset>'}.`);
  } else {
    const runbook = readFileSync(runbookPath, 'utf8');
    for (const needle of [
      lane.targetUrl,
      `HUB_IDENTITY_MODE:${lane.identityMode}`,
      `HUB_DISCOVERY_MODE:${lane.discoveryMode}`,
      `HUB_DISCOVERY_SHARED_PACK:${lane.discoveryPack}`,
    ]) {
      if (!runbook.includes(needle)) {
        errors.push(`${laneId}: ${relative(runbookPath)} must include "${needle}".`);
      }
    }
    for (const server of lane.enabledServers ?? []) {
      if (!runbook.includes(server)) {
        errors.push(`${laneId}: ${relative(runbookPath)} must mention enabled server ${server}.`);
      }
    }
  }

  return {
    laneId,
    classification: lane.classification,
    url: lane.targetUrl,
    runtime: lane.runtime,
    publicToolContract: lane.publicToolContract,
    identityMode: lane.identityMode,
    discoveryMode: lane.discoveryMode,
    discoveryPack: lane.discoveryPack,
    bearerIssueScope: lane.bearerIssueScope,
    hostBinding: lane.hostBinding,
    hostKey: lane.hostKey,
    enabledServerCount: lane.enabledServers?.length ?? 0,
    runbook: lane.runbook,
    knownBlockers: lane.knownBlockers ?? [],
  };
}

async function validateLiveHealth(laneId, lane, errors, warnings) {
  const healthUrl = lane.targetUrl.replace(/\/mcp$/, '/health');
  let health;
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        accept: 'application/json',
      },
    });
    if (!response.ok) {
      errors.push(`${laneId}: live health ${healthUrl} returned HTTP ${response.status}.`);
      return;
    }
    health = await response.json();
  } catch (error) {
    errors.push(`${laneId}: live health ${healthUrl} failed: ${error instanceof Error ? error.message : String(error)}.`);
    return;
  }

  validateLiveHealthPayload({ laneId, lane, health, errors, warnings });
}

export function validateLiveHealthPayload({ laneId, lane, health, errors, warnings }) {
  expectEqual(errors, `${laneId}: live auth_required`, health.auth_required, true);
  expectEqual(errors, `${laneId}: live identity_mode`, health.identity_mode, lane.identityMode);
  expectSetEqual(errors, `${laneId}: live enabled_servers`, health.enabled_servers ?? [], lane.enabledServers ?? []);

  if (health.runtime_mode !== undefined) {
    expectEqual(errors, `${laneId}: live runtime_mode`, health.runtime_mode, lane.runtime);
  }
  if (health.public_tool_contract !== undefined) {
    expectEqual(errors, `${laneId}: live public_tool_contract`, health.public_tool_contract, lane.publicToolContract);
  }
  if (health.managed_discovery !== undefined) {
    expectEqual(errors, `${laneId}: live managed_discovery.mode`, health.managed_discovery?.mode, lane.discoveryMode);
    expectEqual(errors, `${laneId}: live managed_discovery.shared_pack`, health.managed_discovery?.shared_pack, lane.discoveryPack);
    expectSetEqual(
      errors,
      `${laneId}: live managed_discovery.active_servers`,
      health.managed_discovery?.active_servers ?? [],
      lane.enabledServers ?? [],
    );
  }

  const failed = health.failed_servers ?? [];
  if (failed.length > 0) {
    errors.push(`${laneId}: live health reports failed_servers=${JSON.stringify(failed)}.`);
  }
  if (health.policy?.quota?.telemetryDbConfigured !== true) {
    warnings.push(`${laneId}: live health does not report telemetryDbConfigured=true.`);
  }
}

function renderDoc(lanes) {
  const lines = [];
  lines.push('# MCP Hub Named-Lane Hardening Matrix');
  lines.push('');
  lines.push('Generated from `config/mcp-hub/named-lane-hardening.json`.');
  lines.push('');
  lines.push('Regenerate with:');
  lines.push('');
  lines.push('```bash');
  lines.push('pnpm mcp:hub:hardening:matrix:generate');
  lines.push('```');
  lines.push('');
  lines.push('| Lane | Class | Runtime | Public contract | Identity | Discovery pack | Servers | Bearer scope | Host binding | Blockers |');
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |');
  for (const lane of lanes) {
    lines.push(
      `| \`${lane.laneId}\` | \`${lane.classification}\` | \`${lane.runtime}\` | \`${lane.publicToolContract}\` | \`${lane.identityMode}\` | \`${lane.discoveryPack}\` | ${lane.enabledServerCount} | \`${lane.bearerIssueScope}\` | \`${lane.hostBinding}\` | ${formatBlockers(lane.knownBlockers)} |`,
    );
  }
  lines.push('');
  lines.push('## Read-only verification');
  lines.push('');
  lines.push('- `pnpm mcp:hub:hardening:matrix:check` validates local fleet metadata, discovery packs, runbooks, and this generated matrix.');
  lines.push('- `pnpm mcp:hub:hardening:check` also performs unauthenticated `GET /health` checks against each target URL.');
  lines.push('- The live check must not mint credentials, rotate secrets, call `hub_set_discovery`, or mutate Cloudflare/Infisical state.');
  return `${lines.join('\n')}\n`;
}

function formatBlockers(blockers) {
  if (!blockers || blockers.length === 0) return 'None';
  return blockers.map((blocker) => blocker.replaceAll('|', '/')).join('<br>');
}

function readJson(path, errors) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${relative(path)}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function expectEqual(errors, label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function expectSetEqual(errors, label, actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (actualSorted.length !== expectedSorted.length || actualSorted.some((value, index) => value !== expectedSorted[index])) {
    errors.push(
      `${label} mismatch: expected ${JSON.stringify(expectedSorted)}, got ${JSON.stringify(actualSorted)}.`,
    );
  }
}

function relative(path) {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}
