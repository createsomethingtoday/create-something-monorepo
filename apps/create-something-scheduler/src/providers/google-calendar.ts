import { z } from 'zod';
import type {
  AvailableSlot,
  BookingContext,
  CalendarAvailability,
  CalendarPort,
  SchedulerIdentity
} from '../application/booking-service.js';

const freeBusyResponseSchema = z.object({
  calendars: z.record(
    z.object({
      errors: z.array(z.object({ reason: z.string().optional() })).optional(),
      busy: z.array(
        z.object({
          start: z.string().datetime({ offset: true }),
          end: z.string().datetime({ offset: true })
        })
      ).default([])
    })
  )
});

const eventResponseSchema = z.object({
  id: z.string(),
  hangoutLink: z.string().url().optional(),
  conferenceData: z.object({
    entryPoints: z.array(
      z.object({
        entryPointType: z.string(),
        uri: z.string().url()
      })
    ).optional()
  }).optional()
});

const calendarListResponseSchema = z.object({
  nextPageToken: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      selected: z.boolean().optional(),
      primary: z.boolean().optional(),
      accessRole: z.enum([
        'freeBusyReader',
        'reader',
        'writer',
        'owner',
        'writerWithoutPrivateAccess'
      ]),
      conferenceProperties: z.object({
        allowedConferenceSolutionTypes: z.array(z.string()).optional()
      }).optional()
    })
  ).default([])
});

export type AccessTokenProvider = {
  getAccessToken(): Promise<string>;
};

export class GoogleCalendarPort implements CalendarPort {
  private readonly fetch: typeof fetch;

