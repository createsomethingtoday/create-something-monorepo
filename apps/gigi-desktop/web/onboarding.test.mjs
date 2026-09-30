import test from 'node:test';
import assert from 'node:assert/strict';

test('fresh workspace leads to optional setup without automatically signing in, connecting accounts or preparing an agent', async () => {
  const listeners = new Map();
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const prior = { document: globalThis.document, tauri: globalThis.__TAURI__, FormData: globalThis.FormData };
  const calls = [];
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.FormData = class { constructor(form) { this.values = Object.entries(form.values); } [Symbol.iterator]() { return this.values[Symbol.iterator](); } };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return null;
    if (operation === 'workspace.create') return { id: 'w-new', name: input.name };
    if (operation === 'records.save') return { id: 'profile-new', ...input };
    if (operation === 'connections.status') return { provider: input.provider, state: 'disconnected' };
    if (operation === 'agent.status') return { prepared: false, phoneVerified: false };
    return { items: [], count: 0 };
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  try {
    await import(`./app.mjs?first-run=${Date.now()}`); await settle();
    assert.match(root.innerHTML, /id="workspace-form"/);
    const submit = () => listeners.get('submit')({ preventDefault() {}, target: { id: 'workspace-form', values: { name: 'Tour crew', ownerName: 'Alex', currency: 'USD' } } });
    submit(); submit();
    await settle();
    assert.match(root.innerHTML, /data-page="settings" aria-current="page"/);
    assert.match(root.innerHTML, /data-new="gigs"/);
    assert.match(root.innerHTML, /data-sign-in="1"/);
    assert.match(root.innerHTML, /data-prepare-agent="1"/);
    assert.equal(calls.filter(({ operation }) => ['auth.login', 'connections.begin', 'agent.prepare', 'sources.import'].includes(operation)).length, 0);
    assert.equal(calls.filter(({ operation }) => operation === 'workspace.create').length, 1);
    assert.equal(calls.filter(({ operation }) => operation === 'records.save').length, 1);
  } finally { globalThis.document = prior.document; globalThis.__TAURI__ = prior.tauri; globalThis.FormData = prior.FormData; }
});

test('provider choice shows and copies only that exact prepared command; preparing never claims installation or phone access', async () => {
  const listeners = new Map();
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator') };
  const copies = []; const calls = [];
  const agent = { packagePath: '/tmp/Alex workspace/agent/gigi', codexCommand: "codex mcp add gigi --env 'GIGI_DATA_DIR=/tmp/Alex workspace' -- '/tmp/GiGi.app/gigi-mcp'", claudeCommand: "claude --plugin-dir '/tmp/Alex workspace/agent/gigi'", starterPrompt: 'Actually call gigi_workspace_get. Do not change records.', installed: false, state: 'prepared' };
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (value) => copies.push(value) } } });
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push(operation);
    if (operation === 'workspace.get') return { id: 'w1', name: 'Alex workspace' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [], count: 0 };
    if (operation === 'records.get') return { id: 'p1', fields: { Currency: 'USD' } };
    if (operation === 'connections.status') return { provider: input.provider, state: 'disconnected' };
    if (operation === 'agent.prepare') return agent;
    if (operation === 'agent.status') return { prepared: calls.includes('agent.prepare'), phoneVerified: false };
    return {};
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  try {
    await import(`./app.mjs?provider-choice=${Date.now()}`); await settle();
    click({ page: 'settings' }); await settle();
    assert.match(root.innerHTML, /data-agent-provider="claude"/);
    click({ agentProvider: 'claude' });
    assert.equal(calls.includes('agent.prepare'), false);
    click({ prepareAgent: '1' }); await settle();
    assert.match(root.innerHTML, /claude --plugin-dir/);
    assert.doesNotMatch(root.innerHTML, /codex mcp add/);
    assert.match(root.innerHTML, /Prepared.*Not verified/);
    assert.match(root.innerHTML, /Needs device test/);
    click({ copyAgent: 'command' }); await settle();
    click({ copyAgent: 'prompt' }); await settle();
    assert.deepEqual(copies, [agent.claudeCommand, agent.starterPrompt]);
    click({ agentProvider: 'codex' });
    assert.match(root.innerHTML, /codex mcp add/);
    assert.doesNotMatch(root.innerHTML, /claude --plugin-dir/);
    click({ copyAgent: 'command' }); await settle();
    assert.equal(copies.at(-1), agent.codexCommand);
    assert.equal(calls.filter((op) => op === 'agent.prepare').length, 1);
    navigator.clipboard.writeText = async () => { throw new Error('clipboard denied'); };
    click({ copyAgent: 'command' }); await settle();
    assert.match(root.innerHTML, /Could not copy.*Select and copy/);
    assert.match(root.innerHTML, /codex mcp add/);
  } finally {
    globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri;
    if (previous.navigator) Object.defineProperty(globalThis, 'navigator', previous.navigator); else delete globalThis.navigator;
  }
});

test('profile save failure keeps typed defaults and resumes the existing workspace on retry', async () => {
  const listeners = new Map();
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, FormData: globalThis.FormData };
  let creates = 0; let saves = 0;
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.FormData = class { constructor(form) { this.values = Object.entries(form.values); } [Symbol.iterator]() { return this.values[Symbol.iterator](); } };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    if (operation === 'workspace.get') return null;
    if (operation === 'workspace.create') { creates++; return { id: 'w1', name: input.name }; }
    if (operation === 'records.save') { saves++; if (saves === 1) throw new Error('Temporary profile save failure'); return { id: 'p1', ...input }; }
    if (operation === 'connections.status') return { provider: input.provider, state: 'disconnected' };
    if (operation === 'agent.status') return {};
    return { items: [], count: 0 };
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const submit = () => listeners.get('submit')({ preventDefault() {}, target: { id: 'workspace-form', values: { name: 'Tour crew', ownerName: 'Alex', currency: 'CAD' } } });
  try {
    await import(`./app.mjs?setup-retry=${Date.now()}`); await settle();
    submit(); await settle();
    assert.match(root.innerHTML, /Finish your profile/);
    assert.match(root.innerHTML, /value="Alex"/);
    assert.match(root.innerHTML, /value="CAD" selected/);
    assert.doesNotMatch(root.innerHTML, /id="workspace-name"/);
    submit(); await settle();
    assert.match(root.innerHTML, /data-page="settings" aria-current="page"/);
    assert.equal(creates, 1); assert.equal(saves, 2);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; globalThis.FormData = previous.FormData; }
});
