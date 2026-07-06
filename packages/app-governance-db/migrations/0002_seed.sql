-- Seed sources and categories from the App Review · Governance & Transparency
-- Tracker canvas (F0BB96552KG) and its source channels.

INSERT OR IGNORE INTO sources (source_type, external_id, name, workspace, atlas_canvas_id) VALUES
  ('slack_channel', 'C05KPSPTPFT', '#triage-marketplace-apps', 'webflow.enterprise.slack.com', 'F0BB96552KG'),
  ('slack_canvas', 'F0BB96552KG', 'App Review · Governance & Transparency Tracker', 'webflow.enterprise.slack.com', 'F0BB96552KG'),
  ('airtable', 'app1Q0o9xw2Zny7gw', 'App Review Governance Findings (Airtable)', NULL, 'F0BB96552KG');

INSERT OR IGNORE INTO categories (id, title, description, canvas_section) VALUES
  ('runtime-integrity', 'Runtime Integrity & Custom Code Governance',
   'Any runtime on a customer site must be the reviewed, registered, integrity-pinned code regardless of delivery mechanism. Loaders, Custom Code API injection, pasted snippets. Cases: Website Speedy, Converly, Caputchin, Roolify.', '§1'),
  ('private-beta-governance', 'Private App & Beta-Testing Governance',
   'Private/beta review paths; "approved" as visibility toggle vs quality gate; partner testing paths; WF Admin lockdown. Cases: Lokalise Vantage, Muse AI, Pollen.', '§2'),
  ('review-transparency', 'Review Transparency & Inspectability',
   'What we approve must be what we can see: source code inclusion, source maps, bundle capture, iframe UIs. Cases: WES.', '§3'),
  ('bundle-precision', 'Bundle Review Precision',
   'Library false-positive allowlist, dependency declarations, routing flags to the right owner. 52.8% of bundle flags come from third-party libraries.', '§4'),
  ('forms-credential-exposure', 'Forms API & Credential-Field Exposure',
   'Forms API schema gaps forcing DOM scraping; injected runtimes reaching credential fields; category-wide review guardrails.', '§5'),
  ('docs-overhaul', 'Documentation Overhaul & Tracking Hub',
   'Terminology model (public/private/direct install/test access/visibility), Private Apps page fix, batched guidelines release, legal review routing.', '§6'),
  ('tooling-mcp-scanning', 'Tooling — App Review MCP & Security Scanning',
   'App Review MCP context integrations (Airtable/Zendesk/Slack), automated bundle/security scanning, scanning cost/quality tradeoffs.', '§7'),
  ('ecosystem-watch', 'Ecosystem & Competitive Watch',
   'Competitive marketplaces (Framer), moderation-at-scale observations, platform-conflict questions.', '§8'),
  ('triage-ops', 'Marketplace Triage Operations',
   'Channel-native operational traffic: listing updates, visibility issues, app takedowns, admin bugs, submission status checks. Feeds parking lot and pattern detection.', NULL);
