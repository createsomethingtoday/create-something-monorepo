import test from 'node:test';
import assert from 'node:assert/strict';

test('Link records reads visible controls when WebView form lookup fails and bubbling never duplicates it', async () => {
  const listeners = new Map();
  const controls = { '#link-entity': { value: 'gigs' }, '#link-role': { value: 'Gigs' }, '#link-record': { value: 'g1' } };
  const linkButton = { dataset: { linkSubmit: '1' }, addEventListener(name, handler) { if (name === 'click') this.onClick = handler; }, closest(selector) { return selector === 'button' ? this : null; } };
  const root = {
    innerHTML: '',
    classList: { toggle() {} },
    addEventListener(name, handler) { listeners.set(name, handler); },
    querySelector(selector) { return selector === '[data-link-submit]' && this.innerHTML.includes('data-link-submit') ? linkButton : this.innerHTML.includes('data-link-submit') ? controls[selector] || null : null; },
  };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, formData: globalThis.FormData };
  const calls = [];
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_name, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Test' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : input.entity === 'contacts' ? [{ id: 'c1', title: 'Alex' }] : input.entity === 'gigs' ? [{ id: 'g1', title: 'September showcase' }] : [], count: 1 };
    if (operation === 'records.get') return { id: input.id, title: input.id === 'c1' ? 'Alex' : 'Profile', fields: input.entity === 'profile' ? { Currency: 'USD' } : {}, relations: [] };
    if (operation === 'schema.describe') return { entity: 'contacts', relationFields: [{ name: 'Gigs', targetEntity: 'gigs' }] };
    if (operation === 'relations.link') return { linked: true };
    return {};
  } } };
  globalThis.FormData = class {
    constructor(form) { this.entries = Object.entries(form.values); }
    [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
  };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset, form) => listeners.get('click')({ target: { closest(selector) { return selector === 'button' ? { dataset, closest: () => form } : form; } } });
  try {
    await import(`./app.mjs?link-test=${Date.now()}`);
    await settle();
    click({ page: 'contacts' }); await settle();
    click({ open: 'c1', entity: 'contacts' }); await settle();
    click({ link: '1' }); await settle();
    assert.match(root.innerHTML, /data-link-submit/);
    assert.equal(typeof linkButton.onClick, 'function', 'Link records needs a direct button listener');
    linkButton.onClick({ preventDefault() {} });
    listeners.get('click')({ target: { closest: () => linkButton } });
    await settle();
    const links = calls.filter(({ operation }) => operation === 'relations.link');
    assert.deepEqual(links.map(({ input }) => input), [{ workspaceId: 'w1', fromEntity: 'contacts', fromId: 'c1', toEntity: 'gigs', toId: 'g1', role: 'Gigs' }]);
  } finally {
    globalThis.document = previous.document;
    globalThis.__TAURI__ = previous.tauri;
    globalThis.FormData = previous.formData;
  }
});
