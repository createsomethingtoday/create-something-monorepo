import test from 'node:test';
import assert from 'node:assert/strict';

const settle = () => new Promise(resolve => setImmediate(resolve));
async function fixture(run, { storage = new Map(), workspace = 'custom-test', blocked = false } = {}) {
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, storage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage') };
  const listeners = new Map(), calls = [];
  let html = '';
  const controls = new Map();
  const root = { get innerHTML() { return html; }, set innerHTML(value) { html = value; controls.clear(); if (globalThis.document) globalThis.document.activeElement = null; for (const [, id] of value.matchAll(/id="([^"]+)"/g)) controls.set(`#${id}`, { id, tagName: id === 'preferences-import' ? 'TEXTAREA' : 'SELECT', dataset: {}, focus() { globalThis.document.activeElement = this; }, setSelectionRange(start, end, direction) { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; } }); if (value.includes('id="preferences-import-form"')) { const id = value.includes('id="preferences-import-submit"') ? 'preferences-import-submit' : ''; const button = controls.get(`#${id}`) || { id, dataset: {}, focus() { globalThis.document.activeElement = this; } }; button.tagName = 'BUTTON'; controls.set('#preferences-import-form button[type="submit"]', button); } }, classList: { toggle() {} }, addEventListener(name, handler) { const before = listeners.get(name); listeners.set(name, before ? event => { before(event); handler(event); } : handler); }, querySelector(selector) { return controls.get(selector) || null; }, contains(node) { return [...controls.values()].includes(node); }, querySelectorAll(selector) { if (selector === 'input, select, textarea, button, a, summary') return [...controls.values()]; return []; } };
  const element = { dataset: {} };
  globalThis.document = { documentElement: element, querySelector: () => root, addEventListener() {} };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null, setItem(key, value) { if (blocked) throw new Error('Unavailable'); storage.set(key, value); } } });
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: workspace, name: 'Synthetic studio' };
    if (operation === 'records.list') return { total: 1, viewCounts: { upcoming:1, past:0, all:1 }, needsDateCount:0, statusOptions:[], items: input.entity === 'profile' ? [{ id: 'p1' }] : [{ id: 'g1', title: 'Friday session' }], count: 1 };
    if (operation === 'records.get') return { id: input.id, fields: { Currency: 'USD' } };
    return {};
  } } };
  const click = async dataset => { listeners.get('click')({ target: { closest: () => ({ dataset }) } }); await settle(); };
  const change = async (preference, value) => { listeners.get('change')({ target: { dataset: { preference }, value, id: `preference-${preference}` } }); await settle(); };
  try { await import(`./app.mjs?customization=${Math.random()}`); await settle(); await run({ root, element, calls, listeners, click, change, storage }); }
  finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; if (previous.storage) Object.defineProperty(globalThis, 'localStorage', previous.storage); else delete globalThis.localStorage; }
}

test('appearance settings save, apply, survive restart, and reset without record writes', async () => {
  const storage = new Map();
  await fixture(async ({ root, element, calls, click, change }) => {
    await click({ page: 'appearance' });
    assert.match(root.innerHTML, /Make GiGi yours/);
    await change('theme', 'paper');
    await change('density', 'compact');
    await change('startPage', 'gigs');
    await change('collectionView', 'cards');
    assert.equal(element.dataset.theme, 'paper');
    assert.equal(element.dataset.density, 'compact');
    await click({ page: 'gigs' });
    assert.equal(element.dataset.collectionView, 'cards');
    assert.equal(calls.some(call => /save|link|import|restore/.test(call.operation)), false);
  }, { storage });
  await fixture(async ({ root, element, click }) => {
    assert.equal(element.dataset.collectionView, 'cards');
    assert.equal(element.dataset.theme, 'paper');
    await click({ page: 'appearance' });
    await click({ preferencesReset: '1' });
    assert.equal(element.dataset.theme, 'studio');
    assert.equal(element.dataset.density, 'comfortable');
  }, { storage });
});

test('blocked persistence keeps current appearance and explains that saving failed', async () => {
  await fixture(async ({ root, element, click, change }) => {
    await click({ page: 'appearance' });
    await change('theme', 'paper');
    assert.equal(element.dataset.theme, 'studio');
    assert.match(root.innerHTML, /could not|couldn’t|unable|cannot/i);
  }, { blocked: true });
});

