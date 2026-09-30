import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listFrom, recordFields, editedFields, summaryMoney, gigBalance, fieldOptions, relatedEndpoint, sourcePreview, sourceCanBegin, sourceNeedsOperatorReview, fields, booleanFields, moneyFields, numericFields } from './model.mjs';

test('every editable detail belongs to the reviewed relational field catalog', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src-tauri/migrations/notion_fields.json', import.meta.url), 'utf8'));
  for (const [entity, names] of Object.entries(fields)) {
    for (const name of names) assert.ok(Object.hasOwn(catalog[entity].fields, name), `${entity}.${name} is absent from catalog`);
  }
  for (const key of booleanFields) { const [entity, ...parts] = key.split('.'); assert.equal(catalog[entity].fields[parts.join('.')], 'Checkbox', key); }
  for (const name of moneyFields) assert.ok(Object.values(catalog).some((entity) => entity.fields[name] === 'Number (currency)'), name);
  for (const name of numericFields) assert.ok(Object.values(catalog).some((entity) => entity.fields[name]?.startsWith('Number')), name);
});

test('record list accepts the domain envelope and preserves linked records', () => {
  assert.deepEqual(listFrom({ records: [{ id: 'g1', title: 'Show', relations: [{ toEntity: 'contacts', toId: 'c1' }] }] }), [{ id: 'g1', title: 'Show', relations: [{ toEntity: 'contacts', toId: 'c1' }] }]);
});

test('editor sends canonical catalog fields, integer cents, and excludes blank values', () => {
  assert.deepEqual(recordFields({ Status: ' confirmed ', Date: '', Fee: '250.50' }), { Status: 'confirmed', Fee: 25050 });
  assert.throws(() => recordFields({ Fee: '12.345' }), /two decimal/);
  assert.deepEqual(editedFields({ Source: 'manual', Status: 'Open', Fee: 1200 }, { Status: '', Fee: '25' }, 'gigs'), { Source: 'manual', Fee: 2500 });
});

test('money is not invented when a summary has no financial facts', () => {
  assert.equal(summaryMoney({}), '—');
  assert.equal(summaryMoney({ balanceDueCents: 25050 }, 'USD'), '$250.50');
  assert.equal(summaryMoney({ balanceDueCents: 25050 }), '250.50 (currency unset)');
  assert.match(summaryMoney({ balanceDueCents: 25050 }, 'JPY'), /unsupported currency JPY/);
});

test('finance editor exposes domain accepted enums and partial gig balance stays unquantified', () => {
  assert.deepEqual(fieldOptions('finances', 'Direction'), ['Income', 'Expense']);
  assert.deepEqual(fieldOptions('finances', 'Status'), ['Expected', 'Invoiced', 'Paid', 'Overdue']);
  assert.equal(gigBalance({ balanceDueCents: 25050, financialsComplete: false, currency: 'USD' }), 'Incomplete');
  assert.equal(gigBalance({ balanceDueCents: 25050, financialsComplete: true, currency: 'USD' }), '$250.50');
});

test('linked detail navigates to the other endpoint in either direction', () => {
  const relation = { fromEntity: 'gigs', fromId: 'g1', fromTitle: 'Friday set', role: 'Contacts', toEntity: 'contacts', toId: 'c1', toTitle: 'Alex' };
  assert.deepEqual(relatedEndpoint(relation, 'gigs', 'g1'), { entity: 'contacts', id: 'c1', title: 'Alex', role: 'Contacts' });
  assert.deepEqual(relatedEndpoint(relation, 'contacts', 'c1'), { entity: 'gigs', id: 'g1', title: 'Friday set', role: 'Contacts' });
  assert.equal(relatedEndpoint(relation, 'tasks', 't1'), null);
});

test('import source text has human labels and stays separate from record facts', () => {
  assert.deepEqual(sourcePreview({ provider: 'gmail', preview: { from: 'Alex', snippet: 'Call at six' } }), [{ label: 'Sender', value: 'Alex' }, { label: 'Excerpt', value: 'Call at six' }]);
  assert.deepEqual(sourcePreview({ provider: 'googlecalendar', preview: { location: 'Club', description: 'Load in' } }), [{ label: 'Location', value: 'Club' }, { label: 'Description', value: 'Load in' }]);
});

test('only a verified terminal connection receipt permits a fresh consent attempt', () => {
  assert.equal(sourceCanBegin({ state: 'disconnected' }), true);
  assert.equal(sourceCanBegin({ state: 'pending' }), false);
  assert.equal(sourceCanBegin({ state: 'attention' }), false);
  assert.equal(sourceCanBegin({ state: 'attention', reconnectable: false }), false);
  assert.equal(sourceCanBegin({ state: 'attention', reconnectable: true }), true);
  assert.equal(sourceCanBegin({ state: 'connected', reconnectable: true }), false);
});

test('uncertain consent recovery asks for operator review and never offers a new attempt', () => {
  const unknown = { state: 'attention', recovery: 'operator_review' };
  assert.equal(sourceNeedsOperatorReview(unknown), true);
  assert.equal(sourceCanBegin(unknown), false);
  assert.equal(sourceCanBegin({ ...unknown, reconnectable: true }), false);
  assert.equal(sourceNeedsOperatorReview({ state: 'attention', reconnectable: true }), false);
  assert.equal(sourceNeedsOperatorReview({ state: 'pending', recovery: 'operator_review' }), false);
});
