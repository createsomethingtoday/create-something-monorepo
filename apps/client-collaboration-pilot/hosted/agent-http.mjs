import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { hostedProposalMcp } from './mcp.mjs';
// Auth and exact resource audience are enforced before this adapter. Stateless
// JSON responses only: no SSE keepalive, polling, server-side sessions or jobs.
export async function proposalHttp(request, taskTools) {
  if (request.method !== 'POST' || !request.headers.get('content-type')?.startsWith('application/json'))
    return new Response('Request rejected', { status: 405 });
  const reader = request.body?.getReader();
  if (!reader) return new Response('Body required', { status: 400 });
  const decoder = new TextDecoder();
  let raw = '', size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); return new Response('Body too large', { status: 413 }); }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  let parsedBody;
  try { parsedBody = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = hostedProposalMcp(taskTools);
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request, { parsedBody });
    // Materialize bounded JSON before closing the transport; SDK output is a
    // single bounded context/proposal response, never an indefinite event stream.
    const body = await response.text();
    return new Response(body || null, { status: response.status, headers: { ...Object.fromEntries(response.headers), 'cache-control': 'no-store' } });
  } finally { await server.close(); }
}
