-- Schedule MCP — Initial Schema
-- Three-Tier Framework alignment: Database tier (persistence layer)

-- Units: teams, families, departments
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Members: people within the system
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Many-to-many: members belong to units
CREATE TABLE IF NOT EXISTS unit_members (
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  PRIMARY KEY (unit_id, member_id)
);

-- Calendars: named schedule containers
CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES members(id),
  color TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Calendar sharing permissions
CREATE TABLE IF NOT EXISTS calendar_shares (
  calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  shared_with_type TEXT NOT NULL CHECK (shared_with_type IN ('member', 'unit')),
  shared_with_id TEXT NOT NULL,
  permission TEXT DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  PRIMARY KEY (calendar_id, shared_with_type, shared_with_id)
);

-- Events: individual time blocks
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  all_day INTEGER DEFAULT 0,
  recurrence_rule TEXT,
  recurrence_id TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  created_by TEXT REFERENCES members(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Event participants
CREATE TABLE IF NOT EXISTS event_participants (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('accepted', 'declined', 'tentative', 'pending')),
  PRIMARY KEY (event_id, member_id)
);

-- Templates: reusable schedule patterns
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cycle_days INTEGER NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Template slots: time blocks within a template
CREATE TABLE IF NOT EXISTS template_slots (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  day_offset INTEGER NOT NULL,
  start_minutes INTEGER NOT NULL CHECK (start_minutes >= 0 AND start_minutes < 1440),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  metadata TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_calendar ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_target ON calendar_shares(shared_with_type, shared_with_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_member ON unit_members(member_id);
CREATE INDEX IF NOT EXISTS idx_template_slots_template ON template_slots(template_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_member ON event_participants(member_id);
