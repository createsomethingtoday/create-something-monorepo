#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type CatalogCategory = 'create-something' | 'workway';
type CatalogAuthType = 'bearer' | 'oauth';
type CatalogTransport = 'http' | 'sse';
type ServerLifecycle = 'active' | 'dormant' | 'local';
type CatalogExposureMode = 'direct' | 'brokered' | 'exception_direct';

type CatalogConfig = {
  include: boolean;
  name?: string;
  slug?: string;
  category: CatalogCategory;
  description?: string;
  transports?: CatalogTransport[];
  requiresAuth?: boolean;
  authType?: CatalogAuthType;
  setupNotes?: string;
};

type BaseServer = {
  description?: string;
  tags?: string[];
  lifecycle?: ServerLifecycle;
  package_path?: string;
  catalog_exposure_mode?: CatalogExposureMode;
  estimated_tool_count?: number;
  exposure_exception_reason?: string;
  exposure_review_owner?: string;
  catalog?: CatalogConfig;
};

type HttpServer = BaseServer & {
  transport: 'http';
  url: string;
  http_headers?: Record<string, string>;
  env_http_headers?: Record<string, string>;
  bearer_token_env_var?: string;
  headers?: Record<string, string>; // legacy compatibility
};

type StdioServer = BaseServer & {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

type RegistryServer = HttpServer | StdioServer;

type Registry = {
  version: number;
  servers: Record<string, RegistryServer>;
  bundles: Record<string, string[]>;
  defaults?: {
    enabledBundles?: string[];
    enabledServers?: string[];
    disabledServers?: string[];
    codexConfigPath?: string;
  };
};

type GeneratedCatalogEntry = {
  name: string;
  slug: string;
  url: string;
  description: string;
  category: CatalogCategory;
  transports: CatalogTransport[];
  requiresAuth: boolean;
  authType?: CatalogAuthType;
  setupNotes?: string;
};

const VALID_SERVER_LIFECYCLES = new Set(['active', 'dormant', 'local']);
const VALID_CATALOG_EXPOSURE_MODES = new Set(['direct', 'brokered', 'exception_direct']);
const VALID_CATALOG_CATEGORIES = new Set(['create-something', 'workway']);
const VALID_CATALOG_TRANSPORTS = new Set(['http', 'sse']);
const VALID_CATALOG_AUTH_TYPES = new Set(['bearer', 'oauth']);

const ROOT = process.cwd();
const REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const SCHEMA_PATH = resolve(ROOT, 'config/mcp-hub/registry.schema.json');
const GENERATED_CATALOG_PATH = resolve(ROOT, 'packages/playbook-mcp/src/catalog.registry.generated.ts');
const GENERATED_FLEET_DOC_PATH = resolve(ROOT, 'docs/MCP_FLEET_REGISTRY.generated.md');

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!['annotate-exposure', 'check', 'generate', 'validate'].includes(command)) {
  console.error('Usage: tsx scripts/mcp-registry.ts [annotate-exposure|check|generate|validate]');
  process.exit(2);
}

if (!existsSync(REGISTRY_PATH)) {
  console.error(`Registry missing: ${REGISTRY_PATH}`);
  process.exit(1);
}
if (!existsSync(SCHEMA_PATH)) {
  console.error(`Schema missing: ${SCHEMA_PATH}`);
  process.exit(1);
}

