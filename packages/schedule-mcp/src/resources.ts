/**
 * Schedule MCP — Resource Registration
 * Three-Tier Framework: Database tier (MCP Resources)
 *
 * Resources expose read-only state to the model via application-controlled
 * access. Each resource maps to a query function that surfaces the current
 * contents of the D1 database as structured JSON.
 *
 * The `getDb` accessor is lazy — in Worker mode the D1 binding isn't
 * available until a request arrives, so we resolve it at handler execution
 * time rather than at registration time.
 *
 * Insight tracing (cross-cutting concern) is applied to every handler so
 * resource reads appear in the telemetry stream alongside tool invocations.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { D1Database } from './db/queries.js';
import {
  listCalendars,
  listMembers,
  listUnits,
  listTemplates,
  listEvents,
} from './db/queries.js';
import { traceResourceRead } from './insight.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the start (Monday 00:00) and end (Sunday 23:59:59.999) of the current
 * ISO week as unix-millisecond timestamps.
 */
function currentWeekRange(): { start: number; end: number } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday.getTime(), end: sunday.getTime() };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all MCP resources on the server.
 *
 * @param server  - The MCP server instance to register resources on
 * @param getDb   - Lazy accessor for the D1 database binding
 */
export function registerResources(
  server: McpServer,
  getDb: () => D1Database,
): void {
  // --- Calendars -----------------------------------------------------------
  server.resource(
    'calendars',
    'schedule://calendars',
    { description: 'Lists all calendars', mimeType: 'application/json' },
    async (uri: URL) => {
      traceResourceRead('calendars', uri.href);
      const db = getDb();
      const calendars = await listCalendars(db);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(calendars, null, 2),
          },
        ],
      };
    },
  );

  // --- Members -------------------------------------------------------------
  server.resource(
    'members',
    'schedule://members',
    { description: 'Lists all members', mimeType: 'application/json' },
    async (uri: URL) => {
      traceResourceRead('members', uri.href);
      const db = getDb();
      const members = await listMembers(db);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(members, null, 2),
          },
        ],
      };
    },
  );

  // --- Units ---------------------------------------------------------------
  server.resource(
    'units',
    'schedule://units',
    {
      description: 'Lists all units with member counts',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      traceResourceRead('units', uri.href);
      const db = getDb();
      const units = await listUnits(db);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(units, null, 2),
          },
        ],
      };
    },
  );

  // --- Plans -----------------------------------------------------------
  server.resource(
    'plans',
    'schedule://plans',
    { description: 'Lists all schedule plans', mimeType: 'application/json' },
    async (uri: URL) => {
      traceResourceRead('plans', uri.href);
      const db = getDb();
      const templates = await listTemplates(db);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(templates, null, 2),
          },
        ],
      };
    },
  );

  // --- Events This Week ----------------------------------------------------
  server.resource(
    'events-this-week',
    'schedule://events',
    {
      description:
        'Events for the current week (use the list_events tool for custom date ranges)',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      traceResourceRead('events-this-week', uri.href);
      const db = getDb();
      const { start, end } = currentWeekRange();
      const events = await listEvents(db, { start, end });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                week_start: new Date(start).toISOString(),
                week_end: new Date(end).toISOString(),
                count: events.length,
                events,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
