import { describe, expect, it } from 'vitest';
import { schedulerPage } from './page.js';

describe('scheduler public page', () => {
  it('is an API-only client with booking, reschedule, cancel, error, and accessibility states', () => {
    const html = schedulerPage({
      nonce: 'controlled-nonce',
      turnstileSiteKey: 'controlled-site-key'
    });

    expect(html).toContain('/api/v1/availability');
    expect(html).toContain('/api/v1/bookings/prepare');
    expect(html).toContain("'/reschedule'");
    expect(html).toContain("'/cancel'");
    expect(html).toContain('x-booking-action-token');
    expect(html).toContain('x-browser-proof');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('prefers-reduced-motion');
    expect(html).toContain('nonce="controlled-nonce"');
    expect(html).toContain('data-performance-surface="booking"');
    expect(html).toContain('class="system-bar"');
    expect(html).toContain('class="hero-spec"');
    expect(html).toContain('class="proof-footer"');
    expect(html).toContain('class="steps"');
    expect(html).toContain('aria-label="Booking progress"');
    expect(html).toContain('aria-label="Meeting duration"');
    expect(html).toContain('data-duration="30"');
    expect(html).toContain('data-duration="60"');
    expect(html).toContain('durationMinutes: 30');
    expect(html).toContain("durationMinutes:String(state.durationMinutes)");
    expect(html).toContain('id="duration-summary"');
    expect(html).toContain("dateRail.className='date-rail'");
    expect(html).toContain("dateRail.setAttribute('role','tablist')");
    expect(html).toContain("timePanel.className='time-panel'");
    expect(html).toContain('selectedDay: null');
    expect(html).toContain("head.className='day-head'");
    expect(html).toContain("'-minute openings · '");
    expect(html).toContain('id="status-state"');
    expect(html).toContain("event.source !== parent");
    expect(html).toContain("event.origin !== 'https://createsomething.agency'");
    expect(html).toContain('context:state.context');
    expect(html).toContain('--color-performance-signal:#0057b8');
    expect(html).toContain('--color-performance-ready:#007a4d');
    expect(html).not.toContain('border-radius:999px');
    expect(html).not.toContain('Georgia,serif');
    expect(html).not.toContain('pt_secret_');
  });

  it('encodes deployment configuration before embedding it in HTML or script', () => {
    const html = schedulerPage({
      nonce: 'controlled-nonce',
      turnstileSiteKey: 'site-key"><script>unsafe()</script>'
    });

    expect(html).not.toContain('data-sitekey="site-key"><script>');
    expect(html).not.toContain('"turnstileSiteKey":"site-key"><script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;unsafe()&lt;/script&gt;');
    expect(html).toContain('\\u003cscript>unsafe()\\u003c/script>');
  });
});
