import retention from '../src/retention-worker';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { GET, POST } from '../src/routes/api/creators/application/+server';
import { GET as queue, POST as review } from '../src/routes/api/creators/review/+server';
import { POST as invite } from '../src/routes/api/creators/invitations/+server';
import { POST as activateTrial } from '../src/routes/api/networks/[slug]/trial/+server';
import { paidAccess } from '../src/lib/server/billing';
import { POST as track, GET as report } from '../src/routes/api/impact/+server';
import { POST as support, GET as supportList } from '../src/routes/api/support/+server';
import { POST as partnerReview } from '../src/routes/api/support/partners/+server';
import {
  GET as supportDetail,
  POST as supportUpdate
} from '../src/routes/api/support/[id]/+server';
import { ensureSupportPartner } from '../src/lib/server/support-payments';
import { GET as networkImpact } from '../src/routes/api/networks/[slug]/impact/+server';
import {
  GET as fieldNotes,
  POST as saveFieldNote
} from '../src/routes/api/networks/[slug]/field-notes/+server';
let sql: DatabaseSync;
function statement(query: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(query, args),
    first: async () => sql.prepare(query).get(...values),
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => {
      const before = Number(sql.prepare('SELECT total_changes() AS count').get()!.count);
      sql.prepare(query).run(...values);
      const after = Number(sql.prepare('SELECT total_changes() AS count').get()!.count);
      return { meta: { changes: after - before } };
    }
  };
}
function event(body?: unknown, subject = 'creator', email = 'creator@example.com'): any {
  return {
    locals: { identity: { subject, email, role: 'blocked' } },
    platform: {
      env: {
        DB: {
          prepare: statement,
          batch: async (items: any[]) => {
            sql.exec('BEGIN');
            try {
              const result = [];
              for (const item of items) result.push(await item.run());
              sql.exec('COMMIT');
              return result;
            } catch (e) {
              sql.exec('ROLLBACK');
              throw e;
            }
          }
        },
        PCN_ADMIN_EMAILS: 'reviewer@example.com'
      }
    },
    request: new Request('https://private.createsomething.agency/api/creators/application', {
      method: body === undefined ? 'GET' : 'POST',
      headers: { origin: 'https://private.createsomething.agency' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  };
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort())
    sql.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
});
afterEach(() => sql.close());
const application = {
  display_name: 'Builder',
  credentials: 'I build and teach evaluated MCP integrations. https://example.com/work',
  teaching_video_url: 'https://example.com/teaching'
};
it('submits private credentials and teaching video for review without accepting client approval', async () => {
  const response = await POST(event({ ...application, status: 'approved', subject: 'attacker' }));
  expect(response.status).toBe(201);
  expect(await (await GET(event())).json()).toMatchObject({
    application: { status: 'pending', display_name: 'Builder' }
  });
  expect(await (await GET(event(undefined, 'other'))).json()).toEqual({ application: null });
});

it('restricts credential review and approval to platform reviewers, with stale-decision protection', async () => {
  await POST(event(application));
  expect((await queue(event())).status).toBe(403);
  const decision = {
    subject: 'creator',
    status: 'approved',
    review_note: 'Clear teaching and working examples.',
    revision: 0
  };
  expect((await review(event(decision))).status).toBe(403);
  expect((await review(event(decision, 'reviewer', 'reviewer@example.com'))).status).toBe(200);
  expect(
    (await review(event({ ...decision, status: 'rejected' }, 'reviewer', 'reviewer@example.com')))
      .status
  ).toBe(409);
  expect(await (await GET(event())).json()).toMatchObject({ application: { status: 'approved' } });
});

it('binds creator invitations to their recipient and prevents reuse or self-referral', async () => {
  await POST(event(application, 'sponsor', 'sponsor@example.com'));
  await review(
    event(
      { subject: 'sponsor', status: 'approved', review_note: 'Verified teaching.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  expect(
    (
      await invite(
        event({ action: 'create', email: 'sponsor@example.com' }, 'sponsor', 'sponsor@example.com')
      )
    ).status
  ).toBe(400);
  const issued = await invite(
    event({ action: 'create', email: 'creator@example.com' }, 'sponsor', 'sponsor@example.com')
  );
  expect(issued.status).toBe(201);
  const { token } = await issued.json();
  expect(
    (await invite(event({ action: 'redeem', token }, 'stranger', 'stranger@example.com'))).status
  ).toBe(404);
  await POST(event(application));
  expect((await invite(event({ action: 'redeem', token }))).status).toBe(200);
  expect((await invite(event({ action: 'redeem', token }))).status).toBe(200);
  expect(await (await GET(event())).json()).toMatchObject({ application: { status: 'pending' } });
});

it('starts one calendar month only for an approved invited creator and never extends it on retry', async () => {
  await POST(event(application, 'sponsor', 'sponsor@example.com'));
  await review(
    event(
      { subject: 'sponsor', status: 'approved', review_note: 'Verified teaching.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  const { token } = await (
    await invite(
      event({ action: 'create', email: 'creator@example.com' }, 'sponsor', 'sponsor@example.com')
    )
  ).json();
  await POST(event(application));
  await invite(event({ action: 'redeem', token }));
  sql.exec("INSERT INTO networks(id,slug,owner_id,name) VALUES('alpha','alpha','creator','Alpha')");
  const e = () => {
    const v = event({});
    v.locals.network = { id: 'alpha', slug: 'alpha', owner_id: 'creator' };
    v.platform.env.PCN_SELF_SERVICE_ENABLED = 'false';
    v.platform.env.PCN_CREATOR_TRIAL_ENABLED = 'true';
    return v;
  };
  const disabled = e();
  disabled.platform.env.PCN_CREATOR_TRIAL_ENABLED = 'false';
  expect((await activateTrial(disabled)).status).toBe(503);
  expect((await activateTrial(e())).status).toBe(403);
  await review(
    event(
      { subject: 'creator', status: 'approved', review_note: 'Verified teaching.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  const response = await activateTrial(e());
  expect(response.status).toBe(200);
  const first = await response.json();
  expect(first.endsAt - first.startsAt).toBeGreaterThanOrEqual(28 * 86400);
  expect(await (await activateTrial(e())).json()).toEqual(first);
  const other = e();
  other.locals.network = { id: 'beta', slug: 'beta', owner_id: 'creator' };
  expect((await activateTrial(other)).status).toBe(409);
});

it('ends access on trial expiry or creator suspension without trusting cached network status', async () => {
  await POST(event(application));
  await review(
    event(
      { subject: 'creator', status: 'approved', review_note: 'Verified teaching.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  sql.exec(
    "INSERT INTO networks(id,slug,owner_id,name,status) VALUES('alpha','alpha','creator','Alpha','active')"
  );
  sql
    .prepare('INSERT INTO creator_trials(subject,network_id,starts_at,ends_at) VALUES(?,?,?,?)')
    .run('creator', 'alpha', 1, Math.floor(Date.now() / 1000) + 3600);
  const e = event();
  const n: any = { id: 'alpha', owner_id: 'creator', status: 'active' };
  expect(await paidAccess(e.platform.env, n)).toBe(true);
  sql.exec("UPDATE creator_applications SET status='suspended'");
  expect(await paidAccess(e.platform.env, n)).toBe(false);
  sql.exec(
    "UPDATE creator_applications SET status='approved'; UPDATE creator_trials SET ends_at=1"
  );
  expect(await paidAccess(e.platform.env, n)).toBe(false);
});

it('keeps client engagement separate from trusted outcomes and restricts impact reporting', async () => {
  expect((await track(event({ event: 'purchase_paid', surface: 'home' }))).status).toBe(400);
  expect(
    (
      await track(
        event({
          event: 'page_view',
          surface: 'home',
          email: 'do-not-store@example.com',
          url: 'secret-query'
        })
      )
    ).status
  ).toBe(204);
  expect((await report(event())).status).toBe(403);
  const body = await (await report(event(undefined, 'reviewer', 'reviewer@example.com'))).json();
  expect(body.engagement).toEqual([
    expect.objectContaining({ surface: 'home', event: 'page_view', count: 1 })
  ]);
  expect(JSON.stringify(body)).not.toContain('do-not-store');
  expect(JSON.stringify(body)).not.toContain('secret-query');
});

it('requires separate partner approval and keeps company support isolated from creator offers', async () => {
  await POST(event(application, 'partner', 'partner@example.com'));
  await review(
    event(
      { subject: 'partner', status: 'approved', review_note: 'Good creator.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  const request = {
    action: 'request',
    partner: 'partner',
    company: 'Example Co',
    workflow: 'Evaluate our internal agent with explicit permissions.',
    amount: 1,
    split: 100
  };
  expect((await support(event(request, 'company', 'company@example.com'))).status).toBe(409);
  expect(
    (
      await partnerReview(
        event(
          { subject: 'partner', approved: true, note: 'Reviewed for support.' },
          'partner',
          'partner@example.com'
        )
      )
    ).status
  ).toBe(403);
  expect(
    (
      await partnerReview(
        event(
          { subject: 'partner', approved: true, note: 'Reviewed for support.' },
          'reviewer',
          'reviewer@example.com'
        )
      )
    ).status
  ).toBe(200);
  const response = await support(event(request, 'company', 'company@example.com'));
  expect(response.status).toBe(201);
  const { workspace } = await response.json();
  const report = await (
    await supportList(event(undefined, 'company', 'company@example.com'))
  ).json();
  expect(report.workspaces[0]).toMatchObject({
    network_id: workspace.id,
    status: 'requested',
    amount: 90000,
    partner_percent: 95
  });
  expect(
    (await (await supportList(event(undefined, 'other', 'other@example.com'))).json()).workspaces
  ).toEqual([]);
  expect((await support(event(request, 'company', 'company@example.com'))).status).toBe(200);
});
it('never grants a creator trial to a company support workspace', async () => {
  await POST(event(application));
  await review(
    event(
      { subject: 'creator', status: 'approved', review_note: 'Verified teaching.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  await partnerReview(
    event(
      { subject: 'creator', approved: true, note: 'Reviewed for support.' },
      'reviewer',
      'reviewer@example.com'
    )
  );
  sql.exec(
    "INSERT INTO networks(id,slug,owner_id,name) VALUES('company','company','creator','Company'); INSERT INTO support_workspaces(network_id,owner_id,partner_id,company,workflow) VALUES('company','creator','creator','Company','Workflow'); INSERT INTO creator_invitations(token_hash,sponsor,recipient_email,redeemed_by,expires_at) VALUES('test','creator','creator@example.com','creator',9999999999)"
  );
  const e = event({});
  e.locals.network = { id: 'company', owner_id: 'creator' };
  e.platform.env.PCN_SELF_SERVICE_ENABLED = 'false';
  e.platform.env.PCN_CREATOR_TRIAL_ENABLED = 'true';
  expect((await activateTrial(e)).status).toBe(409);
});

it('keeps company updates private and revokes partner access immediately', async () => {
  await POST(event(application, 'partner', 'partner@example.com'));
  await review(
    event(
      { subject: 'partner', status: 'approved', review_note: 'Good creator.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  await partnerReview(
    event(
      { subject: 'partner', approved: true, note: 'Reviewed for support.' },
      'reviewer',
      'reviewer@example.com'
    )
  );
  const request = {
    action: 'request',
    partner: 'partner',
    company: 'Example Co',
    workflow: 'Evaluate our internal agent with explicit permissions.'
  };
  const { workspace } = await (
    await support(event(request, 'company', 'company@example.com'))
  ).json();
  await support(
    event({ action: 'accept', network: workspace.id }, 'partner', 'partner@example.com')
  );
  sql.prepare("UPDATE support_partners SET account_id='acct_partner'").run();
  sql
    .prepare(
      "INSERT INTO network_billing(network_id,checkout_key,subscription_id,status,period_end,checked_at) VALUES(?,'key','sub','active',?,?)"
    )
    .run(workspace.id, Math.floor(Date.now() / 1000) + 3600, Math.floor(Date.now() / 1000));
  const e = (subject: string, body?: unknown) => {
    const v = event(body, subject, subject + '@example.com');
    v.params = { id: workspace.id };
    return v;
  };
  expect(
    (
      await supportUpdate(
        e('company', { body: 'Here is the workflow evaluation and its failure case.' })
      )
    ).status
  ).toBe(201);
  expect((await supportDetail(e('stranger'))).status).toBe(404);
  expect((await (await supportDetail(e('partner'))).json()).updates).toHaveLength(1);
  await partnerReview(
    event(
      { subject: 'partner', approved: false, note: 'Support approval revoked.' },
      'reviewer',
      'reviewer@example.com'
    )
  );
  expect((await supportDetail(e('partner'))).status).toBe(404);
});

it('creates a distinct support payout account with stable recovery after a lost provider response', async () => {
  await POST(event(application, 'partner', 'partner@example.com'));
  await review(
    event(
      { subject: 'partner', status: 'approved', review_note: 'Good creator.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  await partnerReview(
    event(
      { subject: 'partner', approved: true, note: 'Reviewed for support.' },
      'reviewer',
      'reviewer@example.com'
    )
  );
  const e = event(undefined, 'partner', 'partner@example.com');
  e.platform.env.PCN_SUPPORT_CONNECT_ENABLED = 'true';
  e.platform.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  const account = {
    id: 'acct_support',
    livemode: false,
    dashboard: 'express',
    metadata: { application: 'private_pcn_support', pcn_support_partner: 'partner' },
    defaults: {
      responsibilities: { fees_collector: 'application', losses_collector: 'application' }
    }
  };
  const create = vi.fn().mockRejectedValueOnce(new Error('lost')).mockResolvedValue(account);
  const stripe: any = {
    accounts: { retrieve: vi.fn(async () => ({ id: 'acct_1JfTzIAzstI6Ecr5' })) },
    countrySpecs: { retrieve: vi.fn(async () => ({ id: 'US' })) },
    v2: { core: { accounts: { create, retrieve: vi.fn(async () => account) } } }
  };
  await expect(
    ensureSupportPartner(e.platform.env, e.locals.identity, 'US', stripe)
  ).rejects.toThrow('lost');
  expect(await ensureSupportPartner(e.platform.env, e.locals.identity, 'US', stripe)).toBe(
    'acct_support'
  );
  expect(create.mock.calls[0][1].idempotencyKey).toBe(create.mock.calls[1][1].idempotencyKey);
  expect(create.mock.calls[1][0]).toMatchObject({
    dashboard: 'express',
    configuration: {
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } }
    },
    defaults: {
      responsibilities: { fees_collector: 'application', losses_collector: 'application' }
    }
  });
});

it('restricts creator impact reports to the owning network and counts grants rather than claiming installs', async () => {
  sql.exec(
    "INSERT INTO networks(id,slug,owner_id,name) VALUES('alpha','alpha','creator','Alpha'),('bravo','bravo','other','Bravo'); INSERT INTO network_impact_daily(day,network_id,event,count) VALUES(date('now'),'alpha','package_delivery_granted',2),(date('now'),'bravo','package_delivery_granted',9)"
  );
  const e = event();
  e.locals.network = { id: 'alpha', owner_id: 'creator' };
  const body = await (await networkImpact(e)).json();
  expect(body.delivery).toEqual([expect.objectContaining({ count: 2 })]);
  e.locals.identity.subject = 'other';
  expect((await networkImpact(e)).status).toBe(403);
});

it('keeps field evidence private by default and labels creator claims without platform certification', async () => {
  sql.exec(
    "INSERT INTO networks(id,slug,owner_id,name,status,access_model) VALUES('alpha','alpha','creator','Alpha','active','preview')"
  );
  const draft = {
    title: 'Evaluating tool access',
    context: 'A scoped customer workflow with an explicit baseline.',
    implementation: 'An MCP tool with restricted permissions and a review boundary.',
    evaluation: 'Five denial cases and one permitted path tested.',
    result: 'The operator reported fewer manual retries.',
    evidence_url: 'https://example.com/evidence',
    visibility: 'members'
  };
  const e = event(draft);
  e.locals.network = {
    id: 'alpha',
    owner_id: 'creator',
    status: 'active',
    access_model: 'preview'
  };
  expect((await saveFieldNote(e)).status).toBe(201);
  const read = event();
  read.locals.network = e.locals.network;
  read.locals.identity = null;
  expect((await (await fieldNotes(read)).json()).notes).toEqual([]);
  read.locals.identity = { subject: 'member', role: 'member', email: 'member@example.com' };
  const result = await (await fieldNotes(read)).json();
  expect(result.notes).toHaveLength(1);
  expect(result.evidenceStatus).toBe('creator_reported');
  read.locals.network = {
    id: 'other',
    owner_id: 'other',
    status: 'active',
    access_model: 'preview'
  };
  expect((await (await fieldNotes(read)).json()).notes).toEqual([]);
});
it('allows partner revocation after the creator has already been suspended', async () => {
  await POST(event(application, 'partner', 'partner@example.com'));
  await review(
    event(
      { subject: 'partner', status: 'approved', review_note: 'Good creator.', revision: 0 },
      'reviewer',
      'reviewer@example.com'
    )
  );
  await partnerReview(
    event(
      { subject: 'partner', approved: true, note: 'Reviewed for support.' },
      'reviewer',
      'reviewer@example.com'
    )
  );
  await review(
    event(
      {
        subject: 'partner',
        status: 'suspended',
        review_note: 'Quality review pending.',
        revision: 1
      },
      'reviewer',
      'reviewer@example.com'
    )
  );
  expect(
    (
      await partnerReview(
        event(
          { subject: 'partner', approved: false, note: 'Partner approval withdrawn.' },
          'reviewer',
          'reviewer@example.com'
        )
      )
    ).status
  ).toBe(200);
});

it('separates operator engagement and reports invitation and free acquisition outcomes', async () => {
  const operator = event(
    { event: 'page_view', surface: 'home' },
    'operator',
    'reviewer@example.com'
  );
  await track(operator);
  const supportSession = event({ event: 'page_view', surface: 'home' });
  supportSession.locals.impersonation = { id: 'support', invalid: false };
  await track(supportSession);
  sql.exec(
    "INSERT INTO impact_daily(day,surface,event,count) VALUES('2000-01-01','home','page_view',500)"
  );
  await track(event({ event: 'page_view', surface: 'home' }));
  expect(sql.prepare('SELECT COUNT(*) AS count FROM impact_daily').get()?.count).toBe(0);
  await POST(event(application));
  await POST(event(application, 'operator', 'operator@example.com'));
  sql.exec(
    "INSERT INTO creator_invitations(token_hash,sponsor,recipient_email,expires_at) VALUES('real','creator','new@example.com',9999999999),('test','creator','operator@example.com',9999999999)"
  );
  const request = event(undefined, 'reviewer', 'reviewer@example.com');
  request.platform.env.PCN_ANALYTICS_OPERATOR_SUBJECTS = 'operator';
  request.platform.env.PCN_ANALYTICS_OPERATOR_EMAILS = 'operator@example.com';
  sql.exec(`INSERT INTO networks(id,slug,owner_id,name,status) VALUES('impact-net','impact-net','creator','Impact','active');
    INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents) VALUES('asset','impact-net','Skill','skill','Fixture',0);
    INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES('release','impact-net','asset','1.0.0','{}','fixture','hash',10);
    INSERT INTO asset_entitlements(id,network_id,asset_id,release_id,buyer_id,source,status) VALUES('real-buy','impact-net','asset','release','buyer','free','active'),('test-buy','impact-net','asset','release','operator','free','active');
    INSERT INTO impact_daily(day,surface,event,count) VALUES(date('now'),'home','page_view',99);`);
  const result = await (await report(request)).json();
  expect(result.engagement).toEqual([expect.objectContaining({ surface: 'home', count: 1 })]);
  expect(result.outcomes.applications).toEqual([{ status: 'pending', count: 1 }]);
  expect(result.outcomes.invitations).toMatchObject({ issued: 1, redeemed: 0 });
  expect(result.outcomes.acquisitions).toEqual([{ source: 'free', status: 'active', count: 1 }]);
  expect(result.legacyEngagement).toEqual({ count: 99 });
  expect(result.note).toContain('operator');
});

it('expires impact aggregates on a scheduled invocation without customer traffic', async () => {
  sql.exec(
    "INSERT INTO impact_daily VALUES('2000-01-01','home','page_view',3); INSERT INTO customer_impact_daily VALUES('2000-01-01','home','page_view',4); INSERT INTO customer_impact_daily VALUES(date('now'),'home','page_view',5)"
  );
  await retention.scheduled({}, event().platform.env);
  expect(sql.prepare('SELECT COUNT(*) AS count FROM impact_daily').get()?.count).toBe(0);
  expect(sql.prepare('SELECT count FROM customer_impact_daily').all()).toEqual([{ count: 5 }]);
});
