// A synthetic stdio JSON-RPC fixture, not an MCP conformance suite.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
const server = spawn(process.execPath, ['--input-type=module', '-e', `
  import { createInterface } from 'node:readline';
  createInterface({ input: process.stdin }).on('line', line => {
    const r = JSON.parse(line);
    if (!('id' in r)) return;
    let result;
    if (r.method === 'initialize') result = { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'owned-fixture', version: '1.0.0' } };
    else if (r.method === 'tools/list') result = { tools: [{ name: 'echo', description: 'Echo a string', inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } }] };
    else if (r.method === 'tools/call' && r.params.name === 'echo' && typeof r.params.arguments?.value === 'string') result = { content: [{ type: 'text', text: r.params.arguments.value }] };
    else { console.log(JSON.stringify({ jsonrpc: '2.0', id: r.id, error: { code: -32602, message: 'Invalid tool or arguments' } })); return; }
    console.log(JSON.stringify({ jsonrpc: '2.0', id: r.id, result }));
  });
`], { stdio: ['pipe', 'pipe', 'inherit'] });
const replies = [];
createInterface({ input: server.stdout }).on('line', line => replies.push(JSON.parse(line)));
for (const request of [
  { id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'fixture-client', version: '1.0.0' } } },
  { method: 'notifications/initialized' },
  { id: 2, method: 'tools/list' },
  { id: 3, method: 'tools/call', params: { name: 'echo', arguments: { value: 'expected' } } },
  { id: 4, method: 'tools/call', params: { name: 'delete_everything', arguments: {} } },
  { id: 5, method: 'tools/call', params: { name: 'echo', arguments: { value: 4 } } },
]) server.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...request }) + '\n');
server.stdin.end();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.once('close', code => code === 0 ? resolve() : reject(new Error(`server exit ${code}`)));
});
assert.equal(replies.length, 5);
assert.equal(replies[0].result.protocolVersion, '2025-11-25');
assert.equal(replies[1].result.tools[0].name, 'echo');
assert.equal(replies[2].result.content[0].text, 'expected');
assert.equal(replies[3].error.code, -32602);
assert.equal(replies[4].error.code, -32602);
console.log('mcp-fixture:passed');
