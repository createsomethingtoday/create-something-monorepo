# App Governance Database (`app-governance-db`)

The database layer for **App Review · Governance & Transparency**. A Cloudflare D1 canonical store with an MCP boundary, replacing Airtable-as-source-of-truth for governance findings. Airtable (`app1Q0o9xw2Zny7gw`) remains a human workspace / projection target, not the durable record.

Docs by audience: `OPERATORS.md` (the core team running the system) · `TRIAGE_RUNBOOK.md` (agents) · this README (developers).

Narrative context lives in the Slack canvas [App Review · Governance & Transparency Tracker](https://webflow.enterprise.slack.com/docs/T02874CDH/F0BB96552KG) (`F0BB96552KG`).

## Architecture

| Tier | Implementation |
|------|----------------|
| **Database** | D1 `app-governance-db` (`65e0fa00-e934-47b6-a154-baccd09afa1c`) — findings, items, categories, links, notifications, sync cursors, append-only events |
| **Automation** | Worker `app-governance-db` at `app-governance.mcp.createsomething.agency` — MCP tools over `/mcp` and `/sse`, bearer-auth (`MCP_API_KEY`) |
| **Judgment** | Categorization taxonomy (canvas §1–§8 + triage-ops), `decision_needed` flags, `verified_by_reviewer`, notification queue reviewed before delivery |

Atlas-backed: `sources`, `categories`, and `findings` carry `atlas_canvas_id` / `atlas_node_id` references so every record pins to the Atlas canvas/node it serves (initial mapping: tracker canvas `F0BB96552KG`).

### Why agent-mediated sync

The source channels live in `webflow.enterprise.slack.com`, where we have no bot token for a headless worker. The Claude Code agent **is** the sync runtime: it reads channels through the Slack MCP (user-scoped OAuth) and writes normalized items through this MCP. Cursors in `sync_cursors` make the sync idempotent and resumable across sessions — any agent can pick up where the last one stopped.

```
Slack channels/canvas ──(Slack MCP, read)──▶ Claude Code agent ──(app-governance MCP, write)──▶ D1
                                                    │
                                                    ├── categorize items → categories / findings
                                                    ├── queue notifications → delivered via Slack MCP, then marked
                                                    └── project to Airtable (app1Q0o9xw2Zny7gw) when needed
```

## MCP tools

| Tool | Purpose |
|------|---------|
| `governance_sync_status` | Sources, cursors, counts — call first in a sync session |
| `governance_record_items` | Idempotent batch insert of synced messages + cursor advance |
| `governance_list_items` | Triage queue (`triage_state=new`) and filtered item views |
| `governance_categorize_items` | Assign category / attach to finding / ignore |
| `governance_create_finding` | Canonical finding with links + evidence items in one call |
| `governance_update_finding` | Status, priority, owner, decision flags, reviewer verification |
| `governance_list_findings` | Filtered views; `decision_needed=true` = ⚖️ decisions queue |
| `governance_get_finding` | Finding + links + items + audit events |
| `governance_add_link` | Attach Zendesk / Airtable / Slack-thread / doc / app evidence |
| `governance_queue_notification` | Queue outbound notice (owner ping, channel update) |
| `governance_list_notifications` | The outbox (`status=queued`) |
| `governance_mark_notification` | Record delivery outcome |
| `governance_list_categories` | The taxonomy (§1–§8 + triage-ops) |

Every write logs to the append-only `events` table with the acting agent's identifier.

## Sync runbook (Claude Code)

1. `governance_sync_status` — find the cursor for `slack_channel / C05KPSPTPFT`.
2. Read the channel via Slack MCP (`slack_read_channel`, `oldest=<cursor>`); read threads for messages with replies.
3. `governance_record_items` with `external_id = "<channel>:<ts>"`, `cursor_value` = newest ts recorded.
4. `governance_list_items` (`triage_state=new`) → categorize each item against the taxonomy; create/attach findings for anything pattern-level (see canvas throughline: runtime integrity, approval-as-toggle, invisible reviewer cost).
5. `governance_list_notifications` → deliver queued notices via Slack MCP → `governance_mark_notification`.

## Admin sync runbook (Webflow Apps admin → apps table)

The admin view at `https://webflow.com/apps` is session + network gated (Okta login, device on Tailscale), so the snapshot runs in the browser and the push runs locally:

1. On the admin page, run `scripts/admin-apps-snapshot.console.js` in DevTools Console (lineage: `packages/webflow-apps-admin/src/console/client-id-audit.js`). It loads all app cards, captures name/slug/visibility/review-status, optionally enriches client_id/workspace_id from edit pages, and downloads a JSON snapshot.
2. Push it: `infisical run -- node scripts/push-admin-apps.mjs ~/Downloads/admin-apps-snapshot-<date>.json`

`governance_record_apps` upserts by slug and logs `app_changed` events when visibility/status/name/client_id drift — the watch for "apps silently going private" from the tracker parking lot. Query drift with `governance_list_apps({ changed_since })`.

**Automated (Playwright, recommended):** `scripts/sync-admin-apps.playwright.mjs` ports the proven IC audit-script contract (webflow-apps-admin client-id-audit v2.0.0) into a persistent browser profile at `~/.config/webflow-admin-sync/profile`. One-time `--login` run establishes the Okta session; subsequent headless runs collect + enrich + push to the MCP directly (no Downloads hop) and log the internal API routes the admin page calls (candidates for a future headless read API). Schedule daily via `scripts/com.createsomething.app-governance-admin-sync.plist` (launchd). Fails loudly with exit 2 when the session expires or Tailscale is down — re-run `--login`.

**Headless candidate (untested):** internal endpoints under `webflow.com/api/v1/marketplace/*` accept a server Bearer key (proven by the `toggleMarketplacePaymentsCreatorBeta` Airtable automation), but no read endpoints were discoverable by probing (404s with and without the key). The Playwright run's route capture is the fastest way to identify the real listing endpoint for a platform ask.

## Docs alignment & subscriptions

Governed documentation (`webflow/openapi-internal`, local checkout `~/Code/openapi-internal`) is registered in `doc_locations` (Fern paths → categories → Atlas nodes; seeded with the MARKETPLACE pages, app-types terminology page, and custom-code pages). `subscriptions` bind a target (`@paige`, `#channel`) to a scope — doc path prefix, category, or source.

The programmatic loop: `governance_flag_misalignment` (submission behavior contradicts or falls outside a governed doc) creates a finding, links the doc location, and queues notifications to every subscriber whose scope matches. Apps-Admin drift (`governance_record_apps`) notifies `source` subscribers the same way. Delivery outcomes are recorded via `governance_mark_notification`; every write is audited in `events`. Notifications + events together are the receipts.

## Connecting Claude Code

```bash
claude mcp add app-governance \
  --transport http https://app-governance.mcp.createsomething.agency/mcp \
  --header "Authorization: Bearer $APP_GOVERNANCE_MCP_KEY"
```

The key lives in Infisical (`APP_GOVERNANCE_MCP_KEY`) and as the Worker secret `MCP_API_KEY`.

## Deploy

```bash
cd packages/app-governance-db/worker
pnpm deploy                     # wraps scripts/run-wrangler.mjs
# secret (from Infisical):
infisical run -- sh -c 'echo "$APP_GOVERNANCE_MCP_KEY" | npx wrangler secret put MCP_API_KEY'
```

Migrations are plain SQL in `migrations/`; apply with `wrangler d1 execute app-governance-db --remote --file=migrations/0001_init.sql` (0001 and 0002 are already applied to production).
