import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { buildCommercialFunnelSql } from '../scripts/report-commercial-funnel.mjs';

test('commercial funnel report classifies sessions before counting booking stages', () => {
	const sql = buildCommercialFunnelSql({ days: 30 });

	for (const trafficClass of ['external', 'internal', 'preview', 'automated', 'test']) {
		assert.ok(sql.includes(`'${trafficClass}'`), `missing ${trafficClass} classification`);
	}
	for (const action of [
		'booking_cta_click',
		'booking_form_started',
		'booking_initiated',
		'booking_completed'
	]) {
		assert.ok(sql.includes(`'${action}'`), `missing ${action} stage`);
	}
	assert.ok(sql.includes("json_extract(metadata, '$.trafficClass')"));
	assert.ok(sql.includes("datetime(created_at) >= datetime('now', '-30 days')"));
	for (const column of ['review_interest_sessions', 'review_booking_cta_sessions', 'review_booking_completed_sessions']) {
		assert.ok(sql.includes(column));
	}
});

test('commercial funnel report is read-only and bounds its date window', () => {
	assert.throws(() => buildCommercialFunnelSql({ days: 0 }), /between 1 and 365/);
	assert.throws(() => buildCommercialFunnelSql({ days: 366 }), /between 1 and 365/);

	const sql = buildCommercialFunnelSql({ days: 90 });
	assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
	assert.match(sql, /^WITH event_scope AS/);
	assert.match(sql, /ORDER BY CASE traffic_class/);
});


test('review booking counts exclude other offers and unattributed completions in mixed sessions', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE unified_events(session_id TEXT, action TEXT, url TEXT, metadata TEXT, user_agent TEXT, property TEXT, created_at TEXT)');
    const insert = db.prepare("INSERT INTO unified_events VALUES (?,?,?,?, 'browser', 'agency', strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
    const event = (session, action, intent, trafficClass = 'external') => insert.run(session, action, 'https://createsomething.agency/technical-review', JSON.stringify({intent, trafficClass}));
    event('mixed', 'page_view');
    event('mixed', 'booking_cta_click', 'agent-foundation');
    event('mixed', 'booking_completed', 'agent-foundation');
    event('unknown', 'page_view');
    event('unknown', 'booking_completed');
    event('review', 'booking_cta_click', 'technical-review');
    event('review', 'booking_completed', 'technical-review');
    event('test', 'booking_completed', 'technical-review', 'test');
    const rows = db.prepare(buildCommercialFunnelSql()).all();
    const external = rows.find(row => row.traffic_class === 'external');
    assert.equal(external.review_interest_sessions, 3);
    assert.equal(external.review_booking_cta_sessions, 1);
    assert.equal(external.review_booking_completed_sessions, 1);
    assert.equal(external.booking_completed_sessions, 3);
    assert.equal(rows.find(row => row.traffic_class === 'test').review_booking_completed_sessions, 1);
  } finally { db.close(); }
});
