import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createCodexAdapter, JsonLineProcess, ProviderResponseError, type AppServer } from '../src/codex.ts';

// Required local MCP contract; context search is intentionally optional.
const requiredTools = ['gigi_workspace_get', 'gigi_schema_describe', 'gigi_records_list', 'gigi_records_get', 'gigi_gigs_summary', 'gigi_history_list', 'gigi_records_save'];
const toolCatalog = () => requiredTools.map(name => ({ name, description: name, inputSchema: { type: 'object' } }));

class FakeServer implements AppServer {
  calls: Array<{ method: string; params: any }> = [];
  events: Array<(message: any) => void> = [];
  account: any = { account: { type: 'chatgpt', planType: 'plus' } };
  thread: any = { id: 'thread-1', status: { type: 'idle' }, turns: [] };
  async request(method: string, params: any): Promise<any> {
    this.calls.push({ method, params });
    if (method === 'account/read') return this.account;
    if (method === 'thread/start') return { thread: this.thread };
    if (method === 'thread/resume' || method === 'thread/read') return { thread: this.thread };
    if (method === 'thread/turns/list') { const turns = this.thread.turns.slice().reverse(); const offset = Number(params.cursor ?? 0); return { data: turns.slice(offset, offset + params.limit), nextCursor: offset + params.limit < turns.length ? String(offset + params.limit) : null }; }
    if (method === 'plugin/installed') return { marketplaces: [{ plugins: [{ id: 'example-plugin', installed: true }] }] };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    if (method === 'turn/interrupt') return {};
    throw new Error(method);
  }
  onMessage(handler: (message: any) => void): () => void { this.events.push(handler); return () => { this.events = this.events.filter(x => x !== handler); }; }
  reply(_id: string | number, _result: unknown): void {}
}

async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), 'gigi-codex-test-'));
  const server = new FakeServer();
  const mcp = new FakeServer();
  mcp.request = async (method, params) => {
    if (method === 'tools/list') return { tools: toolCatalog() };
    if (method === 'tools/call' && params.name === 'gigi_workspace_get') return { content: [{ type: 'text', text: JSON.stringify({ id: params.arguments.workspaceId }) }] };
    if (method === 'tools/call' && params.name === 'gigi_records_get') return { structuredContent: { id: params.arguments.id, title: 'Task', fields: {}, source: {} } };
    return { content: [{ type: 'text', text: '{}'}] };
  };
  const adapter = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  return { adapter, server, mcp, dataDir };
}

test('rejects API key auth and never starts a thread', async () => {
  const { adapter, server } = await setup();
  server.account = { account: { type: 'apiKey' } };
  assert.deepEqual(await adapter.status(), { provider: 'codex', available: true, authenticated: false, reason: 'chatgpt_auth_required' });
  await assert.rejects(adapter.start({ workspaceId: 'w', message: 'hello' }), /chatgpt_auth_required/);
  assert.equal(server.calls.some(x => x.method === 'thread/start'), false);
});

test('start without a message persists an idle session without a phantom Codex thread', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', record: { entity: 'tasks', id: 'r', title: 'Task' } });
  assert.equal(server.calls.some(x => x.method === 'thread/start'), false);
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  assert.deepEqual(await restarted.read({ workspaceId: 'w', sessionId }), { sessionId, messages: [], state: 'idle', approvals: [], recordLinks: [{ entity: 'tasks', id: 'r', title: 'Task' }] });
  await restarted.send({ workspaceId: 'w', sessionId, message: 'Read task' });
  const start = server.calls.find(x => x.method === 'thread/start')!.params;
  assert.match(start.baseInstructions, /entity "tasks" with id "r"/);
});

test('rejects a workspace that the owned GiGi profile does not contain', async () => {
  const { adapter, server, mcp } = await setup();
  mcp.request = async method => method === 'tools/list' ? { tools: toolCatalog() } : { content: [{ type: 'text', text: '{"id":"foreign"}' }] };
  await assert.rejects(adapter.start({ workspaceId: 'w' }), /workspace_not_found/);
  assert.equal(server.calls.some(x => x.method === 'thread/start'), false);
});

test('starts isolated persistent session and resumes by owned thread id', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello', record: { entity: 'tasks', id: 'r' } });
  const start = server.calls.find(x => x.method === 'thread/start')!.params;
  assert.equal(start.sandbox, 'read-only');
  assert.equal(start.approvalsReviewer, 'user');
  assert.match(start.baseInstructions, /call gigi_records_save with its id/);
  assert.match(start.baseInstructions, /makes no write until the user approves/);
  assert.deepEqual(start.config.mcp_servers, {});
  assert.equal(start.dynamicTools.length > 0, true);
  assert.equal(start.cwd.startsWith(dataDir), true);
  assert.equal((await readFile(join(dataDir, 'codex-chat', 'sessions.jsonl'), 'utf8')).includes('thread-1'), true);
  const same = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  assert.equal((await same.list({ workspaceId: 'w' })).sessions[0]?.sessionId, sessionId);
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }];
  await same.read({ workspaceId: 'w', sessionId });
  await same.send({ workspaceId: 'w', sessionId, message: 'again' });
  assert.equal(server.calls.some(x => x.method === 'thread/resume' && x.params.threadId === 'thread-1'), true);
  assert.equal(server.calls.some(x => x.method === 'thread/turns/list' && x.params.limit === 1), true);
  await assert.rejects(same.read({ workspaceId: 'other', sessionId }), /session_not_found/);
});

