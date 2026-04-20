-- Abundance inbound job -> funnel lead handoff
--
-- Adds durable handoff linkage on inbound jobs and extends funnel lead
-- source values so Abundance handoffs can be tracked explicitly.

PRAGMA foreign_keys=OFF;

CREATE TABLE leads_v2 (
  id TEXT PRIMARY KEY,

  -- Contact
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  linkedin_url TEXT,

  -- Source
  source TEXT CHECK (source IN ('linkedin', 'website', 'referral', 'cold', 'event', 'other', 'abundance')),
  source_detail TEXT,
  campaign TEXT,

  -- Status
  stage TEXT DEFAULT 'awareness' CHECK (stage IN ('awareness', 'consideration', 'decision', 'won', 'lost')),

  -- Value
  estimated_value REAL,
  actual_value REAL,
  service_interest TEXT,

  -- Activity
  first_touch_at TEXT,
  last_touch_at TEXT,
  discovery_call_at TEXT,
  proposal_sent_at TEXT,
  closed_at TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO leads_v2 (
  id,
  name,
  email,
  company,
  role,
  linkedin_url,
  source,
  source_detail,
  campaign,
  stage,
  estimated_value,
  actual_value,
  service_interest,
  first_touch_at,
  last_touch_at,
  discovery_call_at,
  proposal_sent_at,
  closed_at,
  notes,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  email,
  company,
  role,
  linkedin_url,
  source,
  source_detail,
  campaign,
  stage,
  estimated_value,
  actual_value,
  service_interest,
  first_touch_at,
  last_touch_at,
  discovery_call_at,
  proposal_sent_at,
  closed_at,
  notes,
  created_at,
  updated_at
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_v2 RENAME TO leads;

CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_campaign ON leads(campaign);

ALTER TABLE inbound_jobs ADD COLUMN funnel_lead_id TEXT;
ALTER TABLE inbound_jobs ADD COLUMN funnel_handoff_at TEXT;

CREATE INDEX idx_inbound_jobs_funnel_lead_id ON inbound_jobs(funnel_lead_id);

PRAGMA foreign_keys=ON;
