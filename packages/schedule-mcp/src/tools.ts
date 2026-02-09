/**
 * Schedule MCP — Tool Registration
 * Three-Tier Framework: Automation tier (MCP Tools)
 *
 * Tools expose model-controlled operations — CRUD on calendars/events/members,
 * scheduling intelligence (backfill, forecast, conflict detection, availability),
 * and interop (iCal export, template management).
 *
 * Each tool returns structured content via the MCP content format.
 * Errors are returned as content messages rather than thrown.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { D1Database } from './db/queries.js';
import type { EventStatus } from './db/schema.js';
import {
  createCalendar,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  getCalendar,
  getCalendarEvents,
  listCalendars,
  listEvents,
  listMembers,
  listUnits,
  bulkCreateEvents,
  createUnit,
  createMember,
  updateMember,
  deleteMember,
  addMemberToUnit,
  removeMemberFromUnit,
  deleteUnit,
  deleteCalendar,
  shareCalendar,
  unshareCalendar,
  getCalendarShares,
  getTemplate,
  createTemplate,
  createTemplateSlot,
  getSharedCalendars,
  getNotificationPreferences,
  setNotificationPreferences,
  createNotificationLog,
  listNotificationLog,
  getEventParticipants,
} from './db/queries.js';

import { generateBackfillEvents } from './scheduling/backfill.js';
import { generateForecastEvents } from './scheduling/forecast.js';
import { findConflicts, findAvailability } from './scheduling/conflicts.js';
import type { TimeBlock } from './scheduling/conflicts.js';
import { exportToICal } from './scheduling/ical.js';
import type { GeneratedEvent } from './scheduling/backfill.js';
import { tracedTool, traceSamplingRequest, traceSamplingResponse, generateTraceId } from './insight.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert ISO 8601 date string to unix seconds.
 */