test('async server request handler failure produces a safe denial', async () => {
  const childCode = `process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:9,method:'item/tool/call',params:{}})+'\\n');let b='';process.stdin.on('data',c=>{b+=c;for(;;){const n=b.indexOf('\\n');if(n<0)break;const line=b.slice(0,n);b=b.slice(n+1);const m=JSON.parse(line);if(m.id===9&&m.result)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,result:m.result})+'\\n')}});`;
  const processClient = new JsonLineProcess(process.execPath, ['-e', childCode], process.env);
  processClient.onMessage(async () => { throw new Error('ledger unavailable'); });
  try {
    const result = await processClient.request('ping', {});
    assert.equal(result.success, false);
    assert.match(result.contentItems[0].text, /no write was retried/);
  } finally { await processClient.close(); }
});

test('dead provider pipe rejects requests without an uncaught stream error', async () => {
  const processClient = new JsonLineProcess(process.execPath, ['-e', 'process.exit(0)'], process.env);
  await new Promise(resolve => setTimeout(resolve, 50));
  await assert.rejects(processClient.request('ping', {}));
  await assert.rejects(processClient.reply(99, {}));
  await processClient.close();
});

test('surfaces GiGi write approval and denies shell approval', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  const replies: unknown[] = [];
  server.reply = (id, value) => replies.push({ id, value });
  server.events.forEach(fn => fn({ id: 43, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', command: 'echo hi', reason: 'needs approval' } }));
  assert.deepEqual(replies, [{ id: 43, value: { decision: 'decline' } }]);
  server.events.forEach(fn => fn({ id: 44, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Edit' } } }));
  const read = await adapter.read({ workspaceId: 'w', sessionId });
  assert.equal(read.state, 'approval');
  assert.equal(read.approvals.length, 1);
  assert.equal(replies.length, 1);
  await adapter.approve({ workspaceId: 'w', sessionId, approvalId: read.approvals[0].id, decision: 'reject' });
  assert.equal(replies.length, 2);
});

test('embedded chat denies record creates before approval', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  const replies: unknown[] = []; server.reply = (id, value) => { replies.push({ id, value }); };
  await Promise.all(server.events.map(fn => fn({ id: 61, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', title: 'New' } } }) as unknown as Promise<void>));
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).approvals.length, 0);
  assert.match(JSON.stringify(replies), /existing record id/);
});

test('oversized GiGi edit is denied before an incomplete approval can appear', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  const replies: unknown[] = []; server.reply = (id, value) => { replies.push({ id, value }); };
  await Promise.all(server.events.map(fn => fn({ id: 62, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Edit', fields: { note: 'x'.repeat(40_000) } } } }) as unknown as Promise<void>));
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).approvals.length, 0);
  assert.match(JSON.stringify(replies), /too large for review/);
});

test('interruption cleans up turn and unknown outcome is not retried', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  await adapter.cancel({ workspaceId: 'w', sessionId });
  assert.equal(server.calls.filter(x => x.method === 'turn/interrupt').length, 1);
  const turnCalls = server.calls.filter(x => x.method === 'turn/start').length;
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'too soon' }), /turn_in_progress/);
  server.thread.turns = [{ id: 'turn-1', status: 'interrupted', items: [] }];
  await adapter.read({ workspaceId: 'w', sessionId });
  await adapter.send({ workspaceId: 'w', sessionId, message: 'continue' });
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, turnCalls + 1);
});

test('uncertain GiGi write is fenced before provider call and survives restart', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  const replies: unknown[] = []; server.reply = (id, value) => { replies.push({ id, value }); };
  let saveAttempted = false;
  mcp.request = async (method, params) => {
    if (method === 'tools/call' && params.name === 'gigi_records_save') { saveAttempted = true; throw new Error('broken pipe after write'); }
    if (params.name === 'gigi_records_get' && saveAttempted) throw new Error('read unavailable');
    if (method === 'tools/call' && params.name === 'gigi_records_get') return { structuredContent: { id: 'r', title: 'Before', fields: { status: 'open' }, source: { type: 'manual' } } };
    if (method === 'tools/list') return { tools: toolCatalog() };
    return { content: [{ type: 'text', text: '{"id":"w"}' }] };
  };
  await Promise.all(server.events.map(fn => fn({ id: 50, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Edit' } } }) as unknown as Promise<void>));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  assert.match(approval.detail, /expectedRecord/);
  assert.match(approval.detail, /idempotencyKey/);
  await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  const raw = await readFile(join(dataDir, 'codex-chat', 'sessions.jsonl'), 'utf8');
  assert.match(raw, /write_outcome_unknown/);
  assert.match(raw, /uncertainWrite/);
  await Promise.all(server.events.map(fn => fn({ id: 51, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Edit' } } }) as unknown as Promise<void>));
  assert.equal(replies.length, 2);
  assert.match(JSON.stringify(replies[1]), /Previous write outcome is unknown/);
});

test('old completed turn cannot reconcile a new turn with unknown delivery', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [{ type: 'userMessage', id: 'u1', clientId: 'old', content: [{ type: 'text', text: 'first' }] }] }];
  await adapter.read({ workspaceId: 'w', sessionId });
  const original = server.request.bind(server);
  server.request = async (method, params) => method === 'turn/start' ? Promise.reject(new Error('connection lost')) : original(method, params);
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'second' }));
  const after = await adapter.read({ workspaceId: 'w', sessionId });
  assert.equal(after.error, 'turn_outcome_unknown');
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'repeat' }), /reconciliation_required/);
});

test('successful turn start remains running while first provider read is unavailable', async () => {
  const { adapter, server } = await setup();
  const original = server.request.bind(server);
  server.request = async (method, params) => method === 'thread/read' ? Promise.reject(new Error('rollout not materialized')) : original(method, params);
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'read fixture' });
  const polled = await adapter.poll({ workspaceId: 'w', sessionId });
  assert.equal(polled.state, 'running');
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, 1);
});

test('plugin preflight failure does not fence a turn that was never submitted', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w' });
  const original = server.request.bind(server);
  let failed = false;
  server.request = async (method, params) => {
    if (method === 'plugin/installed' && !failed) { failed = true; throw new Error('preflight failed'); }
    return original(method, params);
  };
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'first' }));
  await adapter.send({ workspaceId: 'w', sessionId, message: 'retry after preflight' });
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, 1);
});

