import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { POST } from '../src/routes/api/newsletter/webhook/+server';
import { processSubscription } from '../../canon/src/lib/newsletter/subscribe';

describe('signed provider suppression boundary', () => {
  it('rejects unsigned suppression and suppresses a verified receipt without enabling re-subscription', async () => {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`CREATE TABLE newsletter_subscribers(id INTEGER PRIMARY KEY,email TEXT,status TEXT,active INTEGER,confirmed_at TEXT,unsubscribed_at TEXT,bounce_reason TEXT);
      INSERT INTO newsletter_subscribers VALUES(1,'reader@example.com','active',1,'2026-09-01',NULL,NULL);
      CREATE TABLE newsletter_reengagement_deliveries(resend_email_id TEXT,status TEXT,delivered_at TEXT,error_code TEXT,updated_at TEXT);
      INSERT INTO newsletter_reengagement_deliveries(resend_email_id,status) VALUES('provider-message','sent');`);
    sqlite.exec(
      readFileSync(new URL('../migrations/018_newsletter_editions.sql', import.meta.url), 'utf8')
    );
    sqlite.exec(
      readFileSync(
        new URL('../migrations/020_newsletter_approved_audience.sql', import.meta.url),
        'utf8'
      )
    );
    const recipientHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode('reader@example.com'))
      ),
      (b) => b.toString(16).padStart(2, '0')
    ).join('');
    sqlite
      .prepare(
        "INSERT INTO newsletter_editions(slug,title,subject,owner,author,content_hash,email_status,audience_count) VALUES('test','Test','Test','Operator','CREATE SOMETHING','revision','sent',1)"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO newsletter_edition_deliveries(id,edition_slug,content_hash,subscriber_key,kind,status,resend_email_id,subject,recipient_hash) VALUES('delivery','test','revision','1','audience','sent','provider-message','Test',?)"
      )
      .run(recipientHash);
    sqlite
      .prepare("UPDATE newsletter_editions SET audience_snapshot=? WHERE slug='test'")
      .run(JSON.stringify([{ subscriber_key: '1', recipient_hash: recipientHash }]));
    const db = {
      prepare(sql: string) {
        const statement = sqlite.prepare(sql);
        let values: unknown[] = [];
        const query = {
          bind(...next: unknown[]) {
            values = next;
            return query;
          },
          run: async () => ({
            success: true,
            meta: { changes: Number(statement.run(...(values as [])).changes) }
          }),
          first: async () => statement.get(...(values as [])) ?? null,
          all: async () => ({ success: true, results: statement.all(...(values as [])) })
        };
        return query;
      }
    };
    const secret = 'a test signing secret with 32 bytes';
    const body = JSON.stringify({
      type: 'email.suppressed',
      created_at: new Date().toISOString(),
      data: { email_id: 'provider-message', to: ['reader@example.com'], subject: 'Test' }
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const id = 'suppression-webhook';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.sign(
            'HMAC',
            key,
            new TextEncoder().encode(`${id}.${timestamp}.${body}`)
          )
        )
      )
    );
    const platform = {
      env: { DB: db, ENVIRONMENT: 'production', RESEND_WEBHOOK_SECRET: `whsec_${btoa(secret)}` }
    };
    const unsigned = await POST({
      request: new Request('https://createsomething.io/api/newsletter/webhook', {
        method: 'POST',
        body
      }),
      platform
    } as never);
    expect(unsigned.status).toBe(401);
    expect(sqlite.prepare('SELECT status FROM newsletter_subscribers').get()!.status).toBe(
      'active'
    );
    const signed = await POST({
      request: new Request('https://createsomething.io/api/newsletter/webhook', {
        method: 'POST',
        headers: {
          'svix-id': id,
          'svix-timestamp': timestamp,
          'svix-signature': `v1,${signature}`
        },
        body
      }),
      platform
    } as never);
    expect(signed.status).toBe(200);
    expect(
      sqlite
        .prepare("SELECT status,error_code FROM newsletter_edition_deliveries WHERE id='delivery'")
        .get()
    ).toMatchObject({ status: 'failed', error_code: 'provider-suppressed' });
    expect(
      sqlite.prepare("SELECT email_status FROM newsletter_editions WHERE slug='test'").get()!
        .email_status
    ).toBe('failed');
    expect(sqlite.prepare('SELECT status,active FROM newsletter_subscribers').get()).toMatchObject({
      status: 'suppressed',
      active: 0
    });
    expect(
      sqlite.prepare('SELECT status FROM newsletter_reengagement_deliveries').get()!.status
    ).toBe('failed');
    const lateBody = body.replace('email.suppressed', 'email.delivered');
    const lateBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${id}.${timestamp}.${lateBody}`)
    );
    const lateSignature = btoa(String.fromCharCode(...new Uint8Array(lateBytes)));
    expect(
      (
        await POST({
          request: new Request('https://createsomething.io/api/newsletter/webhook', {
            method: 'POST',
            headers: {
              'svix-id': id,
              'svix-timestamp': timestamp,
              'svix-signature': `v1,${lateSignature}`
            },
            body: lateBody
          }),
          platform
        } as never)
      ).status
    ).toBe(200);
    expect(
      sqlite.prepare("SELECT status FROM newsletter_edition_deliveries WHERE id='delivery'").get()!
        .status
    ).toBe('failed');
    expect(
      sqlite
        .prepare('SELECT status,error_code,delivered_at FROM newsletter_reengagement_deliveries')
        .get()
    ).toMatchObject({ status: 'failed', error_code: 'email.suppressed', delivered_at: null });
    const signup = await processSubscription(
      { email: 'reader@example.com' },
      { DB: db, RESEND_API_KEY: 'offline' } as never,
      '127.0.0.1',
      'io'
    );
    expect(signup.status).toBe(400);
    sqlite.close();
  });
});
