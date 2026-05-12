#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ComposioClient } from '../packages/composio-bridge/src/client.ts';
import type { ComposioToolkitSummary } from '../packages/composio-bridge/src/types.ts';
import type {
  McpBundleRegistry as Registry,
  McpServerConfig as RegistryServer,
} from '../packages/cs-mcp-hub/src/types.ts';

type ScriptOptions = {
  registryPath: string;
  toolkitBaseUrl: string;
  dryRun: boolean;
  limit: number;
  managedBy: 'all' | 'composio' | 'project';
};

const ROOT = process.cwd();
const DEFAULT_REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const MANAGED_SERVER_PREFIX = 'composio-toolkit-';
const MANAGED_BUNDLE_PREFIX = 'composio-category-';
const COMPOSIO_ALL_BUNDLE = 'composio-all';
const DEFAULT_LIMIT = 2000;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const composioApiKey = readRequiredEnv('COMPOSIO_API_KEY');

  if (!existsSync(options.registryPath)) {
    throw new Error(`Registry file not found: ${options.registryPath}`);
  }

  const currentRegistry = loadRegistry(options.registryPath);
  const composio = new ComposioClient({ apiKey: composioApiKey });

  const toolkits = await composio.listToolkits({
    managedBy: options.managedBy,
    sortBy: 'alphabetically',
    limit: options.limit,
  });

  const normalizedToolkits = normalizeToolkits(toolkits);
  if (normalizedToolkits.length === 0) {
    throw new Error('Composio returned zero toolkits; refusing to overwrite managed registry entries.');
  }

  const merged = mergeRegistry(currentRegistry, normalizedToolkits, options.toolkitBaseUrl);
  const nextRaw = `${JSON.stringify(merged, null, 2)}\n`;
  const prevRaw = readFileSync(options.registryPath, 'utf8');

  const changed = prevRaw !== nextRaw;
  const stats = summarizeManagedEntries(merged);

  if (options.dryRun) {
    console.log('[composio-sync] dry-run complete');
    console.log(`[composio-sync] toolkits=${normalizedToolkits.length} servers=${stats.serverCount} bundles=${stats.bundleCount}`);
    console.log(`[composio-sync] changed=${changed}`);
    return;
  }

  if (changed) {
    writeFileSync(options.registryPath, nextRaw, 'utf8');
    console.log(`[composio-sync] updated ${relativeToRoot(options.registryPath)}`);
  } else {
    console.log('[composio-sync] no registry changes');
  }

  console.log(`[composio-sync] toolkits=${normalizedToolkits.length} servers=${stats.serverCount} bundles=${stats.bundleCount}`);
}

function parseArgs(argv: string[]): ScriptOptions {
  let registryPath = DEFAULT_REGISTRY_PATH;
  let dryRun = false;
  let baseUrlFromArg: string | undefined;
  let limit = parsePositiveInt(process.env.COMPOSIO_TOOLKIT_SYNC_LIMIT, DEFAULT_LIMIT);
  let managedBy: 'all' | 'composio' | 'project' = parseManagedBy(
    process.env.COMPOSIO_TOOLKIT_MANAGED_BY,
    'all',
  );

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--registry') {
      const value = argv[i + 1];
      if (!value) throw new Error('Missing value for --registry');
      registryPath = resolve(ROOT, value);
      i += 1;
      continue;
    }

    if (arg.startsWith('--registry=')) {
      registryPath = resolve(ROOT, arg.slice('--registry='.length));
      continue;
    }

    if (arg === '--base-url') {
      const value = argv[i + 1];
      if (!value) throw new Error('Missing value for --base-url');
      baseUrlFromArg = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--base-url=')) {
      baseUrlFromArg = arg.slice('--base-url='.length);
      continue;
    }

    if (arg === '--limit') {
      const value = argv[i + 1];
      if (!value) throw new Error('Missing value for --limit');
      limit = parsePositiveInt(value, DEFAULT_LIMIT);
      i += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      limit = parsePositiveInt(arg.slice('--limit='.length), DEFAULT_LIMIT);
      continue;
    }

    if (arg === '--managed-by') {
      const value = argv[i + 1];
      if (!value) throw new Error('Missing value for --managed-by');
      managedBy = parseManagedBy(value, managedBy);
      i += 1;
      continue;
    }

    if (arg.startsWith('--managed-by=')) {
      managedBy = parseManagedBy(arg.slice('--managed-by='.length), managedBy);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const toolkitBaseUrl = normalizeToolkitBaseUrl(
    baseUrlFromArg ?? process.env.COMPOSIO_TOOLKIT_MCP_BASE_URL,
  );

  return {
    registryPath,
    toolkitBaseUrl,
    dryRun,
    limit,
    managedBy,
  };
}

