import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MARKETING_ATTRIBUTION_TTL_MS,
  captureMarketingAttribution,
  readMarketingAttribution,
  type MarketingSessionStorage
} from '../src/lib/analytics/marketing-attribution.ts';

const capturedAt = Date.UTC(2026, 8, 4, 18, 0, 0);

test('captures bounded social attribution without click identifiers', () => {
  const storage = memoryStorage();
  const attribution = captureMarketingAttribution(
    new URL('https://createsomething.agency/dispatch?utm_source=linkedin&utm_medium=social&utm_campaign=dispatch-2026-w36&utm_content=field-report&li_fat_id=private'),
    storage,
    capturedAt
  );
  assert.deepEqual(attribution, {
    marketingSource: 'linkedin',
    marketingMedium: 'social',
    marketingCampaign: 'dispatch-2026-w36',
    marketingContent: 'field-report',
    marketingLandingPath: '/dispatch',
    marketingAttribution: 'consented-first-party-session'
  });
  assert.doesNotMatch(JSON.stringify(storage.dump()), /private|li_fat_id/);
});

test('persists attribution for the consented session and expires it', () => {
  const storage = memoryStorage();
  captureMarketingAttribution(new URL('https://createsomething.agency/?utm_source=youtube&utm_medium=video&utm_campaign=dispatch-2026-w36'), storage, capturedAt);
  assert.equal(readMarketingAttribution(storage, capturedAt + MARKETING_ATTRIBUTION_TTL_MS - 1)?.marketingSource, 'youtube');
  assert.equal(readMarketingAttribution(storage, capturedAt + MARKETING_ATTRIBUTION_TTL_MS), undefined);
});

test('rejects unknown sources, media, missing campaigns, and unsafe values', () => {
  for (const value of [
    'https://createsomething.agency/?utm_source=tiktok&utm_medium=social&utm_campaign=dispatch',
    'https://createsomething.agency/?utm_source=linkedin&utm_medium=cpc&utm_campaign=dispatch',
    'https://createsomething.agency/?utm_source=linkedin&utm_medium=social',
    'https://createsomething.agency/?utm_source=linkedin&utm_medium=social&utm_campaign=not%20bounded'
  ]) assert.equal(captureMarketingAttribution(new URL(value), memoryStorage(), capturedAt), undefined);
});

function memoryStorage(): MarketingSessionStorage & { dump(): Record<string, string> } {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    dump: () => Object.fromEntries(values)
  };
}
