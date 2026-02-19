import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import TOML from '@iarna/toml';

import type {
  McpBundleRegistry,
  McpHubState,
  McpServerConfig,
  RegistryPaths,
  ResolvedState,
  StatePatch,
  StateResolution,
} from './types.js';

const DEFAULT_REGISTRY_PATH = join('config', 'mcp-hub', 'registry.json');
const DEFAULT_STATE_PATH = join('config', 'mcp-hub', 'state.json');
const DEFAULT_CODEX_CONFIG_PATH = join('.codex', 'config.toml');

export function resolveRegistryPaths(rootDir = resolve(process.env.CS_MCP_HUB_ROOT ?? process.cwd())): RegistryPaths {
  const registryPath = resolveMaybeRelative(rootDir, process.env.CS_MCP_HUB_REGISTRY, DEFAULT_REGISTRY_PATH);
  const statePath = resolveMaybeRelative(rootDir, process.env.CS_MCP_HUB_STATE, DEFAULT_STATE_PATH);
  const codexConfigPath = resolveMaybeRelative(rootDir, process.env.CS_MCP_HUB_CODEX_CONFIG, DEFAULT_CODEX_CONFIG_PATH);

  return { rootDir, registryPath, statePath, codexConfigPath };
}

export function loadRegistry(paths: RegistryPaths): McpBundleRegistry {
  const registry = readJsonFile<McpBundleRegistry>(paths.registryPath, 'registry');

  if (registry.version !== 1) {
    throw new Error(`Unsupported registry version at ${paths.registryPath}: ${String((registry as any).version)}`);
  }
  if (!isRecord(registry.servers) || !isRecord(registry.bundles)) {
    throw new Error(`Invalid registry shape at ${paths.registryPath}: expected "servers" and "bundles" objects`);
  }

  return registry;
}

export function loadState(paths: RegistryPaths): McpHubState {
  if (!existsSync(paths.statePath)) {
    return {};
  }
  return readJsonFile<McpHubState>(paths.statePath, 'state');
}

