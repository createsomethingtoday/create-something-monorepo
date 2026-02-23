import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  normalizeCapabilityClass,
  normalizeRiskTier,
  type CapabilityClass,
  type RiskTier,
} from './policy';

export type CatalogServerConfig = {
  tags?: string[];
  description?: string;
  capabilityClass?: CapabilityClass;
  riskTier?: RiskTier;
  retryProfile?: string;
  requiredScopes?: string[];
};

export type CatalogRegistry = {
  servers: Record<string, CatalogServerConfig>;
};

export type CatalogConnectedServer = {
  name: string;
  tools: Tool[];
};

export interface CatalogEnv {
  HUB_CONTROL_DB?: D1Database;
  HUB_BROKER_DEFAULT_LIMIT?: string;
  HUB_CATALOG_TTL_SECONDS?: string;
  [key: string]: unknown;
}

export type HubToolCatalogRow = {
  toolRef: string;
  serverName: string;
  downstreamToolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  tags: string[];
  capabilityClass: CapabilityClass;
  riskTier: RiskTier;
  retryProfile: string | null;
  requiredScopes: string[];
  discoveredAt: string;
  updatedAt: string;
  enabled: boolean;
};

export type CatalogSearchInput = {
  query?: string | null;
  serverName?: string | null;
  tags?: string[];
  readWrite?: CapabilityClass | null;
  riskTier?: RiskTier | null;
  cursor?: string | null;
  limit?: number | null;
};

export type CatalogSearchResult = {
  query: string | null;
  serverName: string | null;
  tags: string[];
  readWrite: CapabilityClass | null;
  riskTier: RiskTier | null;
  total: number;
  limit: number;
  cursor: string;
  nextCursor: string | null;
  tools: HubToolCatalogRow[];
  source: 'd1' | 'runtime-fallback';
};

export type CatalogDescribeResult = {
  tools: HubToolCatalogRow[];
  missingToolRefs: string[];
  source: 'd1' | 'runtime-fallback';
};

export type CatalogRefreshResult = {
  refreshId: string;
  success: boolean;
  serverNames: string[];
  refreshedToolCount: number;
  startedAt: string;
  finishedAt: string;
  error?: string;
};

