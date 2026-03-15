import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export type McpToolInfo = {
  name: string;
  description?: string;
};

export type McpIntrospection = {
  url: string;
  tools: McpToolInfo[];
  resources: Array<{ uri: string; name?: string; description?: string; mimeType?: string }>;
  prompts: Array<{ name: string; description?: string }>;
};

export type McpIntrospectionResult =
  | { ok: true; value: McpIntrospection }
  | { ok: false; error: string; url: string };

type CacheEntry = { at: number; value: McpIntrospectionResult };

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

function hasMimeType(x: unknown): x is { mimeType?: string } {
  return typeof x === 'object' && x !== null && 'mimeType' in x;
}

export async function introspectMcpServer(
  url: string,
  options?: {
    headers?: Record<string, string>;
    cacheTtlMs?: number;
  },
): Promise<McpIntrospectionResult> {
  const ttl = options?.cacheTtlMs ?? CACHE_TTL_MS;
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < ttl) return cached.value;

  const result = await introspectMcpServerUncached(url, options?.headers);
  cache.set(url, { at: Date.now(), value: result });
  return result;
}

async function introspectMcpServerUncached(
  url: string,
  headers?: Record<string, string>,
): Promise<McpIntrospectionResult> {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: headers ? { headers } : undefined,
  });

  const client = new Client(
    { name: 'interaction-atlas-mapper', version: '0.1.0' },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();

    return {
      ok: true,
      value: {
        url,
        tools: tools.tools.map((t) => ({ name: t.name, description: t.description })),
        resources: resources.resources.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: hasMimeType(r) ? r.mimeType : undefined,
        })),
        prompts: prompts.prompts.map((p) => ({ name: p.name, description: p.description })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

