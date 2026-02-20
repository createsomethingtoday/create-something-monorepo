import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import { filterCatalogEntries, resolveCatalogEntry } from './catalog.js';
import { paginateItems, decodeOffsetCursor } from './pagination.js';
import { enforcePolicyAndQuota } from './policy.js';
import type { DiscoveryMode, Env, HubRuntime, InvocationTrace } from './types.js';
import { HubError } from './types.js';
import { asRecord } from './utils.js';

export const BROKER_TOOLS: Tool[] = [
  {
    name: 'hub_tools_search',
    description: 'Search the hub tool index and return a small shortlist for a task.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        connectors: { type: 'array', items: { type: 'string' } },
        servers: { type: 'array', items: { type: 'string' } },
        read_write: { type: 'string', enum: ['read', 'write'] },
        limit: { type: 'number' },
        cursor: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'hub_tools_describe',
    description: 'Describe selected tools from refs/names and return schemas and routing metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        toolRefs: { type: 'array', items: { type: 'string' } },
        names: { type: 'array', items: { type: 'string' } },
        includeSchema: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'hub_tools_invoke',
    description: 'Invoke a tool by toolRef/proxy/alias with policy and quota checks.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        arguments: { type: 'object' },
        idempotencyKey: { type: 'string' }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  {
    name: 'hub_tools_refresh_index',
    description: 'Force refresh runtime + rebuild tool catalog index.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

export function toolsForDiscoveryMode(
  managementTools: Tool[],
  runtime: HubRuntime,
  mode: DiscoveryMode
): Tool[] {
  if (mode === 'broker') {
    return [...managementTools, ...BROKER_TOOLS];
  }

  return [...managementTools, ...BROKER_TOOLS, ...runtime.proxies.toolDefinitions];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asLimit(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function searchTools(
  args: Record<string, unknown>,
  runtime: HubRuntime
): Record<string, unknown> {
  const query = asOptionalString(args.query);
  const connectors = asStringArray(args.connectors);
  const servers = asStringArray(args.servers);
  const readWrite = asOptionalString(args.read_write);
  const cursor = asOptionalString(args.cursor);
  const limit = asLimit(args.limit, 20, 1, 100);

  if (readWrite && readWrite !== 'read' && readWrite !== 'write') {
    throw new HubError('HUB_INVALID_CURSOR', 'Invalid read_write filter; expected read or write');
  }

  const ranked = filterCatalogEntries(runtime.catalog, {
    query,
    connectors,
    servers,
    readWrite: readWrite as 'read' | 'write' | undefined
  });

  const offset = decodeOffsetCursor(cursor);
  const paged = paginateItems(ranked, offset, limit);

  return {
    query: query ?? '',
    filters: {
      connectors,
      servers,
      read_write: readWrite ?? null
    },
    total: ranked.length,
    results: paged.items.map((row) => ({
      toolRef: row.entry.toolRef,
      proxyName: row.entry.proxyToolName,
      dottedAlias: row.entry.dottedAlias,
      description: row.entry.description,
      server: row.entry.serverName,
      connector: row.entry.connector,
      readWrite: row.entry.readWrite,
      score: row.score
    })),
    nextCursor: paged.nextCursor ?? null
  };
}

export function describeTools(
  args: Record<string, unknown>,
  runtime: HubRuntime
): Record<string, unknown> {
  const toolRefs = asStringArray(args.toolRefs);
  const names = asStringArray(args.names);
  const includeSchema = args.includeSchema === undefined ? true : Boolean(args.includeSchema);

  const requested = [...new Set([...toolRefs, ...names])];
  const found = [] as Array<Record<string, unknown>>;
  const notFound = [] as string[];

  for (const requestName of requested) {
    const entry = resolveCatalogEntry(runtime.catalog, requestName);
    if (!entry) {
      notFound.push(requestName);
      continue;
    }

    found.push({
      toolRef: entry.toolRef,
      proxyName: entry.proxyToolName,
      dottedAlias: entry.dottedAlias,
      server: entry.serverName,
      downstreamTool: entry.downstreamToolName,
      connector: entry.connector,
      description: entry.description,
      readWrite: entry.readWrite,
      aliases: entry.aliases,
      ...(includeSchema ? { inputSchema: entry.inputSchema } : {})
    });
  }

  return {
    requested,
    found,
    notFound
  };
}

export async function invokeToolByCatalogName(
  args: Record<string, unknown>,
  runtime: HubRuntime,
  env: Env,
  trace: InvocationTrace,
  tenantId: string
): Promise<Record<string, unknown>> {
  const name = asOptionalString(args.name);
  if (!name) {
    throw new HubError('HUB_TOOL_NOT_FOUND', 'hub_tools_invoke requires a name');
  }

  const entry = resolveCatalogEntry(runtime.catalog, name);
  if (!entry) {
    throw new HubError('HUB_TOOL_NOT_FOUND', `Unknown tool ${name}`, { name });
  }

  const route = runtime.proxies.routes.get(entry.proxyToolName);
  if (!route) {
    throw new HubError('HUB_TOOL_NOT_FOUND', `Route not found for ${entry.proxyToolName}`, {
      name,
      toolRef: entry.toolRef
    });
  }

  await enforcePolicyAndQuota(env, {
    tenantId,
    toolRef: entry.toolRef,
    serverName: entry.serverName,
    connector: entry.connector,
    readWrite: entry.readWrite
  });

  const invokeArgsRecord = asRecord(args.arguments);
  const invokeArgs = invokeArgsRecord ?? {};

  const result = await route.call(invokeArgs, trace);
  const isError = asRecord(result)?.isError === true;

  return {
    resolvedName: name,
    toolRef: entry.toolRef,
    route: {
      server: route.serverName,
      downstreamTool: route.downstreamToolName,
      proxyName: route.proxyToolName,
      dottedAlias: entry.dottedAlias
    },
    idempotencyKey: asOptionalString(args.idempotencyKey) ?? null,
    success: !isError,
    result
  };
}
