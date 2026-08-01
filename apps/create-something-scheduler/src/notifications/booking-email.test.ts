import { performanceEmailTokens } from '@create-something/canon/performance/scheduler-email';
import { describe, expect, it } from 'vitest';
import { renderBookingEmail } from './booking-email.js';

const input = {
  recipientName: 'Controlled & Verified',
  slot: {
    start: '2026-07-14T16:00:00Z',
    end: '2026-07-14T16:30:00Z'
  },
  meetUrl: 'https://meet.google.com/performance-test',
  manageUrl:
    'https://createsomething.agency/book?booking=booking_controlled#access=controlled-token',
  timezone: 'America/Chicago'
} as const;

const htmlDisplayFont = performanceEmailTokens.font.display.replaceAll('"', '&quot;');
const htmlMonoFont = performanceEmailTokens.font.mono.replaceAll('"', '&quot;');

describe('booking email renderer', () => {
  it.each([
    ['confirmation', 'Your CREATE SOMETHING meeting is booked'],
    ['reminder', 'Your CREATE SOMETHING meeting starts in one hour'],
    ['rescheduled', 'Your CREATE SOMETHING meeting has moved']
  ] as const)('renders the %s message from the same Performance contract', (kind, subject) => {
    const rendered = renderBookingEmail({ ...input, kind });

    expect(rendered.subject).toBe(subject);
    expect(rendered.html).toContain(`background-color:${performanceEmailTokens.color.paper}`);
    expect(rendered.html).toContain(`color:${performanceEmailTokens.color.ink}`);
    expect(rendered.html).toContain(`font-family:${htmlDisplayFont}`);
    expect(rendered.html).toContain(`font-family:${htmlMonoFont}`);
    expect(rendered.html).toContain(`max-width:${performanceEmailTokens.layout.maxWidth}`);
    expect(rendered.html).toContain('Controlled &amp; Verified');
    expect(rendered.html).toContain('Manage this meeting');
    expect(rendered.html).toContain('Join with Google Meet');
    expect(rendered.html).toContain(
      'https://createsomething.agency/book?booking=booking_controlled#access=controlled-token'
    );
    expect(rendered.html).not.toContain('<style');
    expect(rendered.html).not.toContain('<link');
    expect(rendered.text).toContain('Manage this meeting:');
    expect(rendered.text).toContain(input.manageUrl);
    expect(rendered.text).toContain('Tuesday, July 14');
    expect(rendered.text).toContain('11:00 AM–11:30 AM CDT');
  });

  it('escapes visitor-controlled values without changing the owned action URL', () => {
    const rendered = renderBookingEmail({
      ...input,
      kind: 'confirmation',
      recipientName: '<script>alert(1)</script>'
    });

    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.text).not.toContain('<script>');
  });
});
