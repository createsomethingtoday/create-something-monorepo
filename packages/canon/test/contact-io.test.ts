import { describe, expect, it } from 'vitest';
import {
  renderContactResponse,
  renderContactNotification
} from '../../io/src/routes/api/contact/email';

const input = {
  name: '<img src=x onerror=alert(1)>',
  email: 'reader@example.invalid',
  message: 'First & second\n<script>alert(1)</script>',
  service: '<strong>Workflow</strong>',
  intent: 'workflow-mapping',
  lane: 'not_sure',
  company: 'A & B',
  leadStage: 'decision',
  campaign: 'September',
  submittedAt: 'Mon, 28 Sep 2026 04:00:00 GMT'
};

describe('io contact email contract', () => {
  it('renders user fields as text and keeps the response distinct from the owner notification', () => {
    const response = renderContactResponse(input);
    const notification = renderContactNotification(input);
    for (const html of [response, notification]) {
      expect(html).not.toMatch(/<script|<img|<strong>Workflow/);
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('First &amp; second');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toMatch(/<style|href=/);
    }
    expect(response).toContain('typically within 24-48 hours.');
    expect(response).toContain('Your Message:');
    expect(response).not.toContain('Submitted:');
    expect(notification).toContain('reader@example.invalid');
    expect(notification).toContain(input.submittedAt);
    expect(notification).not.toContain('Your Message:');
  });
});