test('restart read of exact active turn remains running and blocks a second send', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  server.thread.turns = [{ id: 'turn-1', status: 'inProgress', items: [] }];
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  assert.equal((await restarted.read({ workspaceId: 'w', sessionId })).state, 'running');
  await assert.rejects(restarted.send({ workspaceId: 'w', sessionId, message: 'second' }), /turn_in_progress/);
});

test('late completion for prior turn cannot settle current turn', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }];
  await adapter.read({ workspaceId: 'w', sessionId });
  server.request = async (method, params) => {
    server.calls.push({ method, params });
    if (method === 'account/read') return server.account;
    if (method === 'plugin/installed') return { marketplaces: [] };
    if (method === 'turn/start') return { turn: { id: 'turn-2' } };
    if (method === 'thread/read') return { thread: server.thread };
    return { thread: server.thread };
  };
  await adapter.send({ workspaceId: 'w', sessionId, message: 'second' });
  await Promise.all(server.events.map(fn => fn({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } } }) as unknown as Promise<void>));
  assert.equal((await adapter.list({ workspaceId: 'w' })).sessions[0].state, 'running');
});

test('gig fee instructions use summary currency and no fixture-specific answer', async () => {
  const { adapter, server, mcp } = await setup();
  const original = mcp.request.bind(mcp);
  mcp.request = async (method, params) => method === 'tools/list'
    ? { tools: toolCatalog() }
    : original(method, params);
  await adapter.start({ workspaceId: 'w', message: 'Read gig' });
  const profile = server.calls.find(x => x.method === 'thread/start')!.params;
  assert.match(profile.baseInstructions, /MUST call gigi_gigs_summary/);
  assert.match(profile.baseInstructions, /feeCents and currency/);
  assert.doesNotMatch(profile.baseInstructions, /45000|\$450/);
  const readTool = profile.dynamicTools[0].tools.find((x: any) => x.name === 'gigi_records_get');
  assert.match(readTool.description, /raw fields.Fee and Amount/);
  assert.match(readTool.description, /MUST use gigi_gigs_summary feeCents/);
});

test('gig raw fee tool result requires summary before reporting amount', async () => {
  const { adapter, server, mcp } = await setup();
  const original = mcp.request.bind(mcp);
  mcp.request = async (method, params) => method === 'tools/call' && params.name === 'gigi_records_get'
    ? { structuredContent: { id: 'gig', title: 'Fixture', fields: { Fee: 45000 }, source: {} }, content: [{ type: 'text', text: JSON.stringify({ id: 'gig', fields: { Fee: 45000 } }) }] }
    : original(method, params);
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'Read gig' });
  const replies: any[] = []; server.reply = (id, value) => { replies.push({ id, value }); };
  await Promise.all(server.events.map(fn => fn({ id: 90, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_get', arguments: { workspaceId: 'w', entity: 'gigs', id: 'gig' } } }) as unknown as Promise<void>));
  assert.match(replies[0].value.contentItems[0].text, /MUST call gigi_gigs_summary for feeCents and currency/);
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).state, 'running');
});

test('longer streamed message fills partial saved item after turn completes', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'Read fixture' });
  await Promise.all(server.events.map(fn => fn({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', itemId: 'a1', delta: 'The fee is $450.00.' } }) as unknown as Promise<void>));
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [{ id: 'a1', type: 'agentMessage', text: 'The fee is ' }] }];
  const read = await adapter.read({ workspaceId: 'w', sessionId });
  assert.equal(read.state, 'idle');
  assert.equal(read.messages.find(x => x.id === 'a1')?.text, 'The fee is $450.00.');
});

test('turn completion keeps a held GiGi approval visible while provider read is transiently unavailable', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'Propose a task edit' });
  await Promise.all(server.events.map(fn => fn({ id: 91, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Proposed' } } }) as unknown as Promise<void>));
  assert.equal((await adapter.list({ workspaceId: 'w' })).sessions[0].state, 'approval');
  await Promise.all(server.events.map(fn => fn({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } } }) as unknown as Promise<void>));
  assert.equal((await adapter.list({ workspaceId: 'w' })).sessions[0].state, 'approval');
  const original = server.request.bind(server);
  server.request = async (method, params) => method === 'thread/read' ? Promise.reject(new Error('rollout not materialized')) : original(method, params);
  const poll = await adapter.poll({ workspaceId: 'w', sessionId });
  assert.equal(poll.state, 'approval');
  assert.equal(poll.approvals.length, 1);
});

test('completed turn notification does not settle before its transcript is readable', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'Read the gig' });
  await Promise.all(server.events.map(fn => fn({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } } }) as unknown as Promise<void>));
  assert.equal((await adapter.list({ workspaceId: 'w' })).sessions[0].state, 'running');
  const original = server.request.bind(server);
  server.request = async (method, params) => method === 'thread/read' ? Promise.reject(new Error('rollout not materialized')) : original(method, params);
  assert.equal((await adapter.poll({ workspaceId: 'w', sessionId })).state, 'running');
  server.request = original;
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [{ id: 'a1', type: 'agentMessage', text: 'Fee: $450.00 USD' }] }];
  const settled = await adapter.poll({ workspaceId: 'w', sessionId });
  assert.equal(settled.state, 'idle');
  assert.equal(settled.messages.find(x => x.id === 'a1')?.text, 'Fee: $450.00 USD');
});


