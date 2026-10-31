import test from 'node:test';
import assert from 'node:assert/strict';

test('desktop exposes durable attention and starts workspace observation outside chat', async () => {
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(type, fn) { listeners.set(type, fn); }, querySelector() { return null; } };
  globalThis.document = { querySelector: () => root, addEventListener() {}, hasFocus: () => true };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Synthetic' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [] };
    if (operation === 'records.get') return { id: 'p1', title: 'Synthetic owner', fields: { Currency: 'USD' } };
    if (operation === 'agent.chat.list') return { sessions: [] };
    if (operation.startsWith('attention.')) return { items: [], unreadCount: 0, settings: { enabled: false, reminders: false, detailedPreviews: false, quietStart: 22, quietEnd: 8 } };
    return {};
  } } };
  try {
    await import(`./app.mjs?attention=${Date.now()}`);
    for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
    assert.match(root.innerHTML, /Needs your attention/);
    assert.match(root.innerHTML, /data-attention-home/);
    assert(calls.some(call => call.operation === 'attention.refresh' && call.input.workspaceId === 'w1'));
    assert(!calls.some(call => ['agent.chat.start', 'agent.chat.send', 'agent.chat.approve', 'notifications.request'].includes(call.operation)), 'observation cannot start paid turns, edits or permission prompts');
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; }
});
