# Agentic Triage Cycle — App Governance

The standing loop for agent-managed triage with receipts. Any Claude Code session (interactive or scheduled) runs this cycle; every write is audited in `events` with the acting agent's identity.

## Access

- **Governance MCP**: `https://app-governance.mcp.createsomething.agency/mcp`, bearer = `infisical secrets get APP_GOVERNANCE_MCP_KEY --plain` (run from the monorepo root — infisical needs the repo's project config).
- **Slack reads**: claude.ai Slack MCP (`slack_read_channel`, detailed format exposes `Message TS`). Session-bound; if unavailable (headless run), skip Phase 1 and run Phases 2–4 only.
- Working client pattern: `rpc`/`secret` functions in any prior sync script; JSON-RPC Streamable HTTP with `Mcp-Session-Id` header, SSE `data:` lines.

## Phase 1 — Sync (needs Slack MCP)

1. `governance_sync_status` — get cursor per `slack_channel` source. Skip sources named "(on-demand)".
2. Per source with a cursor: `slack_read_channel` with `oldest=<cursor_value>`, detailed, limit 100. New messages → `governance_record_items` (external_id `<channel>:<ts>`, cursor_value = newest ts). The pusher pattern lives at `packages/app-governance-db/scripts/` lineage; inserts are idempotent.
3. Sources with no cursor yet: full backfill (newest page with cursor set, older pages without), cap 800 messages.

## Phase 1.5 — Doc-change check (needs local openapi-internal checkout)

From the monorepo root: `node packages/app-governance-db/scripts/check-doc-changes.mjs --pull`
Pulls the checkout (graceful if offline), diffs governed doc paths, auto-notifies doc-path subscribers on newer commits via `governance_record_doc_change` (first observation baselines silently), and sets the `docs_repo` sync cursor to repo HEAD.

## Phase 2 — Triage (governance MCP only)

Loop per source: `governance_list_items {triage_state:"new", source_external_id, limit:200}` → classify → batch `governance_categorize_items` (actor: `triage-agent <date>`). Repeat until empty.

Categories: `runtime-integrity` · `private-beta-governance` · `review-transparency` · `bundle-precision` · `forms-credential-exposure` · `platform-api-gaps` · `docs-overhaul` · `tooling-mcp-scanning` · `ecosystem-watch` · `triage-ops` (operational default). `ignored` (no category): bot notifications, joins, social, fragments. When unsure between workstream and triage-ops → triage-ops.

Link evidence (categorize with `finding_id`) only when a message is clearly evidence for an existing finding (`governance_list_findings` once). Never force links.

## Phase 3 — Escalate (judgment, be conservative)

- Pattern-level item with no matching finding → `governance_create_finding` only when ≥2 independent items show the same pattern; otherwise leave categorized.
- Submission contradicting a governed doc → `governance_flag_misalignment` (auto-notifies doc-path/category subscribers).
- Apps snapshot pushes (`governance_record_apps`) auto-notify drift subscribers — no manual action.

## Phase 4 — Receipts & delivery

- `governance_list_notifications {status:"queued"}` — the outbox. **Delivery to Slack requires explicit human authorization per message or a standing instruction**; when delivered, `governance_mark_notification {status:"sent"}`. Never auto-post to shared channels without authorization.
- End of cycle: `governance_sync_status` snapshot into the session summary — items by triage state should show `new ≈ 0`.

## Invariants

- Idempotent everywhere; re-runs are safe.
- Agents write through the MCP only (never direct D1) so events/receipts capture everything.
- Dashboard: https://app-governance-dash.createsomething.agency (key: Infisical `APP_GOVERNANCE_DASHBOARD_KEY`).