test('verified approval receipt survives completed provider prose and adapter restart', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  const original = mcp.request.bind(mcp);
  mcp.request = async (method, params) => {
    if (method === 'tools/call' && ['gigi_records_save', 'gigi_records_get'].includes(params.name)) return { structuredContent: { id: 'r', title: 'Task', fields: { Status: 'Done' }, source: { kind: 'manual' } }, content: [] };
    return original(method, params);
  };
  await Promise.all(server.events.map(fn => fn({ id: 90, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Task', fields: { Status: 'Done' } } } })));
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [{ type: 'agentMessage', id: 'stale', text: 'Awaiting approval.' }] }];
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  assert.equal(result.decisionReceipt?.outcome, 'verified');
  assert.equal(result.messages[0].text, 'Awaiting approval.');
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  assert.deepEqual((await restarted.read({ workspaceId: 'w', sessionId })).decisionReceipt, result.decisionReceipt);
});

for (const outcome of ['rejected', 'failed', 'unknown'] as const) test(`${outcome} approval never produces a verified receipt`, async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 91, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Updated task' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const original = mcp.request.bind(mcp); let writes = 0;
  mcp.request = async (method, params) => {
    if (method === 'tools/call' && params.name === 'gigi_records_save') { writes++; if (outcome === 'unknown') throw new Error('lost'); return { isError: true, content: [] }; }
    if (outcome === 'unknown' && writes && params.name === 'gigi_records_get') throw new Error('read unavailable');
    return original(method, params);
  };
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: outcome === 'rejected' ? 'reject' : 'approve' });
  assert.equal(result.decisionReceipt?.outcome, outcome);
  assert.equal(writes, outcome === 'rejected' ? 0 : 1);
});


test('a different saved record cannot verify an approved edit', async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 92, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Task' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  mcp.request = async () => ({ structuredContent: { id: 'foreign', title: 'Task', fields: {} }, content: [] });
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  assert.equal(result.decisionReceipt?.outcome, 'unknown');
  assert.equal(result.error, 'write_outcome_unknown');
});

test('full record reconciliation updates an unknown receipt without replaying the write', async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 93, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Task', fields: { Status: 'Done' } } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const original = mcp.request.bind(mcp); let writes = 0;
  mcp.request = async (method, params) => {
    if (params.name === 'gigi_records_save') { writes++; throw new Error('lost'); }
    if (params.name === 'gigi_records_get') return { structuredContent: { id: 'r', title: 'Task', fields: { Status: 'Done' } }, content: [] };
    return original(method, params);
  };
  await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  await Promise.all(server.events.map(fn => fn({ id: 94, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_get', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', detail: 'full' } } })));
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).decisionReceipt?.outcome, 'verified');
  assert.equal(writes, 1);
});


for (const proposal of [
  { title: 'Task', fieldsMode: 'replace', fields: {} },
  { title: 'Task', source: { kind: 'manual', label: 'Reviewed' } },
  { title: '  New task  ' }
]) test(`uncertain save reconciles the full intended mutation: ${JSON.stringify(proposal)}`, async () => {
  const { adapter, server, mcp } = await setup();
  const original = mcp.request.bind(mcp);
  let actual = { id: 'r', title: 'Task', fields: { Status: 'Open' }, source: { kind: 'manual' } };
  let writes = 0, materialized = false;
  mcp.request = async (method, params) => {
    if (params.name === 'gigi_records_get' && writes && !materialized) throw new Error('read unavailable');
    if (params.name === 'gigi_records_get') return { structuredContent: actual, content: [] };
    if (params.name === 'gigi_records_save') { writes++; throw new Error('lost reply'); }
    return original(method, params);
  };
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  const emit = async (id: number, tool: string, args: any) => Promise.all(server.events.map(fn => fn({ id, method: 'item/tool/call', params: { threadId: 'thread-1', tool, arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', ...args } } })));
  await emit(201, 'gigi_records_save', proposal);
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  await emit(202, 'gigi_records_get', { detail: 'full' });
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).decisionReceipt?.outcome, 'unknown');
  materialized = true;
  actual = { ...actual, title: proposal.title.trim(), ...('fields' in proposal ? { fields: proposal.fields as any } : {}), ...('source' in proposal ? { source: proposal.source as any } : {}) };
  await emit(203, 'gigi_records_get', { detail: 'full' });
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).decisionReceipt?.outcome, 'verified');
  assert.equal(writes, 1, 'reconciliation must never replay the save');
});

test('approval readback recognizes a domain-normalized title immediately', async () => {
  const { adapter, server, mcp } = await setup();
  const original = mcp.request.bind(mcp);
  let actual = { id: 'r', title: 'Task', fields: {}, source: {} };
  mcp.request = async (method, params) => {
    if (params.name === 'gigi_records_get') return { structuredContent: actual, content: [] };
    if (params.name === 'gigi_records_save') { actual = { ...actual, title: params.arguments.title.trim() }; return { structuredContent: actual, content: [] }; }
    return original(method, params);
  };
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 204, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: '  New task  ' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  assert.equal(result.decisionReceipt?.outcome, 'verified');
});


test('JSON-line decoding retains Unicode across a split pipe chunk', async () => {
  const text = 'Danny — café 🎸';
  const childCode = `process.stdin.once('data',()=>{const b=Buffer.from(JSON.stringify({id:1,result:{text:'Danny — café 🎸'}})+'\\n');const n=b.indexOf(Buffer.from('🎸'))+2;process.stdout.write(b.subarray(0,n));setTimeout(()=>process.stdout.write(b.subarray(n)),20);});`;
  const client = new JsonLineProcess(process.execPath, ['-e', childCode], process.env);
  try { assert.deepEqual(await client.request('ping', {}), { text }); }
  finally { await client.close(); }
});


test('materialized streamed turns cannot reappear after falling outside the transcript window', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  const original = server.request.bind(server); let turn = 1;
  server.request = async (method, params) => method === 'turn/start' ? { turn: { id: `turn-${++turn}` } } : original(method, params);
  const turns: any[] = [];
  for (let i = 1; i <= 26; i++) {
    if (i > 1) await adapter.send({ workspaceId: 'w', sessionId, message: `Question ${i}` });
    const id = `answer-${i}`, text = `Answer ${i}`;
    await Promise.all(server.events.map(fn => fn({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId: `turn-${i}`, itemId: id, delta: text } })));
    turns.push({ id: `turn-${i}`, status: 'completed', items: [{ id, type: 'agentMessage', text }] });
    server.thread.turns = turns.slice(-20);
    const read = await adapter.read({ workspaceId: 'w', sessionId });
    assert.deepEqual(read.messages.map(message => message.id), turns.slice(-20).map(item => item.items[0].id));
  }
});

