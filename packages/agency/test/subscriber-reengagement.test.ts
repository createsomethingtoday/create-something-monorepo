import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REENGAGEMENT_CAMPAIGN_ID,
  approvalPhraseFor,
  buildReengagementCampaignArtifact,
  deterministicCheckInToken,
  normalizeResendLastEvent,
  sendApprovedReengagementCampaign,
  type ReengagementCampaignStore
} from '../src/lib/server/subscriber-reengagement.ts';

test('provider events collapse to delivery state without open or click metrics', () => {
  assert.equal(normalizeResendLastEvent('delivered'), 'delivered');
  assert.equal(normalizeResendLastEvent('bounced'), 'failed');
  assert.equal(normalizeResendLastEvent('complained'), 'failed');
  assert.equal(normalizeResendLastEvent('delivery_delayed'), 'delayed');
  assert.equal(normalizeResendLastEvent('opened'), 'sent');
  assert.equal(normalizeResendLastEvent('clicked'), 'sent');
});

test('check-in token is stable across an idempotent delivery retry', async () => {
  const first = await deterministicCheckInToken(REENGAGEMENT_CAMPAIGN_ID, 'unsubscribe-safe');
  const retry = await deterministicCheckInToken(REENGAGEMENT_CAMPAIGN_ID, 'unsubscribe-safe');
  const otherCampaign = await deterministicCheckInToken('another-campaign', 'unsubscribe-safe');

  assert.equal(first, retry);
  assert.notEqual(first, otherCampaign);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /unsubscribe-safe/);
});

test('campaign artifact locks copy, reply-to, and aggregate audience receipt', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 11, eligible: 1, excluded: 10 }
  });

  assert.equal(artifact.id, REENGAGEMENT_CAMPAIGN_ID);
  assert.equal(artifact.subject, 'Can I ask why you subscribed?');
  assert.equal(artifact.replyTo, 'micah@createsomething.io');
  assert.equal(artifact.eligibleCount, 1);
  assert.equal(artifact.excludedCount, 10);
  assert.equal(artifact.contentHash.length, 64);
  assert.match(artifact.htmlSnapshot, /\{\{CHECK_IN_URL\}\}/);
  assert.match(artifact.textSnapshot, /\{\{UNSUBSCRIBE_URL\}\}/);
  assert.equal(
    approvalPhraseFor(artifact),
    `APPROVE 1 RECIPIENT ${artifact.contentHash.slice(0, 12)}`
  );
});

test('production send refuses draft status and audience drift', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 11, eligible: 1, excluded: 10 }
  });
  const draftStore = createStore({ ...artifact, status: 'draft' }, 1);

  await assert.rejects(
    sendApprovedReengagementCampaign(draftStore, resendInput()),
    /explicitly approved/
  );

  const driftStore = createStore({ ...artifact, status: 'approved' }, 2);
  await assert.rejects(
    sendApprovedReengagementCampaign(driftStore, resendInput()),
    /Audience changed after approval/
  );
});

test('production send is idempotent and never resends a recorded delivery', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 1, eligible: 1, excluded: 0 }
  });
  const store = createStore({ ...artifact, status: 'approved' }, 1, 'already-sent-id');
  let fetchCalls = 0;

  const result = await sendApprovedReengagementCampaign(store, {
    ...resendInput(),
    fetch: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ id: 'unexpected' }), { status: 200 });
    }
  });

  assert.deepEqual(result, { sent: 0, skipped: 1 });
  assert.equal(fetchCalls, 0);
});

test('approved send uses working private links, reply-to, tags, and Resend idempotency', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 1, eligible: 1, excluded: 0 }
  });
  const store = createStore({ ...artifact, status: 'approved' }, 1);
  let request: RequestInit | undefined;

  const result = await sendApprovedReengagementCampaign(store, {
    ...resendInput(),
    fetch: async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ id: 'resend-receipt-1' }), { status: 200 });
    }
  });

  assert.deepEqual(result, { sent: 1, skipped: 0 });
  assert.equal(
    new Headers(request?.headers).get('Idempotency-Key'),
    `${REENGAGEMENT_CAMPAIGN_ID}-1`
  );
  const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
  assert.equal(body.reply_to, 'micah@createsomething.io');
  assert.match(String(body.html), /https:\/\/createsomething\.io\/check-in\?token=/);
  assert.match(
    String(body.html),
    /https:\/\/createsomething\.io\/unsubscribe\?token=unsubscribe-1/
  );
  assert.deepEqual(body.tags, [
    { name: 'campaign', value: 'subscriber-check-in' },
    { name: 'campaign_id', value: REENGAGEMENT_CAMPAIGN_ID }
  ]);
});

test('provider fetch keeps the Worker global receiver', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 1, eligible: 1, excluded: 0 }
  });
  const store = createStore({ ...artifact, status: 'approved' }, 1);
  const workerFetch = function (this: unknown) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    return Promise.resolve(
      new Response(JSON.stringify({ id: 'resend-receipt-worker' }), { status: 200 })
    );
  } as typeof globalThis.fetch;

  const result = await sendApprovedReengagementCampaign(store, {
    ...resendInput(),
    fetch: workerFetch
  });

  assert.deepEqual(result, { sent: 1, skipped: 0 });
});

function resendInput() {
  return {
    apiKey: 'test-key',
    from: 'CREATE SOMETHING <hello@createsomething.io>',
    baseUrl: 'https://createsomething.io',
    fetch: globalThis.fetch
  };
}

function createStore(
  campaign: Awaited<ReturnType<typeof buildReengagementCampaignArtifact>> & { status: string },
  audienceCount: number,
  existingDeliveryId: string | null = null
): ReengagementCampaignStore {
  const subscribers = Array.from({ length: audienceCount }, (_, index) => ({
    id: index + 1,
    email: `reader-${index + 1}@example.com`,
    unsubscribe_token: `unsubscribe-${index + 1}`
  }));
  return {
    async getCampaign() {
      return campaign;
    },
    async getEligibleSubscribers() {
      return subscribers;
    },
    async getDelivery() {
      return existingDeliveryId ? { resendEmailId: existingDeliveryId } : null;
    },
    async queueDelivery() {},
    async replaceCheckInToken() {},
    async markDeliverySent() {},
    async markDeliveryFailed() {},
    async setCampaignStatus() {}
  };
}
