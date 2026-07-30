import assert from 'node:assert/strict';
import test from 'node:test';

import { isVerifiedOfficialDomain, SOURCE_POLICIES, sourcePolicyFor } from '../src/index.js';

test('registers every initial source family under one resolver', () => {
  assert.deepEqual(Object.keys(SOURCE_POLICIES).sort(), [
    'affiliate_feed',
    'creator_owned',
    'deal_aggregator',
    'ltk_public',
    'official_retailer',
    'retailer_checkout',
    'search_index',
    'user_authorized'
  ]);
});

test('keeps discovery sources below recommendation confidence', () => {
  assert.equal(sourcePolicyFor('search_index').maximumScore, 45);
  assert.equal(sourcePolicyFor('deal_aggregator').maximumScore, 45);
  assert.equal(sourcePolicyFor('official_retailer').maximumScore, 100);
  assert.equal(sourcePolicyFor('ltk_public').authority, 70);
});

test('does not trust retailer QA, staging, or preview subdomains as production evidence', () => {
  assert.equal(isVerifiedOfficialDomain('CVS Pharmacy', 'https://www.cvs.com/coupons'), true);
  assert.equal(isVerifiedOfficialDomain('CVS Pharmacy', 'https://www-qa2.cvs.com/coupons'), false);
  assert.equal(isVerifiedOfficialDomain('Target', 'https://preview.target.com/deals'), false);
});
