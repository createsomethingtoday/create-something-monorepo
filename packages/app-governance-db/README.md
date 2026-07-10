# App Governance Database (`app-governance-db`)

The database-layer instance for **App Review · Governance & Transparency**. A Cloudflare D1 canonical store with an MCP boundary, replacing Airtable-as-source-of-truth for governance findings. Airtable (`app1Q0o9xw2Zny7gw`) remains a human workspace / projection target, not the durable record.

This package is the first realized instance of the broader CREATE SOMETHING
database-layer direction documented in
`docs/CREATE_SOMETHING_DATABASE_LAYER.md`. Keep reusable concepts such as
source records, Atlas bindings, workflow actions, workflow runs, receipts, auth,
API/MCP parity, and dashboard interaction extractable from app-review-specific
concepts such as marketplace apps, findings, categories, reviewer
notifications, and Webflow governance sync.

Docs by audience: `OPERATORS.md` (the core team running the system) · `TRIAGE_RUNBOOK.md` (agents) · this README (developers).

Narrative context lives in the Slack canvas [App Review · Governance & Transparency Tracker](https://webflow.enterprise.slack.com/docs/T02874CDH/F0BB96552KG) (`F0BB96552KG`).

## Architecture

| Tier | Implementation |
|------|----------------|
| **Database** | D1 `app-governance-db` (`65e0fa00-e934-47b6-a154-baccd09afa1c`) — findings, items, categories, links, notifications, sync cursors, append-only events, source-record import ledgers, source-record relations/bindings, Atlas canvases/nodes/edges, workflow runs, receipts |
| **Automation** | Worker `app-governance-db` at `app-governance.mcp.createsomething.agency` — MCP tools over `/mcp` and `/sse`, bearer-auth (`MCP_API_KEY`) |
| **Judgment** | Categorization taxonomy (canvas §1–§8 + triage-ops), `decision_needed` flags, `verified_by_reviewer`, notification queue reviewed before delivery |

Atlas-backed: `sources`, `source_records`, `categories`, and `findings` carry `atlas_canvas_id` / `atlas_node_id` references so every record pins to the Atlas canvas/node it serves (initial mapping: tracker canvas `F0BB96552KG`). `source_record_relations` and `source_record_atlas_bindings` preserve row-to-row topology and multi-map provenance. `atlas_canvases`, `atlas_nodes`, `atlas_edges`, `workflow_runs`, and `workflow_receipts` are the first-class database-layer map/runtime contract: SvelteFlow, desktop Studio, and other UIs consume these records rather than owning the source of truth.

## Distribution boundary

The canonical product is the Cloudflare-hosted database layer:

- D1 is the durable state owner.
- The Worker at `https://app-governance.mcp.createsomething.agency/mcp` is the agent/API boundary.
- The dashboard at `https://app-governance-dash.createsomething.agency` is the operator UI.

The Tauri package in `packages/app-governance-desktop` is not a second product
or a second state model. It is an optional operator shell for native affordances
such as keychain storage, tray actions, notifications, and local script
execution. It must open or enhance the Cloudflare surfaces above; it must not
fork dashboard UI, source records, Atlas maps, workflow actions, receipts, or
review state into desktop-only storage.

## Notion-to-Atlas migration contract

CREATE SOMETHING's own Notion transfer is the product dogfood path. The database layer treats Notion rows as source evidence first, not as Atlas nodes immediately:

1. Record rows into `source_records` with `governance_record_source_records`.
2. Inspect `governance_source_hygiene` and resolve `missing_substrate`, `duplicate`, or `blocked` identity states before projection.
3. Attach `substrate_id`, `canonical_type`, and Atlas bindings with `governance_update_source_record_mapping`.
4. Record source relation properties with `governance_record_source_record_relations` when the connector can see explicit Notion relations, then run `governance_extract_source_record_relations` for fallback payload/title/alias evidence. Explicit/imported evidence and inferred evidence are separated by `evidence_kind`, `confidence`, and `reason`.
5. Project clean records into `atlas_canvases` / `atlas_nodes` / `atlas_edges` and preserve receipts with `governance_record_workflow_receipt`.

`source_import_runs` records each batch, cursor, retry-after, rate-limit, and error condition. This is what makes Notion import resumable and agent-safe: a failed or rate-limited pass leaves a database receipt and a cursor/backoff state instead of depending on chat memory.

The dashboard `/sources` route is the operator view for this migration. It now surfaces the Notion transfer readiness verdict, blocker counts, latest import warnings, source-update queue, and client-map coverage from D1 so the MCP/API completion audit and the human close-loop view agree.

Explicit Notion relation import is handled by:

```bash
node packages/app-governance-db/scripts/sync-notion-relations.mjs --dry-run
node packages/app-governance-db/scripts/sync-notion-relations.mjs --write
```

The runner reads captured `source_records` from the app-governance MCP, queries
matching Notion data sources through `createsomething-notion`, extracts Notion
relation properties, normalizes page IDs, and writes explicit relations through
`governance_record_source_record_relations`. It orients client relations as
`client owns record`; other relation properties become `references`,
`depends_on`, `blocks`, or `corresponds_to` based on property name and record
types.

When the direct `createsomething-notion` MCP bearer is stale, use the installed
Notion connector as a read surface and save its SQL query output into a connector
export bundle:

```bash
pnpm --filter @create-something/app-governance-db notion:connector-plan
pnpm --filter @create-something/app-governance-db notion:connector-plan -- --format json > /tmp/notion-connector-export.json
```

The manifest lives at
`packages/app-governance-db/config/notion-connector-relation-sources.json`.
It covers the CREATE SOMETHING Notion graph sources expected by the transfer
readiness audit: `Clients`, `Engagements`, `Workstreams`, `Tasks / Actions`,
`Evidence`, `Decisions`, `Risks / Blockers`, `Deliverables`,
`Delivery Milestones`, `Agents`, and `MCP Services`. The planner prints the SQL
each agent should run through the installed Notion connector and an empty bundle
shape to fill with returned rows. Queries use the connector's
`collection://...` table names, not display-name aliases:

```json
{
  "connector_exports": [
    {
      "name": "Engagements",
      "data_source_id": "collection://d3873b66-762c-4f3a-bd9e-97267f58faf5",
      "relation_properties": ["Client", "Workstreams", "Tasks / Actions", "Deliverables", "Evidence", "Services used"],
      "rows": [
        {
          "url": "https://app.notion.com/359fa8740b1581058193e9cfbc5f2f6e",
          "Name": "Cato Supply - Webflow Insights CMS build",
          "Client": "[\"https://app.notion.com/359fa8740b15816799c3d05f8b892ea3\"]"
        }
      ]
    }
  ]
}
```

Then run:

```bash
node packages/app-governance-db/scripts/sync-notion-relations.mjs \
  --connector-export /path/to/notion-connector-export.json \
  --dry-run

node packages/app-governance-db/scripts/sync-notion-relations.mjs \
  --connector-export /path/to/notion-connector-export.json \
  --write
```

The connector export path still reads current `source_records` from the
app-governance MCP, normalizes compact/dashed/full Notion page URLs, and writes
through `governance_record_source_record_relations`. `relation_properties` is
required for connector SQL rows so people/user/file JSON arrays are not treated
as page relations.

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
| `governance_record_apps` | Upsert Webflow Apps admin snapshots and detect listing drift |
| `governance_list_apps` | List synced marketplace apps and recent drift |
| `governance_record_app_endpoint_access` | Record Webflow Admin endpoint capability/readback state (MRP id, no-op read/write support, verified/unsupported/error status) and an optional operator-approved write receipt for an app or unsupported template — no secrets stored |
| `governance_set_cursor` | Set a high-water mark for non-item sync mechanisms |
| `governance_record_source_records` | Idempotently record row-level source records from Notion or another database source |
| `governance_list_source_records` | Inspect source records and identity/migration filters, including missing Substrate IDs |
| `governance_source_hygiene` | Summarize source-record migration health, recent import runs, cursors, and backoff state |
| `governance_get_notion_transfer_audit` | Audit CREATE SOMETHING Notion transfer coverage across expected databases: captured rows, identity coverage, Atlas projection, source-level binding/relation coverage, row-level unbound records, relation islands, and reviewed gap counts |
| `governance_get_notion_transfer_readiness` | Return an explicit ready/not-ready verdict with blockers, warnings, review counts, source-update action counts, and client-map coverage for completion audits |
| `governance_list_notion_transfer_readiness_blockers` | List the exact rows/actions behind the readiness blockers: unreviewed binding gaps, unreviewed relation islands, and open source-update actions |
| `governance_plan_notion_transfer_blocker_reviews` | Group readiness blockers into proposal-only review batches by source and canonical type without reviewing, waiving, resolving, or binding records |
| `governance_create_notion_transfer_blocker_review_handoff` | Create a workflow-action handoff for one blocker group while leaving source records, reviews, bindings, and relations untouched |
| `governance_update_notion_transfer_blocker_review_handoff_status` | Move a blocker-group handoff between proposed, running, and blocked with receipt/event logging and no source-record mutation |
| `governance_get_notion_transfer_blocker_review_handoff` | Read the exact current blocker rows behind a blocker-group handoff action for agent execution context |
| `governance_upsert_source_record_transfer_review` | Review, waive, or mark source-record transfer gaps that require source updates before client Atlas rollout |
| `governance_list_source_record_transfer_reviews` | List transfer reviews and kind-specific open binding/relation gap candidates; use `open_gaps_only` plus optional `review_kind` to work the Notion transfer queue |
| `governance_materialize_source_update_actions` | Turn reviewed `needs_source_update` transfer reviews into idempotent Atlas workflow actions for agent/API-managed repair handoff |
| `governance_list_source_update_workflow_actions` | Read the source-update action queue with transfer review state, source-record context, row-level gap flags, and latest receipt evidence |
| `governance_update_source_update_workflow_action_status` | Move a source-update action between `proposed`, `running`, and `blocked` with dashboard-parity validation, receipt logging, and event audit |
| `governance_record_source_update_result` | Evidence-gated close-loop command: record source-truth proof, complete/block the action, and resolve or keep open the transfer review without mutating Notion or creating Atlas bindings |
| `governance_update_source_record_mapping` | Resolve a source row's canonical identity and Atlas bindings before projection |
| `governance_resolve_source_record_identities` | Derive stable Substrate IDs for imported rows that lack explicit canonical IDs |
| `governance_project_source_records_to_atlas` | Project resolved source records into a source-led Atlas map |
| `governance_record_source_record_relations` | Idempotently record explicit source-record relations from Notion relation properties, manual corrections, or connector-owned dependency data |
| `governance_extract_source_record_relations` | Build the source-record relation ledger from payload references, client aliases, and title correspondence with confidence/reason evidence |
| `governance_project_client_workflow_canvases` | Derive client-specific Atlas canvases from source records, direct client evidence, and bounded relation-expanded match evidence; supports client-scoped projection for API/MCP-safe repairs |
| `governance_list_doc_locations` | List governed documentation locations |
| `governance_subscribe` | Subscribe a target to doc/category/source notifications |
| `governance_list_subscriptions` | List notification subscriptions |
| `governance_record_doc_change` | Record governed-doc drift and queue review |
| `governance_flag_misalignment` | Create a finding from a doc/submission mismatch |
| `governance_upsert_atlas_canvas` | Create/update canonical Atlas canvases, nodes, and edges |
| `governance_list_atlas_canvases` | List database-layer workflow maps with node/edge counts |
| `governance_get_atlas_canvas` | Fetch a canvas with nodes, edges, runs, and receipts |
| `governance_get_workflow_runtime` | Fetch executable workflow runtime state: node readiness, dependencies, latest runs, bindings, receipts, open runs, and next runnable nodes |
| `governance_upsert_workflow_action` | Create/update a workflow action or policy gate for proposed, approved, blocked, running, or completed work |
| `governance_list_workflow_actions` | List workflow actions by canvas, node, run, owner, status, or gate kind |
| `governance_record_workflow_run` | Create/update a workflow run lifecycle record without requiring a receipt |
| `governance_record_workflow_receipt` | Record proof/decision/handoff/sync/error evidence for a workflow run |

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

## Atlas Studio session import

Local Atlas Studio sessions can be converted into canonical D1 records before
remote promotion:

```bash
node packages/app-governance-db/scripts/import-atlas-session.mjs \
  "$HOME/Library/Application Support/CREATE SOMETHING/Atlas Studio/sessions/<session-id>.json" \
  --no-transaction \
  > /tmp/atlas-import.sql

wrangler d1 execute app-governance-db --remote --file=/tmp/atlas-import.sql
```

The importer upserts the canvas, nodes, and edges, creates a deterministic
`workflow_runs` sync record, and replaces that import run's receipts with the
current import/observation set. Agents can retry a transfer without duplicating
the canonical map or observation receipts.

Use the default transactional output for local SQLite smoke tests. Use
`--no-transaction` for remote D1 imports because `wrangler d1 execute --file`
rejects explicit `BEGIN`/`COMMIT` wrappers.

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

Migrations are plain SQL in `migrations/`; apply in order (lexical filename sort) with `wrangler d1 execute app-governance-db --remote --file=migrations/<nnnn_name>.sql`. `0006_atlas_workflows.sql` adds the canonical Atlas/workflow runtime tables used by the `/atlas` dashboard view and Atlas MCP tools. `0007_source_record_imports.sql` adds the row-level source-record ledger and import-run tables used by the `/sources` dashboard view and Notion migration MCP tools. `0012_app_admin_endpoint_access.sql` (renamed from `0006_app_admin_endpoint_access.sql`, which collided with the atlas file; prod applied it under the old name) adds the apps MRP columns and admin-endpoint capability/receipt tables — **not idempotent**: its bare `ALTER TABLE ADD COLUMN` statements fail on re-apply, so skip it when `PRAGMA table_info(apps)` already shows the `mrp_*` columns. `0013_seed_platform_api_gaps.sql` seeds the `platform-api-gaps` category (already present in prod; the seed keeps fresh bootstraps aligned).

Dashboard deploys are separate because the dashboard is a SvelteKit Worker with
static assets:

```bash
cd packages/app-governance-db/dashboard
pnpm deploy                     # builds SvelteKit and deploys app-governance-dashboard
```

Dashboard writes intentionally mirror MCP writes for the source-update loop:
starting, blocking, reopening, and recording proof all write `workflow_actions`,
`workflow_receipts`, and `events`. Recording proof also marks the related
`source_record_transfer_reviews` row `resolved`. None of those dashboard actions
mutate Notion or create `source_record_atlas_bindings`; raw gap counts stay
visible until the underlying source/map state is actually repaired.
