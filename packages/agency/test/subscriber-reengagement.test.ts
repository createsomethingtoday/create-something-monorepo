import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  REENGAGEMENT_CAMPAIGN_ID,
  approvalPhraseFor,
  buildReengagementCampaignArtifact,
  createD1ReengagementStore,
  deterministicCheckInToken,
  getReengagementAudienceReceipt,
  normalizeResendLastEvent,
  sendApprovedReengagementCampaign,
  type ReengagementCampaignStore
} from '../src/lib/server/subscriber-reengagement.ts';

class SqliteD1Statement {
  constructor(
    private readonly database: string,
    private readonly sql: string
  ) {}

  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: this.sql,
      encoding: 'utf8'
    }).trim();
    return (output ? (JSON.parse(output) as T[]) : [])[0] ?? null;
  }

  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: this.sql,
      encoding: 'utf8'
    }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

function createSqliteD1(database: string): D1Database {
  return {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql) as unknown as D1PreparedStatement;
    }
  } as unknown as D1Database;
}

test('legacy single-opt-in migration is exact, guarded, and idempotent', () => {
  const directory = mkdtempSync(join(tmpdir(), 'reengagement-migration-'));
  const database = join(directory, 'migration.db');
  const migration = readFileSync(
    new URL('../migrations/0042_newsletter_legacy_single_opt_in.sql', import.meta.url),
    'utf8'
  );
  try {
    execFileSync('sqlite3', [database], {
      input: `CREATE TABLE newsletter_subscribers (
        id INTEGER PRIMARY KEY, source TEXT, subscribed_at TEXT, confirmed_at TEXT,
        active INTEGER, status TEXT, unsubscribed_at TEXT, consent_requested_at TEXT,
        consent_confirmed_at TEXT, consent_method TEXT, consent_evidence TEXT,
        audience_classification TEXT
      );
      ${[
        [1, '2025-11-17 02:23:40'],
        [3, '2025-11-20 00:00:00'],
        [13, '2025-11-26 14:54:18'],
        [16, '2025-11-27 05:22:51'],
        [19, '2025-11-29 09:10:51'],
        [22, '2025-12-03 14:23:54']
      ]
        .map(
          ([id, subscribedAt]) =>
            `INSERT INTO newsletter_subscribers VALUES (${id}, NULL, '${subscribedAt}', '2025-12-23 04:35:59', 1, 'active', NULL, NULL, NULL, NULL, NULL, 'legacy_or_unknown');`
        )
        .join('\n')}
      ${migration}
      ${migration}`,
      encoding: 'utf8'
    });
    const rows = JSON.parse(
      execFileSync('sqlite3', ['-json', database], {
        input: `SELECT id, consent_method, consent_evidence, consent_confirmed_at,
                       audience_classification
                FROM newsletter_subscribers ORDER BY id`,
        encoding: 'utf8'
      })
    ) as Array<Record<string, unknown>>;

    assert.deepEqual(
      rows.filter(({ consent_method }) => consent_method === 'single_opt_in').map(({ id }) => id),
      [1, 13, 16, 19, 22]
    );
    assert.equal(rows.find(({ id }) => id === 3)?.audience_classification, 'legacy_or_unknown');
    assert.ok(
      rows
        .filter(({ id }) => id !== 3)
        .every(
          ({ consent_evidence, consent_confirmed_at, audience_classification }) =>
            consent_evidence === 'legacy_signup_form' &&
            consent_confirmed_at == null &&
            audience_classification === 'confirmed_subscriber'
        )
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('re-engagement distinguishes direct confirmation from reviewed legacy single opt-in', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'reengagement-audience-'));
  const database = join(directory, 'audience.db');
  try {
    execFileSync('sqlite3', [database], {
      input: `CREATE TABLE newsletter_subscribers (
        id INTEGER PRIMARY KEY, email TEXT, source TEXT, unsubscribe_token TEXT,
        active INTEGER, status TEXT, unsubscribed_at TEXT, confirmed_at TEXT,
        consent_requested_at TEXT, consent_confirmed_at TEXT, consent_method TEXT,
        consent_evidence TEXT, audience_classification TEXT
      );
      INSERT INTO newsletter_subscribers VALUES
        (1, 'direct@example.com', 'io', 'u1', 1, 'active', NULL, '2026-01-01', '2026-01-01', '2026-01-01', 'double_opt_in', 'confirmation_link', 'confirmed_subscriber'),
        (13, 'legacy@example.com', NULL, 'u13', 1, 'active', NULL, '2025-12-23', '2025-11-20', NULL, 'single_opt_in', 'legacy_signup_form', 'confirmed_subscriber'),
        (20, 'unknown@example.com', NULL, 'u20', 1, 'active', NULL, '2025-12-23', NULL, NULL, NULL, NULL, 'legacy_or_unknown'),
        (21, 'suppressed@example.com', NULL, 'u21', 0, 'inactive', '2026-01-02', NULL, NULL, NULL, NULL, NULL, 'excluded');`,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);

    const receipt = await getReengagementAudienceReceipt(db);
    const subscribers = await createD1ReengagementStore(db).getEligibleSubscribers();

    assert.deepEqual(receipt, {
      total: 4,
      eligible: 2,
      excluded: 2,
      directConfirmed: 1,
      legacySingleOptIn: 1,
      unconfirmed: 0,
      consentUnproved: 1,
      audienceUnreviewed: 0,
      suppressed: 1
    });
    assert.deepEqual(
      subscribers.map(({ id }) => id),
      [1, 13]
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

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
    audience: { total: 11, eligible: 1, excluded: 10 },
    audienceMemberIds: [1]
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
    audience: { total: 11, eligible: 1, excluded: 10 },
    audienceMemberIds: [1]
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
    audience: { total: 1, eligible: 1, excluded: 0 },
    audienceMemberIds: [1]
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
    audience: { total: 1, eligible: 1, excluded: 0 },
    audienceMemberIds: [1]
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
    audience: { total: 1, eligible: 1, excluded: 0 },
    audienceMemberIds: [1]
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

test('approval locks exact audience membership, not only its count', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 1, eligible: 1, excluded: 0 },
    audienceMemberIds: [1]
  });
  const swappedAudienceStore = createStore({ ...artifact, status: 'approved' }, 1, null, [2]);

  await assert.rejects(
    sendApprovedReengagementCampaign(swappedAudienceStore, resendInput()),
    /Audience or campaign content changed after approval/
  );
});

test('a stop receipt prevents every subsequent provider call and remains stopped', async () => {
  const artifact = await buildReengagementCampaignArtifact({
    replyTo: 'micah@createsomething.io',
    audience: { total: 2, eligible: 2, excluded: 0 },
    audienceMemberIds: [1, 2]
  });
  let campaignStatus = 'approved';
  const baseStore = createStore({ ...artifact, status: 'approved' }, 2);
  const store: ReengagementCampaignStore = {
    ...baseStore,
    async getCampaign() {
      return { ...artifact, status: campaignStatus };
    },
    async setCampaignStatus(_campaignId, status) {
      campaignStatus = status;
    }
  };
  let fetchCalls = 0;

  await assert.rejects(
    sendApprovedReengagementCampaign(store, {
      ...resendInput(),
      fetch: async () => {
        fetchCalls += 1;
        campaignStatus = 'stopped';
        return new Response(JSON.stringify({ id: `resend-receipt-${fetchCalls}` }), {
          status: 200
        });
      }
    }),
    /stopped/
  );

  assert.equal(fetchCalls, 1);
  assert.equal(campaignStatus, 'stopped');
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
  existingDeliveryId: string | null = null,
  subscriberIds: number[] = Array.from({ length: audienceCount }, (_, index) => index + 1)
): ReengagementCampaignStore {
  let currentCampaign = { ...campaign };
  const subscribers = subscriberIds.map((id, index) => ({
    id,
    email: `reader-${index + 1}@example.com`,
    unsubscribe_token: `unsubscribe-${index + 1}`
  }));
  return {
    async getCampaign() {
      return currentCampaign;
    },
    async getEligibleSubscribers() {
      return subscribers;
    },
    async getDelivery() {
      return existingDeliveryId ? { resendEmailId: existingDeliveryId } : null;
    },
    async queueDelivery() {},
    async replaceCheckInToken() {
      return true;
    },
    async markDeliverySent() {},
    async markDeliveryFailed() {},
    async setCampaignStatus(_campaignId, status) {
      currentCampaign = { ...currentCampaign, status };
    }
  };
}
