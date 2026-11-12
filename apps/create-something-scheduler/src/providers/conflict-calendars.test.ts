import { expect, it } from 'vitest';
import { conflictCalendarIds } from './conflict-calendars.js';
it('retains configured and persisted calendars while requiring both host calendars exactly once', () => {
  expect(conflictCalendarIds(['configured'], ['micah@createsomething.io', 'persisted']))
    .toEqual(['configured', 'micah@createsomething.io', 'persisted', 'mj@halfdozen.co']);
});

import { GoogleCalendarPort } from './google-calendar.js';
it.each([undefined, { errors: [{ reason: 'notFound' }] }])('fails closed when required HD coverage is unavailable (%j)', async hd => {
  const port = new GoogleCalendarPort({
    selectedCalendarIds: conflictCalendarIds(['micah@createsomething.io']),
    eventCalendarId: 'micah@createsomething.io',
    accessTokens: { getAccessToken: async () => 'fixture' },
    fetch: async () => Response.json({ calendars: {
      'micah@createsomething.io': { busy: [] }, ...(hd ? { 'mj@halfdozen.co': hd } : {})
    } })
  });
  expect(await port.listBusyIntervals({ from: '2037-07-28T16:00:00Z', to: '2037-07-28T17:00:00Z' }))
    .toEqual({ status: 'unavailable', reason: 'provider_calendar_error' });
});
