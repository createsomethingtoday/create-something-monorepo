import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { actions } from '../src/routes/join/+page.server';
import { actions as review, load } from '../src/routes/review/intake/+page.server';
import retention from '../src/retention-worker';
let sql: DatabaseSync;
function statement(query: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(query, args),
    first: async () => sql.prepare(query).get(...values),
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => {
      const result = sql.prepare(query).run(...values);
      return { meta: { changes: Number(result.changes) } };
    }
  };
}
const introduction = {
  intent: 'learn',
  display_name: 'Intake test',
  email: 'LEARNER@example.com',
  practice: 'I want to learn to evaluate an MCP integration.',
  work_url: 'https://example.com/work',
  referral: '',
  consent: 'yes'
};
function event(body: Record<string, string> = introduction, reviewer = false): any {
  return {
    locals: {
      identity: reviewer
        ? { subject: 'reviewer', email: 'reviewer@example.com', role: 'admin' }
        : null
    },
    url: new URL('https://private.createsomething.agency/review/intake'),
    setHeaders: vi.fn(),
    platform: {
      env: {
        DB: {
          prepare: statement,
          batch: async (items: any[]) => Promise.all(items.map((item) => item.run()))
        },
        PCN_ADMIN_EMAILS: 'reviewer@example.com',
        PCN_INTAKE_RATE_LIMIT: { limit: vi.fn().mockResolvedValue({ success: true }) }
      }
    },
    request: new Request('https://private.createsomething.agency/join', {
      method: 'POST',
      headers: { origin: 'https://private.createsomething.agency' },
      body: new URLSearchParams(body)
    })
  };
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort())
    sql.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
});
afterEach(() => sql.close());
it.each(['learn', 'create', 'both'])(
  'saves a %s introduction without granting access or accepting browser status',
  async (intent) => {
    const result = await actions.default(
      event({ ...introduction, intent, status: 'approved', subject: 'owner' })
    );
    expect(result).toMatchObject({ success: true });
    expect(
      sql.prepare('SELECT email,intent,status,consent_version FROM invitation_requests').get()
    ).toEqual({
      email: 'learner@example.com',
      intent,
      status: 'new',
      consent_version: 'invitation-intake-2026-09-23'
    });
    for (const table of ['creator_applications', 'creator_invitations', 'members'])
      expect(sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n).toBe(0);
  }
);
it('retries without overwriting an introduction or revealing existing email status', async () => {
  const first = await actions.default(event());
  const retry = await actions.default(
    event({ ...introduction, practice: 'Attacker tries to overwrite this existing introduction.' })
  );
  expect(retry).toEqual(first);
  expect(sql.prepare('SELECT practice FROM invitation_requests').get()!.practice).toBe(
    introduction.practice
  );
  expect(sql.prepare('SELECT COUNT(*) AS n FROM invitation_requests').get()!.n).toBe(1);
});
it('fails closed for cross-origin, missing rate limiter, denied rate limit, or database failure', async () => {
  const cross = event();
  cross.request.headers.set('origin', 'https://attacker.example');
  expect(await actions.default(cross)).toMatchObject({ status: 403 });
  const missing = event();
  delete missing.platform.env.PCN_INTAKE_RATE_LIMIT;
  expect(await actions.default(missing)).toMatchObject({ status: 503 });
  const limited = event();
  limited.platform.env.PCN_INTAKE_RATE_LIMIT.limit.mockResolvedValue({ success: false });
  expect(await actions.default(limited)).toMatchObject({ status: 429 });
  expect(limited.setHeaders).toHaveBeenCalledWith({ 'Retry-After': '60' });
  const broken = event();
  broken.platform.env.DB.prepare = () => {
    throw new Error('offline');
  };
  expect(await actions.default(broken)).toMatchObject({
    status: 503,
    data: { success: false, values: introduction }
  });
  expect(sql.prepare('SELECT COUNT(*) AS n FROM invitation_requests').get()!.n).toBe(0);
});
it.each([
  { consent: '' },
  { email: 'no-email' },
  { intent: 'admin' },
  { practice: 'short' },
  { work_url: 'javascript:alert(1)' },
  { work_url: 'https://name:secret@example.com' },
  { referral: 'x'.repeat(161) }
])('rejects invalid or unsafe fields %j', async (fields) => {
  expect(await actions.default(event({ ...introduction, ...fields }))).toMatchObject({
    status: 400
  });
  expect(sql.prepare('SELECT COUNT(*) AS n FROM invitation_requests').get()!.n).toBe(0);
});
it('bounds bodies and quietly discards honeypots', async () => {
  expect(
    await actions.default(event({ ...introduction, practice: 'x'.repeat(20000) }))
  ).toMatchObject({ status: 400 });
  expect(await actions.default(event({ ...introduction, website: 'spam' }))).toMatchObject({
    success: true
  });
  expect(sql.prepare('SELECT COUNT(*) AS n FROM invitation_requests').get()!.n).toBe(0);
});
it('accepts enhanced multipart submissions', async () => {
  const e = event();
  const data = new FormData();
  for (const [key, value] of Object.entries(introduction)) data.set(key, value);
  e.request = new Request(e.request.url, {
    method: 'POST',
    headers: { origin: 'https://private.createsomething.agency' },
    body: data
  });
  expect(await actions.default(e)).toMatchObject({ success: true });
});
it('protects reviewer PII and records a revision-checked decision without creating an invitation', async () => {
  await actions.default(event());
  await expect(load(event())).rejects.toMatchObject({ status: 303 });
  const other = event({}, true);
  other.locals.identity.email = 'other@example.com';
  await expect(load(other)).rejects.toMatchObject({ status: 403 });
  const impersonation = event({}, true);
  impersonation.locals.impersonation = { id: 'support' };
  await expect(load(impersonation)).rejects.toMatchObject({ status: 403 });
  const queue: any = await load(event({}, true));
  expect(queue.introductions).toHaveLength(1);
  const decision = {
    id: queue.introductions[0].id,
    revision: '0',
    status: 'reviewed',
    note: 'Good fit for a follow-up.'
  };
  await expect(review.default(event(decision))).rejects.toMatchObject({ status: 403 });
  const cross = event(decision, true);
  cross.request.headers.set('origin', 'https://attacker.example');
  await expect(review.default(cross)).rejects.toMatchObject({ status: 403 });
  expect(await review.default(event(decision, true))).toMatchObject({ success: true });
  expect(await review.default(event(decision, true))).toMatchObject({ status: 409 });
  expect(sql.prepare('SELECT status,reviewer FROM invitation_request_decisions').get()).toEqual({
    status: 'reviewed',
    reviewer: 'reviewer'
  });
  expect(sql.prepare('SELECT COUNT(*) AS n FROM creator_invitations').get()!.n).toBe(0);
  expect(sql.prepare('SELECT COUNT(*) AS n FROM creator_applications').get()!.n).toBe(0);
});
it('expires old introductions and their audit notes while preserving recent submissions', async () => {
  await actions.default(event());
  const row = sql.prepare('SELECT id FROM invitation_requests').get()!;
  await review.default(
    event(
      { id: String(row.id), revision: '0', status: 'closed', note: 'No follow-up planned.' },
      true
    )
  );
  sql.exec("UPDATE invitation_requests SET created_at=datetime('now','-91 days')");
  await actions.default(event({ ...introduction, email: 'new@example.com' }));
  await retention.scheduled(null, event().platform.env);
  expect(sql.prepare('SELECT email FROM invitation_requests').all()).toEqual([
    { email: 'new@example.com' }
  ]);
  expect(sql.prepare('SELECT COUNT(*) AS n FROM invitation_request_decisions').get()!.n).toBe(0);
});
