/**
 * Schedule MCP — Database Query Functions
 * Three-Tier Framework: Database tier (typed query layer over D1)
 *
 * Every function takes `db: D1Database` as its first argument.
 * No external dependencies — raw SQL only.
 */

import { randomUUID } from 'node:crypto';

import type {
  Calendar,
  CalendarPermission,
  CalendarShare,
  CalendarShareType,
  Event,
  EventParticipant,
  EventParticipantWithMember,
  EventStatus,
  Member,
  NotificationLogEntry,
  NotificationPreferences,
  NotificationStatus,
  NotificationTriggerType,
  Template,
  TemplateSlot,
  TemplateWithSlots,
  Unit,
  UnitMember,
  UnitWithCount,
  UnitWithMembers,
} from './schema.js';

// ---------------------------------------------------------------------------
// D1 interface (minimal, works in both Worker and stdio modes)
// ---------------------------------------------------------------------------

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return randomUUID();
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

// =========================================================================
// Calendars
// =========================================================================

export async function listCalendars(db: D1Database): Promise<Calendar[]> {
  const result = await db
    .prepare('SELECT * FROM calendars ORDER BY created_at DESC')
    .all<Calendar>();
  return result.results;
}

export async function getCalendar(
  db: D1Database,
  id: string,
): Promise<Calendar | null> {
  return db
    .prepare('SELECT * FROM calendars WHERE id = ?')
    .bind(id)
    .first<Calendar>();
}

export async function createCalendar(
  db: D1Database,
  input: {
    name: string;
    description?: string;
    owner_id: string;
    color?: string;
    timezone?: string;
  },
): Promise<Calendar> {
  const id = generateId();
  const ts = now();
  const calendar: Calendar = {
    id,
    name: input.name,
    description: input.description ?? null,
    owner_id: input.owner_id,
    color: input.color ?? null,
    timezone: input.timezone ?? 'UTC',
    created_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO calendars (id, name, description, owner_id, color, timezone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      calendar.id,
      calendar.name,
      calendar.description,
      calendar.owner_id,
      calendar.color,
      calendar.timezone,
      calendar.created_at,
    )
    .run();

  return calendar;
}

export async function getCalendarEvents(
  db: D1Database,
  calendarId: string,
  start?: number,
  end?: number,
): Promise<Event[]> {
  let query = 'SELECT * FROM events WHERE calendar_id = ?';
  const params: unknown[] = [calendarId];

  if (start !== undefined) {
    query += ' AND end_time >= ?';
    params.push(start);
  }
  if (end !== undefined) {
    query += ' AND start_time <= ?';
    params.push(end);
  }

  query += ' ORDER BY start_time ASC';

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<Event>();
  return result.results;
}

// =========================================================================
// Events
// =========================================================================

export async function listEvents(
  db: D1Database,
  filters?: { start?: number; end?: number; calendarId?: string },
): Promise<Event[]> {
  let query = 'SELECT * FROM events WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.calendarId) {
    query += ' AND calendar_id = ?';
    params.push(filters.calendarId);
  }
  if (filters?.start !== undefined) {
    query += ' AND end_time >= ?';
    params.push(filters.start);
  }
  if (filters?.end !== undefined) {
    query += ' AND start_time <= ?';
    params.push(filters.end);
  }

  query += ' ORDER BY start_time ASC';

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<Event>();
  return result.results;
}

export async function getEvent(
  db: D1Database,
  id: string,
): Promise<Event | null> {
  return db
    .prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first<Event>();
}

