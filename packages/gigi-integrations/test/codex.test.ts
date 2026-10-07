import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createCodexAdapter, JsonLineProcess, type AppServer } from '../src/codex.ts';

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
    if (method === 'thread/turns/list') return { data: this.thread.turns.slice().reverse(), nextCursor: null };
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
    if (method === 'tools/list') return { tools: [{ name: 'gigi_records_get', description: 'Read', inputSchema: { type: 'object' } }, { name: 'gigi_records_save', description: 'Save', inputSchema: { type: 'object' } }] };
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
  mcp.request = async () => ({ content: [{ type: 'text', text: '{"id":"foreign"}' }] });
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
  assert.equal(server.calls.some(x => x.method === 'thread/turns/list'), false);
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
  mcp.request = async (method, params) => {
    if (method === 'tools/call' && params.name === 'gigi_records_save') throw new Error('broken pipe after write');
    if (method === 'tools/call' && params.name === 'gigi_records_get') return { structuredContent: { id: 'r', title: 'Before', fields: { status: 'open' }, source: { type: 'manual' } } };
    if (method === 'tools/list') return { tools: [{ name: 'gigi_records_save', description: 'Save', inputSchema: { type: 'object' } }] };
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
    ? { tools: [{ name: 'gigi_records_get', description: 'Read', inputSchema: { type: 'object' } }, { name: 'gigi_gigs_summary', description: 'Summary', inputSchema: { type: 'object' } }] }
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
  await Promise.all(server.events.map(fn => fn({ id: 91, method: 'item/tool/call', params: { threadId: 'thread-1', tool: 'gigi_records_save', arguments: { workspaceId: 'w', entity: 'tasks', id: 'r', title: 'Task' } } })));
  const approval = (await adapter.read({ workspaceId: 'w', sessionId })).approvals[0];
  const original = mcp.request.bind(mcp); let writes = 0;
  mcp.request = async (method, params) => {
    if (method === 'tools/call' && params.name === 'gigi_records_save') { writes++; if (outcome === 'unknown') throw new Error('lost'); return { isError: true, content: [] }; }
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
