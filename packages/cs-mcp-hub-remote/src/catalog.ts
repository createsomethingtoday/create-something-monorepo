import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import aliasOverridesJson from '../../../config/mcp-hub/tool-aliases.json';
import type { CatalogToolEntry, McpBundleRegistry, ProxyCatalog, ToolCatalog } from './types.js';
import { sanitizeDotName, uniqueSortedStrings } from './utils.js';

const HUB_INDEX_SOURCE = 'hub-runtime';

type AliasOverrides = Record<string, string>;

const aliasOverrides = (aliasOverridesJson ?? {}) as AliasOverrides;

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function inferConnector(serverName: string, downstreamToolName: string): string {
  const normalized = downstreamToolName.toLowerCase();
  const firstSegment = normalized.split(/[_.-]/g)[0];
  if (firstSegment && firstSegment.length > 1) {
    return firstSegment;
  }
  return sanitizeDotName(serverName).split('.')[0] ?? sanitizeDotName(serverName);
}

function inferReadWrite(toolName: string): 'read' | 'write' {
  const name = toolName.toLowerCase();
  const writeHints = [
    'create',
    'update',
    'delete',
    'archive',
    'append',
    'sync',
    'send',
    'post',
    'write',
    'upload',
    'set',
    'patch',
    'promote',
    'start',
    'stop'
  ];

  if (writeHints.some((hint) => name.includes(hint))) {
    return 'write';
  }

  return 'read';
}

function reserveUniqueAlias(baseAlias: string, reserved: Set<string>): string {
  const normalized = sanitizeDotName(baseAlias);
  if (!reserved.has(normalized)) {
    reserved.add(normalized);
    return normalized;
  }

  let suffix = 2;
  let candidate = `${normalized}_${suffix}`;
  while (reserved.has(candidate)) {
    suffix += 1;
    candidate = `${normalized}_${suffix}`;
  }

  reserved.add(candidate);
  return candidate;
}

