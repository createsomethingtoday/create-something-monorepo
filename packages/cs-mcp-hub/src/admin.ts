/**
 * Admin CLI mode for `cs-mcp-hub`.
 *
 * Extracted from `src/index.ts`. The admin entry point lets operators flip
 * bundle/server state and write `.codex/config.toml` without starting the
 * stdio MCP server.
 */

import {
  getEffectiveCodexPath,
  loadRegistry,
  loadState,
  resolveRegistryPaths,
  saveState,
  updateState,
  writeCodexConfig,
} from './config.js';
import { buildStatusPayload, type HubIdentity } from './payloads.js';
import type { McpBundleRegistry, RegistryPaths } from './types.js';

export type AdminArgs = {
  status: boolean;
  writeCodex: boolean;
  writeCodexExplicit: boolean;
  enableBundles: string[];
  disableBundles: string[];
  enableServers: string[];
  disableServers: string[];
  help: boolean;
};

export function parseAdminArgs(argv: string[]): AdminArgs | null {
  const args: AdminArgs = {
    status: false,
    writeCodex: true,
    writeCodexExplicit: false,
    enableBundles: [],
    disableBundles: [],
    enableServers: [],
    disableServers: [],
    help: false,
  };

  let adminMode = false;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--help' || token === '-h') {
      args.help = true;
      adminMode = true;
      continue;
    }

    if (token === '--status') {
      args.status = true;
      adminMode = true;
      continue;
    }

    if (token === '--write-codex') {
      args.writeCodex = true;
      args.writeCodexExplicit = true;
      adminMode = true;
      continue;
    }

    if (token === '--no-write-codex') {
      args.writeCodex = false;
      args.writeCodexExplicit = true;
      adminMode = true;
      continue;
    }

    if (token === '--enable-bundle') {
      args.enableBundles.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    if (token === '--disable-bundle') {
      args.disableBundles.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    if (token === '--enable-server') {
      args.enableServers.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    if (token === '--disable-server') {
      args.disableServers.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return adminMode ? args : null;
}

export async function runAdminMode(args: AdminArgs, identity: HubIdentity): Promise<void> {
  if (args.help) {
    printAdminUsage();
    return;
  }

  const { paths, registry } = loadContext();
  const hasPatch =
    args.enableBundles.length > 0 ||
    args.disableBundles.length > 0 ||
    args.enableServers.length > 0 ||
    args.disableServers.length > 0;

  let updatedState = loadState(paths);
  if (hasPatch) {
    updatedState = updateState(registry, updatedState, {
      enableBundles: args.enableBundles,
      disableBundles: args.disableBundles,
      enableServers: args.enableServers,
      disableServers: args.disableServers,
    });
    saveState(paths, updatedState);
  }

  const shouldWriteCodex = args.writeCodexExplicit ? args.writeCodex : hasPatch;
  const codexWrite = shouldWriteCodex
    ? writeCodexResult(paths, registry)
    : null;

  const status = buildStatusPayload(
    identity,
    paths,
    registry,
    { connected: [], failed: [] },
    {
      toolDefinitions: [],
      directRouteMetas: [],
      aliasPlans: [],
      routes: new Map(),
      warnings: [],
    },
  );

  const output = {
    mode: 'admin',
    updated: hasPatch,
    codexWrite,
    status,
  };

  if (args.status || hasPatch || shouldWriteCodex) {
    console.log(JSON.stringify(output, null, 2));
  }
}

export function printAdminUsage(): void {
  console.log(`
CREATE SOMETHING MCP Hub

Run as MCP server (default):
  cs-mcp-hub

Admin mode:
  cs-mcp-hub --status
  cs-mcp-hub --enable-bundle <bundle> [--disable-bundle <bundle>] [--no-write-codex]
  cs-mcp-hub --enable-server <server> [--disable-server <server>] [--no-write-codex]
  cs-mcp-hub --write-codex

Environment overrides:
  CS_MCP_HUB_ROOT
  CS_MCP_HUB_REGISTRY
  CS_MCP_HUB_STATE
  CS_MCP_HUB_CODEX_CONFIG
  CS_MCP_HUB_ROUTING
  HUB_TENANT_ID
  HUB_ALLOW_PENDING_OAUTH_APPROVALS
`);
}

export function loadContext(): { paths: RegistryPaths; registry: McpBundleRegistry } {
  const initialPaths = resolveRegistryPaths();
  const registry = loadRegistry(initialPaths);
  const codexConfigPath = getEffectiveCodexPath(initialPaths, registry);
  const paths: RegistryPaths = {
    ...initialPaths,
    codexConfigPath,
  };
  return { paths, registry };
}

export function writeCodexResult(
  paths: RegistryPaths,
  registry: McpBundleRegistry,
): Record<string, unknown> {
  const state = loadState(paths);
  const result = writeCodexConfig(paths, registry, state);
  return {
    path: result.path,
    enabledServerNames: result.enabledServerNames,
    warnings: result.warnings,
  };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}
