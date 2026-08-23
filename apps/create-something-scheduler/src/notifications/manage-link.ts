import { Temporal } from '@js-temporal/polyfill';

const BOOKING_ID = /^[A-Za-z0-9_-]{1,200}$/;
const ACTION_TOKEN = /^[A-Za-z0-9._~-]{16,4096}$/;

export function bookingActionExpiresAt(slot: { end: string }): string {
  return Temporal.Instant.from(slot.end).add({ hours: 24 }).toString();
}

export function buildBookingManageUrl(input: {
  publicOrigin: string;
  bookingId: string;
  actionToken: string;
  intent?: string;
}): string {
  const origin = new URL(input.publicOrigin);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('manage_link_origin_invalid');
  }
  if (!BOOKING_ID.test(input.bookingId)) throw new Error('manage_link_booking_invalid');
  if (!ACTION_TOKEN.test(input.actionToken)) throw new Error('manage_link_token_invalid');

  const url = new URL('/book', origin);
  url.searchParams.set('booking', input.bookingId);
  if (input.intent === 'compiler-integration') {
    url.searchParams.set('intent', input.intent);
  }
  url.hash = `access=${input.actionToken}`;
  return url.toString();
}