const CATALOG_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS hub_tool_catalog (
    tool_ref TEXT PRIMARY KEY,
    server_name TEXT NOT NULL,
    downstream_tool_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    input_schema_json TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    capability_class TEXT NOT NULL DEFAULT 'read',
    risk_tier TEXT NOT NULL DEFAULT 'medium',
    retry_profile TEXT,
    required_scopes_json TEXT NOT NULL,
    discovered_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hub_tool_catalog_server_name ON hub_tool_catalog(server_name)`,
  `CREATE INDEX IF NOT EXISTS idx_hub_tool_catalog_downstream_tool_name ON hub_tool_catalog(downstream_tool_name)`,
  `CREATE INDEX IF NOT EXISTS idx_hub_tool_catalog_updated_at ON hub_tool_catalog(updated_at)`,
  `CREATE TABLE IF NOT EXISTS hub_catalog_refresh_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    success INTEGER NOT NULL DEFAULT 0,
    servers_json TEXT NOT NULL,
    error TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hub_catalog_refresh_runs_started_at ON hub_catalog_refresh_runs(started_at)`,
].join(';\n');

export async function ensureCatalogSchema(env: CatalogEnv): Promise<void> {
  const db = env.HUB_CONTROL_DB;
  if (!db) return;
  await db.exec(CATALOG_SCHEMA_SQL);
}

export async function refreshCatalog(
  env: CatalogEnv,
  connected: CatalogConnectedServer[],
  registry: CatalogRegistry,
  serverFilter?: string[],
): Promise<CatalogRefreshResult> {
  const now = new Date();
  const startedAt = now.toISOString();
  const refreshId = createRefreshId();
  const selected = connected.filter((server) => {
    if (!serverFilter || serverFilter.length === 0) return true;
    return serverFilter.includes(server.name);
  });
  const serverNames = selected.map((server) => server.name).sort();

  const db = env.HUB_CONTROL_DB;
  if (!db) {
    return {
      refreshId,
      success: false,
      serverNames,
      refreshedToolCount: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: 'HUB_CONTROL_DB is not configured',
    };
  }

  await ensureCatalogSchema(env);

  await db
    .prepare(
      `INSERT INTO hub_catalog_refresh_runs (id, started_at, success, servers_json)
       VALUES (?, ?, 0, ?)`,
    )
    .bind(refreshId, startedAt, JSON.stringify(serverNames))
    .run();

  let refreshedToolCount = 0;

  try {
    if (serverNames.length > 0) {
      const disableSql = `UPDATE hub_tool_catalog SET enabled = 0, updated_at = datetime('now') WHERE server_name IN (${serverNames
        .map(() => '?')
        .join(',')})`;
      await db
        .prepare(disableSql)
        .bind(...serverNames)
        .run();
    }

    for (const server of selected) {
      const serverConfig = registry.servers[server.name] ?? {};
      const tags = dedupeStrings(serverConfig.tags ?? []);
      const capabilityClass = normalizeCapabilityClass(serverConfig.capabilityClass);
      const riskTier = normalizeRiskTier(serverConfig.riskTier);
      const retryProfile = typeof serverConfig.retryProfile === 'string' ? serverConfig.retryProfile : null;
      const requiredScopes = dedupeStrings(serverConfig.requiredScopes ?? []);

      for (const tool of server.tools) {
        const toolRef = toToolRef(server.name, tool.name);
        const description = typeof tool.description === 'string' ? tool.description : serverConfig.description ?? '';
        const inputSchema = isRecord(tool.inputSchema) ? tool.inputSchema : { type: 'object', properties: {} };
        await db
          .prepare(
            `INSERT INTO hub_tool_catalog (
              tool_ref,
              server_name,
              downstream_tool_name,
              description,
              input_schema_json,
              tags_json,
              capability_class,
              risk_tier,
              retry_profile,
              required_scopes_json,
              discovered_at,
              updated_at,
              enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
            ON CONFLICT(tool_ref) DO UPDATE SET
              server_name = excluded.server_name,
              downstream_tool_name = excluded.downstream_tool_name,
              description = excluded.description,
              input_schema_json = excluded.input_schema_json,
              tags_json = excluded.tags_json,
              capability_class = excluded.capability_class,
              risk_tier = excluded.risk_tier,
              retry_profile = excluded.retry_profile,
              required_scopes_json = excluded.required_scopes_json,
              updated_at = datetime('now'),
              enabled = 1`,
          )
          .bind(
            toolRef,
            server.name,
            tool.name,
            description,
            JSON.stringify(inputSchema),
            JSON.stringify(tags),
            capabilityClass,
            riskTier,
            retryProfile,
            JSON.stringify(requiredScopes),
          )
          .run();
        refreshedToolCount += 1;
      }
    }

    const finishedAt = new Date().toISOString();
    await db
      .prepare('UPDATE hub_catalog_refresh_runs SET success = 1, finished_at = ? WHERE id = ?')
      .bind(finishedAt, refreshId)
      .run();

    return {
      refreshId,
      success: true,
      serverNames,
      refreshedToolCount,
      startedAt,
      finishedAt,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : String(error);

    await db
      .prepare('UPDATE hub_catalog_refresh_runs SET success = 0, finished_at = ?, error = ? WHERE id = ?')
      .bind(finishedAt, message.slice(0, 2000), refreshId)
      .run();

    return {
      refreshId,
      success: false,
      serverNames,
      refreshedToolCount,
      startedAt,
      finishedAt,
      error: message,
    };
  }
}

export async function searchCatalog(
  env: CatalogEnv,
  input: CatalogSearchInput,
): Promise<CatalogSearchResult | null> {
  const db = env.HUB_CONTROL_DB;
  if (!db) {
    return null;
  }

  await ensureCatalogSchema(env);

  const query = stringOrNull(input.query);
  const serverName = stringOrNull(input.serverName);
  const tags = dedupeStrings(input.tags ?? []);
  const readWrite = input.readWrite ?? null;
  const riskTier = input.riskTier ?? null;
  const limit = resolveLimit(env, input.limit ?? undefined);
  const cursor = stringOrNull(input.cursor) ?? '0';
  const offset = safeOffset(cursor);

  const whereClauses: string[] = ['enabled = 1'];
  const binds: Array<string | number> = [];

  if (query) {
    whereClauses.push('(tool_ref LIKE ? OR server_name LIKE ? OR downstream_tool_name LIKE ? OR description LIKE ?)');
    const like = `%${query}%`;
    binds.push(like, like, like, like);
  }

  if (serverName) {
    whereClauses.push('server_name = ?');
    binds.push(serverName);
  }

  if (readWrite) {
    whereClauses.push('capability_class = ?');
    binds.push(readWrite);
  }

  if (riskTier) {
    whereClauses.push('risk_tier = ?');
    binds.push(riskTier);
  }

  for (const tag of tags) {
    whereClauses.push('tags_json LIKE ?');
    binds.push(`%\"${tag}\"%`);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM hub_tool_catalog WHERE ${whereSql}`)
    .bind(...binds)
    .first<{ total: number | string | null }>();

  const total = Number(countRow?.total ?? 0) || 0;

  const rows = await db
    .prepare(
      `SELECT
        tool_ref,
        server_name,
        downstream_tool_name,
        description,
        input_schema_json,
        tags_json,
        capability_class,
        risk_tier,
        retry_profile,
        required_scopes_json,
        discovered_at,
        updated_at,
        enabled
      FROM hub_tool_catalog
      WHERE ${whereSql}
      ORDER BY server_name ASC, downstream_tool_name ASC
      LIMIT ? OFFSET ?`,
    )
    .bind(...binds, limit, offset)
    .all<RawCatalogRow>();

  const tools = (rows.results ?? []).map(toCatalogRow);
  const nextCursor = offset + tools.length < total ? String(offset + tools.length) : null;

  return {
    query,
    serverName,
    tags,
    readWrite,
    riskTier,
    total,
    limit,
    cursor,
    nextCursor,
    tools,
    source: 'd1',
  };
}

export async function describeCatalog(
  env: CatalogEnv,
  toolRefs: string[],
): Promise<CatalogDescribeResult | null> {
  const db = env.HUB_CONTROL_DB;
  if (!db) {
    return null;
  }

  await ensureCatalogSchema(env);

  const cleanedRefs = dedupeStrings(toolRefs.map((toolRef) => toolRef.trim()).filter((toolRef) => toolRef.length > 0));
  if (cleanedRefs.length === 0) {
    return {
      tools: [],
      missingToolRefs: [],
      source: 'd1',
    };
  }

  const placeholders = cleanedRefs.map(() => '?').join(',');
  const rows = await db
    .prepare(
      `SELECT
        tool_ref,
        server_name,
        downstream_tool_name,
        description,
        input_schema_json,
        tags_json,
        capability_class,
        risk_tier,
        retry_profile,
        required_scopes_json,
        discovered_at,
        updated_at,
        enabled
      FROM hub_tool_catalog
      WHERE tool_ref IN (${placeholders})`,
    )
    .bind(...cleanedRefs)
    .all<RawCatalogRow>();

  const tools = (rows.results ?? []).map(toCatalogRow);
  const found = new Set(tools.map((tool) => tool.toolRef));
  const missingToolRefs = cleanedRefs.filter((toolRef) => !found.has(toolRef));

  return {
    tools,
    missingToolRefs,
    source: 'd1',
  };
}

export async function getCatalogTool(
  env: CatalogEnv,
  toolRef: string,
): Promise<HubToolCatalogRow | null> {
  const db = env.HUB_CONTROL_DB;
  if (!db) return null;

  await ensureCatalogSchema(env);

  const row = await db
    .prepare(
      `SELECT
        tool_ref,
        server_name,
        downstream_tool_name,
        description,
        input_schema_json,
        tags_json,
        capability_class,
        risk_tier,
        retry_profile,
        required_scopes_json,
        discovered_at,
        updated_at,
        enabled
      FROM hub_tool_catalog
      WHERE tool_ref = ?
      LIMIT 1`,
    )
    .bind(toolRef)
    .first<RawCatalogRow>();

  return row ? toCatalogRow(row) : null;
}

export async function getCatalogLastRefreshAt(env: CatalogEnv): Promise<string | null> {
  const db = env.HUB_CONTROL_DB;
  if (!db) return null;

  await ensureCatalogSchema(env);

  const row = await db
    .prepare(
      `SELECT finished_at
       FROM hub_catalog_refresh_runs
       WHERE success = 1
       ORDER BY finished_at DESC
       LIMIT 1`,
    )
    .first<{ finished_at: string | null }>();

  return typeof row?.finished_at === 'string' ? row.finished_at : null;
}

export function toToolRef(serverName: string, downstreamToolName: string): string {
  return `${serverName}::${downstreamToolName}`;
}

export function parseToolRef(toolRef: string): { serverName: string; downstreamToolName: string } | null {
  const separatorIndex = toolRef.indexOf('::');
  if (separatorIndex <= 0 || separatorIndex >= toolRef.length - 2) {
    return null;
  }

  const serverName = toolRef.slice(0, separatorIndex).trim();
  const downstreamToolName = toolRef.slice(separatorIndex + 2).trim();
  if (!serverName || !downstreamToolName) return null;

  return {
    serverName,
    downstreamToolName,
  };
}

function resolveLimit(env: CatalogEnv, requested?: number): number {
  const defaultLimitRaw = typeof env.HUB_BROKER_DEFAULT_LIMIT === 'string' ? env.HUB_BROKER_DEFAULT_LIMIT : '';
  const defaultLimitParsed = Number.parseInt(defaultLimitRaw, 10);
  const defaultLimit = Number.isFinite(defaultLimitParsed) ? Math.max(1, Math.min(defaultLimitParsed, 100)) : 25;

  if (typeof requested !== 'number' || !Number.isFinite(requested)) {
    return defaultLimit;
  }

  return Math.max(1, Math.min(Math.floor(requested), 100));
}

function safeOffset(cursor: string): number {
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

type RawCatalogRow = {
  tool_ref: string;
  server_name: string;
  downstream_tool_name: string;
  description: string;
  input_schema_json: string;
  tags_json: string;
  capability_class: string;
  risk_tier: string;
  retry_profile: string | null;
  required_scopes_json: string;
  discovered_at: string;
  updated_at: string;
  enabled: number;
};

function toCatalogRow(row: RawCatalogRow): HubToolCatalogRow {
  return {
    toolRef: row.tool_ref,
    serverName: row.server_name,
    downstreamToolName: row.downstream_tool_name,
    description: row.description,
    inputSchema: parseJsonObject(row.input_schema_json),
    tags: parseJsonStringArray(row.tags_json),
    capabilityClass: normalizeCapabilityClass(row.capability_class),
    riskTier: normalizeRiskTier(row.risk_tier),
    retryProfile: typeof row.retry_profile === 'string' && row.retry_profile.length > 0 ? row.retry_profile : null,
    requiredScopes: parseJsonStringArray(row.required_scopes_json),
    discoveredAt: row.discovered_at,
    updatedAt: row.updated_at,
    enabled: row.enabled === 1,
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return { type: 'object', properties: {} };
}

function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return dedupeStrings(parsed.filter((entry): entry is string => typeof entry === 'string'));
    }
  } catch {
    // fall through
  }
  return [];
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createRefreshId(): string {
  return `refresh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
