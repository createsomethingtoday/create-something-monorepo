import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatController, chatView } from './chat.mjs';
const snapshot = (id = 's1', state = 'idle', extra = {}) => ({ sessionId: id, state, messages: [], approvals: [], recordLinks: [], ...extra });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fixture(overrides = {}) {
  const calls = [], timers = new Map(); let next = 0;
  const bridge = {
    chatStatus: async () => ({ available: true, authenticated: true }),
    chatList: async () => [{ sessionId: 's1', record: { entity: 'gigs', id: 'g1', title: 'Synthetic gig' } }, { sessionId: 's2' }],
    chatRead: async (_w, id) => snapshot(id),
    chatSend: async (...args) => { calls.push(['send', ...args]); return snapshot(); },
    ...overrides,
  };
  const chat = new ChatController(bridge, 'w1', () => {}, () => {}, (fn) => { const id = ++next; timers.set(id, fn); return id; }, (id) => timers.delete(id));
  return { chat, calls, timers };
}

test('close/reopen retains selected conversation, its context and unsent draft; switching restores each draft', async () => {
  const { chat } = fixture();
  await chat.open(); await chat.read('s1'); chat.draft = 'Unsent <&>\nsecond line';
  chat.close(); await chat.open({ entity: 'contacts', id: 'p1', title: 'Different current page' });
  assert.equal(chat.current?.sessionId, 's1');
  assert.equal(chat.draft, 'Unsent <&>\nsecond line');
  assert.equal(chat.record?.title, 'Synthetic gig');
  await chat.read('s2'); chat.draft = 'Second session'; await chat.read('s1');
  assert.equal(chat.draft, 'Unsent <&>\nsecond line');
  await chat.read('s2'); assert.equal(chat.draft, 'Second session');
});

