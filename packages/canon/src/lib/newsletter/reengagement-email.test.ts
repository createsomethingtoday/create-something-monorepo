import { describe, expect, it } from 'vitest';
import { buildSubscriberReengagementEmail } from './reengagement-email.js';

describe('subscriber re-engagement email', () => {
  it('keeps the reviewed questions, direct check-in, and unsubscribe contract together', () => {
    const email = buildSubscriberReengagementEmail({
      checkInUrl: 'https://createsomething.io/check-in?token=check-in-safe',
      unsubscribeUrl: 'https://createsomething.io/unsubscribe?token=unsubscribe-safe'
    });

    expect(email.subject).toBe('Can I ask why you subscribed?');
    expect(email.preheader).toBe('A short check-in about what CREATE SOMETHING should send next.');
    expect(email.html).toContain('What brought you here?');
    expect(email.html).toContain('why you joined');
    expect(email.html).toContain('whether this still interests you');
    expect(email.html).toContain('what you have seen');
    expect(email.html).toContain('what would be useful next');
    expect(email.html).toContain('https://createsomething.io/check-in?token=check-in-safe');
    expect(email.html).toContain('https://createsomething.io/unsubscribe?token=unsubscribe-safe');
    expect(email.html).toContain('playbook-home-agent-macro.webp');
    expect(email.html).toContain(
      'background-color:#090909;color:#f3f3f0;font-family:Arial, &quot;Helvetica Neue&quot;, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;line-height:1.4;text-align:center;'
    );
    expect(email.text).toContain('Tell me what would help');
    expect(email.text).toContain(
      'Unsubscribe: https://createsomething.io/unsubscribe?token=unsubscribe-safe'
    );
  });

  it('passes the human-pattern and fabrication guardrails for the locked copy', () => {
    const email = buildSubscriberReengagementEmail({
      checkInUrl: '{{CHECK_IN_URL}}',
      unsubscribeUrl: '{{UNSUBSCRIBE_URL}}'
    });
    const artifact = `${email.subject}\n${email.preheader}\n${email.text}`;

    expect(artifact).not.toMatch(/[—–]/u);
    expect(artifact).not.toMatch(
      /\b(revolutionary|groundbreaking|transformative|vibrant|delve|landscape)\b/iu
    );
    expect(artifact).not.toContain('not just');
    expect(artifact).not.toContain('more than just');
  });
});
