import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticsView } from './diagnostics-view.mjs';

const status = (enabled = false, eventCount = 0) => ({ enabled, eventCount, maxEvents: 200, retentionDays: 7, expiresAt: null });
test('capture is optional, local, bounded and cannot export before stopped review', () => {
  const unavailable = diagnosticsView();
  assert.match(unavailable, /Delete diagnostics/);
  assert.doesNotMatch(unavailable, /Start local capture/);
  const off = diagnosticsView({ status: status() });
  assert.match(off, /Start local capture/);
  assert.match(off, /Nothing is uploaded or sent automatically/);
  assert.match(off, /passwords, tokens and consent links are excluded/);
  assert.match(off, /one hour/); assert.match(off, /200 events/); assert.match(off, /7 days/);
  assert.doesNotMatch(off, /data-diagnostics="export"/);
  assert.match(diagnosticsView({ status: { ...status(), exportExists: true } }), /Delete diagnostics/);
  const active = diagnosticsView({ status: status(true, 2) });
  assert.match(active, /Stop capture/); assert.doesNotMatch(active, /Review diagnostics|Export reviewed report/);
  const stopped = diagnosticsView({ status: status(false, 2) });
  assert.match(stopped, /Review diagnostics/); assert.doesNotMatch(stopped, /Start local capture|Export reviewed report/);
});

test('review exposes exact backend-redacted report; export remains deliberate and all values escaped', () => {
  const report = { events: [{ stage: 'status', outcome: 'failed', code: '<script>bad</script>', provider: 'gmail', timestamp: 0 }] };
  const html = diagnosticsView({ status: status(false, 1), review: { ...report, report, content: JSON.stringify(report), reviewToken: 'opaque-review' }, exported: { path: '/private/<file>.json' } });
  assert.match(html, /Export reviewed report/); assert.match(html, /Exact diagnostic report/);
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Nothing was sent/); assert.match(html, /Copy export path/);
  assert.doesNotMatch(html, /opaque-review/);
});

test('desktop support flow checks status without capturing, requires reviewed token and clears local review on delete', async () => {
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(name, handler) { listeners.set(name, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  let current = status();
  globalThis.document = { querySelector: () => root };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Synthetic' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [] };
    if (operation === 'records.get') return { fields: { Currency: 'USD' } };
    if (operation === 'diagnostics.start') current = status(true);
    if (operation === 'diagnostics.stop') current = status(false, 1);
    if (operation === 'diagnostics.review') return { ...current, events: [], report: { events: [] }, content: '{"events":[]}', reviewToken: 'review-1' };
    if (operation === 'diagnostics.export') return { path: '/synthetic/report.json' };
    if (operation === 'diagnostics.delete') current = status();
    if (operation.startsWith('diagnostics.')) return current;
    return {};
  } } };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const click = async dataset => { listeners.get('click')({ target: { closest: () => ({ dataset }) } }); await settle(); };
  try {
    await import(`./app.mjs?diagnostics=${Date.now()}`); await settle();
    await click({ page: 'settings' });
    assert.deepEqual(calls.filter(call => call.operation.startsWith('diagnostics.')).map(call => call.operation), ['diagnostics.status']);
    await click({ diagnostics: 'export' });
    assert.equal(calls.some(call => call.operation === 'diagnostics.export'), false);
    await click({ diagnostics: 'start' }); await click({ diagnostics: 'review' });
    assert.equal(calls.some(call => call.operation === 'diagnostics.review'), false);
    await click({ diagnostics: 'stop' }); await click({ diagnostics: 'review' }); await click({ diagnostics: 'export' });
    assert.deepEqual(calls.find(call => call.operation === 'diagnostics.export').input, { reviewToken: 'review-1' });
    assert.match(root.innerHTML, /\/synthetic\/report.json/);
    await click({ diagnostics: 'delete' });
    assert.doesNotMatch(root.innerHTML, /\/synthetic\/report.json|Exact diagnostic report/);
    assert.match(root.innerHTML, /Start local capture/);
    assert.equal(calls.some(call => /connections\.(begin|import)|auth.login/.test(call.operation)), false);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; }
});