function isoToUnix(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO 8601 date: ${iso}`);
  }
  return Math.floor(ms / 1000);
}

/** Wrap a value as MCP tool result content. */
function jsonContent(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

/** Return an error message in MCP content format. */
function errorContent(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }] };
}

/** Convert GeneratedEvent[] to bulkCreateEvents input format. */
function toBulkInput(events: GeneratedEvent[]) {
  return events.map((e) => ({
    ...e,
    all_day: e.all_day === 1 ? true : undefined,
    status: e.status as EventStatus,
  }));
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Sampling function type — the recursive property.
 * Automation requesting Judgment through the MCP sampling mechanism.
 * Returns null if sampling is unavailable (graceful degradation).
 */
export type SamplingFn = (
  toolName: string,
  input: string,
  heuristicResult: unknown
) => Promise<{ validated: boolean; refinement: string } | null>;

/**
 * Register all MCP tools on the server.
 *
 * @param server - The MCP server instance to register tools on
 * @param getDb  - Lazy accessor for the D1 database binding
 * @param requestSampling - Optional sampling function for Automation→Judgment feedback
 */
export function registerTools(
  server: McpServer,
  getDb: () => D1Database,
  requestSampling?: SamplingFn | null,
): void {
  // =========================================================================
  // Diagnostics
  // =========================================================================

  server.tool(
    'get_status',
    'Get system status: counts of all entities and D1 connectivity check',
    {},
    async () => {
      return tracedTool('get_status', {}, async () => {
        try {
          const db = getDb();

          // Query all table counts in parallel
          const [members, calendars, events, units, templates] = await Promise.all([
            db.prepare('SELECT COUNT(*) as count FROM members').first<{ count: number }>(),
            db.prepare('SELECT COUNT(*) as count FROM calendars').first<{ count: number }>(),
            db.prepare('SELECT COUNT(*) as count FROM events').first<{ count: number }>(),
            db.prepare('SELECT COUNT(*) as count FROM units').first<{ count: number }>(),
            db.prepare('SELECT COUNT(*) as count FROM templates').first<{ count: number }>(),
          ]);

          return jsonContent({
            status: 'connected',
            d1_database: 'schedule-mcp-db',
            counts: {
              members: members?.count ?? 0,
              calendars: calendars?.count ?? 0,
              events: events?.count ?? 0,
              units: units?.count ?? 0,
              templates: templates?.count ?? 0,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          return errorContent(`D1 connectivity failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // =========================================================================
  // List / Read Operations
  // =========================================================================

  server.tool(
    'list_members',
    'List all members in the system',
    {},
    async () => {
      return tracedTool('list_members', {}, async () => {
        try {
          const db = getDb();
          const members = await listMembers(db);
          return jsonContent(members);
        } catch (err) {
          return errorContent(`Failed to list members: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'list_calendars',
    'List all calendars in the system',
    {},
    async () => {
      return tracedTool('list_calendars', {}, async () => {
        try {
          const db = getDb();
          const calendars = await listCalendars(db);
          return jsonContent(calendars);
        } catch (err) {
          return errorContent(`Failed to list calendars: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'list_units',
    'List all units/groups in the system',
    {},
    async () => {
      return tracedTool('list_units', {}, async () => {
        try {
          const db = getDb();
          const units = await listUnits(db);
          return jsonContent(units);
        } catch (err) {
          return errorContent(`Failed to list units: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'list_events',
    'List events with optional filters (date range, calendar)',
    {
      calendar_id: z.string().optional(),
      start: z.string().optional().describe('ISO 8601 date — filter events ending after this'),
      end: z.string().optional().describe('ISO 8601 date — filter events starting before this'),
    },
    async (params) => {
      return tracedTool('list_events', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const events = await listEvents(db, {
            calendarId: params.calendar_id,
            start: params.start ? isoToUnix(params.start) : undefined,
            end: params.end ? isoToUnix(params.end) : undefined,
          });
          return jsonContent(events);
        } catch (err) {
          return errorContent(`Failed to list events: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'get_calendar_details',
    'Get a calendar with its sharing permissions and upcoming events',
    {
      calendar_id: z.string(),
      include_events: z.boolean().optional().describe('Include events (default true)'),
    },
    async (params) => {
      return tracedTool('get_calendar_details', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const calendar = await getCalendar(db, params.calendar_id);
          if (!calendar) {
            return errorContent(`Calendar not found: ${params.calendar_id}`);
          }

          const shares = await getCalendarShares(db, params.calendar_id);
          const includeEvents = params.include_events !== false;
          const events = includeEvents
            ? await getCalendarEvents(db, params.calendar_id)
            : [];

          return jsonContent({
            ...calendar,
            shares,
            events: includeEvents ? events : undefined,
            event_count: events.length,
          });
        } catch (err) {
          return errorContent(`Failed to get calendar: ${(err as Error).message}`);
        }
      });
    },
  );

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  // --- create_calendar -----------------------------------------------------

  server.tool(
    'create_calendar',
    'Create a new calendar',
    {
      name: z.string(),
      description: z.string().optional(),
      owner_id: z.string(),
      color: z.string().optional(),
      timezone: z.string().optional(),
    },
    async (params) => {
      return tracedTool('create_calendar', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const calendar = await createCalendar(db, params);
          return jsonContent(calendar);
        } catch (err) {
          return errorContent(`Failed to create calendar: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- create_event --------------------------------------------------------

  server.tool(
    'create_event',
    'Create a calendar event',
    {
      calendar_id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      start_time: z.number().describe('Unix timestamp seconds'),
      end_time: z.number(),
      all_day: z.boolean().optional(),
      recurrence_rule: z.string().optional().describe('RFC 5545 RRULE string'),
      status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
      created_by: z.string().optional(),
    },
    async (params) => {
      return tracedTool('create_event', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const event = await createEvent(db, params);
          // Notify participants of the new event
          await notifyEventChange(db, event.id, event.title, 'created');
          return jsonContent(event);
        } catch (err) {
          return errorContent(`Failed to create event: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- update_event --------------------------------------------------------

  server.tool(
    'update_event',
    'Update an existing event',
    {
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      start_time: z.number().optional(),
      end_time: z.number().optional(),
      status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
    },
    async (params) => {
      return tracedTool('update_event', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const { id, ...updates } = params;
          const event = await updateEvent(db, id, updates);
          if (!event) {
            return errorContent(`Event not found: ${id}`);
          }
          // Notify participants of the change
          await notifyEventChange(db, event.id, event.title, 'updated');
          return jsonContent(event);
        } catch (err) {
          return errorContent(`Failed to update event: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- delete_event --------------------------------------------------------

  server.tool(
    'delete_event',
    'Delete an event',
    {
      id: z.string(),
      delete_series: z.boolean().optional().describe('Delete all events in the recurrence series'),
    },
    async (params) => {
      return tracedTool('delete_event', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();

          // Capture event title before deleting (for notification)
          const eventForNotify = await getEvent(db, params.id);

          // If delete_series requested, check for recurrence_id and delete siblings
          if (params.delete_series) {
            if (!eventForNotify) {
              return errorContent(`Event not found: ${params.id}`);
            }

            // Notify before deleting
            await notifyEventChange(db, eventForNotify.id, eventForNotify.title, 'cancelled');

            if (eventForNotify.recurrence_id) {
              await db
                .prepare('DELETE FROM events WHERE recurrence_id = ?')
                .bind(eventForNotify.recurrence_id)
                .run();
              await deleteEvent(db, params.id);
              return jsonContent({ deleted: true, series: true, recurrence_id: eventForNotify.recurrence_id });
            }
          }

          // Notify before deleting
          if (eventForNotify) {
            await notifyEventChange(db, eventForNotify.id, eventForNotify.title, 'cancelled');
          }

          const deleted = await deleteEvent(db, params.id);
          if (!deleted) {
            return errorContent(`Failed to delete event: ${params.id}`);
          }
          return jsonContent({ deleted: true, series: false });
        } catch (err) {
          return errorContent(`Failed to delete event: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- create_unit ---------------------------------------------------------

  server.tool(
    'create_unit',
    'Create a team/family group',
    {
      name: z.string(),
      description: z.string().optional(),
    },
    async (params) => {
      return tracedTool('create_unit', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const unit = await createUnit(db, params);
          return jsonContent(unit);
        } catch (err) {
          return errorContent(`Failed to create unit: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- add_member ----------------------------------------------------------

  server.tool(
    'add_member',
    'Add a member (create if needed) and optionally add to unit',
    {
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional().describe('E.164 format phone number, e.g. +15551234567'),
      timezone: z.string().optional(),
      unit_id: z.string().optional(),
      role: z.string().optional(),
    },
    async (params) => {
      return tracedTool('add_member', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const member = await createMember(db, {
            name: params.name,
            email: params.email,
            timezone: params.timezone,
          });

          if (params.unit_id) {
            await addMemberToUnit(db, params.unit_id, member.id, params.role);
          }

          return jsonContent({
            member,
            unit_id: params.unit_id ?? null,
            role: params.role ?? null,
          });
        } catch (err) {
          return errorContent(`Failed to add member: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- share_calendar ------------------------------------------------------

  server.tool(
    'share_calendar',
    'Share a calendar with a member or unit',
    {
      calendar_id: z.string(),
      shared_with_type: z.enum(['member', 'unit']),
      shared_with_id: z.string(),
      permission: z.enum(['read', 'write', 'admin']).optional(),
    },
    async (params) => {
      return tracedTool('share_calendar', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          await shareCalendar(
            db,
            params.calendar_id,
            params.shared_with_type,
            params.shared_with_id,
            params.permission,
          );
          return jsonContent({
            shared: true,
            calendar_id: params.calendar_id,
            shared_with_type: params.shared_with_type,
            shared_with_id: params.shared_with_id,
            permission: params.permission ?? 'read',
          });
        } catch (err) {
          return errorContent(`Failed to share calendar: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- update_member -------------------------------------------------------

  server.tool(
    'update_member',
    'Update a member\'s details (name, email, phone, timezone)',
    {
      id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional().describe('E.164 format phone number, e.g. +15551234567'),
      timezone: z.string().optional(),
    },
    async (params) => {
      return tracedTool('update_member', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const { id, ...updates } = params;
          const member = await updateMember(db, id, updates);
          if (!member) {
            return errorContent(`Member not found: ${id}`);
          }
          return jsonContent(member);
        } catch (err) {
          return errorContent(`Failed to update member: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- delete_member -------------------------------------------------------

  server.tool(
    'delete_member',
    'Delete a member (removes them from all units and event participants)',
    {
      id: z.string(),
    },
    async (params) => {
      return tracedTool('delete_member', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const deleted = await deleteMember(db, params.id);
          if (!deleted) {
            return errorContent(`Failed to delete member: ${params.id}`);
          }
          return jsonContent({ deleted: true, member_id: params.id });
        } catch (err) {
          return errorContent(`Failed to delete member: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- remove_member_from_unit ---------------------------------------------

  server.tool(
    'remove_member_from_unit',
    'Remove a member from a unit (does not delete the member)',
    {
      unit_id: z.string(),
      member_id: z.string(),
    },
    async (params) => {
      return tracedTool('remove_member_from_unit', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const removed = await removeMemberFromUnit(db, params.unit_id, params.member_id);
          if (!removed) {
            return errorContent(`Failed to remove member from unit`);
          }
          return jsonContent({ removed: true, unit_id: params.unit_id, member_id: params.member_id });
        } catch (err) {
          return errorContent(`Failed to remove member from unit: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- delete_unit ---------------------------------------------------------

  server.tool(
    'delete_unit',
    'Delete a unit/group (does not delete members)',
    {
      id: z.string(),
    },
    async (params) => {
      return tracedTool('delete_unit', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const deleted = await deleteUnit(db, params.id);
          if (!deleted) {
            return errorContent(`Failed to delete unit: ${params.id}`);
          }
          return jsonContent({ deleted: true, unit_id: params.id });
        } catch (err) {
          return errorContent(`Failed to delete unit: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- delete_calendar -----------------------------------------------------

  server.tool(
    'delete_calendar',
    'Delete a calendar and all its events',
    {
      id: z.string(),
    },
    async (params) => {
      return tracedTool('delete_calendar', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const deleted = await deleteCalendar(db, params.id);
          if (!deleted) {
            return errorContent(`Failed to delete calendar: ${params.id}`);
          }
          return jsonContent({ deleted: true, calendar_id: params.id });
        } catch (err) {
          return errorContent(`Failed to delete calendar: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- unshare_calendar ----------------------------------------------------

  server.tool(
    'unshare_calendar',
    'Remove sharing permission from a calendar for a member or unit',
    {
      calendar_id: z.string(),
      shared_with_type: z.enum(['member', 'unit']),
      shared_with_id: z.string(),
    },
    async (params) => {
      return tracedTool('unshare_calendar', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const removed = await unshareCalendar(
            db,
            params.calendar_id,
            params.shared_with_type,
            params.shared_with_id,
          );
          if (!removed) {
            return errorContent(`Failed to unshare calendar`);
          }
          return jsonContent({
            unshared: true,
            calendar_id: params.calendar_id,
            shared_with_type: params.shared_with_type,
            shared_with_id: params.shared_with_id,
          });
        } catch (err) {
          return errorContent(`Failed to unshare calendar: ${(err as Error).message}`);
        }
      });
    },
  );

  // =========================================================================
  // Scheduling Intelligence
  // =========================================================================

  // --- backfill ------------------------------------------------------------

  server.tool(
    'backfill',
    'Generate past events from a template',
    {
      template_id: z.string(),
      calendar_id: z.string(),
      range_start: z.string().describe('ISO 8601 date'),
      range_end: z.string().describe('ISO 8601 date'),
    },
    async (params) => {
      return tracedTool('backfill', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const template = await getTemplate(db, params.template_id);
          if (!template) {
            return errorContent(`Template not found: ${params.template_id}`);
          }

          const rangeStart = isoToUnix(params.range_start);
          const rangeEnd = isoToUnix(params.range_end);

          const generated = generateBackfillEvents({
            templateSlots: template.slots,
            cycleDays: template.cycle_days,
            rangeStart,
            rangeEnd,
            calendarId: params.calendar_id,
          });

          const created = await bulkCreateEvents(db, toBulkInput(generated));

          return jsonContent({
            events_created: created.length,
            range: { start: params.range_start, end: params.range_end },
            template: template.name,
          });
        } catch (err) {
          return errorContent(`Backfill failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- forecast ------------------------------------------------------------

  server.tool(
    'forecast',
    'Project future events from a template',
    {
      template_id: z.string(),
      calendar_id: z.string(),
      range_start: z.string().describe('ISO 8601 date'),
      range_end: z.string().describe('ISO 8601 date'),
    },
    async (params) => {
      return tracedTool('forecast', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const template = await getTemplate(db, params.template_id);
          if (!template) {
            return errorContent(`Template not found: ${params.template_id}`);
          }

          const rangeStart = isoToUnix(params.range_start);
          const rangeEnd = isoToUnix(params.range_end);

          const generated = generateForecastEvents({
            templateSlots: template.slots,
            cycleDays: template.cycle_days,
            rangeStart,
            rangeEnd,
            calendarId: params.calendar_id,
          });

          const created = await bulkCreateEvents(db, toBulkInput(generated));

          return jsonContent({
            events_created: created.length,
            range: { start: params.range_start, end: params.range_end },
            template: template.name,
          });
        } catch (err) {
          return errorContent(`Forecast failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- find_conflicts ------------------------------------------------------

  server.tool(
    'find_conflicts',
    'Detect scheduling conflicts',
    {
      calendar_ids: z.array(z.string()).optional(),
      member_ids: z.array(z.string()).optional(),
      start: z.string().describe('ISO 8601 date'),
      end: z.string().describe('ISO 8601 date'),
    },
    async (params) => {
      return tracedTool('find_conflicts', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const rangeStart = isoToUnix(params.start);
          const rangeEnd = isoToUnix(params.end);

          // Collect events from specified calendars
          const allEvents: TimeBlock[] = [];

          if (params.calendar_ids && params.calendar_ids.length > 0) {
            for (const calId of params.calendar_ids) {
              const events = await listEvents(db, {
                start: rangeStart,
                end: rangeEnd,
                calendarId: calId,
              });
              for (const e of events) {
                allEvents.push({
                  id: e.id,
                  title: e.title,
                  start_time: e.start_time,
                  end_time: e.end_time,
                  calendar_id: e.calendar_id,
                });
              }
            }
          }

          // If member_ids provided, also gather events from their shared calendars
          if (params.member_ids && params.member_ids.length > 0) {
            const seenCalendars = new Set(params.calendar_ids ?? []);
            for (const memberId of params.member_ids) {
              const calendars = await getSharedCalendars(db, memberId);
              for (const cal of calendars) {
                if (seenCalendars.has(cal.id)) continue;
                seenCalendars.add(cal.id);
                const events = await listEvents(db, {
                  start: rangeStart,
                  end: rangeEnd,
                  calendarId: cal.id,
                });
                for (const e of events) {
                  allEvents.push({
                    id: e.id,
                    title: e.title,
                    start_time: e.start_time,
                    end_time: e.end_time,
                    calendar_id: e.calendar_id,
                    member_id: memberId,
                  });
                }
              }
            }
          }

          const conflicts = findConflicts(allEvents);

          // Recursive property: Automation requesting Judgment
          let assessment: { validated: boolean; refinement: string } | null = null;
          if (requestSampling && conflicts.length > 0) {
            assessment = await requestSampling(
              'find_conflicts',
              `Assess these ${conflicts.length} scheduling conflicts and rank by severity`,
              conflicts
            );
          }

          return jsonContent({
            conflicts_found: conflicts.length,
            conflicts,
            ...(assessment ? { judgment: assessment } : {}),
          });
        } catch (err) {
          return errorContent(`Conflict detection failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- find_availability ---------------------------------------------------

  server.tool(
    'find_availability',
    'Find free time slots',
    {
      member_ids: z.array(z.string()),
      start: z.string().describe('ISO 8601 date'),
      end: z.string().describe('ISO 8601 date'),
      min_duration_minutes: z.number().optional(),
    },
    async (params) => {
      return tracedTool('find_availability', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const rangeStart = isoToUnix(params.start);
          const rangeEnd = isoToUnix(params.end);

          // Gather all busy blocks from all members' calendars
          const busyBlocks: TimeBlock[] = [];
          const seenCalendars = new Set<string>();

          for (const memberId of params.member_ids) {
            const calendars = await getSharedCalendars(db, memberId);
            for (const cal of calendars) {
              if (seenCalendars.has(cal.id)) continue;
              seenCalendars.add(cal.id);
              const events = await listEvents(db, {
                start: rangeStart,
                end: rangeEnd,
                calendarId: cal.id,
              });
              for (const e of events) {
                busyBlocks.push({
                  id: e.id,
                  title: e.title,
                  start_time: e.start_time,
                  end_time: e.end_time,
                  calendar_id: e.calendar_id,
                });
              }
            }
          }

          const slots = findAvailability(
            busyBlocks,
            rangeStart,
            rangeEnd,
            params.min_duration_minutes,
          );

          return jsonContent({
            member_ids: params.member_ids,
            range: { start: params.start, end: params.end },
            slots_found: slots.length,
            slots,
          });
        } catch (err) {
          return errorContent(`Availability search failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- apply_template ------------------------------------------------------

  server.tool(
    'apply_template',
    'Apply a template to a calendar (backfill + forecast in one operation)',
    {
      template_id: z.string(),
      calendar_id: z.string(),
      backfill_start: z.string().describe('ISO 8601 date').optional(),
      forecast_end: z.string().describe('ISO 8601 date').optional(),
    },
    async (params) => {
      return tracedTool('apply_template', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const template = await getTemplate(db, params.template_id);
          if (!template) {
            return errorContent(`Template not found: ${params.template_id}`);
          }

          const nowSeconds = Math.floor(Date.now() / 1000);
          const thirtyDays = 30 * 86400;

          const backfillStart = params.backfill_start
            ? isoToUnix(params.backfill_start)
            : nowSeconds - thirtyDays;
          const forecastEnd = params.forecast_end
            ? isoToUnix(params.forecast_end)
            : nowSeconds + thirtyDays;

          // Generate backfill events (past → now)
          const backfillEvents = generateBackfillEvents({
            templateSlots: template.slots,
            cycleDays: template.cycle_days,
            rangeStart: backfillStart,
            rangeEnd: nowSeconds,
            calendarId: params.calendar_id,
          });

          // Generate forecast events (now → future)
          const forecastEvents = generateForecastEvents({
            templateSlots: template.slots,
            cycleDays: template.cycle_days,
            rangeStart: nowSeconds,
            rangeEnd: forecastEnd,
            calendarId: params.calendar_id,
          });

          const allEvents = [...backfillEvents, ...forecastEvents];
          const created = await bulkCreateEvents(db, toBulkInput(allEvents));

          // Recursive property: request judgment on the generated schedule
          let review: { validated: boolean; refinement: string } | null = null;
          if (requestSampling && created.length > 0) {
            review = await requestSampling(
              'apply_template',
              `Review this template application: ${template.name} generated ${created.length} events. Are there obvious issues with the schedule density or coverage?`,
              {
                template: template.name,
                cycle_days: template.cycle_days,
                events_created: created.length,
                backfill_count: backfillEvents.length,
                forecast_count: forecastEvents.length,
              }
            );
          }

          return jsonContent({
            template: template.name,
            calendar_id: params.calendar_id,
            backfill_events: backfillEvents.length,
            forecast_events: forecastEvents.length,
            total_events_created: created.length,
            range: {
              backfill_start: new Date(backfillStart * 1000).toISOString(),
              midpoint: new Date(nowSeconds * 1000).toISOString(),
              forecast_end: new Date(forecastEnd * 1000).toISOString(),
            },
            ...(review ? { judgment: review } : {}),
          });
        } catch (err) {
          return errorContent(`Apply template failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // =========================================================================
  // Interop
  // =========================================================================

  // --- export_ical ---------------------------------------------------------

  server.tool(
    'export_ical',
    'Export calendar as iCalendar format',
    {
      calendar_id: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
    },
    async (params) => {
      return tracedTool('export_ical', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const calendar = await getCalendar(db, params.calendar_id);
          if (!calendar) {
            return errorContent(`Calendar not found: ${params.calendar_id}`);
          }

          const startSeconds = params.start ? isoToUnix(params.start) : undefined;
          const endSeconds = params.end ? isoToUnix(params.end) : undefined;

          const events = await getCalendarEvents(
            db,
            params.calendar_id,
            startSeconds,
            endSeconds,
          );

          const ical = exportToICal(
            { name: calendar.name, timezone: calendar.timezone },
            events,
          );

          // Recursive property: validate the export
          let validation: { validated: boolean; refinement: string } | null = null;
          if (requestSampling && events.length > 0) {
            validation = await requestSampling(
              'export_ical',
              `Validate this iCal export of ${events.length} events from "${calendar.name}". Check for any issues with the event data.`,
              { calendar_name: calendar.name, event_count: events.length }
            );
          }

          return {
            content: [{
              type: 'text' as const,
              text: validation?.refinement
                ? `${ical}\n\n--- Validation Note ---\n${validation.refinement}`
                : ical
            }]
          };
        } catch (err) {
          return errorContent(`iCal export failed: ${(err as Error).message}`);
        }
      });
    },
  );

  // --- create_template -----------------------------------------------------

  server.tool(
    'create_template',
    'Create a reusable schedule template',
    {
      name: z.string(),
      description: z.string().optional(),
      cycle_days: z.number(),
      timezone: z.string().optional(),
      slots: z.array(
        z.object({
          title: z.string(),
          day_offset: z.number(),
          start_minutes: z.number(),
          duration_minutes: z.number(),
          metadata: z.string().optional(),
        }),
      ),
    },
    async (params) => {
      return tracedTool('create_template', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();

          // Create the template
          const template = await createTemplate(db, {
            name: params.name,
            description: params.description,
            cycle_days: params.cycle_days,
            timezone: params.timezone,
          });

          // Create all slots
          const createdSlots = [];
          for (const slotInput of params.slots) {
            const slot = await createTemplateSlot(db, {
              template_id: template.id,
              title: slotInput.title,
              day_offset: slotInput.day_offset,
              start_minutes: slotInput.start_minutes,
              duration_minutes: slotInput.duration_minutes,
              metadata: slotInput.metadata,
            });
            createdSlots.push(slot);
          }

          return jsonContent({
            ...template,
            slots: createdSlots,
          });
        } catch (err) {
          return errorContent(`Failed to create template: ${(err as Error).message}`);
        }
      });
    },
  );

  // =========================================================================
  // Notification Tools
  // =========================================================================

  server.tool(
    'set_notification_preferences',
    'Set SMS notification preferences for a member (reminders, changes, conflicts)',
    {
      member_id: z.string(),
      reminders_enabled: z.boolean().optional(),
      changes_enabled: z.boolean().optional(),
      conflicts_enabled: z.boolean().optional(),
      reminder_minutes_1: z.number().optional().describe('First reminder: minutes before event (default 15)'),
      reminder_minutes_2: z.number().optional().describe('Second reminder: minutes before event (default 60, 0=disabled)'),
      reminder_minutes_3: z.number().optional().describe('Third reminder: minutes before event (default 1440=1day, 0=disabled)'),
      sms_enabled: z.boolean().optional(),
    },
    async (params) => {
      return tracedTool('set_notification_preferences', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const prefs = await setNotificationPreferences(db, params.member_id, {
            reminders_enabled: params.reminders_enabled !== undefined ? (params.reminders_enabled ? 1 : 0) : undefined,
            changes_enabled: params.changes_enabled !== undefined ? (params.changes_enabled ? 1 : 0) : undefined,
            conflicts_enabled: params.conflicts_enabled !== undefined ? (params.conflicts_enabled ? 1 : 0) : undefined,
            reminder_minutes_1: params.reminder_minutes_1,
            reminder_minutes_2: params.reminder_minutes_2,
            reminder_minutes_3: params.reminder_minutes_3,
            sms_enabled: params.sms_enabled !== undefined ? (params.sms_enabled ? 1 : 0) : undefined,
          });
          return jsonContent(prefs);
        } catch (err) {
          return errorContent(`Failed to set preferences: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'get_notification_preferences',
    'Get SMS notification preferences for a member',
    {
      member_id: z.string(),
    },
    async (params) => {
      return tracedTool('get_notification_preferences', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const prefs = await getNotificationPreferences(db, params.member_id);
          if (!prefs) {
            return jsonContent({ member_id: params.member_id, configured: false, message: 'No preferences set. Use set_notification_preferences to enable notifications.' });
          }
          return jsonContent({ ...prefs, configured: true });
        } catch (err) {
          return errorContent(`Failed to get preferences: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'send_notification',
    'Send an immediate SMS notification to a member (agent-triggered)',
    {
      member_id: z.string(),
      message: z.string().describe('SMS message body (max 160 chars recommended)'),
      event_id: z.string().optional().describe('Related event ID if applicable'),
    },
    async (params) => {
      return tracedTool('send_notification', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const member = await (await import('./db/queries.js')).getMember(db, params.member_id);
          if (!member) {
            return errorContent(`Member not found: ${params.member_id}`);
          }
          if (!member.phone) {
            return errorContent(`Member ${member.name} has no phone number. Use update_member to add one.`);
          }

          const entry = await createNotificationLog(db, {
            member_id: params.member_id,
            event_id: params.event_id,
            trigger_type: 'manual',
            phone: member.phone,
            message: params.message,
            status: 'pending',
          });

          return jsonContent({
            notification_id: entry.id,
            member: member.name,
            phone: member.phone,
            message: params.message,
            status: 'pending',
            note: 'SMS will be sent within 5 minutes by the notifier worker.',
          });
        } catch (err) {
          return errorContent(`Failed to send notification: ${(err as Error).message}`);
        }
      });
    },
  );

  server.tool(
    'list_notification_log',
    'View recent SMS notification history (Insight)',
    {
      member_id: z.string().optional(),
      trigger_type: z.enum(['reminder', 'change', 'conflict', 'manual']).optional(),
      limit: z.number().optional().describe('Max results (default 50)'),
    },
    async (params) => {
      return tracedTool('list_notification_log', params as Record<string, unknown>, async () => {
        try {
          const db = getDb();
          const log = await listNotificationLog(db, {
            member_id: params.member_id,
            trigger_type: params.trigger_type,
            limit: params.limit,
          });
          return jsonContent(log);
        } catch (err) {
          return errorContent(`Failed to list notification log: ${(err as Error).message}`);
        }
      });
    },
  );
}

// =============================================================================
// Notification Change Hooks (called by CRUD tools)
// =============================================================================

/**
 * Enqueue change notifications for event participants.
 *
 * Called by create_event, update_event, delete_event when the event changes.
 * Writes 'pending' entries to notification_log. The notifier worker picks
 * them up within 5 minutes and sends SMS via Twilio.
 *
 * This avoids coupling the MCP Durable Object to the Queue producer binding.
 * The MCP writes intent to D1; the notifier worker reads and sends.
 */
export async function notifyEventChange(
  db: D1Database,
  eventId: string,
  eventTitle: string,
  changeType: 'created' | 'updated' | 'cancelled',
): Promise<void> {
  try {
    // Get participants for this event
    const participants = await getEventParticipants(db, eventId);

    for (const participant of participants) {
      // Check if member has changes notifications enabled and a phone number
      const prefs = await getNotificationPreferences(db, participant.member_id);
      if (!prefs || !prefs.changes_enabled || !prefs.sms_enabled) continue;

      // Get member phone
      const member = await (await import('./db/queries.js')).getMember(db, participant.member_id);
      if (!member?.phone) continue;

      const dedupKey = `change:${eventId}:${changeType}:${participant.member_id}`;
      const message = `Schedule ${changeType}: "${eventTitle}"`;

      await createNotificationLog(db, {
        member_id: participant.member_id,
        event_id: eventId,
        trigger_type: 'change',
        phone: member.phone,
        message,
        status: 'pending',
        dedup_key: dedupKey,
      });
    }
  } catch {
    // Notification failures should not block the main operation
    console.error(`[insight] Failed to enqueue change notification for event ${eventId}`);
  }
}