export function saveState(paths: RegistryPaths, state: McpHubState): void {
  mkdirSync(dirname(paths.statePath), { recursive: true });
  writeFileSync(paths.statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

export function resolveState(registry: McpBundleRegistry, state: McpHubState): StateResolution {
  const warnings: string[] = [];

  const resolved: ResolvedState = {
    enabledBundles: uniqueSortedStrings(state.enabledBundles ?? registry.defaults?.enabledBundles ?? []),
    enabledServers: uniqueSortedStrings(state.enabledServers ?? registry.defaults?.enabledServers ?? []),
    disabledServers: uniqueSortedStrings(state.disabledServers ?? registry.defaults?.disabledServers ?? []),
  };

  const enabledServerNames = new Set<string>();

  for (const bundleName of resolved.enabledBundles) {
    const bundleServers = registry.bundles[bundleName];
    if (!bundleServers) {
      warnings.push(`Unknown bundle "${bundleName}" in state`);
      continue;
    }
    for (const serverName of bundleServers) {
      if (!registry.servers[serverName]) {
        warnings.push(`Bundle "${bundleName}" references unknown server "${serverName}"`);
        continue;
      }
      enabledServerNames.add(serverName);
    }
  }

  for (const serverName of resolved.enabledServers) {
    if (!registry.servers[serverName]) {
      warnings.push(`Unknown enabled server "${serverName}" in state`);
      continue;
    }
    enabledServerNames.add(serverName);
  }

  for (const serverName of resolved.disabledServers) {
    if (!registry.servers[serverName]) {
      warnings.push(`Unknown disabled server "${serverName}" in state`);
      continue;
    }
    enabledServerNames.delete(serverName);
  }

  return {
    state: resolved,
    enabledServerNames: [...enabledServerNames].sort(),
    warnings,
  };
}

export function updateState(registry: McpBundleRegistry, current: McpHubState, patch: StatePatch): McpHubState {
  const baseline = resolveState(registry, current).state;

  const enabledBundles = new Set<string>(baseline.enabledBundles);
  const enabledServers = new Set<string>(baseline.enabledServers);
  const disabledServers = new Set<string>(baseline.disabledServers);

  for (const bundle of patch.enableBundles ?? []) {
    enabledBundles.add(bundle);
  }
  for (const bundle of patch.disableBundles ?? []) {
    enabledBundles.delete(bundle);
  }

  for (const server of patch.enableServers ?? []) {
    enabledServers.add(server);
    disabledServers.delete(server);
  }
  for (const server of patch.disableServers ?? []) {
    enabledServers.delete(server);
    disabledServers.add(server);
  }

  return {
    enabledBundles: [...enabledBundles].sort(),
    enabledServers: [...enabledServers].sort(),
    disabledServers: [...disabledServers].sort(),
    updatedAt: new Date().toISOString(),
  };
}

export function writeCodexConfig(
  paths: RegistryPaths,
  registry: McpBundleRegistry,
  state: McpHubState,
): { path: string; enabledServerNames: string[]; warnings: string[] } {
  const resolution = resolveState(registry, state);

  const existing = loadTomlObject(paths.codexConfigPath);
  const existingServersRaw = isRecord(existing.mcp_servers) ? existing.mcp_servers : {};
  const existingServers: Record<string, unknown> = { ...existingServersRaw };

  for (const serverName of Object.keys(registry.servers).sort()) {
    const server = registry.servers[serverName];
    // Keep downstream servers disabled in Codex. The hub process connects to them directly.
    const codexEntry = buildCodexEntry(server, false);
    existingServers[serverName] = codexEntry;
  }

  ensureHubEntry(existingServers);

  existing.mcp_servers = existingServers;

  mkdirSync(dirname(paths.codexConfigPath), { recursive: true });
  writeFileSync(paths.codexConfigPath, TOML.stringify(existing as any), 'utf-8');

  return {
    path: paths.codexConfigPath,
    enabledServerNames: resolution.enabledServerNames,
    warnings: resolution.warnings,
  };
}

export function getEffectiveCodexPath(paths: RegistryPaths, registry: McpBundleRegistry): string {
  if (process.env.CS_MCP_HUB_CODEX_CONFIG) {
    return paths.codexConfigPath;
  }

  const configured = registry.defaults?.codexConfigPath;
  if (!configured) {
    return paths.codexConfigPath;
  }
  return resolveMaybeRelative(paths.rootDir, configured, paths.codexConfigPath);
}

function buildCodexEntry(server: McpServerConfig, enabled: boolean): Record<string, unknown> {
  if (server.transport === 'http') {
    const entry: Record<string, unknown> = {
      url: server.url,
      enabled,
    };
    if (server.headers && Object.keys(server.headers).length > 0) {
      entry.headers = { ...server.headers };
    }
    return entry;
  }

  const entry: Record<string, unknown> = {
    command: server.command,
    enabled,
  };
  if (server.args && server.args.length > 0) {
    entry.args = [...server.args];
  }
  if (server.env && Object.keys(server.env).length > 0) {
    entry.env = { ...server.env };
  }
  if (server.cwd) {
    entry.cwd = server.cwd;
  }

  return entry;
}

function ensureHubEntry(servers: Record<string, unknown>): void {
  const hubName = 'create-something-hub';
  const existing = isRecord(servers[hubName]) ? servers[hubName] : {};
  const existingArgs =
    Array.isArray(existing.args) && existing.args.every((arg) => typeof arg === 'string')
      ? (existing.args as string[])
      : ['./packages/cs-mcp-hub/dist/index.js'];

  servers[hubName] = {
    ...existing,
    command: typeof existing.command === 'string' ? existing.command : 'node',
    args: existingArgs,
    enabled: true,
  };
}

function resolveMaybeRelative(root: string, maybePath: string | undefined, fallback: string): string {
  const candidate = maybePath ?? fallback;
  if (isAbsolute(candidate)) {
    return candidate;
  }
  return resolve(root, candidate);
}

function readJsonFile<T>(path: string, label: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ${label} JSON at ${path}: ${message}`);
  }
}

function loadTomlObject(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const parsed = TOML.parse(readFileSync(path, 'utf-8'));
    return isRecord(parsed) ? parsed : {};
  } catch {
    // Preserve momentum: invalid file should not block writing a clean config.
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort();
}
