#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const defaultConfigPath = path.join(repoRoot, '.mcp.json');
const knownReviewers = {
  'wf-template-review-natalia': {
    url: 'https://wf-template-review-natalia.mcp.createsomething.agency/mcp',
    authEnvCandidates: ['WF_TEMPLATE_REVIEW_NATALIA_AUTH', 'WF_TEMPLATE_REVIEW_NATALIA'],
  },
  'wf-template-review-sudiksha': {
    url: 'https://wf-template-review-sudiksha.mcp.createsomething.agency/mcp',
    authEnvCandidates: ['WF_TEMPLATE_REVIEW_SUDIKSHA_AUTH', 'WF_TEMPLATE_REVIEW_SUDIKSHA'],
  },
  'wf-template-review-eric': {
    url: 'https://wf-template-review-eric.mcp.createsomething.agency/mcp',
    authEnvCandidates: ['WF_TEMPLATE_REVIEW_ERIC_AUTH', 'WF_TEMPLATE_REVIEW_ERIC'],
  },
  'wf-template-review-vicki': {
    url: 'https://wf-template-review-vicki.mcp.createsomething.agency/mcp',
    authEnvCandidates: ['WF_TEMPLATE_REVIEW_VICKI_AUTH', 'WF_TEMPLATE_REVIEW_VICKI'],
  },
  'wf-template-review-mariana': {
    url: 'https://wf-template-review-mariana.mcp.createsomething.agency/mcp',
    authEnvCandidates: ['WF_TEMPLATE_REVIEW_MARIANA_AUTH', 'WF_TEMPLATE_REVIEW_MARIANA'],
  },
  'wf-template-review-micah': {
    url: 'https://wf-template-review-micah.mcp.createsomething.agency/mcp',
    authEnvCandidates: ['WF_TEMPLATE_REVIEW_MICAH_AUTH', 'WF_TEMPLATE_REVIEW_MICAH'],
  },
};

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function normalizeReviewerList(rawValue) {
  if (!rawValue) return [];
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildBridgeEnvVarName(name) {
  return `${name.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}_AUTH_HEADER`;
}

function redactAuthorization(value) {
  if (typeof value !== 'string' || value.length === 0) return '<missing>';
  if (value.length <= 20) return `${value.slice(0, 8)}...`;
  return `${value.slice(0, 18)}...${value.slice(-6)}`;
}

function parseToolPayload(result) {
  if (!result) return null;
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const rawText = Array.isArray(result.content)
    ? result.content
        .filter((item) => item?.type === 'text' && typeof item?.text === 'string')
        .map((item) => item.text)
        .join('\n')
    : '';
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return { rawText };
  }
}

function createFullBridgeConfig(entries) {
  const mcpServers = {};
  for (const [name, entry] of Object.entries(entries)) {
    const envVar = buildBridgeEnvVarName(name);
    mcpServers[name] = {
      command: 'npx',
      args: [
        '-y',
        'mcp-remote',
        entry.url,
        '--transport',
        'http-only',
        '--header',
        `Authorization:\${${envVar}}`,
        '--silent',
      ],
      env: {
        [envVar]: entry.authorization,
      },
    };
  }
  return { mcpServers };
}

function createRedactedBridgeConfig(entries) {
  const mcpServers = {};
  for (const [name, entry] of Object.entries(entries)) {
    const envVar = buildBridgeEnvVarName(name);
    mcpServers[name] = {
      command: 'npx',
      args: [
        '-y',
        'mcp-remote',
        entry.url,
        '--transport',
        'http-only',
        '--header',
        `Authorization:\${${envVar}}`,
        '--silent',
      ],
      env: {
        [envVar]: redactAuthorization(entry.authorization),
      },
    };
  }
  return { mcpServers };
}

