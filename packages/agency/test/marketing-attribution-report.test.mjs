import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { buildMarketingAttributionSql } from '../scripts/report-marketing-attribution.mjs';

test('marketing attribution report is bounded, read-only, and follows booking outcomes', () => {
  const sql = buildMarketingAttributionSql({ days: 30 });
  for (const key of ['marketingSource', 'marketingMedium', 'marketingCampaign', 'marketingContent', 'marketingAttribution', 'trafficClass']) assert.ok(sql.includes(key));
  for (const action of ['page_view', 'booking_cta_click', 'booking_completed']) assert.ok(sql.includes(action));
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
  assert.throws(() => buildMarketingAttributionSql({ days: 0 }), /between 1 and 365/);
});

test('SQLite report separates Meta channels, consent, traffic classes, and funnel outcomes', () => {
  const events = [];
  function add(session, source, medium, actions, options = {}) {
    for (const action of actions) events.push({
      session, action, property: options.property ?? 'agency', age: options.age ?? '-1 day',
      metadata: {
        marketingSource: source, marketingMedium: medium, marketingCampaign: 'meta-test',
        marketingContent: 'creative-a', trafficClass: options.trafficClass ?? 'external',
        ...(options.consented === false ? {} : { marketingAttribution: 'consented-first-party-session' })
      }
    });
  }
  add('organic', 'facebook', 'social', ['page_view', 'contact_submitted', 'contact_submitted']);
  add('instagram-ad', 'instagram', 'paid_social', ['page_view', 'booking_cta_click', 'booking_completed']);
  add('meta-ad', 'meta', 'cpc', ['page_view', 'booking_cta_click']);
  add('internal', 'facebook', 'social', ['page_view', 'contact_submitted'], { trafficClass: 'internal' });
  add('unconsented', 'facebook', 'social', ['page_view', 'contact_submitted'], { consented: false });
  add('other-property', 'facebook', 'social', ['contact_submitted'], { property: 'io' });
  add('old', 'facebook', 'social', ['contact_submitted'], { age: '-31 days' });

  const result = spawnSync('python3', ['-c', `
import json, sqlite3, sys
payload = json.load(sys.stdin)
db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.execute('CREATE TABLE unified_events (session_id TEXT, action TEXT, property TEXT, metadata TEXT, created_at TEXT)')
for event in payload['events']:
    db.execute("INSERT INTO unified_events VALUES (?, ?, ?, ?, datetime('now', ?))", (event['session'], event['action'], event['property'], json.dumps(event['metadata']), event['age']))
print(json.dumps([dict(row) for row in db.execute(payload['sql'])]))
`], { input: JSON.stringify({ events, sql: buildMarketingAttributionSql({ days: 30 }) }), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout).sort((a, b) =>
    `${a.source}/${a.traffic_class}`.localeCompare(`${b.source}/${b.traffic_class}`));
  const expected = (source, medium, traffic_class, contacts, clicks, bookings) => ({
    source, medium, campaign: 'meta-test', content: 'creative-a', traffic_class,
    sessions: 1, landing_sessions: 1, booking_cta_sessions: clicks,
    booking_completed_sessions: bookings, contact_submission_sessions: contacts
  });
  assert.deepEqual(rows, [
    expected('facebook', 'social', 'external', 1, 0, 0),
    expected('facebook', 'social', 'internal', 1, 0, 0),
    expected('instagram', 'paid_social', 'external', 0, 1, 1),
    expected('meta', 'cpc', 'external', 0, 1, 0)
  ]);
});
