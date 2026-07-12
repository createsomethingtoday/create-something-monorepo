import assert from 'node:assert/strict';
import test from 'node:test';
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
	assert.ok(sql.includes("datetime('now', '-30 days')"));
});

test('commercial funnel report is read-only and bounds its date window', () => {
	assert.throws(() => buildCommercialFunnelSql({ days: 0 }), /between 1 and 365/);
	assert.throws(() => buildCommercialFunnelSql({ days: 366 }), /between 1 and 365/);

	const sql = buildCommercialFunnelSql({ days: 90 });
	assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
	assert.match(sql, /^WITH event_scope AS/);
	assert.match(sql, /ORDER BY CASE traffic_class/);
});
