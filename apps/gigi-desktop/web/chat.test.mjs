import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridge } from './bridge.mjs';
import { ChatController, chatView } from './chat.mjs';

const session = (state, extra = {}) => ({ sessionId: 's1', messages: [], state, approvals: [], recordLinks: [], ...extra });

test('chat bridge sends workspace-owned typed operations and explicit decisions', async () => {
  const calls = [];
  const bridge = createBridge(async (_command, value) => { calls.push(value); return {}; });
  await bridge.chatStatus('w1'); await bridge.chatList('w1'); await bridge.chatStart('w1', { entity: 'gigs', id: 'g1' });
  await bridge.chatRead('w1', 's1'); await bridge.chatSend('w1', 's1', 'When is the show?'); await bridge.chatPoll('w1', 's1');
  await bridge.chatCancel('w1', 's1'); await bridge.chatApprove('w1', 's1', 'a1', 'reject');
  assert.deepEqual(calls, [
    { operation: 'agent.chat.status', input: { workspaceId: 'w1' } },
    { operation: 'agent.chat.list', input: { workspaceId: 'w1' } },
    { operation: 'agent.chat.start', input: { workspaceId: 'w1', record: { entity: 'gigs', id: 'g1' } } },
    { operation: 'agent.chat.read', input: { workspaceId: 'w1', sessionId: 's1' } },
    { operation: 'agent.chat.send', input: { workspaceId: 'w1', sessionId: 's1', message: 'When is the show?' } },
    { operation: 'agent.chat.poll', input: { workspaceId: 'w1', sessionId: 's1' } },
    { operation: 'agent.chat.cancel', input: { workspaceId: 'w1', sessionId: 's1' } },
    { operation: 'agent.chat.approve', input: { workspaceId: 'w1', sessionId: 's1', approvalId: 'a1', decision: 'reject' } },
  ]);
  assert.throws(() => bridge.chatStart(''), /workspace/i);
});

test('chat starts with selected context, sends once, resumes running session, and refreshes after completion', async () => {
  const calls = [], timers = []; let completion = 0;
  const bridge = {
    chatStatus: async (w) => { calls.push(['status', w]); return { provider: 'codex', available: true, authenticated: true }; },
    chatList: async (w) => { calls.push(['list', w]); return { sessions: [{ sessionId: 's1', title: 'Friday show' }] }; },
    chatStart: async (w, record) => { calls.push(['start', w, record]); return { sessionId: 's1' }; },
    chatRead: async (w, id) => { calls.push(['read', w, id]); return session('idle'); },
    chatSend: async (w, id, message) => { calls.push(['send', w, id, message]); return session('running', { messages: [{ id: 'u1', role: 'user', text: message }] }); },
    chatPoll: async (w, id) => { calls.push(['poll', w, id]); return session('idle', { messages: [{ id: 'u1', role: 'user', text: 'Show?' }, { id: 'a1', role: 'assistant', text: 'Friday.' }] }); },
  };
  const chat = new ChatController(bridge, 'w1', () => {}, () => { completion++; }, (fn) => { timers.push(fn); return timers.length; }, () => {});
  await chat.open({ entity: 'gigs', id: 'g1', title: 'Friday show' }); await chat.start();
  assert.equal(chat.error, null);
  assert.equal(chat.sessions[0].sessionId, 's1');
  assert.match(chatView(chat), /About Friday show/);
  assert.deepEqual(calls.find((item) => item[0] === 'start'), ['start', 'w1', { entity: 'gigs', id: 'g1' }]);
  chat.draft = 'Show?';
  const first = chat.send(chat.draft), duplicate = chat.send(chat.draft);
  await Promise.all([first, duplicate]);
  assert.equal(calls.filter((item) => item[0] === 'send').length, 1);
  assert.equal(chat.draft, '');
  await timers.shift()();
  assert.equal(completion, 1);
  assert.match(chatView(chat), /Friday\./);
});

