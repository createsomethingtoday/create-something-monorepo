#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = process.cwd();
const REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const FLEET_PATH = resolve(ROOT, 'config/mcp-hub/fleet.json');
const PACKAGE_JSON_PATH = resolve(ROOT, 'package.json');
const PLAYBOOK_WORKER_PATH = resolve(ROOT, 'packages/playbook-mcp/worker/index.ts');

const REQUIRED_AGENT_SCENARIOS = ['dedup', 'inbox-triage', 'fleet-watchdog'];

const HALFDOZEN_NOTION_WORKWAY_SERVERS = [
  'notion-halfdozen-create-something',
  'notion-halfdozen-system-studio',
  'notion-halfdozen-blondish',
  'notion-halfdozen-c3-management',
  'notion-halfdozen-cracked',
  'notion-halfdozen-fanpad',
  'notion-halfdozen-juice-labs',
  'notion-halfdozen-kk-management',
  'notion-halfdozen-lightswitch',
  'notion-halfdozen-phase-3',
  'notion-halfdozen-three-six-zero'
];

const REQUIRED_HALFDOZEN_SYNC_SERVERS = [
  'halfdozen-gmail-sync-danny',
  'halfdozen-gmail-sync-fillip',
  'halfdozen-gmail-sync-leah',
  'halfdozen-zoom-sync',
  'half-dozen-youtube-sync',
  'halfdozen-blondish-sync-mcp'
];

const REQUIRED_FLEET_NOTION_DEPLOYMENTS = {
  'wrangler.cs.toml': 'createsomething-notion',
  'wrangler.system-studio.cs.toml': 'system-studio-notion',
  'wrangler.blondish.cs.toml': 'blondish-notion',
  'wrangler.c3-management.cs.toml': 'c3-management-notion',
  'wrangler.cracked.cs.toml': 'cracked-notion',
  'wrangler.fanpad.cs.toml': 'fanpad-notion',
  'wrangler.juice-labs.cs.toml': 'juice-labs-notion',
  'wrangler.kk-management.cs.toml': 'kk-management-notion',
  'wrangler.lightswitch.cs.toml': 'lightswitch-notion',
  'wrangler.phase-3.cs.toml': 'phase-3-notion',
  'wrangler.three-six-zero.cs.toml': 'three-six-zero-notion'
};

