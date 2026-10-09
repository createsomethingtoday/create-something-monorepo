import test from 'node:test';
import assert from 'node:assert/strict';

test('record Ask GiGi opens selected context, resumes a saved conversation, and sends once', async () => {
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(type, handler) { listeners.set(type, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, formData: globalThis.FormData };
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Private' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [{ id: 'g1', title: 'Friday show' }] };
    if (operation === 'records.get') return input.entity === 'profile' ? { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } } : { id: 'g1', title: 'Friday show', fields: {}, relations: [] };
    if (operation === 'agent.chat.status') return { provider: 'codex', available: true, authenticated: true };
    if (operation === 'agent.chat.list') return { sessions: [{ sessionId: 's1', title: 'Friday conversation' }] };
    if (operation === 'agent.chat.read') return { sessionId: 's1', messages: [{ id: 'a1', role: 'assistant', text: '<unsafe>' }], state: 'idle', approvals: [], recordLinks: [] };
    if (operation === 'agent.chat.send') return { sessionId: 's1', messages: [{ id: 'u1', role: 'user', text: input.message }], state: 'running', approvals: [], recordLinks: [] };
    return {};
  } } };
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  try {
    await import(`./app.mjs?chat-flow=${Date.now()}`); await settle();
    click({ page: 'gigs' }); await settle();
    click({ open: 'g1', entity: 'gigs' }); await settle();
    assert.match(root.innerHTML, /data-chat-open="1">Ask GiGi/);
    click({ chatOpen: '1' }); await settle();
    assert.match(root.innerHTML, /About Friday show/);
    assert.match(root.innerHTML, /Friday conversation/);
    assert.doesNotMatch(root.innerHTML, /<unsafe>/);
    click({ chatSession: 's1' }); await settle();
    assert.match(root.innerHTML, /&lt;unsafe&gt;/);
    const form = { id: 'chat-form', values: { message: 'What time?' } };
    listeners.get('submit')({ preventDefault() {}, target: form });
    listeners.get('submit')({ preventDefault() {}, target: form });
    await settle();
    assert.equal(calls.filter((item) => item.operation === 'agent.chat.send').length, 1);
    assert.equal(calls.find((item) => item.operation === 'agent.chat.send').input.message, 'What time?');
    click({ chatClose: '1' });
    assert.doesNotMatch(root.innerHTML, /class="chat-panel"/);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; globalThis.FormData = previous.formData; }
});
