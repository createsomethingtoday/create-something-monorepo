import { describe, expect, it } from 'vitest';
import {
  generateConfirmationEmailHtml,
  generateConfirmationEmailText,
  generateWelcomeEmailHtml,
  generateWelcomeEmailText,
  processSubscription
} from './subscribe.js';

describe('newsletter lifecycle email contract', () => {
  it('renders confirmation and welcome mail in the current Playbook Performance language', () => {
    const confirmation = generateConfirmationEmailHtml(
      'https://createsomething.io/confirm?token=confirm-safe'
    );
    const welcome = generateWelcomeEmailHtml('unsubscribe-safe', 'ltd');

    for (const html of [confirmation, welcome]) {
      expect(html).toContain('background-color:#f3f3f0');
      expect(html).toContain('border:1px solid #d7d7d2');
      expect(html).toContain('PERFORMANCE LAB');
      expect(html).toContain(
        'https://createsomething.agency/images/performance-lab/playbook-home-agent-macro.webp'
      );
      expect(html).toContain('alt="Macro-real Playbook court');
      expect(html).not.toContain('background-color: #000000');
    }

    expect(confirmation).toContain('Confirm the note');
    expect(welcome).toContain('https://createsomething.io/unsubscribe?token=unsubscribe-safe');
    expect(welcome).not.toContain('https://createsomething.ltd/unsubscribe');
    expect(
      generateConfirmationEmailText('https://createsomething.io/confirm?token=safe')
    ).toContain('Confirm the note: https://createsomething.io/confirm?token=safe');
    expect(generateWelcomeEmailText('unsubscribe-safe', 'ltd')).toContain(
      'Unsubscribe: https://createsomething.io/unsubscribe?token=unsubscribe-safe'
    );
  });
});

describe('subscription consent receipts', () => {
  it('records the request and Resend confirmation receipt before returning success', async () => {
    const statements: Array<{ sql: string; values: unknown[]; operation: string }> = [];
    const db = {
      prepare(sql: string) {
        let values: unknown[] = [];
        return {
          bind(...nextValues: unknown[]) {
            values = nextValues;
            return this;
          },
          async first() {
            statements.push({ sql, values, operation: 'first' });
            return null;
          },
          async run() {
            statements.push({ sql, values, operation: 'run' });
            return { success: true };
          },
          async all() {
            return { success: true, results: [] };
          }
        };
      },
      async batch() {
        return [];
      }
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ id: 'email-confirm-123' });

    try {
      const { result, status } = await processSubscription(
        { email: 'reader@example.com', source: 'ltd-operator-library' },
        { DB: db, RESEND_API_KEY: 'test-key' } as never,
        '127.0.0.1',
        'ltd'
      );

      expect(status).toBe(200);
      expect(result.emailId).toBe('email-confirm-123');
      expect(
        statements.some(
          ({ sql }) => sql.includes('consent_requested_at') && sql.includes('consent_evidence')
        )
      ).toBe(true);
      expect(
        statements.some(
          ({ sql, values }) =>
            sql.includes('confirmation_email_id = ?') && values[0] === 'email-confirm-123'
        )
      ).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