  constructor(
    private readonly config: {
      selectedCalendarIds: string[];
      requiredCalendarIds?: string[];
      eventCalendarId: string;
      accessTokens: AccessTokenProvider;
      fetch?: typeof fetch;
    }
  ) {
    this.fetch = config.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  async listBusyIntervals(input: { from: string; to: string }): Promise<CalendarAvailability> {
    try {
      const accessToken = await this.config.accessTokens.getAccessToken();
      const response = await this.fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: input.from,
          timeMax: input.to,
          timeZone: 'UTC',
          items: this.config.selectedCalendarIds.map((id) => ({ id }))
        })
      });
      if (!response.ok) {
        return { status: 'unavailable', reason: `provider_http_${response.status}` };
      }
      const parsed = freeBusyResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return { status: 'unavailable', reason: 'provider_invalid_response' };
      }

      const intervals = [] as Array<{ start: string; end: string }>;
      for (const calendarId of this.config.selectedCalendarIds) {
        const calendar = parsed.data.calendars[calendarId];
        if (!calendar || (calendar.errors?.length ?? 0) > 0) {
          return { status: 'unavailable', reason: 'provider_calendar_error' };
        }
        intervals.push(...calendar.busy);
      }
      intervals.sort((left, right) => left.start.localeCompare(right.start));
      return { status: 'available', intervals };
    } catch {
      return { status: 'unavailable', reason: 'provider_unavailable' };
    }
  }

  async discoverCalendars(): Promise<
    | {
        status: 'available';
        selectedCalendarIds: string[];
        eventCalendarId: string;
      }
    | { status: 'unavailable'; reason: string }
  > {
    try {
      const accessToken = await this.config.accessTokens.getAccessToken();
      const calendars: Array<z.infer<typeof calendarListResponseSchema>['items'][number]> = [];
      let pageToken: string | undefined;
      do {
        const url = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList');
        url.searchParams.set('maxResults', '250');
        url.searchParams.set('showHidden', 'true');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const response = await this.fetch(url.toString(), {
          headers: { authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          return { status: 'unavailable', reason: `provider_calendar_list_http_${response.status}` };
        }
        const parsed = calendarListResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
          return { status: 'unavailable', reason: 'provider_calendar_list_invalid_response' };
        }
        calendars.push(...parsed.data.items);
        pageToken = parsed.data.nextPageToken;
      } while (pageToken);

      const eventCalendar = calendars.find(
        (calendar) => calendar.id === this.config.eventCalendarId
      );
      if (!eventCalendar || !['writer', 'owner'].includes(eventCalendar.accessRole)) {
        return { status: 'unavailable', reason: 'event_calendar_not_writable' };
      }
      if (!eventCalendar.conferenceProperties?.allowedConferenceSolutionTypes
        ?.includes('hangoutsMeet')) {
        return { status: 'unavailable', reason: 'event_calendar_meet_unavailable' };
      }
      const accessibleCalendarIds = new Set(calendars.map((calendar) => calendar.id));
      const requiredCalendarIds = this.config.requiredCalendarIds ?? [];
      if (requiredCalendarIds.some((calendarId) => !accessibleCalendarIds.has(calendarId))) {
        return { status: 'unavailable', reason: 'required_conflict_calendar_missing' };
      }
      const selectedCalendarIds = new Set(
        calendars
          .filter((calendar) => calendar.selected === true)
          .map((calendar) => calendar.id)
      );
      for (const calendarId of requiredCalendarIds) selectedCalendarIds.add(calendarId);
      return {
        status: 'available',
        selectedCalendarIds: [...selectedCalendarIds],
        eventCalendarId: eventCalendar.id
      };
    } catch {
      return { status: 'unavailable', reason: 'provider_calendar_list_unavailable' };
    }
  }

  async createEvent(input: {
    slot: AvailableSlot;
    scheduler: SchedulerIdentity;
    idempotencyKey: string;
    context?: BookingContext;
    conferencing?: { provider: 'first_party'; roomId: string; joinUrl: string };
  }): Promise<{ status: 'created'; eventId: string; meetUrl: string }> {
    const accessToken = await this.config.accessTokens.getAccessToken();
    const eventId = await googleEventId(
      `${this.config.eventCalendarId}:${input.idempotencyKey}`
    );
    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.config.eventCalendarId)}/events`;
    const firstParty = input.conferencing?.provider === 'first_party';
    const response = await this.fetch(
      `${calendarUrl}?${firstParty ? '' : 'conferenceDataVersion=1&'}sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          id: eventId,
          summary: `Micah Johnson and ${input.scheduler.name}`,
          description: eventDescription(input.context, firstParty ? input.conferencing!.joinUrl : undefined),
          ...(firstParty ? { location: input.conferencing!.joinUrl } : {}),
          start: {
            dateTime: input.slot.start,
            timeZone: 'America/Chicago'
          },
          end: {
            dateTime: input.slot.end,
            timeZone: 'America/Chicago'
          },
          attendees: [
            {
              email: input.scheduler.email,
              displayName: input.scheduler.name
            }
          ],
          ...(firstParty ? {} : {
            conferenceData: {
              createRequest: {
                requestId: eventId,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
              }
            }
          }),
          guestsCanInviteOthers: false,
          guestsCanModify: false
        })
      }
    );

    const eventResponse = response.status === 409
      ? await this.fetch(`${calendarUrl}/${eventId}`, {
          headers: { authorization: `Bearer ${accessToken}` }
        })
      : response;
    if (!eventResponse.ok) {
      throw new Error(`provider_event_http_${eventResponse.status}`);
    }
    const parsed = eventResponseSchema.safeParse(await eventResponse.json());
    if (!parsed.success) throw new Error('provider_event_invalid_response');
    const meetUrl = firstParty
      ? input.conferencing!.joinUrl
      : parsed.data.hangoutLink ?? parsed.data.conferenceData?.entryPoints
        ?.find((entryPoint) => entryPoint.entryPointType === 'video')?.uri;
    if (!meetUrl) throw new Error('provider_conference_pending');
    return { status: 'created', eventId: parsed.data.id, meetUrl };
  }

  async updateEvent(input: {
    eventId: string;
    slot: AvailableSlot;
    idempotencyKey: string;
    context?: BookingContext;
    conferencing?: { provider: 'first_party'; joinUrl: string };
  }): Promise<{ status: 'updated'; eventId: string; meetUrl: string }> {
    const accessToken = await this.config.accessTokens.getAccessToken();
    const eventUrl = this.eventUrl(input.eventId);
    const firstParty = input.conferencing?.provider === 'first_party';
    const response = await this.fetch(
      `${eventUrl}?${firstParty ? '' : 'conferenceDataVersion=1&'}sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          start: {
            dateTime: input.slot.start,
            timeZone: 'America/Chicago'
          },
          end: {
            dateTime: input.slot.end,
            timeZone: 'America/Chicago'
          },
          ...(firstParty ? {
            location: input.conferencing!.joinUrl,
            description: eventDescription(input.context, input.conferencing!.joinUrl)
          } : {})
        })
      }
    );
    if (!response.ok) throw new Error(`provider_event_update_http_${response.status}`);
    const parsed = eventResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('provider_event_update_invalid_response');
    const meetUrl = firstParty
      ? input.conferencing!.joinUrl
      : parsed.data.hangoutLink ?? parsed.data.conferenceData?.entryPoints
        ?.find((entryPoint) => entryPoint.entryPointType === 'video')?.uri;
    if (!meetUrl) throw new Error('provider_conference_missing');
    return { status: 'updated', eventId: parsed.data.id, meetUrl };
  }

  async cancelEvent(input: {
    eventId: string;
    idempotencyKey: string;
  }): Promise<{ status: 'cancelled' }> {
    const accessToken = await this.config.accessTokens.getAccessToken();
    const response = await this.fetch(`${this.eventUrl(input.eventId)}?sendUpdates=all`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`provider_event_cancel_http_${response.status}`);
    }
    return { status: 'cancelled' };
  }

  private eventUrl(eventId: string): string {
    return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.config.eventCalendarId)}/events/${encodeURIComponent(eventId)}`;
  }
}

function eventDescription(context?: BookingContext, joinUrl?: string): string {
  const lines = ['Scheduled via CREATE SOMETHING.'];
  if (joinUrl) lines.push('', `Join: ${joinUrl}`);
  if (context) {
    const attribution = [
      context.source && `source=${context.source}`,
      context.intent && `intent=${context.intent}`,
      context.lane && `lane=${context.lane}`,
      context.warmup && `warmup=${context.warmup}`,
      context.readiness && `readiness=${context.readiness}`,
      context.score !== undefined && `score=${context.score}`,
      context.atlasSessionId && `atlas_session_id=${context.atlasSessionId}`,
      context.agentMessages !== undefined && `agent_messages=${context.agentMessages}`
    ].filter(Boolean);
    if (attribution.length) lines.push('', `Booking context: ${attribution.join('; ')}`);
    if (context.warmupNotes) lines.push('', 'Warmup notes:', context.warmupNotes);
  }
  return lines.join('\n');
}

async function googleEventId(material: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  ).slice(0, 20);
  const alphabet = '0123456789abcdefghijklmnopqrstuv';
  let bits = 0;
  let buffer = 0;
  let output = '';
  for (const byte of digest) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += alphabet[(buffer >>> bits) & 31];
    }
  }
  return output;
}
