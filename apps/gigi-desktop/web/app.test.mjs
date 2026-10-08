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

test('editing a gig replaces its fields so cleared fee, status, and date are removed', async () => {
  const listeners = new Map();
  const calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, formData: globalThis.FormData };
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Test' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : input.entity === 'gigs' ? [{ id: 'g1', title: 'Friday show' }] : [], count: 1 };
    if (operation === 'records.get') return input.entity === 'profile'
      ? { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } }
      : { id: 'g1', title: 'Friday show', fields: { Source: 'manual', Status: 'Open', Date: '2026-10-02', Fee: 1200, Requirements: 'Bring keys' }, source: { kind: 'manual' }, relations: [] };
    if (operation === 'records.save') return { id: 'g1', title: input.title, fields: input.fields };
    return {};
  } } };
  globalThis.FormData = class {
    constructor(form) { this.entries = Object.entries(form.values); }
    [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
  };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  try {
    await import(`./app.mjs?edit-clear-test=${Date.now()}`);
    await settle();
    click({ page: 'gigs' }); await settle();
    click({ open: 'g1', entity: 'gigs' }); await settle();
    click({ edit: '1' }); await settle();
    assert.match(root.innerHTML, /id="record-form"/);
    listeners.get('submit')({ preventDefault() {}, target: { id: 'record-form', values: { title: 'Friday show', Status: '', Date: '', Fee: '', Requirements: 'Bring keys' } } });
    await settle();
    const save = calls.find(({ operation }) => operation === 'records.save');
    assert.deepEqual(save?.input, { workspaceId: 'w1', entity: 'gigs', id: 'g1', title: 'Friday show', fieldsMode: 'replace', fields: { Source: 'manual', Requirements: 'Bring keys' }, expectedRecord: { title: 'Friday show', fields: { Source: 'manual', Status: 'Open', Date: '2026-10-02', Fee: 1200, Requirements: 'Bring keys' }, source: { kind: 'manual' } } });
  } finally {
    globalThis.document = previous.document;
    globalThis.__TAURI__ = previous.tauri;
    globalThis.FormData = previous.formData;
  }
});

test('stale editor save keeps typed values and explains how to reload', async () => {
  const listeners = new Map();
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, formData: globalThis.FormData };
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    if (operation === 'workspace.get') return { id: 'w1', name: 'Test' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [{ id: 'g1', title: 'Show' }], count: 1 };
    if (operation === 'records.get') return input.entity === 'profile' ? { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } } : { id: 'g1', title: 'Show', fields: { Requirements: 'Old detail' }, source: { kind: 'manual' }, relations: [] };
    if (operation === 'records.save') throw new Error('record changed since it was opened; reload before saving');
    return {};
  } } };
  globalThis.FormData = class { constructor(form) { this.entries = Object.entries(form.values); } [Symbol.iterator]() { return this.entries[Symbol.iterator](); } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  try {
    await import(`./app.mjs?stale-edit-test=${Date.now()}`);
    await settle();
    click({ page: 'gigs' }); await settle();
    click({ open: 'g1', entity: 'gigs' }); await settle();
    click({ edit: '1' }); await settle();
    listeners.get('submit')({ preventDefault() {}, target: { id: 'record-form', values: { title: 'My unsaved title', Requirements: 'My unsaved detail' } } });
    await settle();
    assert.match(root.innerHTML, /value="My unsaved title"/);
    assert.match(root.innerHTML, /My unsaved detail/);
    assert.match(root.innerHTML, /record changed.*reload/i);
    assert.match(root.innerHTML, /id="record-form"/);
  } finally {
    globalThis.document = previous.document;
    globalThis.__TAURI__ = previous.tauri;
    globalThis.FormData = previous.formData;
  }
});