test('closing tears down polling and ignores stale poll responses', async () => {
  let release; const timers = []; let polls = 0;
  const bridge = { chatStatus: async () => ({ available: true, authenticated: true }), chatList: async () => [], chatRead: async () => session('running'), chatPoll: async () => { polls++; return new Promise((resolve) => { release = resolve; }); } };
  const chat = new ChatController(bridge, 'w1', () => {}, () => {}, (fn) => { timers.push(fn); return timers.length; }, () => {});
  await chat.open(); await chat.read('s1');
  const polling = timers.shift()(); await Promise.resolve();
  chat.close(); release(session('idle', { messages: [{ id: 'm1', role: 'assistant', text: 'Stale' }] })); await polling;
  assert.equal(polls, 1); assert.equal(chat.current.state, 'running'); assert.equal(chat.visible, false);
  await chat.open(); await chat.read('s1'); assert.equal(timers.length, 1, 'a reopened running session polls again');
});

test('approval is explicit and provider text is escaped', async () => {
  const decisions = []; let completion = 0;
  const bridge = { chatStatus: async () => ({ available: true, authenticated: true }), chatList: async () => [], chatRead: async () => session('approval', { approvals: [{ id: 'a1', title: '<script>change</script>', detail: 'Edit record?' }] }), chatApprove: async (...args) => { decisions.push(args); return session('idle'); } };
  const chat = new ChatController(bridge, 'w1', () => {}, () => { completion++; });
  await chat.open(); await chat.read('s1');
  assert.match(chatView(chat), /&lt;script&gt;change&lt;\/script&gt;/);
  assert.doesNotMatch(chatView(chat), /<script>/);
  await chat.decide('a1', 'approve');
  assert.deepEqual(decisions, [['w1', 's1', 'a1', 'approve']]); assert.equal(completion, 1);
});

test('record write approval presents actual proposed fields and keeps raw arguments in disclosure', async () => {
  const bridge = { chatStatus: async () => ({ available: true, authenticated: true }), chatList: async () => [], chatRead: async () => session('approval', { approvals: [{ id: 'a2', title: 'Approve gigi_records_save', detail: JSON.stringify({ workspaceId: 'w1', entity: 'tasks', title: 'Call venue', fields: { Status: 'Open', Notes: '<review me>' } }) }] }) };
  const chat = new ChatController(bridge, 'w1', () => {});
  await chat.open(); await chat.read('s1');
  const html = chatView(chat);
  assert.match(html, /Save a record/);
  assert.match(html, /tasks · Call venue/);
  assert.match(html, /Status<\/dt><dd>Open/);
  assert.match(html, /Notes<\/dt><dd>&lt;review me&gt;/);
  assert.match(html, /<summary>Technical details<\/summary>/);
  assert.doesNotMatch(html, /<review me>/);
});

test('Codex status and uncertain writes use plain recovery copy and stop another send', async () => {
  let sends = 0;
  const bridge = { chatStatus: async () => ({ provider: 'codex', available: true, authenticated: false, reason: 'chatgpt_auth_required' }), chatList: async () => [], chatSend: async () => { sends++; } };
  const chat = new ChatController(bridge, 'w1', () => {});
  await chat.open();
  assert.match(chatView(chat), /Sign in to your ChatGPT account in Codex/);
  assert.doesNotMatch(chatView(chat), /chatgpt_auth_required/);
  chat.status = { provider: 'codex', available: true, authenticated: true };
  chat.current = session('failed', { error: 'write_outcome_unknown' });
  chat.error = 'write_outcome_unknown';
  const html = chatView(chat);
  assert.match(html, /record change may have happened/i);
  assert.match(html, /Check the latest conversation and affected GiGi records/);
  assert.match(html, /type="submit" class="btn primary" disabled/);
  assert.doesNotMatch(html, /write_outcome_unknown/);
  await chat.send('Repeat the write');
  assert.equal(sends, 0);
});

test('unknown provider errors are not echoed into the chat panel', () => {
  const chat = { visible: true, status: { provider: 'codex', available: false, authenticated: false, reason: 'secret-token=abc' }, sessions: [], current: null, record: null, error: 'provider failed with secret-token=abc', pending: false };
  const html = chatView(chat);
  assert.match(html, /Could not complete this request/);
  assert.doesNotMatch(html, /secret-token/);
});