export async function createEvent(
  db: D1Database,
  input: {
    calendar_id: string;
    title: string;
    description?: string;
    location?: string;
    start_time: number;
    end_time: number;
    all_day?: boolean;
    recurrence_rule?: string;
    recurrence_id?: string;
    status?: EventStatus;
    created_by?: string;
  },
): Promise<Event> {
  const id = generateId();
  const ts = now();
  const event: Event = {
    id,
    calendar_id: input.calendar_id,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    start_time: input.start_time,
    end_time: input.end_time,
    all_day: input.all_day ? 1 : 0,
    recurrence_rule: input.recurrence_rule ?? null,
    recurrence_id: input.recurrence_id ?? null,
    status: input.status ?? 'confirmed',
    created_by: input.created_by ?? null,
    created_at: ts,
    updated_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO events
         (id, calendar_id, title, description, location, start_time, end_time,
          all_day, recurrence_rule, recurrence_id, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.calendar_id,
      event.title,
      event.description,
      event.location,
      event.start_time,
      event.end_time,
      event.all_day,
      event.recurrence_rule,
      event.recurrence_id,
      event.status,
      event.created_by,
      event.created_at,
      event.updated_at,
    )
    .run();

  return event;
}

export async function updateEvent(
  db: D1Database,
  id: string,
  updates: Partial<Omit<Event, 'id' | 'created_at'>>,
): Promise<Event | null> {
  const existing = await getEvent(db, id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  const allowedKeys: (keyof typeof updates)[] = [
    'calendar_id',
    'title',
    'description',
    'location',
    'start_time',
    'end_time',
    'all_day',
    'recurrence_rule',
    'recurrence_id',
    'status',
    'created_by',
  ];

  for (const key of allowedKeys) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key] ?? null);
    }
  }

  if (fields.length === 0) return existing;

  const ts = now();
  fields.push('updated_at = ?');
  values.push(ts);

  values.push(id);

  await db
    .prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getEvent(db, id);
}

export async function deleteEvent(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM events WHERE id = ?')
    .bind(id)
    .run();
  return result.success;
}

export async function getEventParticipants(
  db: D1Database,
  eventId: string,
): Promise<EventParticipantWithMember[]> {
  const result = await db
    .prepare(
      `SELECT ep.event_id, ep.member_id, ep.status, m.name, m.email
       FROM event_participants ep
       JOIN members m ON m.id = ep.member_id
       WHERE ep.event_id = ?
       ORDER BY m.name ASC`,
    )
    .bind(eventId)
    .all<EventParticipantWithMember>();
  return result.results;
}

export async function addEventParticipant(
  db: D1Database,
  eventId: string,
  memberId: string,
  status?: EventParticipant['status'],
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO event_participants (event_id, member_id, status)
       VALUES (?, ?, ?)`,
    )
    .bind(eventId, memberId, status ?? 'pending')
    .run();
}

export async function bulkCreateEvents(
  db: D1Database,
  events: Array<{
    calendar_id: string;
    title: string;
    description?: string;
    location?: string;
    start_time: number;
    end_time: number;
    all_day?: boolean;
    recurrence_rule?: string;
    recurrence_id?: string;
    status?: EventStatus;
    created_by?: string;
  }>,
): Promise<Event[]> {
  const ts = now();
  const created: Event[] = [];
  const statements: D1PreparedStatement[] = [];

  for (const input of events) {
    const id = generateId();
    const event: Event = {
      id,
      calendar_id: input.calendar_id,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      start_time: input.start_time,
      end_time: input.end_time,
      all_day: input.all_day ? 1 : 0,
      recurrence_rule: input.recurrence_rule ?? null,
      recurrence_id: input.recurrence_id ?? null,
      status: input.status ?? 'confirmed',
      created_by: input.created_by ?? null,
      created_at: ts,
      updated_at: ts,
    };

    statements.push(
      db
        .prepare(
          `INSERT INTO events
             (id, calendar_id, title, description, location, start_time, end_time,
              all_day, recurrence_rule, recurrence_id, status, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          event.id,
          event.calendar_id,
          event.title,
          event.description,
          event.location,
          event.start_time,
          event.end_time,
          event.all_day,
          event.recurrence_rule,
          event.recurrence_id,
          event.status,
          event.created_by,
          event.created_at,
          event.updated_at,
        ),
    );

    created.push(event);
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return created;
}

// =========================================================================
// Members
// =========================================================================

export async function listMembers(db: D1Database): Promise<Member[]> {
  const result = await db
    .prepare('SELECT * FROM members ORDER BY name ASC')
    .all<Member>();
  return result.results;
}

export async function getMember(
  db: D1Database,
  id: string,
): Promise<Member | null> {
  return db
    .prepare('SELECT * FROM members WHERE id = ?')
    .bind(id)
    .first<Member>();
}

export async function createMember(
  db: D1Database,
  input: { name: string; email?: string; phone?: string; timezone?: string },
): Promise<Member> {
  const id = generateId();
  const ts = now();
  const member: Member = {
    id,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    timezone: input.timezone ?? 'UTC',
    created_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO members (id, name, email, phone, timezone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(member.id, member.name, member.email, member.phone, member.timezone, member.created_at)
    .run();

  return member;
}

export async function updateMember(
  db: D1Database,
  id: string,
  updates: Partial<Omit<Member, 'id' | 'created_at'>>,
): Promise<Member | null> {
  const existing = await getMember(db, id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  const allowedKeys: (keyof typeof updates)[] = ['name', 'email', 'phone', 'timezone'];

  for (const key of allowedKeys) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key] ?? null);
    }
  }

  if (fields.length === 0) return existing;

  values.push(id);

  await db
    .prepare(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getMember(db, id);
}