test('send acknowledgment survives hide/reopen, blocks replay and retains newly typed text', async () => {
  const send = deferred(); let sends = 0;
  const { chat } = fixture({ chatSend: async () => { sends++; return send.promise; } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Original';
  const sending = chat.send(chat.draft); chat.close(); await chat.open();
  await chat.send('Original'); await chat.read('s2');
  assert.equal(sends, 1); assert.equal(chat.current?.sessionId, 's1');
  chat.draft = 'New text typed while waiting';
  send.resolve(snapshot('s1', 'idle', { messages: [{ id: 'u1', role: 'user', text: 'Original' }] })); await sending;
  assert.equal(chat.pending, false); assert.equal(chat.draft, 'New text typed while waiting');
  assert.equal(chat.current?.sessionId, 's1');
  assert.equal(sends, 1);
  chat.close(); await chat.open(); assert.equal(chat.draft, 'New text typed while waiting');
});

test('successful send while hidden clears only the submitted draft and never sends on reopen', async () => {
  const send = deferred(); let sends = 0;
  const { chat } = fixture({ chatSend: async () => { sends++; return send.promise; } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Original';
  const sending = chat.send(chat.draft); chat.close(); send.resolve(snapshot('s1', 'running')); await sending;
  assert.equal(chat.draft, ''); assert.equal(chat.current.state, 'running');
  await chat.open(); assert.equal(chat.current.sessionId, 's1'); assert.equal(sends, 1);
});

test('failed refresh retains draft and keeps Send and approval disabled until a successful read', async () => {
  let reads = 0, sends = 0, decisions = 0;
  const approval = snapshot('s1', 'approval', { approvals: [{ id: 'a1', title: 'Edit', detail: 'Synthetic proposal' }] });
  const { chat } = fixture({ chatRead: async () => { if (++reads > 1) throw new Error('offline'); return approval; }, chatSend: async () => { sends++; }, chatApprove: async () => { decisions++; } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Keep this'; chat.close(); await chat.open();
  assert.equal(chat.current?.sessionId, 's1'); assert.equal(chat.draft, 'Keep this');
  assert.match(chatView(chat), /data-chat-decision="approve" disabled/);
  await chat.decide('a1', 'approve'); await chat.send(chat.draft);
  assert.equal(decisions, 0); assert.equal(sends, 0);
  chat.bridge.chatRead = async () => snapshot(); await chat.read('s1'); await chat.send(chat.draft);
  assert.equal(sends, 1);
});

test('uncertain send settling while hidden retains its error and draft; failing read cannot clear the fence', async () => {
  const send = deferred(); let sends = 0, reads = 0;
  const { chat } = fixture({ chatRead: async () => { if (++reads > 1) throw new Error('offline'); return snapshot(); }, chatSend: async () => { sends++; return send.promise; } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Change record'; const sending = chat.send(chat.draft);
  chat.close(); send.reject(new Error('write_outcome_unknown')); await sending;
  assert.equal(chat.error, 'write_outcome_unknown'); assert.equal(chat.draft, 'Change record');
  await chat.open(); await chat.send(chat.draft); assert.equal(sends, 1);
  assert.match(chatView(chat), /type="submit" class="btn primary" disabled/);
});

for (const kind of ['cancel', 'approve', 'reject']) test(`${kind} close/reopen remains one explicit operation and cannot act during refresh`, async () => {
  const operation = deferred(); let writes = 0;
  const initial = snapshot('s1', kind === 'cancel' ? 'running' : 'approval', { approvals: [{ id: 'a1', title: 'Edit', detail: 'Synthetic' }] });
  const { chat } = fixture({ chatRead: async () => initial, chatCancel: async () => { writes++; return operation.promise; }, chatApprove: async () => { writes++; return operation.promise; } });
  await chat.open(); await chat.read('s1');
  const act = () => kind === 'cancel' ? chat.cancel() : chat.decide('a1', kind);
  const pending = act(); chat.close(); await chat.open(); await act(); assert.equal(writes, 1);
  chat.bridge.chatRead = async () => snapshot(); operation.resolve(snapshot()); await pending;
  assert.equal(chat.current.sessionId, 's1'); assert.equal(chat.pending, false); assert.equal(writes, 1);
});

test('late session reads cannot replace the newest conversation or its draft', async () => {
  const old = deferred();
  const { chat } = fixture({ chatRead: async (_w, id) => id === 's1' ? old.promise : snapshot('s2') });
  await chat.open(); const reading = chat.read('s1'); await chat.read('s2'); chat.draft = 'Newest';
  old.resolve(snapshot('s1', 'approval')); await reading;
  assert.equal(chat.current.sessionId, 's2'); assert.equal(chat.draft, 'Newest');
});

test('New chat uses the newly selected page context while reopening retains the old conversation context', async () => {
  let context;
  const { chat } = fixture({ chatStart: async (_w, record) => { context = record; return { sessionId: 's3' }; } });
  await chat.open({ entity: 'gigs', id: 'g1', title: 'Synthetic gig' }); await chat.read('s1'); chat.draft = 'Keep old draft';
  chat.close(); await chat.open({ entity: 'contacts', id: 'c2', title: 'New selection' });
  assert.equal(chat.record.title, 'Synthetic gig'); await chat.start();
  assert.deepEqual(context, { entity: 'contacts', id: 'c2' }); assert.equal(chat.current.sessionId, 's3');
  assert.equal(chat.record.title, 'New selection'); assert.equal(chat.draft, '');
  await chat.read('s1'); assert.equal(chat.draft, 'Keep old draft');
});

test('interrupted New chat retains the created session without repeating creation, and failed creation keeps the old draft', async () => {
  const created = deferred(); let starts = 0;
  const { chat } = fixture({ chatStart: async () => { starts++; return created.promise; } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Original draft';
  const starting = chat.start(); chat.close(); await chat.open(); await chat.start();
  assert.equal(starts, 1); created.resolve({ sessionId: 's3' }); await starting;
  assert.equal(chat.current.sessionId, 's3');
  await chat.read('s1'); assert.equal(chat.draft, 'Original draft');
  chat.bridge.chatStart = async () => { throw new Error('codex_unavailable'); };
  await chat.start(); assert.equal(chat.current.sessionId, 's1'); assert.equal(chat.draft, 'Original draft');
});

test('repeated close/reopen cancels obsolete status/read/poll results and maintains one active poll timer', async () => {
  const oldStatus = deferred(); let statuses = 0;
  const { chat, timers } = fixture({ chatStatus: async () => ++statuses === 2 ? oldStatus.promise : { available: true, authenticated: true }, chatRead: async () => snapshot('s1', 'running') });
  await chat.open(); await chat.read('s1'); assert.equal(timers.size, 1);
  chat.close(); const oldOpen = chat.open(); chat.close(); await chat.open(); assert.equal(timers.size, 1);
  oldStatus.resolve({ available: false, authenticated: false }); await oldOpen;
  assert.equal(chat.status.available, true); assert.equal(timers.size, 1);
  for (let i = 0; i < 3; i++) { chat.close(); assert.equal(timers.size, 0); await chat.open(); assert.equal(timers.size, 1); }
});

for (const receipt of [null, { sessionId: 'other', state: 'idle' }, { sessionId: 's1', state: 'unexpected' }, new Error('reply timed out')]) test(`unconfirmed send receipt ${JSON.stringify(receipt)} preserves draft and fences replay until matching fresh transcript`, async () => {
  let sends = 0;
  const old = [{ id: 'old', role: 'user', text: 'Same question' }];
  const { chat } = fixture({ chatRead: async () => snapshot('s1', 'idle', { messages: old }), chatSend: async () => { sends++; if (receipt instanceof Error) throw receipt; return receipt; } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Same question'; await chat.send(chat.draft);
  assert.equal(chat.draft, 'Same question'); assert.equal(chat.error, 'turn_outcome_unknown');
  await chat.send(chat.draft); assert.equal(sends, 1);
  chat.close(); await chat.open(); assert.equal(chat.draft, 'Same question'); await chat.send(chat.draft); assert.equal(sends, 1);
  chat.bridge.chatRead = async () => snapshot('s1', 'idle', { messages: [...old, { id: 'new', role: 'user', text: 'Same question' }] });
  await chat.read('s1'); assert.equal(chat.draft, ''); assert.equal(chat.error, null);
});

for (const reason of ['chatgpt_auth_required', 'codex_unavailable', 'provider_turn_rejected', 'plugin_inventory_unavailable']) test(`${reason} retains the draft without fencing a later explicit retry`, async () => {
  let sends = 0;
  const { chat } = fixture({ chatSend: async () => { if (++sends === 1) throw new Error(reason); return snapshot(); } });
  await chat.open(); await chat.read('s1'); chat.draft = 'Synthetic question';
  await chat.send(chat.draft);
  assert.equal(chat.error, reason); assert.equal(chat.draft, 'Synthetic question');
  assert.equal(chat.unconfirmedSends.size, 0); assert.equal(chat.refreshRequired, false);
  chat.close(); await chat.open();
  assert.equal(sends, 1); assert.equal(chat.draft, 'Synthetic question');
  await chat.send(chat.draft); assert.equal(sends, 2); assert.equal(chat.draft, '');
});
