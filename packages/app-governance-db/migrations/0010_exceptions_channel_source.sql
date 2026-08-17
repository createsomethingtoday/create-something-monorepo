-- Register #app-review-exceptions (the exception transparency loop's Slack
-- surface) as a governance source, so exception requests, decisions, holds,
-- and denial follow-throughs become triaged items with receipts.
-- Applied to the remote DB 2026-08-17; kept here so migrations remain the
-- reproducible record. Sync: normal cursor source (not on-demand) — the
-- agent-mediated triage cycle backfills and follows it automatically.

INSERT OR IGNORE INTO sources (source_type, external_id, name, workspace, atlas_canvas_id) VALUES
  ('slack_channel', 'C0BN54FQU84', '#app-review-exceptions', 'webflow.enterprise.slack.com', 'F0BB96552KG');
