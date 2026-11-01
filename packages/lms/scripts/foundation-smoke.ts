import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = process.argv.find(arg => arg.startsWith('http')) ?? 'https://learn.createsomething.space';
const client = new Client({ name: 'create-something-foundation-smoke', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(new URL('/api/foundation/mcp', base));
const report: Record<string, unknown> = { base, client: 'MCP TypeScript SDK StreamableHTTPClientTransport', checkedAt: new Date().toISOString() };

async function http(path: string, status = 200, init?: RequestInit) {
  const response = await fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, status, `${path}: expected ${status}, got ${response.status}: ${await response.clone().text()}`);
  return response;
}

await client.connect(transport);
try {
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(x => x.name).sort(), ['get_foundation_lesson', 'search_foundation']);
  assert.ok(tools.tools.every(x => x.annotations?.readOnlyHint === true));
  report.tools = tools.tools.map(x => x.name);
  const manifest = await (await http('/api/foundation')).json();
  assert.equal(manifest.lessons, 540); assert.equal(manifest.referenceLessons, 523);
  report.catalogRevision = manifest.catalogRevision;
  const queries = ['agent loop', 'memory', 'tools', 'evaluation', 'permissions approvals'];
  const results: unknown[] = [];
  for (const query of queries) {
    const called = await client.callTool({ name: 'search_foundation', arguments: { query, limit: 3 } });
    assert.ok(!called.isError);
    const search = called.structuredContent as { results: { id: string }[] };
    assert.ok(search.results.length > 0 && search.results.length <= 3);
    const fromHttp = await (await http(`/api/foundation/search?query=${encodeURIComponent(query)}&limit=3`)).json();
    assert.deepEqual(fromHttp, search);
    results.push({ query, ids: search.results.map(x => x.id) });
  }
  report.search = results;
  const id = 'original/governed-agent-engineering/govern-the-boundary';
  const called = await client.callTool({ name: 'get_foundation_lesson', arguments: { id, maxChars: 500 } });
  assert.ok(!called.isError);
  const lesson = called.structuredContent as { content: string; sections: { id: string }[]; pagination: { next: Record<string, unknown> | null }; policy: string };
  assert.ok(Array.from(lesson.content).length <= 500);
  assert.ok(lesson.policy.includes('client policy'));
  assert.deepEqual(await (await http(`/api/foundation/lesson?id=${id}&maxChars=500`)).json(), lesson);
  const section = await client.callTool({ name: 'get_foundation_lesson', arguments: { id, section: lesson.sections[1].id, maxChars: 500 } });
  assert.ok(!section.isError);
  if (lesson.pagination.next) assert.ok(!(await client.callTool({ name: 'get_foundation_lesson', arguments: lesson.pagination.next })).isError);
  const empty = await (await http('/api/foundation/search?query=zxqvnonexistenttopic')).json();
  assert.deepEqual(empty.results, []);
  assert.equal((await client.callTool({ name: 'learn_complete', arguments: {} })).isError, true);
  assert.equal((await client.callTool({ name: 'get_foundation_lesson', arguments: { id: '../../secrets' } })).isError, true);
  await http('/api/foundation/lesson?id=missing', 404);
  await http('/api/foundation/search?query=memory&limit=11', 400);
  await http('/api/foundation/search?query=memory', 405, { method: 'POST' });
  await http('/api/foundation/mcp', 405, { method: 'DELETE' });
  await http('/api/foundation/mcp', 403, { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{}' });
  await http('/api/foundation/mcp', 415, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: new URL(base).origin }, body: '{}' });
  await http('/api/foundation/mcp', 400, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'invalid' });
  await http('/api/foundation/mcp', 413, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(8193) });
  await http('/api/foundation/mcp', 400, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]) });
  const anonymous = await http('/api/foundation/search?query=memory', 200, { headers: { Authorization: 'Bearer invalid', Cookie: 'cs_access_token=expired; cs_refresh_token=invalid' } });
  assert.equal(anonymous.headers.get('set-cookie'), null);
  const cors = await http('/api/foundation/search', 204, { method: 'OPTIONS' });
  assert.equal(cors.headers.get('access-control-allow-origin'), '*');
  report.contract = 'PASS: SDK/HTTP parity, section/continuation, bounded content, no-match, invalid/write requests, origin, MIME, anonymous cookie isolation, CORS';
} finally { await client.close(); }

if (process.argv.includes('--rate-limit')) {
  // Fixed bounded burst against this public read-only endpoint; no retries or bypass identities.
  const responses: Response[] = [];
  for (let i = 0; i < 14; i++) responses.push(...await Promise.all(Array.from({ length: 5 }, () => fetch(new URL('/api/foundation/search?query=memory&limit=1', base), { signal: AbortSignal.timeout(20000) }))));
  assert.ok(responses.every(r => r.status === 200 || r.status === 429));
  const limited = responses.find(r => r.status === 429);
  assert.ok(limited, 'Expected real request control to reject the bounded burst.');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  report.requestControl = { status: 429, retryAfter: limited.headers.get('retry-after'), attempted: responses.length, limited: responses.filter(r => r.status === 429).length };
}
console.log(JSON.stringify(report, null, 2));