test('connector sign-in explains provider outages and timeouts without exposing error codes', async () => {
  const listeners = new Map();
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  let failure = 'provider_unavailable';
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    if (operation === 'workspace.get') return { id: 'w1', name: 'Test' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [], count: 0 };
    if (operation === 'records.get') return { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } };
    if (operation === 'connections.status') return { provider: input.provider, state: 'disconnected' };
    if (operation === 'agent.status') return {};
    if (operation === 'auth.login') throw new Error(failure);
    return {};
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  try {
    await import(`./app.mjs?signin-error-test=${Date.now()}`);
    await settle();
    click({ page: 'settings' }); await settle();
    click({ signIn: '1' }); await settle();
    assert.match(root.innerHTML, /temporarily unavailable.*try again/i);
    assert.doesNotMatch(root.innerHTML, /provider_unavailable/);

    failure = 'timeout';
    click({ signIn: '1' }); await settle();
    assert.match(root.innerHTML, /timed out.*try again/i);
    assert.doesNotMatch(root.innerHTML, /\btimeout\b/i);
  } finally {
    globalThis.document = previous.document;
    globalThis.__TAURI__ = previous.tauri;
  }
});

test('source card explains an in-progress session refresh and keeps manual status recovery available', async () => {
  const listeners = new Map();
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  let gmailDetail = 'refresh_in_progress';
  globalThis.document = { querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    if (operation === 'workspace.get') return { id: 'w1', name: 'Test' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [], count: 0 };
    if (operation === 'records.get') return { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } };
    if (operation === 'connections.status') return input.provider === 'gmail'
      ? { provider: 'gmail', state: 'unavailable', detail: gmailDetail }
      : { provider: 'googlecalendar', state: 'connected', connectedAccountId: 'ca_calendar' };
    if (operation === 'agent.status') return {};
    return {};
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  try {
    await import(`./app.mjs?source-refresh-test=${Date.now()}`);
    await settle();
    click({ page: 'settings' }); await settle();
    assert.match(root.innerHTML, /Connector session is refreshing\. Check status again shortly\./);
    assert.doesNotMatch(root.innerHTML, /refresh_in_progress/);
    assert.match(root.innerHTML, /data-source-refresh="gmail"><svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>Check status<\/button>/);
    assert.doesNotMatch(root.innerHTML, /data-source-begin="gmail"/);
    assert.match(root.innerHTML, /1 of 2 verified/);

    gmailDetail = 'Unusual <source> outage';
    click({ sourceRefresh: 'gmail' }); await settle();
    assert.match(root.innerHTML, /Unusual &lt;source&gt; outage/);
  } finally {
    globalThis.document = previous.document;
    globalThis.__TAURI__ = previous.tauri;
  }
});

