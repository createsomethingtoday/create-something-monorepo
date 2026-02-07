/**
 * Schedule MCP — Database Schema Types
 * Three-Tier Framework: Database tier (type definitions mirroring D1 schema)
 *
 * Pure type definitions — no runtime code.
 */

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export type Unit = {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export type Member = {
  id: string;
  name: string;
  email: string | null;
  timezone: string;
  created_at: number;
};

// ---------------------------------------------------------------------------
// Unit ↔ Member join
// ---------------------------------------------------------------------------

export type UnitMember = {
  unit_id: string;
  member_id: string;
  role: string;
};

// ---------------------------------------------------------------------------
// Calendars
// ---------------------------------------------------------------------------

export type Calendar = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  color: string | null;
  timezone: string;
  created_at: number;
};

// ---------------------------------------------------------------------------
// Calendar sharing
// ---------------------------------------------------------------------------

export type CalendarShareType = 'member' | 'unit';
export type CalendarPermission = 'read' | 'write' | 'admin';

export type CalendarShare = {
  calendar_id: string;
  shared_with_type: CalendarShareType;
  shared_with_id: string;
  permission: CalendarPermission;
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export type Event = {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: number;
  end_time: number;
  all_day: number; // 0 | 1
  recurrence_rule: string | null;
  recurrence_id: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: number;
  updated_at: number;
};

// ---------------------------------------------------------------------------
// Event participants
// ---------------------------------------------------------------------------

export type ParticipantStatus = 'accepted' | 'declined' | 'tentative' | 'pending';

export type EventParticipant = {
  event_id: string;
  member_id: string;
  status: ParticipantStatus;
};

/** Participant joined with member details. */
export type EventParticipantWithMember = EventParticipant & {
  name: string;
  email: string | null;
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type Template = {
  id: string;
  name: string;
  description: string | null;
  cycle_days: number;
  timezone: string;
  created_at: number;
};

// ---------------------------------------------------------------------------
// Template slots
// ---------------------------------------------------------------------------

export type TemplateSlot = {
  id: string;
  template_id: string;
  title: string;
  day_offset: number;
  start_minutes: number;   // 0–1439
  duration_minutes: number; // > 0
  metadata: string | null;  // JSON string
};

// ---------------------------------------------------------------------------
// Template with nested slots (for getTemplate)
// ---------------------------------------------------------------------------

export type TemplateWithSlots = Template & {
  slots: TemplateSlot[];
};

// ---------------------------------------------------------------------------
// Unit with members (for getUnit)
// ---------------------------------------------------------------------------

export type UnitWithMembers = Unit & {
  members: (Member & { role: string })[];
};

// ---------------------------------------------------------------------------
// Unit with count (for listUnits)
// ---------------------------------------------------------------------------

export type UnitWithCount = Unit & {
  member_count: number;
};