for (const loseReply of [false, true]) test(`imported record manual source preserves origin and reconciles on reopen (lost reply: ${loseReply})`, async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const original = mcp.request.bind(mcp);
  const imported = { kind: 'import', provider: 'synthetic', externalId: 'fixture-1' };
  let actual = { id: 'r', title: 'Task', fields: {}, source: imported as any };
  let writes = 0, materialized = !loseReply;
  mcp.request = async (method, params) => {
    if (params.name === 'gigi_records_get' && writes && !materialized) throw new Error('read unavailable');
    if (params.name === 'gigi_records_get') return { structuredContent: actual, content: [] };
    if (params.name === 'gigi_records_save') {
      writes++;
      if (loseReply) throw new Error('lost reply');
      actual = { ...actual, source: { kind: 'manual', origin: imported } };
      return { structuredContent: actual, content: [] };
    }
    return original(method, params);
  };
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 205, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Task', source: { kind: 'manual' } } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  assert.equal(result.decisionReceipt?.outcome, loseReply ? 'unknown' : 'verified');
  if (loseReply) {
    materialized = true;
    actual = { ...actual, source: { kind: 'manual', origin: imported } };
    const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
    await assert.rejects(restarted.read({ workspaceId: 'other-workspace', sessionId }), /session_not_found/);
    const reopened = await restarted.read({ workspaceId: 'w', sessionId });
    assert.equal(reopened.decisionReceipt?.outcome, 'verified');
    assert.equal(reopened.error, undefined);
  }
  assert.equal(writes, 1, 'fresh read must not replay the save');
});

test('matching uncertain running turn restores cancellation without a duplicate send', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }];
  await adapter.read({ workspaceId: 'w', sessionId });
  const original = server.request.bind(server);
  let clientId = '';
  server.request = async (method, params) => {
    if (method === 'turn/start') { clientId = params.clientUserMessageId; throw new Error('lost reply'); }
    return original(method, params);
  };
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'second' }));
  server.thread.turns = [{ id: 'turn-2', status: 'inProgress', items: [{ type: 'userMessage', id: 'u2', clientId, content: [{ type: 'text', text: 'second' }] }] }];
  const read = await adapter.read({ workspaceId: 'w', sessionId });
  assert.equal(read.state, 'running');
  assert.equal(read.error, undefined);
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'repeat' }), /turn_in_progress/);
  await adapter.cancel({ workspaceId: 'w', sessionId });
  assert.equal([...server.calls].reverse().find(x => x.method === 'turn/interrupt')?.params.turnId, 'turn-2');
});

test('correlated provider turn rejection permits a later explicit send without an uncertainty fence', async () => {
  const { adapter, server, dataDir, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }];
  await adapter.read({ workspaceId: 'w', sessionId });
  const original = server.request.bind(server); let attempts = 0;
  server.request = async (method, params) => {
    if (method === 'turn/start') { attempts++; if (attempts === 1) throw new ProviderResponseError('rate limit'); return { turn: { id: 'turn-2' } }; }
    return original(method, params);
  };
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'second' }), /provider_turn_rejected/);
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  assert.equal((await restarted.read({ workspaceId: 'w', sessionId })).error, 'provider_turn_rejected');
  assert.equal((await restarted.send({ workspaceId: 'w', sessionId, message: 'second' })).state, 'running');
  assert.equal(attempts, 2, 'no automatic send retry');
});

test('JSON-line correlated errors retain response identity distinct from pipe failure', async () => {
  const client = new JsonLineProcess(process.execPath, ['-e', `process.stdin.once('data',()=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,error:{code:-32000,message:'rate limit'}})+'\\n'));`], process.env);
  try { await assert.rejects(client.request('turn/start', {}), error => error instanceof ProviderResponseError); }
  finally { await client.close(); }
});


test('the conversation cap archives the oldest settled session and permits another explicit chat', async () => {
  const { adapter, server, dataDir } = await setup();
  const first = await adapter.start({ workspaceId: 'w' });
  for (let i = 1; i < 100; i++) await adapter.start({ workspaceId: 'w' });
  await assert.rejects(adapter.start({ workspaceId: '' }), /invalid_request/);
  assert.equal((await adapter.list({ workspaceId: 'w' })).sessions.length, 100);
  const next = await adapter.start({ workspaceId: 'w' });
  const listed = (await adapter.list({ workspaceId: 'w' })).sessions;
  assert.equal(listed.length, 100);
  assert.ok(listed.some(item => item.sessionId === next.sessionId));
  assert.ok(!listed.some(item => item.sessionId === first.sessionId));
  const archived = JSON.parse((await readFile(join(dataDir, 'codex-chat', 'retired-sessions.jsonl'), 'utf8')).trim());
  assert.equal(archived.session.sessionId, first.sessionId);
  assert.equal(server.calls.filter(call => call.method === 'turn/start').length, 0);
});