function printUsage(): void {
  console.log(
    [
      'Usage:',
      '  pnpm exec tsx scripts/composio-registry-sync.ts [options]',
      '',
      'Required env:',
      '  COMPOSIO_API_KEY',
      '  COMPOSIO_TOOLKIT_MCP_BASE_URL',
      '',
      'Options:',
      '  --registry <path>      Registry JSON path (default: config/mcp-hub/registry.json)',
      '  --base-url <url>       Override COMPOSIO_TOOLKIT_MCP_BASE_URL',
      '  --limit <number>       Toolkit list limit (default: 2000)',
      '  --managed-by <value>   all | composio | project (default: all)',
      '  --dry-run              Preview without writing',
    ].join('\n'),
  );
}

function parseManagedBy(
  raw: string | undefined,
  fallback: 'all' | 'composio' | 'project',
): 'all' | 'composio' | 'project' {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'composio' || normalized === 'project') {
    return normalized;
  }
  return fallback;
}

function normalizeToolkitBaseUrl(raw: string | undefined): string {
  if (!raw || !raw.trim()) {
    throw new Error('COMPOSIO_TOOLKIT_MCP_BASE_URL is required (or pass --base-url).');
  }

  const trimmed = raw.trim().replace(/\/+$/g, '');
  const withoutMcpSuffix = trimmed.replace(/\/mcp$/i, '');
  if (!withoutMcpSuffix.startsWith('https://') && !withoutMcpSuffix.startsWith('http://')) {
    throw new Error(`Invalid toolkit base URL: ${raw}`);
  }
  return withoutMcpSuffix;
}