function resolveAliasOverride(
  serverName: string,
  downstreamToolName: string,
  proxyToolName: string
): string | null {
  const keys = [
    `${serverName}.${downstreamToolName}`,
    `${sanitizeDotName(serverName)}.${sanitizeDotName(downstreamToolName)}`,
    proxyToolName
  ];

  for (const key of keys) {
    const value = aliasOverrides[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildToolRef(
  serverName: string,
  downstreamToolName: string,
  reserved: Set<string>
): string {
  const base = `${sanitizeDotName(serverName)}:${sanitizeDotName(downstreamToolName)}`;
  if (!reserved.has(base)) {
    reserved.add(base);
    return base;
  }

  let suffix = 2;
  let candidate = `${base}_${suffix}`;
  while (reserved.has(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  reserved.add(candidate);
  return candidate;
}

export function buildToolCatalog(
  proxies: ProxyCatalog,
  registry: McpBundleRegistry
): { catalog: ToolCatalog; warnings: string[] } {
  const entries: CatalogToolEntry[] = [];
  const warnings: string[] = [];
  const aliasSet = new Set<string>();
  const toolRefSet = new Set<string>();

  for (const toolDef of proxies.toolDefinitions) {
    const route = proxies.routes.get(toolDef.name);
    if (!route) {
      warnings.push(`No route found for proxy tool ${toolDef.name}`);
      continue;
    }

    const serverConfig = registry.servers[route.serverName];
    const overrideAlias = resolveAliasOverride(
      route.serverName,
      route.downstreamToolName,
      route.proxyToolName
    );
    const fallbackAlias = `${sanitizeDotName(route.serverName)}.${sanitizeDotName(route.downstreamToolName)}`;
    const dottedAlias = reserveUniqueAlias(overrideAlias ?? fallbackAlias, aliasSet);
    if (overrideAlias && dottedAlias !== sanitizeDotName(overrideAlias)) {
      warnings.push(`Alias collision for ${overrideAlias}; using ${dottedAlias}`);
    }

    const toolRef = buildToolRef(route.serverName, route.downstreamToolName, toolRefSet);
    const connector = inferConnector(route.serverName, route.downstreamToolName);
    const tags = uniqueSortedStrings([...(serverConfig?.tags ?? []), connector]);
    const description = toolDef.description ?? '';
    const inputSchema = (toolDef.inputSchema ?? { type: 'object', properties: {} }) as Record<
      string,
      unknown
    >;
    const category = serverConfig?.catalog?.category ?? 'unknown';
    const lifecycle = serverConfig?.lifecycle ?? 'unknown';
    const readWrite = inferReadWrite(route.downstreamToolName);
    const aliases = uniqueSortedStrings([toolRef, route.proxyToolName, dottedAlias]);

    entries.push({
      toolRef,
      serverName: route.serverName,
      downstreamToolName: route.downstreamToolName,
      proxyToolName: route.proxyToolName,
      dottedAlias,
      aliases,
      description,
      inputSchema,
      connector,
      category,
      lifecycle,
      tags,
      searchText: `${aliases.join(' ')} ${description} ${tags.join(' ')}`.toLowerCase(),
      schemaHash: hashString(JSON.stringify(inputSchema)),
      readWrite,
      active: true
    });
  }

  entries.sort((a, b) => {
    const aliasCmp = a.dottedAlias.localeCompare(b.dottedAlias);
    if (aliasCmp !== 0) return aliasCmp;
    return a.toolRef.localeCompare(b.toolRef);
  });

  const byToolRef = new Map<string, CatalogToolEntry>();
  const byName = new Map<string, CatalogToolEntry>();

  for (const entry of entries) {
    byToolRef.set(entry.toolRef, entry);
    for (const alias of entry.aliases) {
      const normalized = alias.trim();
      if (!normalized) continue;
      const existing = byName.get(normalized);
      if (!existing) {
        byName.set(normalized, entry);
      } else if (existing.toolRef !== entry.toolRef) {
        warnings.push(
          `Name collision: ${normalized} points to ${existing.toolRef} and ${entry.toolRef}`
        );
      }
    }
  }

  return {
    catalog: {
      entries,
      byToolRef,
      byName
    },
    warnings
  };
}

export function addAliasRoutesToCatalog(proxies: ProxyCatalog, catalog: ToolCatalog): string[] {
  const warnings: string[] = [];

  for (const entry of catalog.entries) {
    const route = proxies.routes.get(entry.proxyToolName);
    if (!route) {
      warnings.push(`Missing proxy route for ${entry.proxyToolName}`);
      continue;
    }

    if (!proxies.routes.has(entry.dottedAlias)) {
      proxies.routes.set(entry.dottedAlias, route);
    }

    if (!proxies.routes.has(entry.toolRef)) {
      proxies.routes.set(entry.toolRef, route);
    }
  }

  return warnings;
}

export function resolveCatalogEntry(catalog: ToolCatalog, name: string): CatalogToolEntry | null {
  const directRef = catalog.byToolRef.get(name);
  if (directRef) return directRef;
  const byName = catalog.byName.get(name);
  if (byName) return byName;
  return null;
}

export function filterCatalogEntries(
  catalog: ToolCatalog,
  filters: {
    query?: string;
    connectors?: string[];
    servers?: string[];
    readWrite?: 'read' | 'write';
  }
): Array<{ entry: CatalogToolEntry; score: number }> {
  const queryTerms = (filters.query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const connectors = new Set((filters.connectors ?? []).map((value) => value.toLowerCase()));
  const servers = new Set((filters.servers ?? []).map((value) => value.toLowerCase()));

  const ranked: Array<{ entry: CatalogToolEntry; score: number }> = [];

  for (const entry of catalog.entries) {
    if (!entry.active) continue;

    if (connectors.size > 0 && !connectors.has(entry.connector.toLowerCase())) {
      continue;
    }

    if (servers.size > 0 && !servers.has(entry.serverName.toLowerCase())) {
      continue;
    }

    if (filters.readWrite && entry.readWrite !== filters.readWrite) {
      continue;
    }

    let score = 1;
    if (queryTerms.length > 0) {
      score = 0;
      for (const term of queryTerms) {
        if (entry.searchText.includes(term)) {
          score += 1;
        }
        if (entry.proxyToolName.toLowerCase().includes(term)) {
          score += 2;
        }
        if (entry.dottedAlias.toLowerCase().includes(term)) {
          score += 3;
        }
      }
      if (score === 0) {
        continue;
      }
    }

    ranked.push({ entry, score });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.entry.toolRef.localeCompare(b.entry.toolRef);
  });

  return ranked;
}

export async function syncToolCatalogIndex(
  db: D1Database | undefined,
  catalog: ToolCatalog,
  warnings: string[]
): Promise<void> {
  if (!db) {
    return;
  }

  const buildId = `build_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  try {
    await ensureHubIndexTables(db);
  } catch (error) {
    console.warn(
      `[hub-catalog] failed to ensure index tables: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  const startedAt = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO hub_index_builds (build_id, started_at, status, warning_count, source)
         VALUES (?, ?, 'running', ?, ?)`
      )
      .bind(buildId, startedAt, warnings.length, HUB_INDEX_SOURCE)
      .run();
  } catch (error) {
    console.warn(
      `[hub-catalog] failed to insert running build row: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const seenToolRefs = new Set<string>();

  for (const entry of catalog.entries) {
    seenToolRefs.add(entry.toolRef);

    try {
      await db
        .prepare(
          `INSERT INTO hub_tool_index (
             tool_ref,
             server_name,
             downstream_tool_name,
             proxy_tool_name,
             dotted_alias,
             description,
             input_schema_json,
             connector,
             category,
             lifecycle,
             tags_json,
             search_text,
             active,
             schema_hash,
             last_seen_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
           ON CONFLICT(tool_ref) DO UPDATE SET
             server_name = excluded.server_name,
             downstream_tool_name = excluded.downstream_tool_name,
             proxy_tool_name = excluded.proxy_tool_name,
             dotted_alias = excluded.dotted_alias,
             description = excluded.description,
             input_schema_json = excluded.input_schema_json,
             connector = excluded.connector,
             category = excluded.category,
             lifecycle = excluded.lifecycle,
             tags_json = excluded.tags_json,
             search_text = excluded.search_text,
             active = 1,
             schema_hash = excluded.schema_hash,
             last_seen_at = datetime('now')`
        )
        .bind(
          entry.toolRef,
          entry.serverName,
          entry.downstreamToolName,
          entry.proxyToolName,
          entry.dottedAlias,
          entry.description,
          JSON.stringify(entry.inputSchema),
          entry.connector,
          entry.category,
          entry.lifecycle,
          JSON.stringify(entry.tags),
          entry.searchText,
          entry.schemaHash
        )
        .run();
    } catch (error) {
      console.warn(
        `[hub-catalog] upsert failed for ${entry.toolRef}: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    for (const alias of entry.aliases) {
      try {
        await db
          .prepare(
            `INSERT INTO hub_tool_aliases (alias, tool_ref, source, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(alias) DO UPDATE SET
               tool_ref = excluded.tool_ref,
               source = excluded.source,
               updated_at = datetime('now')`
          )
          .bind(alias, entry.toolRef, alias === entry.dottedAlias ? 'generated' : 'proxy')
          .run();
      } catch (error) {
        console.warn(
          `[hub-catalog] alias upsert failed for ${alias}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  try {
    await markMissingEntriesInactive(db, seenToolRefs);
  } catch (error) {
    console.warn(
      `[hub-catalog] failed to mark missing entries inactive: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const finishedAt = new Date().toISOString();

  try {
    await db
      .prepare(
        `UPDATE hub_index_builds
         SET finished_at = ?,
             tool_count = ?,
             warning_count = ?,
             status = 'success'
         WHERE build_id = ?`
      )
      .bind(finishedAt, catalog.entries.length, warnings.length, buildId)
      .run();
  } catch (error) {
    console.warn(
      `[hub-catalog] failed to finalize build row: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function markMissingEntriesInactive(
  db: D1Database,
  seenToolRefs: Set<string>
): Promise<void> {
  if (seenToolRefs.size === 0) {
    await db.prepare(`UPDATE hub_tool_index SET active = 0, last_seen_at = datetime('now')`).run();
    return;
  }

  const refs = [...seenToolRefs];
  if (refs.length > 500) {
    // D1 has SQLite parameter limits; skip aggressive inactive sweep for very large catalogs.
    return;
  }

  const placeholders = refs.map(() => '?').join(',');
  await db
    .prepare(
      `UPDATE hub_tool_index
       SET active = 0,
           last_seen_at = datetime('now')
       WHERE tool_ref NOT IN (${placeholders})`
    )
    .bind(...refs)
    .run();
}

async function ensureHubIndexTables(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hub_tool_index (
         tool_ref TEXT PRIMARY KEY,
         server_name TEXT NOT NULL,
         downstream_tool_name TEXT NOT NULL,
         proxy_tool_name TEXT NOT NULL,
         dotted_alias TEXT NOT NULL,
         description TEXT,
         input_schema_json TEXT,
         connector TEXT,
         category TEXT,
         lifecycle TEXT,
         tags_json TEXT,
         search_text TEXT,
         active INTEGER NOT NULL DEFAULT 1,
         schema_hash TEXT,
         last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hub_tool_aliases (
         alias TEXT PRIMARY KEY,
         tool_ref TEXT NOT NULL,
         source TEXT NOT NULL DEFAULT 'generated',
         updated_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hub_index_builds (
         build_id TEXT PRIMARY KEY,
         started_at TEXT NOT NULL,
         finished_at TEXT,
         tool_count INTEGER NOT NULL DEFAULT 0,
         warning_count INTEGER NOT NULL DEFAULT 0,
         status TEXT NOT NULL,
         error_text TEXT,
         source TEXT,
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_hub_tool_index_proxy ON hub_tool_index(proxy_tool_name)`
    )
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_hub_tool_index_alias ON hub_tool_index(dotted_alias)`)
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_hub_tool_index_server ON hub_tool_index(server_name)`)
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_hub_tool_index_connector ON hub_tool_index(connector)`)
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_hub_tool_index_active ON hub_tool_index(active)`)
    .run();
}

export function buildProxyToolName(serverName: string, downstreamToolName: string): string {
  return `${serverName.replace(/[^a-zA-Z0-9_-]/g, '_')}__${downstreamToolName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export function reserveProxyName(
  baseName: string,
  routes: Map<string, unknown>,
  warnings: string[]
): string {
  if (!routes.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;
  while (routes.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }
  warnings.push(`Proxy tool name collision for "${baseName}", renamed to "${candidate}"`);
  return candidate;
}

export function sortToolsByName(tools: Tool[]): Tool[] {
  return [...tools].sort((a, b) => a.name.localeCompare(b.name));
}
