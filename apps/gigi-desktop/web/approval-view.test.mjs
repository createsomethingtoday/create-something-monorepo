import test from 'node:test';
import assert from 'node:assert/strict';
import { chatView } from './chat.mjs';
function view(args, currency = 'USD') {
  return chatView({ visible: true, status: { available: true, authenticated: true }, sessions: [], record: null, draft: '', currency,
    current: { state: 'approval', approvals: [{ id: 'a1', title: 'Approve gigi_records_save', detail: JSON.stringify(args) }] } });
}
const args = (extra = {}) => ({ entity: 'gigs', id: 'synthetic-gig', title: 'Existing gig', fields: {}, expectedRecord: { title: 'Existing gig', fields: { Status: 'Open', Fee: 9000, Date: '2026-10-03' }, source: { kind: 'manual' } }, ...extra });
const comparison = (html) => html.split('<details>')[0];

test('approval shows only structural changes including title, with exact before/after money and date semantics', () => {
  const html = view(args({ title: '  Renamed gig  ', fields: { Status: 'Open', Fee: 12550, Date: '2026-10-04' } }));
  const copy = comparison(html);
  assert.match(copy, /Review record changes/);
  assert.match(copy, /gigs · Existing gig/);
  assert.match(copy, /<caption>Proposed changes<\/caption>/);
  assert.match(copy, /scope="col">Before/); assert.match(copy, /scope="col">After/);
  assert.match(copy, /scope="row">Title<\/th><td>Existing gig<\/td><td>Renamed gig/);
  assert.match(copy, /\$90\.00 USD/); assert.match(copy, /\$125\.50 USD/);
  assert.match(copy, /Sat, Oct 3, 2026/); assert.match(copy, /Sun, Oct 4, 2026/);
  assert.doesNotMatch(copy, /scope="row">Status/);
  assert.match(html, />Approve changes<\/button>/); assert.match(html, />Reject changes<\/button>/);
  assert.match(html, /Technical details/); assert.match(html, /12550/);
});

test('replace shows every removal; merge omission stays unchanged; null is cleared and empty string remains literal', () => {
  const base = args({ expectedRecord: { title: 'Existing gig', fields: { Requirements: 'Old notes', Status: 'Open', Type: 'Show' }, source: { kind: 'manual' } } });
  const replace = comparison(view({ ...base, fieldsMode: 'replace', fields: { Status: null, Type: '', Added: false } }));
  assert.match(replace, /Requirements<\/th><td>Old notes<\/td><td>Removed/);
  assert.match(replace, /Status<\/th><td>Open<\/td><td>Cleared \(null\)/);
  assert.match(replace, /Type<\/th><td>Show<\/td><td>\(empty string\)/);
  assert.match(replace, /Added<\/th><td>Not set<\/td><td>No/);
  const merge = comparison(view({ ...base, fields: { Status: 'Done' } }));
  assert.doesNotMatch(merge, /Requirements<\/th>/); assert.doesNotMatch(merge, /Removed/);
});

test('objects compare structurally, arrays retain order, and more than twenty changed fields are not truncated', () => {
  const before = { Detail: { one: 1, two: { x: 2, y: 3 } }, Array: ['a', 'b'] };
  const fields = { Detail: { two: { y: 3, x: 2 }, one: 1 }, Array: ['b', 'a'], ...Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`Changed ${i}`, i])) };
  const copy = comparison(view(args({ fields, expectedRecord: { title: 'Existing gig', fields: before, source: { kind: 'manual' } } })));
  assert.doesNotMatch(copy, /scope="row">Detail/); assert.match(copy, /scope="row">Array/);
  assert.match(copy, /scope="row">Changed 24/); assert.equal((copy.match(/scope="row"/g) || []).length, 26);
});

test('missing or malformed snapshots explicitly lack current values and cannot claim changed-only', () => {
  for (const expectedRecord of [undefined, {}, { title: 'Bad', fields: [], source: {} }]) {
    const copy = comparison(view({ entity: 'tasks', title: 'Proposed', fields: { Status: 'Open' }, expectedRecord }));
    assert.match(copy, /Current values unavailable/); assert.match(copy, /Proposed values/);
    assert.doesNotMatch(copy, /Proposed changes/); assert.doesNotMatch(copy, /Not set/);
    assert.match(copy, /scope="row">Status/);
  }
});