function normalizeToolkits(toolkits: ComposioToolkitSummary[]): ComposioToolkitSummary[] {
  const bySlug = new Map<string, ComposioToolkitSummary>();

  for (const toolkit of toolkits) {
    const slug = sanitizeSlug(toolkit.slug);
    if (!slug) continue;

    bySlug.set(slug, {
      ...toolkit,
      slug,
      name: toolkit.name?.trim() || slug,
      categories: normalizeCategories(toolkit.categories),
    });
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function normalizeCategories(raw: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .map((entry) => sanitizeCategory(entry))
    .filter(Boolean);
  return uniqueSortedStrings(normalized);
}

function sanitizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

function sanitizeCategory(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mergeRegistry(
  current: Registry,
  toolkits: ComposioToolkitSummary[],
  toolkitBaseUrl: string,
): Registry {
  const managedServers = buildManagedServerEntries(toolkits, toolkitBaseUrl);
  const managedBundles = buildManagedBundles(toolkits);
  const managedBundleNames = new Set(Object.keys(managedBundles));
  managedBundleNames.add(COMPOSIO_ALL_BUNDLE);

  const nextServers = Object.fromEntries(
    Object.entries(current.servers).filter(([name]) => !name.startsWith(MANAGED_SERVER_PREFIX)),
  ) as Record<string, RegistryServer>;

  for (const [name, config] of Object.entries(managedServers)) {
    nextServers[name] = config;
  }

  const nextBundles = Object.fromEntries(
    Object.entries(current.bundles).filter(
      ([bundleName]) =>
        bundleName !== COMPOSIO_ALL_BUNDLE && !bundleName.startsWith(MANAGED_BUNDLE_PREFIX),
    ),
  ) as Record<string, string[]>;

  nextBundles[COMPOSIO_ALL_BUNDLE] = Object.keys(managedServers).sort();
  for (const [bundleName, members] of Object.entries(managedBundles)) {
    nextBundles[bundleName] = members;
  }

  const nextDefaults = current.defaults
    ? {
        ...current.defaults,
        enabledBundles: uniqueSortedStrings(
          (current.defaults.enabledBundles ?? []).filter(
            (bundleName) => !managedBundleNames.has(bundleName),
          ),
        ),
        enabledServers: uniqueSortedStrings(
          (current.defaults.enabledServers ?? []).filter(
            (serverName) => !serverName.startsWith(MANAGED_SERVER_PREFIX),
          ),
        ),
        disabledServers: uniqueSortedStrings(
          (current.defaults.disabledServers ?? []).filter(
            (serverName) => !serverName.startsWith(MANAGED_SERVER_PREFIX),
          ),
        ),
      }
    : undefined;

  return {
    ...current,
    servers: nextServers,
    bundles: nextBundles,
    ...(nextDefaults ? { defaults: nextDefaults } : {}),
  };
}

function buildManagedServerEntries(
  toolkits: ComposioToolkitSummary[],
  toolkitBaseUrl: string,
): Record<string, RegistryServer> {
  const entries: Array<[string, RegistryServer]> = toolkits.map((toolkit) => {
    const serverName = `${MANAGED_SERVER_PREFIX}${toolkit.slug}`;
    const categories = toolkit.categories.length > 0 ? toolkit.categories : ['uncategorized'];

    const tags = uniqueSortedStrings([
      'composio',
      'toolkit',
      ...categories.map((category) => `composio-${category}`),
    ]);

    const description = toolkit.description?.trim()
      ? `Composio toolkit gateway: ${toolkit.name} (${toolkit.slug}) - ${toolkit.description.trim()}`
      : `Composio toolkit gateway: ${toolkit.name} (${toolkit.slug})`;

    const server: RegistryServer = {
      transport: 'http',
      url: `${toolkitBaseUrl}/mcp/${encodeURIComponent(toolkit.slug)}`,
      description,
      tags,
    };
    return [serverName, server];
  });

  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function buildManagedBundles(
  toolkits: ComposioToolkitSummary[],
): Record<string, string[]> {
  const grouped = new Map<string, Set<string>>();

  for (const toolkit of toolkits) {
    const serverName = `${MANAGED_SERVER_PREFIX}${toolkit.slug}`;
    const categories = toolkit.categories.length > 0 ? toolkit.categories : ['uncategorized'];

    for (const category of categories) {
      const bundleName = `${MANAGED_BUNDLE_PREFIX}${category}`;
      const members = grouped.get(bundleName) ?? new Set<string>();
      members.add(serverName);
      grouped.set(bundleName, members);
    }
  }

  const entries: Array<[string, string[]]> = [];
  for (const [bundleName, members] of grouped.entries()) {
    entries.push([bundleName, [...members].sort()]);
  }

  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function summarizeManagedEntries(registry: Registry): { serverCount: number; bundleCount: number } {
  const serverCount = Object.keys(registry.servers).filter((name) =>
    name.startsWith(MANAGED_SERVER_PREFIX),
  ).length;
  const bundleCount = Object.keys(registry.bundles).filter(
    (name) => name === COMPOSIO_ALL_BUNDLE || name.startsWith(MANAGED_BUNDLE_PREFIX),
  ).length;
  return { serverCount, bundleCount };
}

function loadRegistry(path: string): Registry {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as Registry;
  if (parsed.version !== 1) {
    throw new Error(`Unsupported registry version: ${String((parsed as { version?: unknown }).version)}`);
  }
  if (!parsed.servers || typeof parsed.servers !== 'object') {
    throw new Error('Invalid registry: "servers" object is required.');
  }
  if (!parsed.bundles || typeof parsed.bundles !== 'object') {
    throw new Error('Invalid registry: "bundles" object is required.');
  }
  return parsed;
}

function readRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function relativeToRoot(filePath: string): string {
  return filePath.replace(`${ROOT}/`, '');
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[composio-sync] ${message}`);
  process.exit(1);
});