export async function deleteMember(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM members WHERE id = ?')
    .bind(id)
    .run();
  return result.success;
}

// =========================================================================
// Units
// =========================================================================

export async function listUnits(db: D1Database): Promise<UnitWithCount[]> {
  const result = await db
    .prepare(
      `SELECT u.*, COUNT(um.member_id) AS member_count
       FROM units u
       LEFT JOIN unit_members um ON um.unit_id = u.id
       GROUP BY u.id
       ORDER BY u.name ASC`,
    )
    .all<UnitWithCount>();
  return result.results;
}

export async function getUnit(
  db: D1Database,
  id: string,
): Promise<UnitWithMembers | null> {
  const unit = await db
    .prepare('SELECT * FROM units WHERE id = ?')
    .bind(id)
    .first<Unit>();

  if (!unit) return null;

  const membersResult = await db
    .prepare(
      `SELECT m.*, um.role
       FROM members m
       JOIN unit_members um ON um.member_id = m.id
       WHERE um.unit_id = ?
       ORDER BY m.name ASC`,
    )
    .bind(id)
    .all<Member & { role: string }>();

  return { ...unit, members: membersResult.results };
}

export async function createUnit(
  db: D1Database,
  input: { name: string; description?: string },
): Promise<Unit> {
  const id = generateId();
  const ts = now();
  const unit: Unit = {
    id,
    name: input.name,
    description: input.description ?? null,
    created_at: ts,
    updated_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO units (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(unit.id, unit.name, unit.description, unit.created_at, unit.updated_at)
    .run();

  return unit;
}

export async function addMemberToUnit(
  db: D1Database,
  unitId: string,
  memberId: string,
  role?: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO unit_members (unit_id, member_id, role)
       VALUES (?, ?, ?)`,
    )
    .bind(unitId, memberId, role ?? 'member')
    .run();
}

export async function removeMemberFromUnit(
  db: D1Database,
  unitId: string,
  memberId: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM unit_members WHERE unit_id = ? AND member_id = ?')
    .bind(unitId, memberId)
    .run();
  return result.success;
}

export async function deleteUnit(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM units WHERE id = ?')
    .bind(id)
    .run();
  return result.success;
}

export async function deleteCalendar(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM calendars WHERE id = ?')
    .bind(id)
    .run();
  return result.success;
}

export async function unshareCalendar(
  db: D1Database,
  calendarId: string,
  sharedWithType: CalendarShareType,
  sharedWithId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      'DELETE FROM calendar_shares WHERE calendar_id = ? AND shared_with_type = ? AND shared_with_id = ?',
    )
    .bind(calendarId, sharedWithType, sharedWithId)
    .run();
  return result.success;
}

export async function getUnitMembers(
  db: D1Database,
  unitId: string,
): Promise<Member[]> {
  const result = await db
    .prepare(
      `SELECT m.*
       FROM members m
       JOIN unit_members um ON um.member_id = m.id
       WHERE um.unit_id = ?
       ORDER BY m.name ASC`,
    )
    .bind(unitId)
    .all<Member>();
  return result.results;
}

// =========================================================================
// Calendar Sharing
// =========================================================================

export async function shareCalendar(
  db: D1Database,
  calendarId: string,
  sharedWithType: CalendarShareType,
  sharedWithId: string,
  permission?: CalendarPermission,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO calendar_shares
         (calendar_id, shared_with_type, shared_with_id, permission)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(calendarId, sharedWithType, sharedWithId, permission ?? 'read')
    .run();
}

export async function getCalendarShares(
  db: D1Database,
  calendarId: string,
): Promise<CalendarShare[]> {
  const result = await db
    .prepare(
      'SELECT * FROM calendar_shares WHERE calendar_id = ? ORDER BY shared_with_type, shared_with_id',
    )
    .bind(calendarId)
    .all<CalendarShare>();
  return result.results;
}

export async function getSharedCalendars(
  db: D1Database,
  memberId: string,
): Promise<Calendar[]> {
  // Calendars shared directly with this member OR via any unit they belong to
  const result = await db
    .prepare(
      `SELECT DISTINCT c.*
       FROM calendars c
       JOIN calendar_shares cs ON cs.calendar_id = c.id
       WHERE
         (cs.shared_with_type = 'member' AND cs.shared_with_id = ?)
         OR
         (cs.shared_with_type = 'unit' AND cs.shared_with_id IN (
           SELECT unit_id FROM unit_members WHERE member_id = ?
         ))
       ORDER BY c.name ASC`,
    )
    .bind(memberId, memberId)
    .all<Calendar>();
  return result.results;
}

// =========================================================================
// Templates
// =========================================================================

export async function listTemplates(db: D1Database): Promise<Template[]> {
  const result = await db
    .prepare('SELECT * FROM templates ORDER BY name ASC')
    .all<Template>();
  return result.results;
}

export async function getTemplate(
  db: D1Database,
  id: string,
): Promise<TemplateWithSlots | null> {
  const template = await db
    .prepare('SELECT * FROM templates WHERE id = ?')
    .bind(id)
    .first<Template>();

  if (!template) return null;

  const slotsResult = await db
    .prepare(
      `SELECT * FROM template_slots
       WHERE template_id = ?
       ORDER BY day_offset ASC, start_minutes ASC`,
    )
    .bind(id)
    .all<TemplateSlot>();

  return { ...template, slots: slotsResult.results };
}

export async function createTemplate(
  db: D1Database,
  input: {
    name: string;
    description?: string;
    cycle_days: number;
    timezone?: string;
  },
): Promise<Template> {
  const id = generateId();
  const ts = now();
  const template: Template = {
    id,
    name: input.name,
    description: input.description ?? null,
    cycle_days: input.cycle_days,
    timezone: input.timezone ?? 'UTC',
    created_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO templates (id, name, description, cycle_days, timezone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      template.id,
      template.name,
      template.description,
      template.cycle_days,
      template.timezone,
      template.created_at,
    )
    .run();

  return template;
}

export async function createTemplateSlot(
  db: D1Database,
  input: {
    template_id: string;
    title: string;
    day_offset: number;
    start_minutes: number;
    duration_minutes: number;
    metadata?: string;
  },
): Promise<TemplateSlot> {
  const id = generateId();
  const slot: TemplateSlot = {
    id,
    template_id: input.template_id,
    title: input.title,
    day_offset: input.day_offset,
    start_minutes: input.start_minutes,
    duration_minutes: input.duration_minutes,
    metadata: input.metadata ?? null,
  };

  await db
    .prepare(
      `INSERT INTO template_slots
         (id, template_id, title, day_offset, start_minutes, duration_minutes, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      slot.id,
      slot.template_id,
      slot.title,
      slot.day_offset,
      slot.start_minutes,
      slot.duration_minutes,
      slot.metadata,
    )
    .run();

  return slot;
}

export async function getTemplateSlots(
  db: D1Database,
  templateId: string,
): Promise<TemplateSlot[]> {
  const result = await db
    .prepare(
      `SELECT * FROM template_slots
       WHERE template_id = ?
       ORDER BY day_offset ASC, start_minutes ASC`,
    )
    .bind(templateId)
    .all<TemplateSlot>();
  return result.results;
}

// =========================================================================
// Notification Preferences
// =========================================================================

export async function getNotificationPreferences(
  db: D1Database,
  memberId: string,
): Promise<NotificationPreferences | null> {
  return db
    .prepare('SELECT * FROM notification_preferences WHERE member_id = ?')
    .bind(memberId)
    .first<NotificationPreferences>();
}

export async function setNotificationPreferences(
  db: D1Database,
  memberId: string,
  prefs: Partial<Omit<NotificationPreferences, 'id' | 'member_id' | 'created_at' | 'updated_at'>>,
): Promise<NotificationPreferences> {
  const existing = await getNotificationPreferences(db, memberId);
  const ts = now();

  if (existing) {
    // Update existing
    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedKeys = [
      'reminders_enabled', 'changes_enabled', 'conflicts_enabled',
      'reminder_minutes_1', 'reminder_minutes_2', 'reminder_minutes_3',
      'sms_enabled',
    ] as const;

    for (const key of allowedKeys) {
      if (key in prefs) {
        fields.push(`${key} = ?`);
        values.push(prefs[key]);
      }
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(ts);
      values.push(memberId);

      await db
        .prepare(`UPDATE notification_preferences SET ${fields.join(', ')} WHERE member_id = ?`)
        .bind(...values)
        .run();
    }

    return (await getNotificationPreferences(db, memberId))!;
  } else {
    // Create new with defaults
    const id = generateId();
    await db
      .prepare(
        `INSERT INTO notification_preferences
           (id, member_id, reminders_enabled, changes_enabled, conflicts_enabled,
            reminder_minutes_1, reminder_minutes_2, reminder_minutes_3, sms_enabled,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        memberId,
        prefs.reminders_enabled ?? 1,
        prefs.changes_enabled ?? 1,
        prefs.conflicts_enabled ?? 1,
        prefs.reminder_minutes_1 ?? 15,
        prefs.reminder_minutes_2 ?? 60,
        prefs.reminder_minutes_3 ?? 1440,
        prefs.sms_enabled ?? 1,
        ts,
        ts,
      )
      .run();

    return (await getNotificationPreferences(db, memberId))!;
  }
}

// =========================================================================
// Notification Log
// =========================================================================

export async function createNotificationLog(
  db: D1Database,
  input: {
    member_id: string;
    event_id?: string;
    trigger_type: NotificationTriggerType;
    phone: string;
    message: string;
    status?: NotificationStatus;
    dedup_key?: string;
    scheduled_for?: number;
  },
): Promise<NotificationLogEntry> {
  const id = generateId();
  const ts = now();

  await db
    .prepare(
      `INSERT INTO notification_log
         (id, member_id, event_id, trigger_type, phone, message, status, dedup_key, scheduled_for, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.member_id,
      input.event_id ?? null,
      input.trigger_type,
      input.phone,
      input.message,
      input.status ?? 'pending',
      input.dedup_key ?? null,
      input.scheduled_for ?? null,
      ts,
    )
    .run();

  return {
    id,
    member_id: input.member_id,
    event_id: input.event_id ?? null,
    trigger_type: input.trigger_type,
    phone: input.phone,
    message: input.message,
    status: input.status ?? 'pending',
    error_message: null,
    dedup_key: input.dedup_key ?? null,
    scheduled_for: input.scheduled_for ?? null,
    sent_at: null,
    created_at: ts,
  };
}

export async function getPendingNotifications(
  db: D1Database,
  limit = 50,
): Promise<NotificationLogEntry[]> {
  const result = await db
    .prepare(
      `SELECT * FROM notification_log
       WHERE status = 'pending'
       ORDER BY scheduled_for ASC, created_at ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<NotificationLogEntry>();
  return result.results;
}

export async function updateNotificationStatus(
  db: D1Database,
  id: string,
  status: NotificationStatus,
  errorMessage?: string,
): Promise<void> {
  const ts = now();
  await db
    .prepare(
      `UPDATE notification_log
       SET status = ?, error_message = ?, sent_at = ?
       WHERE id = ?`,
    )
    .bind(status, errorMessage ?? null, status === 'sent' ? ts : null, id)
    .run();
}

export async function checkDedupKey(
  db: D1Database,
  dedupKey: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM notification_log WHERE dedup_key = ? AND status != 'failed' LIMIT 1`,
    )
    .bind(dedupKey)
    .first<{ id: string }>();
  return row !== null;
}

export async function listNotificationLog(
  db: D1Database,
  filters?: { member_id?: string; trigger_type?: string; limit?: number },
): Promise<NotificationLogEntry[]> {
  let query = 'SELECT * FROM notification_log WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.member_id) {
    query += ' AND member_id = ?';
    params.push(filters.member_id);
  }
  if (filters?.trigger_type) {
    query += ' AND trigger_type = ?';
    params.push(filters.trigger_type);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(filters?.limit ?? 50);

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<NotificationLogEntry>();
  return result.results;
}

export async function getMembersWithRemindersEnabled(
  db: D1Database,
): Promise<Array<Member & { reminder_minutes_1: number; reminder_minutes_2: number; reminder_minutes_3: number }>> {
  const result = await db
    .prepare(
      `SELECT m.*, np.reminder_minutes_1, np.reminder_minutes_2, np.reminder_minutes_3
       FROM members m
       JOIN notification_preferences np ON np.member_id = m.id
       WHERE np.reminders_enabled = 1 AND np.sms_enabled = 1 AND m.phone IS NOT NULL`,
    )
    .all<Member & { reminder_minutes_1: number; reminder_minutes_2: number; reminder_minutes_3: number }>();
  return result.results;
}