test('currency codes are explicit, unset is honest, and invalid minor-unit types are never coerced', () => {
  assert.match(comparison(view(args({ fields: { Fee: 12345 } }), 'CAD')), /CA\$123\.45 CAD/);
  assert.match(comparison(view(args({ fields: { Fee: 12345 } }), null)), /123\.45 \(currency unset\)/);
  for (const value of ['9000', true, {}, 1.2, 9007199254740992]) {
    const copy = comparison(view(args({ fields: { Fee: value } })));
    assert.match(copy, /invalid minor-unit value/);
  }
});

test('offset dates retain their recorded day and precision remains in technical detail; source normalization matches the domain', () => {
  const original = { kind: 'import', provider: 'gmail', externalId: 'synthetic' };
  const html = view(args({ fields: { 'Call Time': '2026-10-03T23:30:00.123456-05:00' }, source: { kind: 'manual' }, expectedRecord: { title: 'Existing gig', fields: {}, source: original } }));
  const copy = comparison(html);
  assert.match(copy, /Oct 3, 2026/); assert.match(copy, /11:30:00\.123 PM \(UTC-05:00\)/);
  assert.match(html, /123456-05:00/);
  assert.match(copy, /scope="row">Source/); assert.match(copy, /&quot;origin&quot;/);
});

test('all provider-controlled values, field names and technical arguments remain escaped', () => {
  const html = view(args({ title: '<script>title</script>', fields: { '<img src=x>': '<b>after</b>' }, expectedRecord: { title: '<i>before</i>', fields: { '<img src=x>': '<a>old</a>' }, source: { kind: 'manual' } } }));
  assert.doesNotMatch(html, /<script>|<img src=x>|<b>after|<i>before|<a>old/);
  assert.match(html, /&lt;img src=x&gt;/); assert.match(html, /&lt;b&gt;after/);
});

test('primary comparison reveals a timestamp change beyond millisecond precision', () => {
  const before = '2026-10-03T23:30:00.123456-05:00', after = '2026-10-03T23:30:00.123789-05:00';
  const copy = comparison(view(args({ fields: { 'Call Time': after }, expectedRecord: { title: 'Existing gig', fields: { 'Call Time': before }, source: { kind: 'manual' } } })));
  assert.match(copy, /scope="row">Call Time/);
  assert.ok(copy.includes(before)); assert.ok(copy.includes(after));
});

test('invalid replacement/mode/title cannot invent removals or claim no changes without a comparison', () => {
  for (const extra of [{ fieldsMode: 'replace', fields: undefined }, { fieldsMode: null }, { title: undefined }, { title: '  ' }]) {
    const copy = comparison(view(args(extra)));
    assert.match(copy, /cannot be compared/);
    assert.doesNotMatch(copy, /Proposed changes|<td>Removed|No record values change/);
  }
  const absent = comparison(view({ entity: 'gigs' }));
  assert.match(absent, /Current values unavailable/); assert.match(absent, /No proposed record values provided/);
  assert.doesNotMatch(absent, /No record values change/);
});

test('profile merge/replace money uses authoritative before/after Currency even when app cache differs', () => {
  const proposal = { entity: 'profile', title: 'Profile', fields: { 'Default Day Rate': 9000 }, expectedRecord: { title: 'Profile', fields: { Currency: 'CAD', 'Default Day Rate': 8000 }, source: { kind: 'manual' } } };
  const merge = comparison(view(proposal, 'USD'));
  assert.match(merge, /CA\$80\.00 CAD/); assert.match(merge, /CA\$90\.00 CAD/); assert.doesNotMatch(merge, / USD/);
  const replace = comparison(view({ ...proposal, fieldsMode: 'replace' }, 'USD'));
  assert.match(replace, /90\.00 \(currency unset\)/); assert.match(replace, /Currency<\/th><td>CAD<\/td><td>Removed/);
});