test('the conversation cap never retires an unresolved send or approval receipt', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  for (let i = 0; i < 100; i++) await adapter.start({ workspaceId: 'w' });
  const ledger = join(dataDir, 'codex-chat', 'sessions.jsonl');
  const entries = (await readFile(ledger, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  for (const [index, entry] of entries.entries()) {
    if (index % 2) { entry.error = 'turn_outcome_unknown'; entry.pendingMessageId = 'pending'; }
    else entry.decisionReceipt = { approvalId: 'held', outcome: 'unknown' };
  }
  await writeFile(ledger, entries.map(entry => JSON.stringify(entry)).join('\n') + '\n');
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  await assert.rejects(restarted.start({ workspaceId: 'w' }), /session_limit/);
  assert.equal((await restarted.list({ workspaceId: 'w' })).sessions.length, 100);
  await assert.rejects(readFile(join(dataDir, 'codex-chat', 'retired-sessions.jsonl')), { code: 'ENOENT' });
});


test('Stop denies an edit whose record snapshot finishes after cancellation', async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  let resolve!: (value: any) => void;
  const snapshot = new Promise<any>(yes => { resolve = yes; });
  const original = mcp.request.bind(mcp);
  mcp.request = (method, params) => params.name === 'gigi_records_get' ? snapshot : original(method, params);
  const replies: any[] = []; server.reply = (id, value) => { replies.push({ id, value }); };
  const pending = Promise.all(server.events.map(fn => fn({ id: 999, method: 'item/tool/call', params: { threadId: 'thread-1', turnId: 'turn-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Cancelled edit' } } })));
  await adapter.cancel({ workspaceId: 'w', sessionId });
  resolve({ structuredContent: { id: 'r', title: 'Original', fields: {}, source: { kind: 'manual' } } });
  await pending;
  const result = await adapter.read({ workspaceId: 'w', sessionId });
  assert.equal(result.approvals.length, 0); assert.notEqual(result.state, 'approval');
  assert.equal(replies.find(item => item.id === 999)?.value.success, false);
  assert.equal(mcp.calls.some(call => call.params.name === 'gigi_records_save'), false);
});


test('ordered unchanged full-record reconciliation closes an uncertain save without replay', async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 1001, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { entity: 'tasks', id: 'r', title: 'Updated' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const original = mcp.request.bind(mcp); let writes = 0;
  mcp.request = async (method, params) => {
    if (params.name === 'gigi_records_save') { writes++; throw new Error('lost before commit'); }
    return original(method, params);
  };
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  assert.equal(result.decisionReceipt?.outcome, 'failed'); assert.equal(result.error, undefined);
  await Promise.all(server.events.map(fn => fn({ id: 1002, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { entity: 'tasks', id: 'r', title: 'New proposal' } } })));
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).approvals.length, 1);
  assert.equal(writes, 1);
});


for (const actual of [
  { id: 'r', title: 'Someone else changed it', fields: {}, source: {} },
  { id: 'r', title: 'Task', fields: {} }
]) test(`uncertain write stays fenced for conflicting or incomplete read: ${JSON.stringify(actual)}`, async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 1003, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { entity: 'tasks', id: 'r', title: 'Updated' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const original = mcp.request.bind(mcp); let writes = 0;
  mcp.request = async (method, params) => {
    if (params.name === 'gigi_records_save') { writes++; throw new Error('lost reply'); }
    if (params.name === 'gigi_records_get') return { structuredContent: actual };
    return original(method, params);
  };
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' });
  assert.equal(result.decisionReceipt?.outcome, 'unknown'); assert.equal(result.error, 'write_outcome_unknown');
  await Promise.all(server.events.map(fn => fn({ id: 1004, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { entity: 'tasks', id: 'r', title: 'Retry' } } })));
  assert.equal((await adapter.read({ workspaceId: 'w', sessionId })).approvals.length, 0);
  assert.equal(writes, 1);
});


test('failed rejection delivery cannot leave a rejected proposal approvable', async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'edit' });
  await Promise.all(server.events.map(fn => fn({ id: 1005, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { entity: 'tasks', id: 'r', title: 'Denied edit' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  server.reply = async () => { throw new Error('broken pipe'); };
  const result = await adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'reject' });
  assert.equal(result.decisionReceipt?.outcome, 'rejected'); assert.equal(result.approvals.length, 0);
  await assert.rejects(adapter.approve({ workspaceId: 'w', sessionId, approvalId: approval.id, decision: 'approve' }), /approval_not_found/);
  assert.equal(mcp.calls.some(call => call.params.name === 'gigi_records_save'), false);
});

test('authoritative failed turns can retire at the cap while uncertainty remains protected', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  for (let i = 0; i < 100; i++) await adapter.start({ workspaceId: 'w' });
  const ledger = join(dataDir, 'codex-chat', 'sessions.jsonl');
  const entries = (await readFile(ledger, 'utf8')).trim().split('\n').map(line => ({ ...JSON.parse(line), state: 'failed', error: 'Provider usage limit reached' }));
  await writeFile(ledger, entries.map(entry => JSON.stringify(entry)).join('\n') + '\n');
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  await restarted.start({ workspaceId: 'w' });
  assert.equal((await restarted.list({ workspaceId: 'w' })).sessions.length, 100);
  assert.equal(JSON.parse((await readFile(join(dataDir, 'codex-chat', 'retired-sessions.jsonl'), 'utf8')).trim()).session.error, 'Provider usage limit reached');
});

for (const failure of ['thread/start', 'thread/resume', 'plugin/installed']) test(`correlated ${failure} rejection is definitive before turn submission and allows explicit retry`, async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w' });
  if (failure === 'thread/resume') {
    await adapter.send({ workspaceId: 'w', sessionId, message: 'first' });
    server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }];
    await adapter.read({ workspaceId: 'w', sessionId });
  }
  const active = failure === 'thread/resume' ? createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp }) : adapter;
  const original = server.request.bind(server);
  let reject = true;
  server.request = async (method, params) => { if (method === failure && reject) throw new ProviderResponseError('provider declined preflight'); return original(method, params); };
  const priorTurns = server.calls.filter(x => x.method === 'turn/start').length;
  await assert.rejects(active.send({ workspaceId: 'w', sessionId, message: 'retryable' }), /provider_preflight_rejected/);
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, priorTurns);
  reject = false;
  const read = await active.read({ workspaceId: 'w', sessionId });
  assert.notEqual(read.error, 'turn_outcome_unknown');
  await active.send({ workspaceId: 'w', sessionId, message: 'explicit retry' });
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, priorTurns + 1);
});

