import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type RpcRequest = { jsonrpc?: unknown; id?: unknown; method?: unknown };

function error(id: unknown, code: number, message: string, status = 400) {
  return json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
  let rpc: RpcRequest;
  try {
    rpc = await request.json() as RpcRequest;
  } catch {
    return error(null, -32700, 'Parse error');
  }

  if (rpc.jsonrpc !== '2.0' || !('id' in rpc) || typeof rpc.method !== 'string') {
    return error(rpc.id, -32600, 'Invalid Request');
  }
  if (rpc.method !== 'tools/list') return error(rpc.id, -32601, 'Method not found');

  // Cloudflare's WebMCP bridge probes this optional dynamic pack. Draw's
  // browser-native tools are registered on document.modelContext instead.
  return json({ jsonrpc: '2.0', id: rpc.id, result: { tools: [] } });
};