async function loadAvailableReviewers(configPath, requestedReviewers) {
  const rawConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const requested = requestedReviewers.length > 0 ? new Set(requestedReviewers) : null;
  const entries = {};

  for (const [name, reviewer] of Object.entries(knownReviewers)) {
    if (requested && !requested.has(name)) {
      continue;
    }

    const configuredServer = rawConfig?.mcpServers?.[name];
    if (
      configuredServer?.type === 'http' &&
      typeof configuredServer.url === 'string' &&
      typeof configuredServer?.headers?.Authorization === 'string'
    ) {
      entries[name] = {
        url: configuredServer.url,
        authorization: configuredServer.headers.Authorization,
        source: configPath,
      };
      continue;
    }

    for (const envVarName of reviewer.authEnvCandidates) {
      const envValue = process.env[envVarName];
      if (typeof envValue === 'string' && envValue.length > 0) {
        entries[name] = {
          url: reviewer.url,
          authorization: envValue,
          source: `env:${envVarName}`,
        };
        break;
      }
    }
  }

  return entries;
}

async function smokeServer(name, bridgeEntry, timeoutMs) {
  const childEnv = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === 'string'),
  );
  Object.assign(childEnv, bridgeEntry.env);

  const transport = new StdioClientTransport({
    command: bridgeEntry.command,
    args: bridgeEntry.args,
    env: childEnv,
  });

  const client = new Client(
    { name: 'reviewer-hub-mcp-remote-smoke', version: '0.1.0' },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    const listed = await client.listTools(undefined, {
      timeout: timeoutMs,
      maxTotalTimeout: timeoutMs,
    });
    const hubStatus = await client.callTool(
      {
        name: 'hub_status',
        arguments: {},
      },
      undefined,
      {
        timeout: timeoutMs,
        maxTotalTimeout: timeoutMs,
      },
    );

    const parsedStatus = parseToolPayload(hubStatus);

    return {
      ok: true,
      reviewer: name,
      toolCount: listed.tools.length,
      firstTools: listed.tools.slice(0, 6).map((tool) => tool.name),
      hubStatus: parsedStatus,
    };
  } catch (error) {
    return {
      ok: false,
      reviewer: name,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      await client.close();
    } catch {
      // ignore shutdown errors during smoke runs
    }
  }
}

async function main() {
  const configPath = path.resolve(getArg('--config') || defaultConfigPath);
  const outputConfigPath = getArg('--write-config')
    ? path.resolve(getArg('--write-config'))
    : null;
  const timeoutMs = Number(getArg('--timeout-ms') || 30000);
  const requestedReviewers = normalizeReviewerList(getArg('--reviewers'));
  const printConfig = hasFlag('--print-config');
  const skipSmoke = hasFlag('--skip-smoke');

  const reviewerEntries = await loadAvailableReviewers(configPath, requestedReviewers);
  const names = Object.keys(reviewerEntries).sort();

  if (names.length === 0) {
    throw new Error(
      `No reviewer hub tokens were available from ${configPath} or the known WF_TEMPLATE_REVIEW_* env vars.`,
    );
  }

  const fullBridgeConfig = createFullBridgeConfig(reviewerEntries);
  const redactedBridgeConfig = createRedactedBridgeConfig(reviewerEntries);

  if (outputConfigPath) {
    await fs.mkdir(path.dirname(outputConfigPath), { recursive: true });
    await fs.writeFile(outputConfigPath, `${JSON.stringify(fullBridgeConfig, null, 2)}\n`, 'utf8');
  }

  let smokeResults = [];
  if (!skipSmoke) {
    for (const name of names) {
      smokeResults.push(await smokeServer(name, fullBridgeConfig.mcpServers[name], timeoutMs));
    }
  }

  const summary = {
    testedAt: new Date().toISOString(),
    sourceConfig: configPath,
    writtenConfig: outputConfigPath,
    reviewersDiscovered: names.map((name) => ({
      name,
      source: reviewerEntries[name].source,
      url: reviewerEntries[name].url,
      authorization: redactAuthorization(reviewerEntries[name].authorization),
    })),
    bridgeConfig: redactedBridgeConfig,
    smoke: skipSmoke ? { skipped: true } : smokeResults,
  };

  if (printConfig) {
    console.log(JSON.stringify(redactedBridgeConfig, null, 2));
    return;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
