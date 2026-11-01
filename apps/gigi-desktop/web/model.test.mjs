import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listFrom, recordFields, editedFields, summaryMoney, gigBalance, fieldOptions, relatedEndpoint, sourcePreview, sourceCanBegin, sourceNeedsOperatorReview, importRunForAccount, nextImportCursor, pendingConsentForProvider, pendingAccountForProvider, linkInput, fields, booleanFields, moneyFields, numericFields } from './model.mjs';

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
  assert.deepEqual(relatedEndpoint(relation, 'contacts', 'c1'), { entity: 'gigs', id: 'g1', title: 'Friday set', role: null });
  assert.deepEqual(relatedEndpoint({ fromEntity: 'contacts', fromId: 'c1', fromTitle: 'Alex', role: 'Gigs', toEntity: 'gigs', toId: 'g1', toTitle: 'Friday set' }, 'gigs', 'g1'), { entity: 'contacts', id: 'c1', title: 'Alex', role: null });
  assert.equal(relatedEndpoint(relation, 'tasks', 't1'), null);
});

test('People to Gigs link captures selected values before UI rerender and rejects incomplete forms explicitly', () => {
  assert.deepEqual(linkInput({ entity: 'gigs', role: 'Gigs', id: 'gig-1' }, 'contacts', 'contact-1'), {
    fromEntity: 'contacts', fromId: 'contact-1', toEntity: 'gigs', toId: 'gig-1', role: 'Gigs'
  });
  assert.throws(() => linkInput({ entity: 'gigs', role: 'Gigs', id: '' }, 'contacts', 'contact-1'), /Choose a record/);
  assert.throws(() => linkInput({ entity: 'gigs', role: '', id: 'gig-1' }, 'contacts', 'contact-1'), /relationship/);
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

test('source import cursor never crosses connected accounts', () => {
  const run = { accountId: 'ca_old', cursor: 'page-1', result: { complete: true, nextCursor: 'page-2' } };
  assert.equal(importRunForAccount(run, 'ca_old'), run);
  assert.equal(nextImportCursor(run, 'ca_old'), 'page-2');
  assert.equal(importRunForAccount(run, 'ca_new'), null);
  assert.equal(nextImportCursor(run, 'ca_new'), undefined);
  assert.equal(nextImportCursor({ accountId: 'ca_old', cursor: 'page-1', result: { complete: false, retryCursor: 'page-1' } }, 'ca_old'), 'page-1');
});

test('pending consent resumes from exact provider status after restart without exposing other provider attempts', () => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  const gmail = { provider: 'gmail', state: 'pending', connectedAccountId: 'ca_gmail', url: 'https://connect.composio.dev/gmail', expiresAt: '2026-09-30T12:05:00Z' };
  const calendar = { provider: 'googlecalendar', state: 'pending', connectedAccountId: 'ca_calendar' };
  const attempts = { googlecalendar: { connectedAccountId: 'ca_calendar', status: 'awaiting_consent', url: 'https://connect.composio.dev/calendar', expiresAt: '2026-09-30T12:05:00Z' } };
  assert.equal(pendingConsentForProvider(gmail, {}, 'gmail', now), gmail.url);
  assert.equal(pendingConsentForProvider(calendar, attempts, 'googlecalendar', now), attempts.googlecalendar.url);
  assert.equal(pendingConsentForProvider(calendar, attempts, 'gmail', now), null);
  assert.equal(pendingAccountForProvider(gmail, 'gmail'), 'ca_gmail');
  assert.equal(pendingAccountForProvider(calendar, 'gmail'), null);
  assert.equal(pendingAccountForProvider({ provider: 'googlecalendar', state: 'pending' }, 'googlecalendar'), null);
  assert.equal(pendingConsentForProvider({ provider: 'googlecalendar', state: 'pending' }, attempts, 'googlecalendar', now), null);
});

test('expired, mismatched, or unsafe consent URLs never show a resume action', () => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  const pending = { provider: 'gmail', state: 'pending', connectedAccountId: 'ca_new' };
  const attempt = { connectedAccountId: 'ca_old', status: 'awaiting_consent', url: 'https://connect.composio.dev/old', expiresAt: '2026-09-30T12:05:00Z' };
  assert.equal(pendingConsentForProvider(pending, { gmail: attempt }, 'gmail', now), null);
  assert.equal(pendingConsentForProvider({ ...pending, url: 'https://connect.composio.dev:8443/x', expiresAt: '2026-09-30T12:05:00Z' }, {}, 'gmail', now), null);
  assert.equal(pendingConsentForProvider({ ...pending, url: 'https://connect.composio.dev/x', expiresAt: '2026-09-30T11:59:59Z' }, {}, 'gmail', now), null);
  assert.equal(pendingConsentForProvider({ provider: 'gmail', state: 'attention', url: 'https://connect.composio.dev/x', expiresAt: '2026-09-30T12:05:00Z' }, {}, 'gmail', now), null);
});
