import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../worker/presence.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { PresenceHub } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

class Socket {
  static OPEN = 1;
  readyState = 1;
  messages = [];
  closes = [];
  fail = false;
  send(value) { if (this.fail) throw new Error('disconnected'); this.messages.push(JSON.parse(value)); }
  close(code, reason) { this.readyState = 3; this.closes.push({ code, reason }); }
  accept() { throw new Error('Standard sockets prevent hibernation'); }
  addEventListener() { throw new Error('Use hibernation handlers'); }
}

function fixture() {
  const values = new Map();
  const sockets = [];
  let pending = Promise.resolve();
  const storage = {
    get: async (key) => structuredClone(values.get(key)),
    put: async (key, value) => { values.set(key, structuredClone(value)); },
    transaction(fn) {
      const run = pending.then(() => fn(storage));
      pending = run.catch(() => {});
      return run;
    },
  };
  const state = { storage, acceptWebSocket: (ws) => sockets.push(ws), getWebSockets: () => sockets };
  return { values, sockets, state, hub: new PresenceHub(state) };
}
const publish = (hub, event) => hub.fetch(new Request('https://presence/publish', { method: 'POST', body: JSON.stringify(event) }));

// HTTP 101 is a Workers extension; keep the runtime boundary explicit in this
// existing Node suite. These tests do not simulate actual eviction.
async function withSockets(run) {
  const original = { WebSocket: globalThis.WebSocket, WebSocketPair: globalThis.WebSocketPair, Response: globalThis.Response };
  globalThis.WebSocket = Socket;
  globalThis.WebSocketPair = class { constructor() { this[0] = new Socket(); this[1] = new Socket(); } };
  globalThis.Response = class extends original.Response {
    constructor(body, options) {
      super(body, options?.status === 101 ? { status: 200 } : options);
      if (options?.status === 101) { Object.defineProperty(this, 'status', { value: 101 }); this.webSocket = options.webSocket; }
    }
  };
  try { await run(); } finally { Object.assign(globalThis, original); }
}

test('idle hub has no timers/listeners and accepts sockets through runtime', () => withSockets(async () => {
  assert.doesNotMatch(source, /setInterval\s*\(|setTimeout\s*\(|addEventListener\s*\(/);
  const { hub, sockets, values } = fixture();
  assert.equal(values.size, 0);
  const response = await hub.fetch(new Request('https://presence/', { headers: { Upgrade: 'websocket' } }));
  assert.equal(response.status, 101);
  assert.deepEqual(sockets[0].messages, [{ type: 'hello', recent: [] }]);
}));

test('reconstruction retains connections and last 50 events for reconnect', () => withSockets(async () => {
  const { hub, state, sockets, values } = fixture();
  const retained = new Socket(); sockets.push(retained);
  for (let id = 0; id < 55; id++) await publish(hub, { id });
  const restored = new PresenceHub(state);
  await publish(restored, { id: 55 });
  assert.deepEqual(retained.messages.at(-1), { type: 'event', id: 55 });
  await restored.fetch(new Request('https://presence/', { headers: { Upgrade: 'websocket' } }));
  assert.deepEqual(sockets[1].messages[0].recent, Array.from({ length: 50 }, (_, i) => ({ id: i + 6 })));
  assert.equal(values.get('recent').length, 50);
}));

test('concurrent publishers preserve the bounded history and broadcasts', () => withSockets(async () => {
  const { hub, sockets, values } = fixture(); sockets.push(new Socket());
  await Promise.all(Array.from({ length: 40 }, (_, id) => publish(hub, { id })));
  assert.equal(new Set(values.get('recent').map((e) => e.id)).size, 40);
  assert.equal(sockets[0].messages.length, 40);
}));

test('failed/closed sockets do not disrupt healthy subscribers; close/error terminate', () => withSockets(async () => {
  const { hub, sockets } = fixture();
  const good = new Socket(), failed = new Socket(), closed = new Socket();
  failed.fail = true; closed.readyState = 3; sockets.push(good, failed, closed);
  assert.deepEqual(await (await publish(hub, { action: 'updated' })).json(), { ok: true, subscribers: 1 });
  assert.equal(good.messages.length, 1);
  assert.equal(closed.messages.length, 0);
  assert.equal(failed.closes[0].code, 1011);
  hub.webSocketClose(good, 1005, '');
  assert.equal(good.closes[0].code, 1000);
  hub.webSocketMessage(good, 'ignored');
  assert.equal(good.messages.length, 1);
}));

test('failed persistence does not broadcast or acknowledge an event', () => withSockets(async () => {
  const { hub, state, sockets } = fixture(); sockets.push(new Socket());
  state.storage.transaction = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(publish(hub, { id: 1 }), /storage unavailable/);
  assert.equal(sockets[0].messages.length, 0);
}));
