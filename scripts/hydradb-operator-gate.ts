#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  HydraRecallClient,
  resolveHydraConfig
} from '../packages/hydradb-context-mcp/src/client.js';
import { compileRecallContext } from '../packages/hydradb-context-mcp/src/compiler.js';

type Options = {
  json: boolean;
  requireEnabled: boolean;
};

type RegistryServer = {
  catalog_exposure_mode?: string;
  estimated_tool_count?: number;
  lifecycle?: string;
  transport?: string;
};

type Registry = {
  servers?: Record<string, RegistryServer>;
  bundles?: Record<string, string[]>;
};

type State = {
  enabledBundles?: string[];
  enabledServers?: string[];
  disabledServers?: string[];
};

const REGISTRY_PATH = resolve(process.cwd(), 'config/mcp-hub/registry.json');
const STATE_PATH = resolve(process.cwd(), 'config/mcp-hub/state.json');

async function main(options: Options): Promise<void> {
  const registry = readJson<Registry>(REGISTRY_PATH);
  const state = existsSync(STATE_PATH) ? readJson<State>(STATE_PATH) : {};
  const registryChecks = checkRegistry(registry);
  const stateChecks = checkState(registry, state, options.requireEnabled);
  const recallChecks = await checkRecall();
  const status = registryChecks.ok && stateChecks.ok && recallChecks.ok ? 'pass' : 'fail';
  const payload = {
    status,
    registry: registryChecks,
    state: stateChecks,
    recall: recallChecks
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Hydra DB operator gate: ${status}`);
    console.log(
      `registry wrapper=${registryChecks.wrapper.lifecycle}/${registryChecks.wrapper.catalogExposureMode} upstream=${registryChecks.upstream.lifecycle}/${registryChecks.upstream.catalogExposureMode}`
    );
    console.log(
      `state wrapperEnabled=${stateChecks.wrapperEnabled} upstreamEnabled=${stateChecks.upstreamEnabled}`
    );
    console.log(
      `recall results=${recallChecks.resultCount} compiled=${recallChecks.compiledOutputValidated} rejected=${recallChecks.disallowedSubTenantRejected}`
    );
  }

  if (status !== 'pass') process.exit(1);
}

function checkRegistry(registry: Registry) {
  const wrapper = registry.servers?.['hydradb-context-mcp'];
  const upstream = registry.servers?.['hydradb-memory'];
  if (!wrapper) throw new Error('registry missing hydradb-context-mcp');
  if (!upstream) throw new Error('registry missing hydradb-memory');

  const wrapperChecks = {
    catalogExposureMode: wrapper.catalog_exposure_mode,
    estimatedToolCount: wrapper.estimated_tool_count,
    lifecycle: wrapper.lifecycle,
    transport: wrapper.transport
  };
  const upstreamChecks = {
    catalogExposureMode: upstream.catalog_exposure_mode,
    estimatedToolCount: upstream.estimated_tool_count,
    lifecycle: upstream.lifecycle,
    transport: upstream.transport
  };
  const ok =
    wrapper.transport === 'stdio' &&
    wrapper.lifecycle === 'dormant' &&
    wrapper.catalog_exposure_mode === 'dormant' &&
    wrapper.estimated_tool_count === 1 &&
    upstream.transport === 'stdio' &&
    upstream.lifecycle === 'dormant' &&
    upstream.catalog_exposure_mode === 'dormant' &&
    (registry.bundles?.dormant ?? []).includes('hydradb-memory') &&
    (registry.bundles?.dormant ?? []).includes('hydradb-context-mcp');

  return {
    ok,
    wrapper: wrapperChecks,
    upstream: upstreamChecks,
    dormantBundleIncludesWrapper: (registry.bundles?.dormant ?? []).includes('hydradb-context-mcp'),
    dormantBundleIncludesUpstream: (registry.bundles?.dormant ?? []).includes('hydradb-memory')
  };
}

function checkState(registry: Registry, state: State, requireEnabled: boolean) {
  const enabled = effectiveEnabledServers(registry, state);
  const wrapperEnabled = enabled.has('hydradb-context-mcp');
  const upstreamEnabled = enabled.has('hydradb-memory');
  return {
    ok: !requireEnabled || (wrapperEnabled && upstreamEnabled),
    requireEnabled,
    wrapperEnabled,
    upstreamEnabled,
    enabledServers: [...enabled].sort()
  };
}

async function checkRecall() {
  const client = new HydraRecallClient(resolveHydraConfig());
  const recall = await client.recall({
    graphContext: true,
    maxResults: 5,
    mode: 'thinking',
    query: 'Which policy governs bearer token rotation?',
    subTenantId: 'cs-internal-context'
  });
  const compiled = compileRecallContext(recall, { maxSources: 5 });
  const disallowedSubTenantRejected = await rejectsDisallowedSubTenant(client);
  return {
    ok:
      recall.resultCount > 0 &&
      compiled.compiledContext.includes('## Sources') &&
      disallowedSubTenantRejected,
    resultCount: recall.resultCount,
    subTenantId: recall.subTenantId,
    compiledOutputValidated: compiled.compiledContext.includes('## Sources'),
    disallowedSubTenantRejected
  };
}

async function rejectsDisallowedSubTenant(client: HydraRecallClient): Promise<boolean> {
  try {
    await client.recall({
      graphContext: false,
      maxResults: 1,
      mode: 'fast',
      query: 'This should be rejected before a network request.',
      subTenantId: 'client-not-allowlisted-context'
    });
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes('not allowed');
  }
}

function effectiveEnabledServers(registry: Registry, state: State): Set<string> {
  const enabled = new Set<string>();
  const bundles = registry.bundles ?? {};
  for (const bundleName of state.enabledBundles ?? []) {
    for (const serverId of bundles[bundleName] ?? []) enabled.add(serverId);
  }
  for (const serverId of state.enabledServers ?? []) enabled.add(serverId);
  for (const serverId of state.disabledServers ?? []) enabled.delete(serverId);
  return enabled;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function parseArgs(argv: string[]): Options {
  const cleanArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const options: Options = {
    json: false,
    requireEnabled: true
  };

  for (const arg of cleanArgv) {
    switch (arg) {
      case '--json':
        options.json = true;
        break;
      case '--allow-not-enabled':
        options.requireEnabled = false;
        break;
      case '--require-enabled':
        options.requireEnabled = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm hydradb:operator:gate:infisical -- [options]

Checks:
  - hydradb-context-mcp remains a dormant stdio registry entry
  - hydradb-context-mcp is enabled in local/operator Hub state
  - hydradb-memory remains a dormant stdio registry entry
  - hydradb-memory is enabled only in local/operator Hub state
  - governed recall works and non-allowlisted sub-tenants are rejected

Options:
  --json                Print machine-readable JSON.
  --allow-not-enabled   Do not require local/operator state to enable Hydra DB servers.
  --require-enabled     Require local/operator state enablement. Default.
  --help                Show this help.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  await main(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
