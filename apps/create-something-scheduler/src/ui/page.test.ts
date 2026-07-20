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
    expect(html).toContain('data-performance-contract="1.0.0"');
    expect(html).toContain('api.fontshare.com/v2/css?f[]=satoshi@400,500,700&amp;display=swap');
    expect(html).toContain('cdn.jsdelivr.net/npm/@ibm/plex-mono@2.5.0/css/ibm-plex-mono-all.css');
    expect(html).toContain('--color-performance-grid:rgb(9 9 9 / .055)');
    expect(html).toContain('--font-performance-display-weight:500');
    expect(html).not.toContain('--font-display:Arial');
    expect(html).not.toContain('--font-mono:ui-monospace');
    expect(html).not.toContain('class="system-bar"');
    expect(html).not.toContain('class="hero-spec"');
    expect(html).not.toContain('class="proof-footer"');
    expect(html).toContain('<title>Workflow Mapping Session | CREATE SOMETHING</title>');
    expect(html).toContain('<h1>Choose a time</h1>');
    expect(html).toMatch(/Pick 30 or 60 minutes/);
    expect(html).toMatch(
      /you confirm[\s\S]*Google Calendar[\s\S]*Google Meet[\s\S]*booking receipt/i
    );
    expect(html).not.toMatch(/decision owner|explicit intent|receipt issued|fail closed/i);
    expect(html).toContain('class="steps"');
    expect(html).toContain('aria-label="Booking progress"');
    expect(html).toContain('aria-label="Meeting duration"');
    expect(html).toContain('data-duration="30"');
    expect(html).toContain('data-duration="60"');
    expect(html).toContain('durationMinutes: 30');
    expect(html).toContain('durationMinutes:String(state.durationMinutes)');
    expect(html).toContain('id="duration-summary"');
    expect(html).toContain("dateRail.className='date-rail'");
    expect(html).toContain("dateRail.setAttribute('role','tablist')");
    expect(html).toContain("timePanel.className='time-panel'");
    expect(html).toContain('selectedDay: null');
    expect(html).toContain("head.className='day-head'");
    expect(html).toContain("'-minute openings · '");
    expect(html).toContain('id="status-state"');
    expect(html).toContain('event.source !== parent');
    expect(html).toContain("event.origin !== 'https://createsomething.agency'");
    expect(html).toContain("event.data?.type === 'create-something:scheduler-access'");
    expect(html).toContain('sessionStorage.setItem(tokenKey(access.bookingId),access.actionToken)');
    expect(html).toContain('state.actionToken=result.actionToken');
    expect(html).toContain('context:state.context');
    expect(html).toContain('--color-performance-signal:#0057b8');
    expect(html).toContain('--color-performance-growth:#007a4d');
    expect(html).toContain('--color-performance-ready:var(--color-performance-growth)');
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