test('resuming a saved conversation displays its own record context and honest capability scope', async () => {
  const bridge = {
    chatStatus: async () => ({ provider: 'codex', available: true, authenticated: true }),
    chatList: async () => ({ sessions: [{ sessionId: 's2', title: 'Venue conversation', record: { entity: 'locations', id: 'l2', title: 'Blue Room' } }, { sessionId: 's3', title: 'General notes' }] }),
    chatRead: async (_workspaceId, sessionId) => ({ sessionId, messages: [], state: 'idle', approvals: [], recordLinks: [] }),
  };
  const chat = new ChatController(bridge, 'w1', () => {});
  await chat.open({ entity: 'gigs', id: 'g1', title: 'Friday show' });
  await chat.read('s2');
  let html = chatView(chat);
  assert.match(html, /About Blue Room/);
  assert.doesNotMatch(html, /About Friday show/);
  assert.match(html, /Codex signed in/);
  assert.match(html, /approve edits to existing records/);
  assert.match(html, /Create records and links with GiGi/);
  assert.match(html, /Phone access is a separate setup step/);
  await chat.read('s3');
  html = chatView(chat);
  assert.match(html, /class="chat-context">Workspace/);
  assert.doesNotMatch(html, /About Blue Room/);
});

test('missing GiGi tools gives setup guidance without claiming a connected workspace', async () => {
  const bridge = {
    chatStatus: async () => ({ provider: 'codex', available: true, authenticated: true }),
    chatList: async () => [],
    chatStart: async () => { throw new Error('gigi_tools_unavailable'); },
  };
  const chat = new ChatController(bridge, 'w1', () => {});
  await chat.open(); await chat.start();
  const html = chatView(chat);
  assert.match(html, /GiGi’s local tools are unavailable/);
  assert.match(html, /data-page="settings">Open Settings/);
  assert.doesNotMatch(html, /gigi_tools_unavailable/);
  assert.doesNotMatch(html, />Connected</);
});

test('empty running snapshots retain confirmed transcript until provider readback replaces it', async () => {
  const timers = [];
  let pollCount = 0;
  const confirmed = [{ id: 'u1', role: 'user', text: 'Earlier question' }, { id: 'a1', role: 'assistant', text: 'Earlier answer' }];
  const complete = [...confirmed, { id: 'u2', role: 'user', text: 'New question' }, { id: 'a2', role: 'assistant', text: 'New answer' }];
  const bridge = {
    chatStatus: async () => ({ available: true, authenticated: true }), chatList: async () => ({ sessions: [{ sessionId: 's1' }] }),
    chatRead: async () => session('idle', { messages: confirmed }),
    chatSend: async () => session('running', { messages: [] }),
    chatPoll: async () => ++pollCount === 1 ? session('running', { messages: [] }) : session('idle', { messages: complete }),
  };
  const chat = new ChatController(bridge, 'w1', () => {}, () => {}, (fn) => { timers.push(fn); return timers.length; }, () => {});
  await chat.open(); await chat.read('s1'); await chat.send('New question');
  assert.deepEqual(chat.current.messages, confirmed);
  assert.equal((chatView(chat).match(/Earlier answer/g) || []).length, 1);
  await timers.shift()();
  assert.deepEqual(chat.current.messages, confirmed);
  await timers.shift()();
  assert.deepEqual(chat.current.messages, complete);
  assert.equal((chatView(chat).match(/New question/g) || []).length, 1);
  assert.equal((chatView(chat).match(/Earlier answer/g) || []).length, 1);
});

test('default timers keep the Window receiver when scheduling and clearing a poll', () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  let scheduled = false, cleared = false;
  globalThis.setTimeout = function (_callback, delay) {
    assert.equal(this, globalThis, 'WebKit requires Window as the timer receiver');
    assert.equal(delay, 1000);
    scheduled = true;
    return 37;
  };
  globalThis.clearTimeout = function (id) {
    assert.equal(this, globalThis, 'WebKit requires Window as the timer receiver');
    assert.equal(id, 37);
    cleared = true;
  };
  try {
    const chat = new ChatController({}, 'w1', () => {});
    chat.visible = true;
    chat.current = session('idle');
    chat.accept(session('running'));
    assert.equal(scheduled, true);
    chat.stopPolling();
    assert.equal(cleared, true);
  } finally {
    globalThis.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  }
});
