import { describe, expect, it } from 'vitest';
import { bookingActionExpiresAt, buildBookingManageUrl } from './manage-link.js';

describe('booking management link contract', () => {
  it('keeps the booking identifier in the query and the action credential in the fragment', () => {
    const url = buildBookingManageUrl({
      publicOrigin: 'https://createsomething.agency',
      bookingId: 'booking_controlled',
      actionToken: 'controlled.token'
    });

    expect(url).toBe(
      'https://createsomething.agency/book?booking=booking_controlled#access=controlled.token'
    );
    expect(new URL(url).search).not.toContain('controlled.token');
  });

  it('preserves only allowlisted commercial offer intents', () => {
    const integration = buildBookingManageUrl({
      publicOrigin: 'https://createsomething.agency',
      bookingId: 'booking_integration',
      actionToken: 'controlled.token',
      intent: 'compiler-integration'
    });
    const unknown = buildBookingManageUrl({
      publicOrigin: 'https://createsomething.agency',
      bookingId: 'booking_unknown',
      actionToken: 'controlled.token',
      intent: 'unknown-offer'
    });
    const foundation = buildBookingManageUrl({
      publicOrigin: 'https://createsomething.agency',
      bookingId: 'booking_foundation',
      actionToken: 'controlled.token',
      intent: 'agent-foundation'
    });

    expect(integration).toBe(
      'https://createsomething.agency/book?booking=booking_integration&intent=compiler-integration#access=controlled.token'
    );
    expect(unknown).toBe(
      'https://createsomething.agency/book?booking=booking_unknown#access=controlled.token'
    );
    expect(foundation).toBe(
      'https://createsomething.agency/book?booking=booking_foundation&intent=agent-foundation#access=controlled.token'
    );
  });

  it('expires access one day after the current meeting ends', () => {
    expect(bookingActionExpiresAt({ end: '2026-07-14T16:30:00Z' })).toBe('2026-07-15T16:30:00Z');
  });

  it('rejects origins, identifiers, and credentials outside the narrow contract', () => {
    expect(() =>
      buildBookingManageUrl({
        publicOrigin: 'http://createsomething.agency',
        bookingId: 'booking_controlled',
        actionToken: 'controlled.token'
      })
    ).toThrow('manage_link_origin_invalid');
    expect(() =>
      buildBookingManageUrl({
        publicOrigin: 'https://createsomething.agency',
        bookingId: '../booking',
        actionToken: 'controlled.token'
      })
    ).toThrow('manage_link_booking_invalid');
    expect(() =>
      buildBookingManageUrl({
        publicOrigin: 'https://createsomething.agency',
        bookingId: 'booking_controlled',
        actionToken: 'token with space'
      })
    ).toThrow('manage_link_token_invalid');
  });
});