for (const failure of ['account/read', 'thread/start', 'thread/resume', 'plugin/installed', 'tools/list']) test(`transport failure at ${failure} never fences an unsent message`, async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w' });
  if (failure === 'thread/resume') {
    await adapter.send({ workspaceId: 'w', sessionId, message: 'first' });
    server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }];
    await adapter.read({ workspaceId: 'w', sessionId });
  }
  const active = failure === 'thread/resume' ? createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp }) : adapter;
  const target = failure === 'tools/list' ? mcp : server;
  const original = target.request.bind(target);
  let failing = true;
  target.request = async (method, params) => { if (method === failure && failing) throw new Error('transport lost'); return original(method, params); };
  const priorTurns = server.calls.filter(x => x.method === 'turn/start').length;
  await assert.rejects(active.send({ workspaceId: 'w', sessionId, message: 'not submitted' }), failure === 'account/read' ? /codex_unavailable/ : /provider_preflight_unavailable/);
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, priorTurns);
  const persisted = (await readFile(join(dataDir, 'codex-chat', 'sessions.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line)).find(x => x.sessionId === sessionId);
  assert.equal(persisted.state, 'idle'); assert.equal(persisted.pendingMessageId, undefined);
  failing = false;
  await active.send({ workspaceId: 'w', sessionId, message: 'explicit retry' });
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, priorTurns + 1);
});

test('recovered running turn permits Stop once the exact active turn is confirmed', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  const restart = () => createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  const first = restart(); await first.list({ workspaceId: 'w' });
  const recovered = restart(); // Recovery state remains distinguishable across another restart.
  await assert.rejects(recovered.send({ workspaceId: 'w', sessionId, message: 'duplicate' }), /turn_in_progress/);
  server.thread.turns = [{ id: 'foreign-turn', status: 'inProgress', items: [] }];
  assert.equal((await recovered.read({ workspaceId: 'w', sessionId })).recoveryPending, true);
  server.thread.turns = [{ id: 'turn-1', status: 'inProgress', items: [] }];
  const confirmed = await recovered.read({ workspaceId: 'w', sessionId });
  assert.equal(confirmed.state, 'running'); assert.equal(confirmed.cancelPending, undefined);
  const stopped = await recovered.cancel({ workspaceId: 'w', sessionId }, true);
  assert.equal(stopped.cancelPending, true);
  assert.equal(server.calls.filter(x => x.method === 'turn/interrupt').length, 1);
  const afterRealStop = restart();
  const pending = await afterRealStop.read({ workspaceId: 'w', sessionId });
  assert.equal(pending.cancelPending, true, 'a real pending interrupt is retained');
  server.thread.turns = [{ id: 'turn-1', status: 'interrupted', items: [] }];
  assert.equal((await afterRealStop.read({ workspaceId: 'w', sessionId })).cancelPending, undefined);
});

for (const [name, catalog] of Object.entries({ missing: {}, empty: { tools: [] }, unrelated: { tools: [{ name: 'unrecognized', inputSchema: { type: 'object' } }] }, malformed: { tools: [null, { name: 'gigi_records_get', inputSchema: null }] } })) test(`${name} catalog disables readiness and cannot start a turn`, async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w' });
  const original = mcp.request.bind(mcp);
  let invalid = true;
  mcp.request = async (method, params) => method === 'tools/list' && invalid ? catalog : original(method, params);
  assert.deepEqual(await adapter.status(), { provider: 'codex', available: false, authenticated: true, reason: 'gigi_tools_unavailable' });
  await assert.rejects(adapter.start({ workspaceId: 'w', message: 'not sent' }), /gigi_tools_unavailable/);
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'not sent' }), /gigi_tools_unavailable/);
  assert.equal(server.calls.some(x => x.method === 'thread/start' || x.method === 'turn/start'), false);
  invalid = false;
  assert.equal((await adapter.status()).available, true);
  await adapter.send({ workspaceId: 'w', sessionId, message: 'explicit retry' });
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, 1);
});

test('a previously loaded thread rechecks the catalog before another send', async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'first' });
  server.thread.turns = [{ id: 'turn-1', status: 'completed', items: [] }]; await adapter.read({ workspaceId: 'w', sessionId });
  const original = mcp.request.bind(mcp);
  mcp.request = async (method, params) => method === 'tools/list' ? { tools: [] } : original(method, params);
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'not sent' }), /gigi_tools_unavailable/);
  assert.equal(server.calls.filter(x => x.method === 'turn/start').length, 1);
});

for (const missing of requiredTools) test(`missing required ${missing} prevents readiness and provider submission`, async () => {
  const { adapter, server, mcp } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w' });
  const original = mcp.request.bind(mcp);
  const localCalls: string[] = [];
  mcp.request = async (method, params) => { localCalls.push(method); return method === 'tools/list' ? { tools: toolCatalog().filter(tool => tool.name !== missing) } : original(method, params); };
  assert.equal((await adapter.status()).reason, 'gigi_tools_unavailable');
  await assert.rejects(adapter.start({ workspaceId: 'w', message: 'not sent' }), /gigi_tools_unavailable/);
  await assert.rejects(adapter.send({ workspaceId: 'w', sessionId, message: 'not sent' }), /gigi_tools_unavailable/);
  assert.equal(server.calls.some(call => call.method === 'thread/start' || call.method === 'turn/start'), false);
  assert.equal(localCalls.includes('tools/call'), false, 'catalog is checked before workspace or record lookup');
  mcp.request = original;
  assert.equal((await adapter.status()).available, true);
  await adapter.send({ workspaceId: 'w', sessionId, message: 'explicit retry' });
  assert.equal(server.calls.filter(call => call.method === 'turn/start').length, 1);
});

