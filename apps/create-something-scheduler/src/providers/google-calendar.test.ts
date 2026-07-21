import { describe, expect, it, vi } from 'vitest';
import { GoogleCalendarPort } from './google-calendar.js';

describe('GoogleCalendarPort', () => {
  it('queries every selected calendar and normalizes their busy intervals', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        timeMin: '2026-07-14T00:00:00Z',
        timeMax: '2026-07-15T00:00:00Z',
        timeZone: 'UTC',
        items: [
          { id: 'micah@createsomething.io' },
          { id: 'micah@webflow.com' }
        ]
      });
      return Response.json({
        calendars: {
          'micah@createsomething.io': {
            busy: [
              { start: '2026-07-14T18:00:00Z', end: '2026-07-14T18:30:00Z' }
            ]
          },
          'micah@webflow.com': {
            busy: [
              { start: '2026-07-14T16:00:00Z', end: '2026-07-14T17:00:00Z' }
            ]
          }
        }
      });
    });
    const port = new GoogleCalendarPort({
      selectedCalendarIds: ['micah@createsomething.io', 'micah@webflow.com'],
      eventCalendarId: 'micah@createsomething.io',
      accessTokens: { getAccessToken: async () => 'controlled-access-token' },
      fetch
    });

    const result = await port.listBusyIntervals({
      from: '2026-07-14T00:00:00Z',
      to: '2026-07-15T00:00:00Z'
    });

    expect(result).toEqual({
      status: 'available',
      intervals: [
        { start: '2026-07-14T16:00:00Z', end: '2026-07-14T17:00:00Z' },
        { start: '2026-07-14T18:00:00Z', end: '2026-07-14T18:30:00Z' }
      ]
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer controlled-access-token' })
      })
    );
  });

  it('creates an attendee event with a unique Google Meet using a retry-safe event id', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/micah%40createsomething.io/events?conferenceDataVersion=1&sendUpdates=all'
      );
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        summary: 'Micah Johnson and Controlled Test',
        description: expect.stringContaining('source=atlas-canvas'),
        start: {
          dateTime: '2026-07-14T16:00:00Z',
          timeZone: 'America/Chicago'
        },
        end: {
          dateTime: '2026-07-14T16:30:00Z',
          timeZone: 'America/Chicago'
        },
        attendees: [{ email: 'controlled@example.com', displayName: 'Controlled Test' }],
        conferenceData: {
          createRequest: {
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      });
      expect(body.id).toMatch(/^[0-9a-v]{32}$/);
      expect(body.conferenceData.createRequest.requestId).toBe(body.id);
      return Response.json({
        id: body.id,
        hangoutLink: 'https://meet.google.com/provider-test'
      });
    });
    const port = new GoogleCalendarPort({
      selectedCalendarIds: ['micah@createsomething.io'],
      eventCalendarId: 'micah@createsomething.io',
      accessTokens: { getAccessToken: async () => 'controlled-access-token' },
      fetch
    });

    const result = await port.createEvent({
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      },
      idempotencyKey: 'controlled-provider-event',
      context: {
        source: 'atlas-canvas',
        intent: 'workflow-map',
        warmupNotes: 'Map the approval handoff.'
      }
    });

    expect(result).toMatchObject({
      status: 'created',
      meetUrl: 'https://meet.google.com/provider-test'
    });
  });

  it('places the owned room URL in Calendar without requesting Google Meet', async () => {
    const joinUrl = 'https://scheduler.local/rooms/room-controlled?cap=guest-capability';
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/micah%40createsomething.io/events?sendUpdates=all'
      );
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        location: joinUrl,
        description: expect.stringContaining(joinUrl)
      });
      expect(body).not.toHaveProperty('conferenceData');
      return Response.json({ id: body.id });
    });
    const port = new GoogleCalendarPort({
      selectedCalendarIds: ['micah@createsomething.io'],
      eventCalendarId: 'micah@createsomething.io',
      accessTokens: { getAccessToken: async () => 'controlled-access-token' },
      fetch
    });

    await expect(port.createEvent({
      slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
      scheduler: { name: 'Controlled Test', email: 'controlled@example.com' },
      idempotencyKey: 'controlled-first-party-event',
      conferencing: { provider: 'first_party', roomId: 'room-controlled', joinUrl }
    })).resolves.toEqual({
      status: 'created',
      eventId: expect.any(String),
      meetUrl: joinUrl
    });
  });

  it('discovers selected conflict calendars and verifies the event calendar can create Meet events', async () => {
    const fetch = vi.fn(async () => Response.json({
      items: [
        {
          id: 'micah@createsomething.io',
          summary: 'CREATE SOMETHING',
          selected: true,
          primary: true,
          accessRole: 'owner',
          conferenceProperties: {
            allowedConferenceSolutionTypes: ['hangoutsMeet']
          }
        },
        {
          id: 'micah@webflow.com',
          summary: 'Conflicts',
          selected: false,
          accessRole: 'freeBusyReader'
        },
        {
          id: 'not-selected-calendar',
          summary: 'Hidden from conflict checks',
          selected: false,
          accessRole: 'owner'
        }
      ]
    }));
    const port = new GoogleCalendarPort({
      selectedCalendarIds: [],
      requiredCalendarIds: ['micah@createsomething.io', 'micah@webflow.com'],
      eventCalendarId: 'micah@createsomething.io',
      accessTokens: { getAccessToken: async () => 'controlled-access-token' },
      fetch
    });

    await expect(port.discoverCalendars()).resolves.toEqual({
      status: 'available',
      selectedCalendarIds: [
        'micah@createsomething.io',
        'micah@webflow.com'
      ],
      eventCalendarId: 'micah@createsomething.io'
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&showHidden=true',
      expect.objectContaining({
        headers: { authorization: 'Bearer controlled-access-token' }
      })
    );
  });

  it('fails discovery when a required conflict calendar is inaccessible', async () => {
    const fetch = vi.fn(async () => Response.json({
      items: [{
        id: 'micah@createsomething.io',
        selected: true,
        accessRole: 'owner',
        conferenceProperties: {
          allowedConferenceSolutionTypes: ['hangoutsMeet']
        }
      }]
    }));
    const port = new GoogleCalendarPort({
      selectedCalendarIds: [],
      requiredCalendarIds: ['micah@createsomething.io', 'micah@webflow.com'],
      eventCalendarId: 'micah@createsomething.io',
      accessTokens: { getAccessToken: async () => 'controlled-access-token' },
      fetch
    });

    await expect(port.discoverCalendars()).resolves.toEqual({
      status: 'unavailable',
      reason: 'required_conflict_calendar_missing'
    });
  });

  it('invokes the runtime fetch function with the global receiver', async () => {
    const runtimeFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({
        items: [{
          id: 'micah@createsomething.io',
          selected: true,
          accessRole: 'owner',
          conferenceProperties: { allowedConferenceSolutionTypes: ['hangoutsMeet'] }
        }]
      }));
    });
    vi.stubGlobal('fetch', runtimeFetch);

    try {
      const port = new GoogleCalendarPort({
        selectedCalendarIds: ['micah@createsomething.io'],
        eventCalendarId: 'micah@createsomething.io',
        accessTokens: { getAccessToken: async () => 'controlled-access-token' }
      });
      await expect(port.discoverCalendars()).resolves.toMatchObject({ status: 'available' });
      expect(runtimeFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('moves and deletes the same provider event while notifying the attendee', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        expect(String(input)).toBe(
          'https://www.googleapis.com/calendar/v3/calendars/micah%40createsomething.io/events/google-event-lifecycle?conferenceDataVersion=1&sendUpdates=all'
        );
        expect(JSON.parse(String(init.body))).toEqual({
          start: {
            dateTime: '2026-07-16T18:00:00Z',
            timeZone: 'America/Chicago'
          },
          end: {
            dateTime: '2026-07-16T18:30:00Z',
            timeZone: 'America/Chicago'
          }
        });
        return Response.json({
          id: 'google-event-lifecycle',
          hangoutLink: 'https://meet.google.com/lifecycle-test'
        });
      }
      expect(init?.method).toBe('DELETE');
      expect(String(input)).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/micah%40createsomething.io/events/google-event-lifecycle?sendUpdates=all'
      );
      return new Response(null, { status: 204 });
    });
    const port = new GoogleCalendarPort({
      selectedCalendarIds: ['micah@createsomething.io'],
      eventCalendarId: 'micah@createsomething.io',
      accessTokens: { getAccessToken: async () => 'controlled-access-token' },
      fetch
    });

    await expect(port.updateEvent({
      eventId: 'google-event-lifecycle',
      slot: {
        start: '2026-07-16T18:00:00Z',
        end: '2026-07-16T18:30:00Z'
      },
      idempotencyKey: 'reschedule-provider-event'
    })).resolves.toMatchObject({
      status: 'updated',
      eventId: 'google-event-lifecycle'
    });
    await expect(port.cancelEvent({
      eventId: 'google-event-lifecycle',
      idempotencyKey: 'cancel-provider-event'
    })).resolves.toEqual({ status: 'cancelled' });
  });
});
