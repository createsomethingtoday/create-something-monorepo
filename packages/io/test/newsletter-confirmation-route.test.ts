import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const { conversion, warmLead } = vi.hoisted(() => ({
  conversion: vi.fn(async () => {}),
  warmLead: vi.fn(async () => {})
}));
vi.mock('@create-something/canon/analytics', () => ({
  recordServerConversion: conversion,
  upsertWarmLead: warmLead
}));
vi.mock(
  '@create-something/canon/newsletter/attribution',
  async () => import('../../canon/src/lib/newsletter/attribution')
);
import { load } from '../src/routes/confirm/+page.server';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE newsletter_subscribers(id INTEGER PRIMARY KEY,email TEXT,confirmation_token TEXT,confirmed_at TEXT,unsubscribed_at TEXT,source TEXT,unsubscribe_token TEXT,consent_confirmed_at TEXT,consent_method TEXT,consent_evidence TEXT,audience_classification TEXT,active INTEGER,status TEXT,updated_at TEXT,welcome_email_id TEXT,confirmation_email_id TEXT);
    INSERT INTO newsletter_subscribers VALUES(1,'reader@example.com','current-token',NULL,NULL,'io','unsubscribe',NULL,'double_opt_in','pending_confirmation','confirmed_subscriber',1,'active',NULL,NULL,'confirmation-receipt');`);
  sqlite.exec(
    readFileSync(
      new URL('../migrations/019_newsletter_signup_attribution.sql', import.meta.url),
      'utf8'
    )
  );
  sqlite.exec(
    `INSERT INTO newsletter_signup_attributions(subscriber_id,confirmation_email_id,edition,channel,campaign,traffic_class,requested_at) VALUES(1,'confirmation-receipt','2026-09-08-test-the-checker','newsletter','2026-09-08-test-the-checker','test',datetime('now'));`
  );
  let failures = 0;
  const db = {
    prepare(sql: string) {
      let values: unknown[] = [];
      const query = {
        bind(...next: unknown[]) {
          values = next;
          return query;
        },
        run: async () => ({
          success: true,
          meta: { changes: Number(sqlite.prepare(sql).run(...(values as [])).changes) }
        }),
        first: async <T>() => {
          if (sql.includes('UPDATE newsletter_signup_attributions') && failures > 0) {
            failures--;
            throw new Error('transient attribution failure');
          }
          return (sqlite.prepare(sql).get(...(values as [])) ?? null) as T | null;
        }
      };
      return query;
    }
  };
  const event = (
    token = 'current-token',
    headers: Record<string, string> = {},
    optOut = false
  ) => ({
    url: new URL(`https://createsomething.io/confirm?token=${token}`),
    request: new Request(`https://createsomething.io/confirm?token=${token}`, { headers }),
    platform: { env: { DB: db, RESEND_API_KEY: 'offline' } },
    parent: async () => ({ user: { analytics_opt_out: optOut } })
  });
  return {
    sqlite,
    event,
    failNext: () => {
      failures = 1;
    }
  };
}

beforeEach(() => {
  conversion.mockClear();
  warmLead.mockClear();
  vi.unstubAllGlobals();
});
describe('newsletter confirmation attribution recovery', () => {
  it('retries pending attribution on the same confirmed link without duplicate welcome or lead work', async () => {
    const f = fixture();
    const send = vi.fn(async () => Response.json({ id: 'welcome-receipt' }));
    vi.stubGlobal('fetch', send);
    try {
      f.failNext();
      expect(await load(f.event() as never)).toMatchObject({
        success: true,
        alreadyConfirmed: false
      });
      expect(
        f.sqlite.prepare('SELECT confirmed_at FROM newsletter_subscribers').get()!.confirmed_at
      ).not.toBeNull();
      expect(
        f.sqlite.prepare('SELECT confirmed_at FROM newsletter_signup_attributions').get()!
          .confirmed_at
      ).toBeNull();
      expect(await load(f.event() as never)).toMatchObject({
        success: true,
        alreadyConfirmed: true
      });
      expect(
        f.sqlite.prepare('SELECT confirmed_at FROM newsletter_signup_attributions').get()!
          .confirmed_at
      ).not.toBeNull();
      await load(f.event() as never);
      expect(conversion).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledTimes(1);
      expect(warmLead).toHaveBeenCalledTimes(1);
    } finally {
      f.sqlite.close();
      vi.unstubAllGlobals();
    }
  });
  it('keeps privacy gates on a pending-attribution retry and rejects invalid or suppressed links', async () => {
    const scenarios: { headers: Record<string, string>; optOut: boolean }[] = [
      { headers: { dnt: '1' }, optOut: false },
      { headers: { 'sec-gpc': '1' }, optOut: false },
      { headers: {}, optOut: true }
    ];
    for (const scenario of scenarios) {
      const f = fixture();
      const send = vi.fn();
      vi.stubGlobal('fetch', send);
      try {
        f.sqlite.exec(
          "UPDATE newsletter_subscribers SET confirmed_at='2026-11-03',consent_evidence='confirmation_link';"
        );
        expect(
          await load(f.event('current-token', scenario.headers, scenario.optOut) as never)
        ).toMatchObject({ success: true, alreadyConfirmed: true });
        expect(
          f.sqlite.prepare('SELECT confirmed_at FROM newsletter_signup_attributions').get()!
            .confirmed_at
        ).toBeNull();
        expect(await load(f.event('obsolete-token') as never)).toMatchObject({ success: false });
        f.sqlite.exec("UPDATE newsletter_subscribers SET active=0,status='suppressed';");
        expect(await load(f.event() as never)).toMatchObject({ success: false });
        expect(send).not.toHaveBeenCalled();
        expect(conversion).not.toHaveBeenCalled();
        expect(warmLead).not.toHaveBeenCalled();
      } finally {
        f.sqlite.close();
        vi.unstubAllGlobals();
      }
    }
  });
});
