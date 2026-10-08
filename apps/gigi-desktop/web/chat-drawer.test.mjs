import test from 'node:test';
import assert from 'node:assert/strict';

test('Ask GiGi opens once, updates its mounted drawer during status changes, and Escape closes it', async () => {
  const listeners = new Map();
  let markup = '', pageWrites = 0, focusReturned = false, panelMounted = false, insertedMarkup = '';
  const contentNode = { scrollTop: 137 };
  const panel = { innerHTML: '', querySelector() { return null; }, remove() { panelMounted = false; } };
  const shellNode = { insertAdjacentHTML(position, value) { assert.equal(position, 'beforeend'); insertedMarkup = value; panelMounted = true; } };
  const root = {
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = value; pageWrites++; panelMounted = value.includes('class="chat-panel'); },
    classList: { toggle() {} },
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelector(selector) {
      if (selector === '.shell') return markup.includes('class="shell"') ? shellNode : null;
      if (selector === '.content-primary') return contentNode;
      if (selector === '.chat-panel') return panelMounted ? panel : null;
      if (selector === '[data-chat-open]') return { focus() { focusReturned = true; } };
      return null;
    },
  };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    if (operation === 'workspace.get') return { id: 'w1', name: 'Private' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [] };
    if (operation === 'records.get') return { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } };
    if (operation === 'agent.chat.status') return { provider: 'codex', available: true, authenticated: true };
    if (operation === 'agent.chat.list') return { sessions: [] };
    return {};
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  try {
    await import(`./app.mjs?chat-drawer=${Date.now()}`); await settle();
    const writesBeforeOpen = pageWrites;
    const retainedContent = root.querySelector('.content-primary');
    listeners.get('click')({ target: { closest: () => ({ dataset: { chatOpen: '1' } }) } });
    const writesOnOpen = pageWrites;
    assert.equal(writesOnOpen, writesBeforeOpen, 'opening the drawer must preserve the workspace DOM');
    assert.match(insertedMarkup, /class="chat-panel chat-entering"/);
    assert.equal(root.querySelector('.content-primary'), retainedContent);
    assert.equal(retainedContent.scrollTop, 137);
    await settle();
    assert.equal(pageWrites, writesOnOpen, 'status update should not rebuild the page or reopen the drawer');
    assert.match(panel.innerHTML, /Codex signed in/);
    assert.doesNotMatch(markup, /content-with-chat/);
    let prevented = false;
    listeners.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(focusReturned, true);
    assert.equal(panelMounted, false);
    assert.equal(pageWrites, writesBeforeOpen, 'closing the drawer must preserve the workspace DOM');
    assert.equal(root.querySelector('.content-primary'), retainedContent);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; }
});