test('Overview shows actionable workspace data, opens its records, and keeps library navigation available', async () => {
  const listeners = new Map(); const calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, scrollTo: globalThis.scrollTo };
  const scrolls = []; globalThis.scrollTo = (...args) => scrolls.push(args);
  globalThis.document = { querySelector: () => root };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Private' };
    if (operation === 'workspace.overview') return { counts: { gigs: 28, tasks: 7, contacts: 2, finances: 3 }, undatedGigsCount: 2, gigs: { items: [{ id: 'g1', title: 'Upcoming show', date: '2026-10-02', status: 'Confirmed' }], count: 6 }, tasks: { items: [{ id: 't1', title: 'Follow up', date: '2026-09-29', status: 'Open' }], count: 4 }, finances: { items: [{ id: 'f1', title: 'Venue expense', status: 'Expected', moneyCents: 9000, fields: { Direction: 'Expense' } }], count: 2 } };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [], count: input.entity === 'profile' ? 1 : 0 };
    if (operation === 'records.get') return { id: input.id, title: input.entity === 'profile' ? 'Owner' : 'Venue expense', fields: input.entity === 'profile' ? { Currency: 'USD' } : { Amount: 9000, Direction: 'Expense', 'Due Date': '2026-10-02', Custom: 'Retained' }, relations: [] };
    return {};
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const click = (dataset) => listeners.get('click')({ target: { closest: () => ({ dataset }) } });
  try {
    await import(`./app.mjs?overview-test=${Date.now()}`); await settle();
    assert.match(root.innerHTML, /Upcoming work/); assert.match(root.innerHTML, /Upcoming show/);
    assert.match(root.innerHTML, /Open tasks/); assert.match(root.innerHTML, /Follow up/);
    assert.match(root.innerHTML, /Expense · \$90\.00/);
    assert.match(root.innerHTML, /Showing 1 of 6 matching records · 2 without a usable date/);
    assert.match(root.innerHTML, /<details class="nav-library" data-library-nav="1" >/);
    assert.equal(calls.filter(({operation}) => operation === 'workspace.overview').length, 1);
    const beforeNavigation = scrolls.length;
    click({ open: 'f1', entity: 'finances' }); await settle();
    assert.ok(scrolls.length > beforeNavigation);
    assert.deepEqual(scrolls.at(-1), [0, 0]);
    assert.match(root.innerHTML, /Venue expense/); assert.match(root.innerHTML, /Fri, Oct 2, 2026/);
    assert.match(root.innerHTML, /More details \(1\)/); assert.match(root.innerHTML, /Retained/);
    listeners.get('toggle')({target:{dataset:{libraryNav:'1'},open:true}});
    click({ page: 'services' }); await settle();
    assert.match(root.innerHTML, /data-library-nav="1" open/);
    assert.match(root.innerHTML, /Add your first service/);
    click({ new: 'services' });
    assert.match(root.innerHTML, /id="record-form"/);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; globalThis.scrollTo = previous.scrollTo; }
});


test('saving with the native submit button focused writes once and clears the busy state', async () => {
  const listeners = new Map(), calls = [];
  let loading = false;
  const form = { id: 'record-form', dataset: {}, values: { title: 'Saved native task', Status: 'Open', 'Due Date': '2026-10-09', Priority: 'High' } };
  const root = {
    innerHTML: '', classList: { toggle(_name, value) { loading = value; } },
    addEventListener(name, handler) { listeners.set(name, handler); },
    querySelector(selector) {
      if (selector === '#') throw new SyntaxError('Invalid selector');
      if (selector === '#record-form' && this.innerHTML.includes('id="record-form"')) {
        form.dataset.editorVersion = this.innerHTML.match(/data-editor-version="(\d+)"/)[1];
        return form;
      }
      return null;
    }
  };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, formData: globalThis.FormData };
  let saved = { id: 't1', title: 'Original task', fields: { Status: 'Open', Priority: 'High' }, source: { kind: 'manual' }, relations: [] };
  globalThis.document = { querySelector: () => root, activeElement: null };
  globalThis.FormData = class { constructor(value) { this.entries = Object.entries(value.values); } [Symbol.iterator]() { return this.entries[Symbol.iterator](); } };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Synthetic' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [saved], count: 1 };
    if (operation === 'records.get') return input.entity === 'profile' ? { id: 'p1', fields: { Currency: 'USD' } } : saved;
    if (operation === 'records.save') { saved = { ...saved, title: input.title, fields: input.fields }; return saved; }
    return {};
  } } };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const click = async dataset => { listeners.get('click')({ target: { closest: () => ({ dataset }) } }); await settle(); };
  try {
    await import(`./app.mjs?native-submit=${Math.random()}`); await settle();
    await click({ page: 'tasks' }); await click({ open: 't1', entity: 'tasks' }); await click({ edit: '1' });
    globalThis.document.activeElement = { id: '', form };
    listeners.get('submit')({ preventDefault() {}, target: form }); await settle();
    assert.equal(calls.filter(call => call.operation === 'records.save').length, 1);
    assert.equal(saved.title, 'Saved native task');
    assert.equal(saved.fields['Due Date'], '2026-10-09');
    assert.equal(loading, false);
    assert.doesNotMatch(root.innerHTML, /id="record-form"/);
    assert.match(root.innerHTML, /task saved/);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; globalThis.FormData = previous.formData; }
});
