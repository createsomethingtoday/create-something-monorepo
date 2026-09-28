import { describe, expect, it } from 'vitest';
import {
  renderContactResponse,
  renderContactNotification
} from '../../agency/src/routes/api/contact/email';

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

describe('agency contact email contract', () => {
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
    expect(response).toContain('within 24 hours to scope your first outcome stack.');
    expect(response).toContain('Your Message:');
    expect(response).not.toContain('Submitted:');
    expect(notification).toContain('reader@example.invalid');
    expect(notification).toContain(input.submittedAt);
    expect(notification).not.toContain('Your Message:');
    expect(response).toContain('Next step: workflow-mapping / not_sure');
    expect(notification).toContain('A &amp; B');
    expect(notification).toContain('decision');
    expect(notification).toContain('September');
  });
  it('omits optional service and company rows without losing default next-step information', () => {
    const plain = { ...input, service: undefined, company: undefined, campaign: undefined };
    const response = renderContactResponse(plain);
    const notification = renderContactNotification(plain);
    expect(response).toContain("I've received your inquiry and will get back");
    expect(response).not.toContain('Service:');
    expect(notification).toContain('New Contact Form Submission');
    expect(notification).not.toMatch(/Company:|Campaign:|Service:/);
  });
});