const PACKAGE_COVERAGE = {
  'packages/abundance-jobs-mcp': {
    registry: ['abundance-jobs-mcp'],
    fleetDeployments: ['abundance-jobs-mcp']
  },
  'packages/abundance-jobs-mcp/worker': {
    registry: ['abundance-jobs-mcp'],
    fleetDeployments: ['abundance-jobs-mcp']
  },
  'packages/agency/clients/outerfields/mcp-remote': {
    registry: ['outerfields-pcn']
  },
  'packages/agency/clients/outerfields/mcp-server': {
    note: 'local companion to outerfields-pcn',
    registry: ['outerfields-pcn']
  },
  'packages/abundance-jobs-mcp': {
    registry: ['abundance-jobs-mcp']
  },
  'packages/abundance-jobs-mcp/worker': {
    registry: ['abundance-jobs-mcp']
  },
  'packages/bettermode-creator-mcp': {
    registry: ['bettermode-creator']
  },
  'packages/bettermode-creator-mcp/worker': {
    registry: ['bettermode-creator']
  },
  'packages/community-mcp': {
    registry: ['community-mcp']
  },
  'packages/composio-toolkit-mcp': {
    registryPrefix: 'composio-toolkit-',
    bundles: ['composio-all']
  },
  'packages/create-something-mcp': {
    registry: ['create-something']
  },
  'packages/create-something-mcp/worker': {
    registry: ['create-something']
  },
  'packages/cs-mcp-hub': {
    note: 'hub runtime; consumes registry.json rather than registering itself as a downstream server'
  },
  'packages/cs-mcp-hub-notion-bridge': {
    note: 'supporting bridge for hub/fleet operations'
  },
  'packages/cs-mcp-hub-remote': {
    note: 'remote hub runtime; consumes registry.json rather than registering itself as a downstream server'
  },
  'packages/cs-telemetry-mcp/worker': {
    registry: ['cs-telemetry']
  },
  'packages/gmail-notion-mcp': {
    registry: ['gmail-notion-mcp']
  },
  'packages/gmail-notion-mcp/worker': {
    registry: ['gmail-notion-mcp']
  },
  'packages/ground/npm': {
    registry: ['ground-mcp']
  },
  'packages/halfdozen-dm-mcp': {
    registry: ['halfdozen-dm-mcp']
  },
  'packages/halfdozen-dm-mcp/worker': {
    registry: ['halfdozen-dm-mcp']
  },
  'packages/halfdozen-blondish-sync-mcp': {
    registry: ['halfdozen-blondish-sync-mcp'],
    fleetDeployments: ['halfdozen-blondish-sync-mcp']
  },
  'packages/halfdozen-notion-mcp': {
    registry: HALFDOZEN_NOTION_WORKWAY_SERVERS,
    fleetDeployments: Object.values(REQUIRED_FLEET_NOTION_DEPLOYMENTS)
  },
  'packages/halfdozen-notion-mcp/worker': {
    registry: HALFDOZEN_NOTION_WORKWAY_SERVERS,
    fleetDeployments: Object.values(REQUIRED_FLEET_NOTION_DEPLOYMENTS)
  },
  'packages/halfdozen-operator-notion-mcp': {
    registry: ['halfdozen-operator-notion-mcp']
  },
  'packages/halfdozen-operator-notion-mcp/worker': {
    registry: ['halfdozen-operator-notion-mcp']
  },
  'packages/halfdozen-agent-analyzer-telemetry-mcp/worker': {
    registry: ['halfdozen-agent-analyzer-telemetry'],
    fleetDeployments: ['halfdozen-agent-analyzer-telemetry-mcp']
  },
  'packages/halfdozen-telemetry-mcp/worker': {
    registry: ['halfdozen-telemetry']
  },
  'packages/harness-mcp': {
    registry: ['harness-mcp']
  },
  'packages/hydra-db-recall-mcp': {
    registry: ['hydra-db-recall-mcp']
  },
  'packages/hydra-db-recall-mcp/worker': {
    registry: ['hydra-db-recall-mcp']
  },
  'packages/interaction-atlas-mcp': {
    registry: ['interaction-atlas-mcp']
  },
  'packages/loom/npm': {
    registry: ['loom-mcp']
  },
  'packages/loom-mcp-remote': {
    registry: ['loom-mcp']
  },
  'packages/mcp-authz': {
    note: 'supporting authorization library, not an MCP server deployment'
  },
  'packages/mcp-core': {
    note: 'supporting MCP library, not an MCP server deployment'
  },
  'packages/meetings-mcp/worker': {
    registry: ['meetings']
  },
  'packages/notion-sync-mcp': {
    registry: ['notion-sync-mcp']
  },
  'packages/playbook-mcp': {
    registry: ['playbook']
  },
  'packages/playbook-mcp/worker': {
    registry: ['playbook'],
    agentScenarios: REQUIRED_AGENT_SCENARIOS
  },
  'packages/quickbooks-notion-mcp': {
    registry: ['quickbooks-notion-mcp-server']
  },
  'packages/schedule-mcp': {
    registry: ['schedule-mcp']
  },
  'packages/schedule-mcp/worker': {
    registry: ['schedule-mcp']
  },
  'packages/schedule-mcp/workers/notifier': {
    note: 'supporting notifier Worker for schedule-mcp'
  },
  'packages/social-mcp': {
    registry: ['social-mcp']
  },
  'packages/spotify-mcp': {
    registry: ['spotify-mcp']
  },
  'packages/spotify-mcp/worker': {
    registry: ['spotify-mcp']
  },
  'packages/substrate-mcp': {
    registry: ['substrate-mcp']
  },
  'packages/substrate-mcp/worker': {
    registry: ['substrate-mcp']
  },
  'packages/three-tier-framework-mcp': {
    registry: ['three-tier-framework']
  },
  'packages/three-tier-framework-mcp/worker': {
    registry: ['three-tier-framework']
  },
  'packages/ui-preview-mcp': {
    registry: ['ui-preview-mcp']
  },
  'packages/webflow-app-review-mcp': {
    registry: ['webflow-app-review-mcp']
  },
  'packages/webflow-app-review-mcp/worker': {
    registry: ['webflow-app-review-mcp']
  },
  'packages/zendesk-mcp': {
    registry: ['zendesk-mcp']
  },
  'packages/zendesk-mcp/worker': {
    registry: ['zendesk-mcp']
  },
  'packages/webflow-mcp': {
    registry: ['webflow-local']
  },
  'packages/webflow-mcp/worker': {
    registry: ['webflow-local']
  },
  'packages/webflow-site-analyzer-mcp': {
    note: 'retired Webflow analyzer implementation; not registered in active Hub routing'
  },
  'packages/webflow-site-analyzer-mcp/worker': {
    note: 'retired Webflow analyzer Worker; deployment route removed from active Hub routing'
  },
  'packages/webflow-site-analyzer-mcp/workers/remote': {
    note: 'retired Webflow analyzer remote Worker; deployment route removed from active Hub routing'
  },
  'packages/webflow-template-review-mcp': {
    registry: ['webflow-template-review-mcp']
  },
  'packages/webflow-template-review-mcp/worker': {
    registry: ['webflow-template-review-mcp']
  }
};

