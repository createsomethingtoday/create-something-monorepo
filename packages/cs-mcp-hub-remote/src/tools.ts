import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'hub_status',
    description: 'Show active downstream MCP servers, proxy tool count, and warning state.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_registry',
    description: 'List all servers and bundles known by this remote hub registry.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_proxy_tools',
    description: '[Deprecated] List legacy proxy tool names currently available from connected downstream MCPs.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_search_proxy_tools',
    description: '[Deprecated] Search legacy proxy tools with optional server filter and cursor pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        serverName: { type: 'string' },
        cursor: { type: 'string' },
        limit: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_tools_search',
    description: 'Brokered catalog search over downstream tools with policy metadata filters.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        serverName: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        readWrite: { type: 'string', enum: ['read', 'write', 'mixed'] },
        riskTier: { type: 'string', enum: ['low', 'medium', 'high'] },
        cursor: { type: 'string' },
        limit: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_tools_describe',
    description: 'Describe one or more broker catalog tools using toolRefs in "server::tool" format.',
    inputSchema: {
      type: 'object',
      properties: {
        toolRefs: { type: 'array', items: { type: 'string' }, minItems: 1 },
      },
      required: ['toolRefs'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_tools_invoke',
    description: 'Invoke a brokered downstream tool by toolRef with centralized policy and retry controls.',
    inputSchema: {
      type: 'object',
      properties: {
        toolRef: { type: 'string' },
        args: { type: 'object', additionalProperties: true },
        idempotencyKey: { type: 'string' },
      },
      required: ['toolRef'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_refresh_catalog',
    description: 'Refresh brokered catalog metadata from connected downstream servers.',
    inputSchema: {
      type: 'object',
      properties: {
        serverNames: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_refresh_connections',
    description: 'Force-refresh downstream MCP connections and proxy tool catalog.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_update_state',
    description:
      'Enable/disable bundles or servers in remote hub state (persisted in HUB_STATE_KV) and refresh connections.',
    inputSchema: {
      type: 'object',
      properties: {
        enableBundles: { type: 'array', items: { type: 'string' } },
        disableBundles: { type: 'array', items: { type: 'string' } },
        enableServers: { type: 'array', items: { type: 'string' } },
        disableServers: { type: 'array', items: { type: 'string' } },
        writeCodexConfig: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_trace_lookup',
    description: 'Lookup hub and downstream telemetry records by correlation ID.',
    inputSchema: {
      type: 'object',
      properties: {
        correlationId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['correlationId'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_policy_status',
    description: 'Show active proxy policy settings (rate limits + quotas + auth + catalog) for this hub runtime.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];
