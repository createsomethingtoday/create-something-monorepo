import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { validateHighIntentSearchCampaign } from '../scripts/check-high-intent-search.mjs';

const packageRoot = resolve(import.meta.dirname, '..');
const campaignPath = resolve(
  packageRoot,
  'content/campaigns/high-intent-google-search-v20260810/campaign-spec.json'
);

test('keeps the planning envelope bounded to Search, exact and phrase, and USD 50 per day', () => {
  const campaign = JSON.parse(readFileSync(campaignPath, 'utf8'));
  assert.deepEqual(validateHighIntentSearchCampaign(campaign, { packageRoot }), []);
  assert.equal(campaign.dailyBudgetUsd, 50);
  assert.equal(
    campaign.adGroups.reduce((sum, adGroup) => sum + adGroup.dailyBudgetUsd, 0),
    50
  );
  assert.equal(campaign.activation.status, 'approval-required');
  assert.equal(campaign.activation.preSpendGate, 'google-keyword-planner');
  assert.equal(campaign.network.channel, 'google-search');
  assert.equal(campaign.network.searchPartners, false);
  assert.equal(campaign.network.displayExpansion, false);
  assert.equal(campaign.network.presenceOnly, true);

  for (const adGroup of campaign.adGroups) {
    assert.ok(adGroup.keywords.length > 0, `${adGroup.id} needs keywords`);
    assert.ok(
      adGroup.keywords.every((keyword) => ['exact', 'phrase'].includes(keyword.matchType)),
      `${adGroup.id} includes an unapproved match type`
    );
  }
});

test('keeps generic demand clusters paused and the three proof-backed routes prioritized', () => {
  const campaign = JSON.parse(readFileSync(campaignPath, 'utf8'));
  assert.deepEqual(
    campaign.adGroups.map(({ id, dailyBudgetUsd, landingPath }) => ({
      id,
      dailyBudgetUsd,
      landingPath
    })),
    [
      {
        id: 'marketplace-review',
        dailyBudgetUsd: 22,
        landingPath: '/marketplace-review-automation'
      },
      {
        id: 'workflow-recovery',
        dailyBudgetUsd: 15,
        landingPath: '/ai-workflow-recovery'
      },
      {
        id: 'workflow-control',
        dailyBudgetUsd: 10,
        landingPath: '/ai-workflow-control'
      },
      { id: 'brand', dailyBudgetUsd: 3, landingPath: '/' }
    ]
  );
  assert.deepEqual(
    campaign.holdbacks.map((holdback) => holdback.cluster),
    ['generic-ai-governance', 'revops', 'customer-service']
  );
  assert.ok(campaign.holdbacks.every((holdback) => holdback.status === 'paused'));
});

test('produces a read-only first-party campaign report', async () => {
  const { buildHighIntentSearchSql } = await import('../scripts/report-high-intent-search.mjs');
  const sql = buildHighIntentSearchSql({ days: 90 });

  for (const action of [
    'page_view',
    'workflow_draft_started',
    'booking_form_started',
    'booking_initiated',
    'booking_completed'
  ]) {
    assert.ok(sql.includes(`'${action}'`), `missing ${action} funnel stage`);
  }
  assert.ok(sql.includes("json_extract(metadata, '$.paidSearchCampaign')"));
  assert.ok(sql.includes("json_extract(metadata, '$.paidSearchIntent')"));
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
});