test('a malformed mandatory schema cannot be replaced by optional context search', async () => {
  const { adapter, server, mcp } = await setup();
  const original = mcp.request.bind(mcp);
  mcp.request = async (method, params) => method === 'tools/list' ? { tools: [...toolCatalog().map(tool => tool.name === 'gigi_records_save' ? { ...tool, inputSchema: { type: 'string' } } : tool), { name: 'gigi_context_search', inputSchema: { type: 'object' } }] } : original(method, params);
  assert.equal((await adapter.status()).available, false);
  await assert.rejects(adapter.start({ workspaceId: 'w', message: 'not sent' }), /gigi_tools_unavailable/);
  assert.equal(server.calls.some(call => call.method === 'thread/start'), false);
});

test('complete mandatory catalog works without optional context search', async () => {
  const { adapter, server } = await setup();
  assert.equal((await adapter.status()).available, true);
  await adapter.start({ workspaceId: 'w', message: 'hello' });
  const tools = server.calls.find(call => call.method === 'thread/start')!.params.dynamicTools[0].tools;
  assert.deepEqual(tools.map((tool: any) => tool.name), requiredTools);
  assert.equal(server.calls.filter(call => call.method === 'turn/start').length, 1);
});

test('large retained history reopens through bounded pages and reconciles the latest turn', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'latest question' });
  server.thread.turns = Array.from({ length: 120 }, (_, index) => ({ id: index === 119 ? 'turn-1' : `old-${index}`, status: 'completed', items: [{ type: 'agentMessage', id: `answer-${index}`, text: `${index}:` + 'x'.repeat(16_000) }] }));
  assert.ok(Buffer.byteLength(JSON.stringify(server.thread)) > 1_000_000);
  const original = server.request.bind(server);
  server.request = async (method, params) => {
    if (method === 'thread/read' || method === 'thread/resume') {
      assert.equal(method === 'thread/read' ? params.includeTurns : params.excludeTurns, method === 'thread/read' ? false : true);
      server.calls.push({ method, params });
      return { thread: { id: server.thread.id, turns: [], status: server.thread.status } };
    }
    return original(method, params);
  };
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  for (let reopen = 0; reopen < 2; reopen++) {
    const result = await restarted.read({ workspaceId: 'w', sessionId });
    assert.equal(result.state, 'idle');
    assert.equal(result.messages.length, 20);
    assert.equal(result.messages[0].id, 'answer-100');
    assert.equal(result.messages.at(-1)?.id, 'answer-119');
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 500_000);
  }
  assert.equal(server.calls.filter(call => call.method === 'thread/turns/list').length, 40);
});

test('invalid history pagination never falls back to a full-history read or clears recovery', async () => {
  const { adapter, server } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  const original = server.request.bind(server);
  server.request = async (method, params) => method === 'thread/turns/list' ? { data: [], nextCursor: 'repeated' } : original(method, params);
  const result = await adapter.read({ workspaceId: 'w', sessionId });
  assert.equal(result.state, 'running');
  assert.equal(server.calls.some(call => call.method === 'thread/read' && call.params.includeTurns), false);
});

test('reading another session returns persisted workspace write verification', async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const a = await adapter.start({ workspaceId: 'w' });
  const b = await adapter.start({ workspaceId: 'w' });
  const path = join(dataDir, 'codex-chat', 'sessions.jsonl');
  const entries = (await readFile(path, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const pending = entries.find(entry => entry.sessionId === a.sessionId);
  pending.uncertainWrite = { tool: 'gigi_records_save', arguments: { id: 'r', entity: 'tasks', title: 'Updated' } };
  pending.decisionReceipt = { approvalId: 'held-edit-a', outcome: 'unknown' };
  await writeFile(path, entries.map(entry => JSON.stringify(entry)).join('\n') + '\n');
  const original = mcp.request.bind(mcp);
  mcp.request = async (method, params) => params.name === 'gigi_records_get' ? { structuredContent: { id: 'r', title: 'Updated', fields: {}, source: {} } } : original(method, params);
  const restart = () => createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  assert.deepEqual((await restart().read({ workspaceId: 'w', sessionId: b.sessionId })).workspaceVerifiedEdits, ['held-edit-a']);
  assert.deepEqual((await restart().read({ workspaceId: 'w', sessionId: b.sessionId })).workspaceVerifiedEdits, ['held-edit-a']);
});

for (const definitive of [true, false]) test(`interrupt rejection retains only uncertain cancellation fence (definitive: ${definitive})`, async () => {
  const { adapter, server, mcp, dataDir } = await setup();
  const { sessionId } = await adapter.start({ workspaceId: 'w', message: 'hello' });
  server.thread.turns = [{ id: 'turn-1', status: 'inProgress', items: [] }];
  const original = server.request.bind(server);
  let reject = true;
  server.request = async (method, params) => {
    if (method === 'turn/interrupt' && reject) throw definitive ? new ProviderResponseError('interrupt declined') : new Error('delivery lost');
    return original(method, params);
  };
  await assert.rejects(adapter.cancel({ workspaceId: 'w', sessionId }, true));
  const restarted = createCodexAdapter({ dataDir, mcpBinary: '/fixture/gigi-mcp', skillPath: '/fixture/skill/SKILL.md', server, mcp });
  const read = await restarted.read({ workspaceId: 'w', sessionId });
  assert.equal(read.state, 'running');
  assert.equal(Boolean(read.cancelPending), !definitive);
  if (definitive) {
    reject = false;
    assert.equal((await restarted.cancel({ workspaceId: 'w', sessionId }, true)).cancelPending, true);
  }
});