const registry = loadRegistry(REGISTRY_PATH);
const errors = validateRegistry(registry);
if (errors.length > 0) {
  console.error('Registry validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const catalogEntries = buildCatalogEntries(registry);
const generatedCatalog = renderCatalogFile(catalogEntries);
const generatedFleetDoc = renderFleetDoc(registry);

if (command === 'validate') {
  console.log('Registry validation passed.');
  process.exit(0);
}

if (command === 'generate') {
  writeFileSync(GENERATED_CATALOG_PATH, generatedCatalog, 'utf8');
  writeFileSync(GENERATED_FLEET_DOC_PATH, generatedFleetDoc, 'utf8');
  console.log(`Wrote ${relativeToRoot(GENERATED_CATALOG_PATH)}`);
  console.log(`Wrote ${relativeToRoot(GENERATED_FLEET_DOC_PATH)}`);
  process.exit(0);
}

if (command === 'annotate-exposure') {
  const { nextRegistry, updatedServers } = annotateExposureMetadata(registry);
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(nextRegistry, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${relativeToRoot(REGISTRY_PATH)}`);
  console.log(`Annotated ${updatedServers.length} server(s) with explicit exposure metadata.`);
  if (updatedServers.length > 0) {
    for (const serverName of updatedServers) {
      console.log(`- ${serverName}`);
    }
  }
  process.exit(0);
}

const drift: string[] = [];
if (!isFileContentEqual(GENERATED_CATALOG_PATH, generatedCatalog)) {
  drift.push(relativeToRoot(GENERATED_CATALOG_PATH));
}
if (!isFileContentEqual(GENERATED_FLEET_DOC_PATH, generatedFleetDoc)) {
  drift.push(relativeToRoot(GENERATED_FLEET_DOC_PATH));
}

if (drift.length > 0) {
  console.error('Registry artifacts are out of date:');
  for (const file of drift) {
    console.error(`- ${file}`);
  }
  console.error('Run: pnpm mcp:registry:generate');
  process.exit(1);
}

console.log('Registry check passed.');

function loadRegistry(path: string): Registry {
  return JSON.parse(readFileSync(path, 'utf8')) as Registry;
}

function validateRegistry(data: Registry): string[] {
  const errors: string[] = [];

  if (data.version !== 1) {
    errors.push(`version must be 1 (received ${String(data.version)})`);
  }

  if (!isPlainObject(data.servers) || Object.keys(data.servers).length === 0) {
    errors.push('servers must be a non-empty object');
  }
  if (!isPlainObject(data.bundles)) {
    errors.push('bundles must be an object');
  }

  const serverNames = new Set(Object.keys(data.servers ?? {}));
  const catalogSlugs = new Set<string>();

  for (const [serverName, server] of Object.entries(data.servers ?? {})) {
    if (!isPlainObject(server)) {
      errors.push(`server ${serverName}: config must be an object`);
      continue;
    }

    validateRegistryMetadata(serverName, server as unknown as Record<string, unknown>, errors);

    if (server.transport === 'http') {
      if (typeof server.url !== 'string' || server.url.length === 0) {
        errors.push(`server ${serverName}: http transport requires non-empty url`);
      }
    } else if (server.transport === 'stdio') {
      if (typeof server.command !== 'string' || server.command.length === 0) {
        errors.push(`server ${serverName}: stdio transport requires non-empty command`);
      }
    } else {
      errors.push(`server ${serverName}: transport must be "http" or "stdio"`);
    }

    const catalog = isPlainObject(server.catalog) ? server.catalog : undefined;
    if (catalog?.include) {
      if (server.transport !== 'http') {
        errors.push(`server ${serverName}: catalog.include requires http transport`);
      }
      if (!catalog.category) {
        errors.push(`server ${serverName}: catalog.include requires category`);
      }
      const slug = typeof catalog.slug === 'string' && catalog.slug.trim() ? catalog.slug.trim() : serverName;
      if (catalogSlugs.has(slug)) {
        errors.push(`duplicate catalog slug: ${slug}`);
      }
      catalogSlugs.add(slug);
    }

    validateCatalogExposurePolicy(serverName, server, errors);
  }

  for (const [bundleName, members] of Object.entries(data.bundles ?? {})) {
    if (!Array.isArray(members)) {
      errors.push(`bundle ${bundleName}: must be an array`);
      continue;
    }
    for (const serverName of members) {
      if (!serverNames.has(serverName)) {
        errors.push(`bundle ${bundleName}: unknown server ${serverName}`);
      }
    }
  }

  for (const bundleName of data.defaults?.enabledBundles ?? []) {
    if (!(bundleName in (data.bundles ?? {}))) {
      errors.push(`defaults.enabledBundles references unknown bundle: ${bundleName}`);
    }
  }

  for (const serverName of data.defaults?.enabledServers ?? []) {
    if (!serverNames.has(serverName)) {
      errors.push(`defaults.enabledServers references unknown server: ${serverName}`);
    }
  }

  for (const serverName of data.defaults?.disabledServers ?? []) {
    if (!serverNames.has(serverName)) {
      errors.push(`defaults.disabledServers references unknown server: ${serverName}`);
    }
  }

  return errors;
}

function validateRegistryMetadata(serverName: string, server: Record<string, unknown>, errors: string[]): void {
  if (server.lifecycle !== undefined && !VALID_SERVER_LIFECYCLES.has(String(server.lifecycle))) {
    errors.push(`server ${serverName}: lifecycle must be one of active, dormant, local`);
  }

  if (
    server.catalog_exposure_mode !== undefined &&
    !VALID_CATALOG_EXPOSURE_MODES.has(String(server.catalog_exposure_mode))
  ) {
    errors.push(
      `server ${serverName}: catalog_exposure_mode must be one of direct, brokered, exception_direct`,
    );
  }

  if (
    server.estimated_tool_count !== undefined &&
    (!Number.isInteger(server.estimated_tool_count) || Number(server.estimated_tool_count) < 0)
  ) {
    errors.push(`server ${serverName}: estimated_tool_count must be a non-negative integer`);
  }

  if (server.tags !== undefined) {
    if (!Array.isArray(server.tags) || server.tags.some((tag) => typeof tag !== 'string')) {
      errors.push(`server ${serverName}: tags must be an array of strings`);
    }
  }

  if (server.catalog !== undefined) {
    if (!isPlainObject(server.catalog)) {
      errors.push(`server ${serverName}: catalog must be an object`);
      return;
    }
    const catalog = server.catalog;

    if (typeof catalog.include !== 'boolean') {
      errors.push(`server ${serverName}: catalog.include must be a boolean`);
    }
    if (!VALID_CATALOG_CATEGORIES.has(String(catalog.category))) {
      errors.push(`server ${serverName}: catalog.category must be one of create-something, workway`);
    }
    if (catalog.transports !== undefined) {
      if (
        !Array.isArray(catalog.transports) ||
        catalog.transports.some((transport) => !VALID_CATALOG_TRANSPORTS.has(String(transport)))
      ) {
        errors.push(`server ${serverName}: catalog.transports must contain only http or sse`);
      }
    }
    if (catalog.authType !== undefined && !VALID_CATALOG_AUTH_TYPES.has(String(catalog.authType))) {
      errors.push(`server ${serverName}: catalog.authType must be bearer or oauth`);
    }
  }
}

function validateCatalogExposurePolicy(
  serverName: string,
  server: RegistryServer,
  errors: string[],
): void {
  const exposureMode = server.catalog_exposure_mode ?? inferCatalogExposureMode(serverName, server);
  const estimatedToolCount = inferEstimatedToolCount(serverName, server);
  const reason = server.exposure_exception_reason?.trim();
  const owner = server.exposure_review_owner?.trim();

  if (estimatedToolCount >= 75 && exposureMode === 'direct') {
    errors.push(
      `server ${serverName}: direct catalog exposure is not allowed for estimated_tool_count >= 75; use brokered or exception_direct`,
    );
  }

  if (estimatedToolCount >= 26 && estimatedToolCount <= 75 && exposureMode === 'direct') {
    if (!reason || !owner) {
      errors.push(
        `server ${serverName}: direct catalog exposure for estimated_tool_count 26-75 requires exposure_exception_reason and exposure_review_owner`,
      );
    }
  }

  if (exposureMode === 'exception_direct') {
    if (!reason || !owner) {
      errors.push(
        `server ${serverName}: exception_direct exposure requires exposure_exception_reason and exposure_review_owner`,
      );
    }
  }

  if (isBroadConnectorSurface(serverName, server) && exposureMode === 'direct' && estimatedToolCount >= 75) {
    errors.push(
      `server ${serverName}: broad connector surfaces should not be marked direct at large-catalog scale`,
    );
  }
}

function annotateExposureMetadata(data: Registry): { nextRegistry: Registry; updatedServers: string[] } {
  const nextServers: Record<string, RegistryServer> = {};
  const updatedServers: string[] = [];

  for (const [serverName, server] of Object.entries(data.servers)) {
    const nextServer: RegistryServer = {
      ...server,
      catalog_exposure_mode: server.catalog_exposure_mode ?? inferCatalogExposureMode(serverName, server),
      estimated_tool_count:
        typeof server.estimated_tool_count === 'number' && Number.isFinite(server.estimated_tool_count)
          ? Math.max(0, Math.trunc(server.estimated_tool_count))
          : inferEstimatedToolCount(serverName, server),
    };

    nextServers[serverName] = nextServer;

    if (
      nextServer.catalog_exposure_mode !== server.catalog_exposure_mode ||
      nextServer.estimated_tool_count !== server.estimated_tool_count
    ) {
      updatedServers.push(serverName);
    }
  }

  return {
    nextRegistry: {
      ...data,
      servers: nextServers,
    },
    updatedServers,
  };
}

function inferCatalogExposureMode(serverName: string, server: RegistryServer): CatalogExposureMode {
  if (isBroadConnectorSurface(serverName, server)) {
    return 'brokered';
  }
  return 'direct';
}

function inferEstimatedToolCount(serverName: string, server: RegistryServer): number {
  if (typeof server.estimated_tool_count === 'number' && Number.isFinite(server.estimated_tool_count)) {
    return Math.max(0, Math.trunc(server.estimated_tool_count));
  }
  if (isBroadConnectorSurface(serverName, server)) {
    return 100;
  }
  return 0;
}

function isBroadConnectorSurface(serverName: string, server: RegistryServer): boolean {
  if (serverName.startsWith('composio-toolkit-')) {
    return true;
  }
  const tags = server.tags ?? [];
  return tags.includes('toolkit') || (tags.includes('composio') && tags.length >= 2);
}

function buildCatalogEntries(data: Registry): GeneratedCatalogEntry[] {
  const entries: GeneratedCatalogEntry[] = [];

  for (const [serverName, server] of Object.entries(data.servers)) {
    if (!server.catalog?.include) continue;
    if (server.transport !== 'http') continue;

    const category = server.catalog.category;
    const name = server.catalog.name?.trim() || titleCase(serverName);
    const slug = server.catalog.slug?.trim() || serverName;
    const description =
      server.catalog.description?.trim() ||
      server.description?.trim() ||
      `${name} MCP server`;
    const transports =
      server.catalog.transports && server.catalog.transports.length > 0
        ? server.catalog.transports
        : (['http'] as CatalogTransport[]);

    const requiresAuth =
      server.catalog.requiresAuth ??
      Boolean(
        server.bearer_token_env_var ||
          (server.http_headers && Object.keys(server.http_headers).length > 0) ||
          (server.env_http_headers && Object.keys(server.env_http_headers).length > 0),
      );

    const entry: GeneratedCatalogEntry = {
      name,
      slug,
      url: stripTransportSuffix(server.url),
      description,
      category,
      transports,
      requiresAuth,
    };

    if (server.catalog.authType) {
      entry.authType = server.catalog.authType;
    }
    if (server.catalog.setupNotes) {
      entry.setupNotes = server.catalog.setupNotes;
    }

    entries.push(entry);
  }

  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return entries;
}

function renderCatalogFile(entries: GeneratedCatalogEntry[]): string {
  return [
    '/**',
    ' * AUTO-GENERATED FILE. DO NOT EDIT.',
    ' * Source: config/mcp-hub/registry.json',
    ' * Regenerate with: pnpm mcp:registry:generate',
    ' */',
    '',
    `export const REGISTRY_CATALOG_ENTRIES = ${JSON.stringify(entries, null, 2)} as const;`,
    '',
  ].join('\n');
}

function renderFleetDoc(data: Registry): string {
  const byLifecycle: Record<ServerLifecycle, Array<{ name: string; server: RegistryServer }>> = {
    active: [],
    dormant: [],
    local: [],
  };

  for (const [name, server] of Object.entries(data.servers)) {
    const lifecycle = resolveLifecycle(server);
    byLifecycle[lifecycle].push({ name, server });
  }

  for (const values of Object.values(byLifecycle)) {
    values.sort((a, b) => a.name.localeCompare(b.name));
  }

  const lines: string[] = [
    '# MCP Fleet Registry (Generated)',
    '',
    '> Auto-generated from `config/mcp-hub/registry.json`.',
    '> Regenerate with `pnpm mcp:registry:generate`.',
    '',
  ];

  for (const lifecycle of ['active', 'dormant', 'local'] as const) {
    const rows = byLifecycle[lifecycle];
    lines.push(`## ${titleCase(lifecycle)} (${rows.length})`, '');
    lines.push('| Server | Transport | Endpoint | Exposure | Est. Tools | Tags |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const row of rows) {
      const endpoint =
        row.server.transport === 'http'
          ? `\`${row.server.url}\``
          : `\`${row.server.command}${row.server.args?.length ? ` ${row.server.args.join(' ')}` : ''}\``;
      const exposure = row.server.catalog_exposure_mode ?? inferCatalogExposureMode(row.name, row.server);
      const estimatedToolCount = inferEstimatedToolCount(row.name, row.server);
      const tags = row.server.tags?.length ? row.server.tags.map((tag) => `\`${tag}\``).join(', ') : '—';
      lines.push(
        `| \`${row.name}\` | \`${row.server.transport}\` | ${endpoint} | \`${exposure}\` | \`${estimatedToolCount}\` | ${tags} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Bundles', '');
  lines.push('| Bundle | Servers |');
  lines.push('| --- | --- |');
  for (const [bundleName, members] of Object.entries(data.bundles).sort(([a], [b]) => a.localeCompare(b))) {
    const memberText = members.map((member) => `\`${member}\``).join(', ');
    lines.push(`| \`${bundleName}\` | ${memberText} |`);
  }
  lines.push('');

  return lines.join('\n');
}

function resolveLifecycle(server: RegistryServer): ServerLifecycle {
  if (server.lifecycle) return server.lifecycle;
  if (server.transport === 'stdio') return 'local';
  if (server.tags?.includes('local')) return 'local';
  if (server.tags?.includes('dormant') || server.tags?.includes('prototype')) return 'dormant';
  return 'active';
}

function stripTransportSuffix(url: string): string {
  return url.replace(/\/(mcp|sse)(\?.*)?$/, '');
}

function titleCase(input: string): string {
  return input
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFileContentEqual(filePath: string, expected: string): boolean {
  if (!existsSync(filePath)) return false;
  return readFileSync(filePath, 'utf8') === expected;
}

function relativeToRoot(filePath: string): string {
  return filePath.replace(`${ROOT}/`, '');
}
