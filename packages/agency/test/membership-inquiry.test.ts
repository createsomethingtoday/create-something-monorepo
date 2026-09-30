import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from '../src/routes/contact/+page.server.ts';
import { agencyCoreMessaging } from '../src/lib/data/marketingCopy.ts';
import { createBookingHandoffState } from '../src/lib/scheduling/first-party.ts';
import { PUBLIC_PRICING } from '../src/lib/data/publicPricing.ts';

test('membership CTA preserves inquiry intent and attribution through the public loader', async () => {
  const result = await load({
    url: new URL(agencyCoreMessaging.membershipInquiryHref, 'https://createsomething.agency')
  } as Parameters<typeof load>[0]);
  assert.equal(result?.contactIntent, 'membership');
  assert.equal(result?.contactSource, 'membership');
  assert.equal(result?.contactLane, 'workflow_infrastructure');
  assert.equal(result?.contactPlan, 'focused');
  assert.equal(PUBLIC_PRICING.membership.monthlyUsd, 900);
  assert.equal(PUBLIC_PRICING.membership.team.monthlyUsd, 2500);
  assert.equal(PUBLIC_PRICING.membership.team.workstreams, 2);
  assert.equal(PUBLIC_PRICING.managedControl.startingMonthlyUsd, 900);
});

test('Team membership CTA selects the Team inquiry without changing the service lane', async () => {
  const result = await load({
    url: new URL(agencyCoreMessaging.teamMembershipInquiryHref, 'https://createsomething.agency')
  } as Parameters<typeof load>[0]);
  assert.equal(result?.contactIntent, 'membership');
  assert.equal(result?.contactLane, 'workflow_infrastructure');
  assert.equal(result?.contactPlan, 'team');
});

test('unknown inquiry intents retain the existing safe fallback', async () => {
  const result = await load({
    url: new URL('https://createsomething.agency/contact?intent=unknown&lane=unknown')
  } as Parameters<typeof load>[0]);
  assert.equal(result?.contactIntent, 'workflow-teardown');
  assert.equal(result?.contactLane, 'not_sure');
});


test('DFW support intent preserves its reliability lane and campaign attribution', async () => {
  const result = await load({
    url: new URL('https://createsomething.agency/contact?intent=system-support&lane=reliability_and_control&source=dfw-tech-support&campaign=dfw-remote-support')
  } as Parameters<typeof load>[0]);
  assert.equal(result?.contactIntent, 'system-support');
  assert.equal(result?.contactSource, 'dfw-tech-support');
  assert.equal(result?.contactLane, 'reliability_and_control');
  assert.equal(result?.contactCampaign, 'dfw-remote-support');
});


test('support booking suppresses a previously stored Map draft after intent normalization', () => {
  for (const intent of ['system-support', 'System%20Support', '%00system-support']) {
    const state = createBookingHandoffState(`?source=dfw-tech-support&intent=${intent}&lane=reliability_and_control`, 'Unrelated private Map draft.');
    assert.equal(state.handoffContext.intent, 'system-support');
    assert.equal(state.handoffContext.warmupNotes, undefined);
    assert.equal(state.handoffSheet.warmupNotes, undefined);
    assert.equal(state.handoffSheet.fields.find(field => field.label === 'Operating lane')?.value, 'Reliability And Control');
    assert.equal(new URL(state.schedulerHref).searchParams.get('intent'), 'system-support');
  }
  const mapping = createBookingHandoffState('?intent=workflow-map', 'Current Map draft.');
  assert.equal(mapping.handoffContext.warmupNotes, 'Current Map draft.');
});