const registry = readJson(REGISTRY_PATH);
const fleet = readJson(FLEET_PATH);
const rootPackageJson = readJson(PACKAGE_JSON_PATH);
const playbookWorkerSource = readFileSync(PLAYBOOK_WORKER_PATH, 'utf8');

const errors = [];
const registryServers = registry.servers ?? {};
const registryBundles = registry.bundles ?? {};
const fleetDeployments = fleet.deployments ?? {};

checkDiscoveredMcpPackages();
checkRegistryCoverage();
checkFleetCoverage();
checkAgentCoverage();

if (errors.length > 0) {
  console.error('MCP registry coverage failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('MCP registry coverage passed.');
console.log(
  JSON.stringify(
    {
      registry_servers: Object.keys(registryServers).length,
      registry_bundles: Object.keys(registryBundles).length,
      covered_mcp_packages: Object.keys(PACKAGE_COVERAGE).length,
      fleet_deployments: Object.keys(fleetDeployments).length,
      agent_scenarios: REQUIRED_AGENT_SCENARIOS.length
    },
    null,
    2
  )
);

function checkDiscoveredMcpPackages() {
  const discovered = discoverMcpPackageDirs();
  for (const packageDir of discovered) {
    if (!PACKAGE_COVERAGE[packageDir]) {
      errors.push(`MCP package is not classified in PACKAGE_COVERAGE: ${packageDir}`);
    }
  }

  for (const packageDir of Object.keys(PACKAGE_COVERAGE)) {
    if (!existsSync(resolve(ROOT, packageDir, 'package.json'))) {
      errors.push(`PACKAGE_COVERAGE references missing package: ${packageDir}`);
    }
  }
}

function checkRegistryCoverage() {
  for (const [packageDir, coverage] of Object.entries(PACKAGE_COVERAGE)) {
    for (const serverName of coverage.registry ?? []) {
      if (!registryServers[serverName]) {
        errors.push(`${packageDir}: missing registry server ${serverName}`);
      }
    }

    if (coverage.registryPrefix) {
      const matches = Object.keys(registryServers).filter((serverName) =>
        serverName.startsWith(coverage.registryPrefix)
      );
      if (matches.length === 0) {
        errors.push(`${packageDir}: missing registry server prefix ${coverage.registryPrefix}`);
      }
    }

    for (const bundleName of coverage.bundles ?? []) {
      if (!Array.isArray(registryBundles[bundleName]) || registryBundles[bundleName].length === 0) {
        errors.push(`${packageDir}: missing or empty registry bundle ${bundleName}`);
      }
    }
  }

  for (const serverName of [
    ...HALFDOZEN_NOTION_WORKWAY_SERVERS,
    ...REQUIRED_HALFDOZEN_SYNC_SERVERS
  ]) {
    if (!registryServers[serverName]) {
      errors.push(`missing required Half Dozen registry server ${serverName}`);
    }
  }

  const halfdozenBundle = new Set(registryBundles.halfdozen ?? []);
  for (const serverName of HALFDOZEN_NOTION_WORKWAY_SERVERS) {
    if (!halfdozenBundle.has(serverName)) {
      errors.push(`bundle halfdozen does not include ${serverName}`);
    }
  }

  const localBundle = new Set(registryBundles['local-dev'] ?? []);
  for (const serverName of [
    'community-mcp',
    'ground-mcp',
    'harness-mcp',
    'social-mcp',
    'ui-preview-mcp'
  ]) {
    if (!localBundle.has(serverName)) {
      errors.push(`bundle local-dev does not include ${serverName}`);
    }
  }
}

function checkFleetCoverage() {
  for (const [packageDir, coverage] of Object.entries(PACKAGE_COVERAGE)) {
    for (const deploymentSlug of coverage.fleetDeployments ?? []) {
      if (!fleetDeployments[deploymentSlug]) {
        errors.push(`${packageDir}: missing fleet deployment ${deploymentSlug}`);
      }
    }
  }

  for (const [configFile, deploymentSlug] of Object.entries(REQUIRED_FLEET_NOTION_DEPLOYMENTS)) {
    const configPath = `packages/halfdozen-notion-mcp/worker/${configFile}`;
    const deployment = fleetDeployments[deploymentSlug];

    if (!existsSync(resolve(ROOT, configPath))) {
      errors.push(`missing expected Half Dozen Notion wrangler config ${configPath}`);
    }
    if (!deployment) {
      errors.push(`fleet.json missing deployment ${deploymentSlug} for ${configPath}`);
      continue;
    }
    if (deployment.status !== 'deployed') {
      errors.push(
        `fleet deployment ${deploymentSlug}: expected status deployed, got ${deployment.status}`
      );
    }
    if (deployment.type !== 'notion_mcp') {
      errors.push(
        `fleet deployment ${deploymentSlug}: expected type notion_mcp, got ${deployment.type}`
      );
    }
    if (deployment.wrangler_config !== configPath) {
      errors.push(
        `fleet deployment ${deploymentSlug}: expected wrangler_config ${configPath}, got ${deployment.wrangler_config}`
      );
    }
    if (!deployment.url?.startsWith('https://') || !deployment.url.endsWith('/mcp')) {
      errors.push(`fleet deployment ${deploymentSlug}: invalid MCP url ${deployment.url}`);
    }
    if (
      deployment.auth?.type === 'notion_integration_with_bearer' &&
      !deployment.auth.bearer_token_env_var
    ) {
      errors.push(`fleet deployment ${deploymentSlug}: bearer auth missing bearer_token_env_var`);
    }
  }

  for (const [deploymentSlug, deployment] of Object.entries(fleetDeployments)) {
    if (deployment.status !== 'deployed') continue;

    if (!deployment.url?.startsWith('https://') || !deployment.url.endsWith('/mcp')) {
      errors.push(
        `fleet deployment ${deploymentSlug}: deployed MCP has invalid url ${deployment.url}`
      );
    }
    if (deployment.package_path && !existsSync(resolve(ROOT, deployment.package_path))) {
      errors.push(
        `fleet deployment ${deploymentSlug}: package_path does not exist: ${deployment.package_path}`
      );
    }
    if (deployment.wrangler_config && !existsSync(resolve(ROOT, deployment.wrangler_config))) {
      errors.push(
        `fleet deployment ${deploymentSlug}: wrangler_config does not exist: ${deployment.wrangler_config}`
      );
    }
    if (deployment.auth?.type === 'bearer' && !deployment.auth.bearer_token_env_var) {
      errors.push(`fleet deployment ${deploymentSlug}: bearer auth missing bearer_token_env_var`);
    }
  }
}

function checkAgentCoverage() {
  const scripts = rootPackageJson.scripts ?? {};
  for (const scenario of REQUIRED_AGENT_SCENARIOS) {
    const runScript = `agent:halfdozen:${scenario}`;
    const connectScript = `agent:halfdozen:${scenario}:connect`;
    const expectedRoute = `/clients/halfdozen/agents/${scenario}/run`;

    if (!scripts[runScript]) {
      errors.push(`missing package.json script ${runScript}`);
    }
    if (!scripts[connectScript]) {
      errors.push(`missing package.json script ${connectScript}`);
    }
    if (!String(scripts[connectScript] ?? '').includes('--connect-only')) {
      errors.push(`package.json script ${connectScript} must use --connect-only`);
    }
    if (!playbookWorkerSource.includes(expectedRoute)) {
      errors.push(`playbook worker missing protected agent route ${expectedRoute}`);
    }
  }
}

function discoverMcpPackageDirs() {
  const packageJsonFiles = [];
  walkForPackageJson(resolve(ROOT, 'packages'), packageJsonFiles);

  return packageJsonFiles
    .map((filePath) => {
      const packageJson = readJson(filePath);
      const packageDir = dirname(filePath).replace(`${ROOT}/`, '');
      return { packageDir, packageName: packageJson.name ?? '' };
    })
    .filter(({ packageDir, packageName }) => /mcp/i.test(`${packageName} ${packageDir}`))
    .map(({ packageDir }) => packageDir)
    .sort();
}

function walkForPackageJson(dir, out) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.turbo', 'dist', '.next', '.svelte-kit'].includes(entry.name))
      continue;
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkForPackageJson(entryPath, out);
    } else if (entry.name === 'package.json') {
      out.push(entryPath);
    }
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
