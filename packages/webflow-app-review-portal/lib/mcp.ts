import { z } from 'zod';
import { BundleError } from './bundle-contract';
import { providerFetch } from './provider';

export const MCP_URL = 'https://app-review-mcp-access.wf.app/mcp';
export const OAUTH_ISSUER = 'https://webflow.cloudflareaccess.com';
export type Tool = { name: string; description?: string; inputSchema: Record<string, unknown> };
export const identitySchema = z.object({
  accountId: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  authMode: z.literal('cloudflare-access')
});
export type Identity = z.infer<typeof identitySchema>;
export class McpToolFailure extends BundleError {
  constructor(
    message: string,
    public providerCode: string
  ) {
    super('MCP_REJECTED', message, 409);
  }
}

export async function decodeRpc(response: Response, id: number) {
  const body = await response.text();
  if (body.length > 4_000_000)
    throw new BundleError(
      'MCP_RESPONSE_TOO_LARGE',
      'The review response is too large. Narrow the request.',
      502
    );
  const messages = response.headers.get('content-type')?.includes('text/event-stream')
    ? body.split(/\r?\n\r?\n/).flatMap((block) => {
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) return [];
        try {
          return [JSON.parse(data)];
        } catch {
          return [];
        }
      })
    : [JSON.parse(body)];
  const message = messages.find((message) => message.id === id);
  if (!message || message.error)
    throw new BundleError('MCP_ERROR', 'The App Review MCP could not complete the request.', 502);
  return message.result;
}
export function toolData(result: {
  isError?: boolean;
  structuredContent?: unknown;
  content?: { type: string; text?: string }[];
}): any {
  const data =
    result.structuredContent ??
    JSON.parse(result.content?.find((item) => item.type === 'text')?.text || '{}');
  if (result.isError || data?.ok === false) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message.slice(0, 1000)
        : 'The App Review MCP rejected this request.';
    throw new McpToolFailure(
      message,
      typeof data?.error?.code === 'string' ? data.error.code : 'UNKNOWN_ERROR'
    );
  }
  return data?.data ?? data;
}
export async function withMcp<T>(
  token: string,
  run: (rpc: (method: string, params?: unknown) => Promise<any>) => Promise<T>,
  fetcher = fetch
): Promise<T> {
  let session: string | null = null,
    nextId = 0;
  const headers = () => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': '2025-03-26',
    ...(session ? { 'Mcp-Session-Id': session } : {})
  });
  const rpc = async (method: string, params: unknown = {}) => {
    const id = ++nextId;
    const response = await providerFetch(
      'App Review MCP',
      MCP_URL,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
      },
      fetcher
    );
    session = response.headers.get('Mcp-Session-Id') || session;
    return decodeRpc(response, id);
  };
  try {
    await rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'webflow-app-review-portal', version: '0.1.0' }
    });
    await providerFetch(
      'App Review MCP',
      MCP_URL,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
      },
      fetcher
    );
    return await run(rpc);
  } finally {
    if (session)
      await fetcher(MCP_URL, {
        method: 'DELETE',
        headers: headers(),
        redirect: 'error',
        signal: AbortSignal.timeout(5000)
      }).catch(() => undefined);
  }
}
export async function catalog(
  rpc: (method: string, params?: unknown) => Promise<any>
): Promise<Tool[]> {
  const tools: Tool[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const data = await rpc('tools/list', cursor ? { cursor } : {});
    tools.push(...data.tools);
    cursor = data.nextCursor;
    if (!cursor) return tools;
  }
  throw new BundleError('MCP_CATALOG_INCOMPLETE', 'Could not load your complete permissions.', 502);
}