test('configuration import validates before saving and export contains presentation settings only', async () => {
  await fixture(async ({ root, element, calls, click, listeners, storage }) => {
    await click({ page: 'appearance' });
    const input = value => listeners.get('input')({ target: { id: 'preferences-import', value } });
    const submit = async () => { listeners.get('submit')({ preventDefault() {}, target: { id: 'preferences-import-form' } }); await settle(); };
    input('{"version":1,"theme":"paper","token":"never-apply"}');
    await submit();
    assert.equal(storage.size, 0);
    assert.equal(element.dataset.theme, 'studio');
    assert.match(root.innerHTML, /unsupported setting/);
    input('{"version":1,"theme":"midnight","density":"compact","scheduleView":"all"}');
    await submit();
    assert.equal(element.dataset.theme, 'midnight');
    assert.equal(element.dataset.density, 'compact');
    await click({ preferencesExport: '1' });
    assert.match(root.innerHTML, /id="preferences-export"/);
    const config = JSON.parse([...storage.values()][0]);
    assert.equal(config.scheduleView, 'all');
    assert.deepEqual(Object.keys(config).sort(), ['chatDensity','chatTextSize','chatWidth','collectionView','density','scheduleView','startPage','theme','version']);
    assert.equal(calls.some(call => /save|import|restore|link/.test(call.operation)), false);
  });
});

test('import recovery keeps focus and selection when an earlier notification expires', async () => {
  const previousTimeout = globalThis.setTimeout;
  const timers = [];
  globalThis.setTimeout = fn => { timers.push(fn); return timers.length; };
  try {
    await fixture(async ({ root, listeners, click }) => {
      await click({ page: 'appearance' });
      await click({ copyRecordValue: 'Synthetic value' });
      listeners.get('input')({ target: { id: 'preferences-import', value: '{broken' } });
      listeners.get('submit')({ preventDefault() {}, target: { id: 'preferences-import-form' } });
      const input = root.querySelector('#preferences-import');
      input.focus(); input.setSelectionRange(2, 5, 'forward'); input.scrollTop = 10;
      timers.at(-1)();
      assert.equal(globalThis.document.activeElement?.id, 'preferences-import');
      assert.equal(globalThis.document.activeElement.selectionStart, 2);
      assert.equal(globalThis.document.activeElement.selectionEnd, 5);
      assert.equal(globalThis.document.activeElement.scrollTop, 10);
      assert.match(root.innerHTML, /\{broken/);
    });
  } finally { globalThis.setTimeout = previousTimeout; }
});

test('blocked preference storage retains focus on the setting that needs recovery', async () => {
  await fixture(async ({ root, click, change }) => {
    await click({ page: 'appearance' });
    root.querySelector('#preference-density').focus();
    await change('density', 'compact');
    assert.equal(globalThis.document.activeElement?.id, 'preference-density');
    assert.match(root.innerHTML, /Could not save preferences/);
  }, { blocked: true });
});


test('appearance route keeps setup separate and card layout preserves Gigs filtering and workspace navigation', async () => {
  await fixture(async ({ root, element, click, change, calls }) => {
    await click({ page: 'settings' });
    assert.match(root.innerHTML, /Choose your next step/);
    assert.doesNotMatch(root.innerHTML, /id="workspace-preferences"/);
    assert.match(root.innerHTML, /data-page="appearance"/);
    assert.match(root.innerHTML, /data-page="music"/);
    assert.match(root.innerHTML, /data-workspace-history/);
    await click({ page: 'appearance' });
    assert.doesNotMatch(root.innerHTML, /Library navigation|landing-page palette/);
    await change('collectionView', 'cards');
    await click({ page: 'gigs' });
    assert.equal(element.dataset.collectionView, 'cards');
    assert.match(root.innerHTML, /data-collection-view="cards"/);
    assert.match(root.innerHTML, /id="gigs-search"/);
    await click({ gigsView: 'past' });
    assert.equal(calls.filter(({ input }) => input.gigs).at(-1).input.gigs.view, 'past');
    await click({ page: 'appearance' });
    await change('theme', 'midnight');
    await click({ page: 'gigs' });
    assert.match(root.innerHTML, /data-gigs-view="past" aria-pressed="true"/);
    assert.match(root.innerHTML, /data-collection-view="cards"/);
    assert.equal(calls.some(({ operation }) => /records.save|relations.link|source.import|backup.restore/.test(operation)), false);
  });
});

test('Schedule selection is saved without changing source connections', async () => {
  const storage = new Map();
  await fixture(async ({ click, calls }) => {
    await click({ page: 'schedule' });
    await click({ scheduleView: 'all' });
    assert.equal(JSON.parse([...storage.values()][0]).scheduleView, 'all');
    assert.equal(calls.some(({ operation }) => /connections|sources|records.save/.test(operation)), false);
  }, { storage });
});


test('successful configuration import retains keyboard focus on its submit control', async () => {
  await fixture(async ({ root, click, listeners }) => {
    await click({ page: 'appearance' });
    listeners.get('input')({ target: { id: 'preferences-import', value: '{"version":1,"theme":"paper"}' } });
    root.querySelector('#preferences-import-form button[type="submit"]').focus();
    listeners.get('submit')({ preventDefault() {}, target: { id: 'preferences-import-form' } });
    await settle();
    assert.equal(globalThis.document.activeElement?.id, 'preferences-import-submit');
  });
});
