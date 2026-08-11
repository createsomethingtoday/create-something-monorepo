import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HIGH_INTENT_SEARCH_CAMPAIGN_ID,
  HIGH_INTENT_SEARCH_SESSION_TTL_MS,
  captureHighIntentSearchAttribution,
  readHighIntentSearchAttribution,
  type CampaignSessionStorage
} from '../src/lib/analytics/high-intent-search.ts';

const capturedAt = Date.UTC(2026, 7, 10, 18, 0, 0);

test('captures only the allowlisted Google CPC campaign as first-party session metadata', () => {
  const storage = memoryStorage();
  const url = new URL(
    `https://createsomething.agency/marketplace-review-automation?utm_source=google&utm_medium=cpc&utm_campaign=${HIGH_INTENT_SEARCH_CAMPAIGN_ID}&utm_content=marketplace-review&utm_term=marketplace+review+automation&gclid=private-click-id&wbraid=private-braid`
  );

  const attribution = captureHighIntentSearchAttribution(url, storage, capturedAt);

  assert.deepEqual(attribution, {
    paidSearchCampaign: HIGH_INTENT_SEARCH_CAMPAIGN_ID,
    paidSearchSource: 'google',
    paidSearchMedium: 'cpc',
    paidSearchIntent: 'marketplace-review',
    paidSearchLandingPath: '/marketplace-review-automation',
    paidSearchAttribution: 'consented-first-party-session'
  });

  const serialized = JSON.stringify(storage.dump());
  assert.doesNotMatch(serialized, /private-click-id|private-braid|gclid|wbraid|utm_term/);
});

test('persists the bounded attribution across routes for 30 minutes and then removes it', () => {
  const storage = memoryStorage();
  const url = new URL(
    `https://createsomething.agency/ai-workflow-recovery?utm_source=google&utm_medium=cpc&utm_campaign=${HIGH_INTENT_SEARCH_CAMPAIGN_ID}&utm_content=workflow-recovery`
  );

  captureHighIntentSearchAttribution(url, storage, capturedAt);

  assert.equal(
    readHighIntentSearchAttribution(storage, capturedAt + HIGH_INTENT_SEARCH_SESSION_TTL_MS - 1)
      ?.paidSearchIntent,
    'workflow-recovery'
  );
  assert.equal(
    readHighIntentSearchAttribution(storage, capturedAt + HIGH_INTENT_SEARCH_SESSION_TTL_MS),
    undefined
  );
  assert.deepEqual(storage.dump(), {});
});

test('rejects mismatched campaigns, media, intents, and landing paths', () => {
  const invalidUrls = [
    'https://createsomething.agency/ai-workflow-control?utm_source=bing&utm_medium=cpc&utm_campaign=agency-high-intent-search-v20260810&utm_content=workflow-control',
    'https://createsomething.agency/ai-workflow-control?utm_source=google&utm_medium=display&utm_campaign=agency-high-intent-search-v20260810&utm_content=workflow-control',
    'https://createsomething.agency/ai-workflow-control?utm_source=google&utm_medium=cpc&utm_campaign=another-campaign&utm_content=workflow-control',
    'https://createsomething.agency/ai-workflow-control?utm_source=google&utm_medium=cpc&utm_campaign=agency-high-intent-search-v20260810&utm_content=marketplace-review',
    'https://createsomething.agency/unowned?utm_source=google&utm_medium=cpc&utm_campaign=agency-high-intent-search-v20260810&utm_content=workflow-control'
  ];

  for (const value of invalidUrls) {
    const storage = memoryStorage();
    assert.equal(captureHighIntentSearchAttribution(new URL(value), storage, capturedAt), undefined);
    assert.deepEqual(storage.dump(), {});
  }
});

function memoryStorage(): CampaignSessionStorage & { dump(): Record<string, string> } {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    dump() {
      return Object.fromEntries(values);
    }
  };
}
