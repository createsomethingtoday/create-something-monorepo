import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from '../src/routes/contact/+page.server.ts';
import { agencyCoreMessaging } from '../src/lib/data/marketingCopy.ts';
import { PUBLIC_PRICING } from '../src/lib/data/publicPricing.ts';

test('membership CTA preserves inquiry intent and attribution through the public loader', async () => {
  const result = await load({
    url: new URL(agencyCoreMessaging.membershipInquiryHref, 'https://createsomething.agency')
  } as Parameters<typeof load>[0]);
  assert.equal(result?.contactIntent, 'membership');
  assert.equal(result?.contactSource, 'membership');
  assert.equal(result?.contactLane, 'workflow_infrastructure');
  assert.equal(PUBLIC_PRICING.membership.monthlyUsd, 900);
  assert.equal(PUBLIC_PRICING.managedControl.startingMonthlyUsd, 900);
});

test('unknown inquiry intents retain the existing safe fallback', async () => {
  const result = await load({
    url: new URL('https://createsomething.agency/contact?intent=unknown&lane=unknown')
  } as Parameters<typeof load>[0]);
  assert.equal(result?.contactIntent, 'workflow-teardown');
  assert.equal(result?.contactLane, 'not_sure');
});
