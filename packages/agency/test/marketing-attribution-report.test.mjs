import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMarketingAttributionSql } from '../scripts/report-marketing-attribution.mjs';

test('marketing attribution report is bounded, read-only, and follows booking outcomes', () => {
  const sql = buildMarketingAttributionSql({ days: 30 });
  for (const key of ['marketingSource', 'marketingMedium', 'marketingCampaign', 'marketingContent', 'marketingAttribution', 'trafficClass']) assert.ok(sql.includes(key));
  for (const action of ['page_view', 'booking_cta_click', 'booking_completed']) assert.ok(sql.includes(action));
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
  assert.throws(() => buildMarketingAttributionSql({ days: 0 }), /between 1 and 365/);
});
