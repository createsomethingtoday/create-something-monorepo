import {
  PERFORMANCE_DOCUMENT_STYLE_VERSION,
  performanceDocumentCss
} from '@create-something/canon/performance/scheduler-document';
import { describe, expect, it } from 'vitest';
import { renderBookingManagementActions, schedulerPage } from './page.js';

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
    expect(html).toContain(
      `data-performance-contract="${PERFORMANCE_DOCUMENT_STYLE_VERSION}"`
    );
    expect(html).toContain(performanceDocumentCss);
    expect(html).toContain('--color-performance-grid:rgb(9 9 9 / .055)');
    expect(html).toContain('--font-performance-display-weight:500');
    expect(html).toContain('class="system-bar"');
    expect(html).toContain('class="hero-spec"');
    expect(html).toContain('class="proof-footer"');
    expect(html).toContain('<title>Workflow Mapping Session | CREATE SOMETHING</title>');
    expect(html).toContain('<h1>Map One Workflow</h1>');
    expect(html).toContain('30- or 60-minute workflow mapping session with Micah Johnson');
    expect(html).toContain(
      'Bring one real handoff, its decision owner, and the proof your team needs next.'
    );
    expect(html).toContain('<span>Policy</span><strong>Workflow Mapping / V2</strong>');
    expect(html).toContain('<span>Calendar</span><strong>Google Calendar</strong>');
    expect(html).not.toContain('focused, 30- or 60-minute conversation');
    expect(html).not.toContain('Createsomething Together / V2');
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

  it('renders an explicit Workflow Compiler Integration fit call for that intent only', () => {
    const integration = schedulerPage({
      nonce: 'controlled-nonce',
      intent: 'compiler-integration'
    });
    const unknown = schedulerPage({ nonce: 'controlled-nonce', intent: 'unknown-offer' });

    expect(integration).toContain(
      '<title>Workflow Compiler Integration Fit Call | CREATE SOMETHING</title>'
    );
    expect(integration).toContain('<h1>Fit One Integration</h1>');
    expect(integration).toContain('one repository, one consequential workflow');
    expect(integration).toContain(
      '<span>Policy</span><strong>Compiler Integration / V1</strong>'
    );
    expect(integration).not.toContain('<h1>Map One Workflow</h1>');
    expect(unknown).toContain('<title>Workflow Mapping Session | CREATE SOMETHING</title>');
    expect(unknown).toContain('<h1>Map One Workflow</h1>');
  });

  it('does not offer booking management actions after cancellation', () => {
    const cancelledActions = renderBookingManagementActions('cancelled');
    const committedActions = renderBookingManagementActions('committed');
    const html = schedulerPage({ nonce: 'controlled-nonce' });

    expect(cancelledActions).not.toContain('id="reschedule"');
    expect(cancelledActions).not.toContain('id="cancel"');
    expect(committedActions).toContain('id="reschedule"');
    expect(committedActions).toContain('id="cancel"');
    expect(html).toContain(
      `const renderBookingManagementActions=${renderBookingManagementActions.toString()}`
    );
  });
});
