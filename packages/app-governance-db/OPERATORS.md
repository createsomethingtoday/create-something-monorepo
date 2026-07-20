# Operating the App Governance System

For the App Review core team. This is the human side of the system: what to look at, what the agents already did, and which actions are yours to take. (Developers: see `README.md`. Agents: see `TRIAGE_RUNBOOK.md`.)

## What this is

One system of record for App Review governance. Slack channels, the tracker canvas, the Airtable findings base, the Apps Admin listing state, and the developer docs repo all sync into a single database. Agents categorize everything and attach evidence to findings; you make the decisions and release the notifications. Every action — agent or human — leaves a receipt in the audit log.

The database (Cloudflare D1) is the source of truth. Airtable is a projection for human workflows, not the record.

## Surfaces

| Surface | Where | Access |
|---|---|---|
| Dashboard (reads everywhere; audited transfer-review/workflow write actions on /sources) | https://app-governance-dash.createsomething.agency | Access key — Infisical `APP_GOVERNANCE_DASHBOARD_KEY` |
| Governance MCP (agents & scripts) | https://app-governance.mcp.createsomething.agency/mcp | Bearer — Infisical `APP_GOVERNANCE_MCP_KEY` |
| Notifications | Posted to Slack targets (e.g. #triage-marketplace-apps) | Released by a human — see below |
| Tracker canvas | Slack canvas `F0BB96552KG` | Narrative home; synced into the DB as items |
| Airtable | Base `app1Q0o9xw2Zny7gw` | Projection only |

## Who does what

| The agents (automatic) | You (judgment) |
|---|---|
| Sync every source on a cursor (Slack, canvas, Airtable, docs repo) | Decide the ⚖️ NEEDS DECISION findings |
| Categorize and ignore incoming items, with receipts | Verify findings (`verified_by_reviewer`) and set owners/priorities |
| Link items as evidence to findings | Release queued notifications to Slack |
| Detect Apps Admin drift and docs changes; queue notifications to subscribers | Keep the admin sync logged in (see below) |
| Write decision briefs from linked evidence | Edit the tracker canvas narrative |

## The operating rhythm

**Glance (daily, ~1 min)** — Dashboard → Overview:
- Sync cursors: every non-"(on-demand)" source should show a recent sync. Red NEVER SYNCED on anything else means a mechanism stopped.
- Items by triage state: `new` should be ~0 (three protected canvas items are permanently new by design).
- Queued notifications: if > 0, something is waiting for a human to release it.

**Work the decisions (weekly, or when the count changes)** — Dashboard → Findings, filter DECISION = needed. Each ⚖️ finding carries a decision brief in its detail view: the fork, options with tradeoffs, dated evidence with Slack permalinks, and a recommendation. Walk into the meeting with it; record the outcome by updating the finding (ask any Claude Code session, or note it and an agent will apply it).

**Check drift (after each admin sync)** — Dashboard → Apps → Recent drift. Visibility flips (PUBLIC↔PRIVATE), status changes, and client_id changes appear here and notify `#triage-marketplace-apps` automatically. Drift on an app you didn't expect = the listing/visibility problem from the parking lot, caught live.

## Actions you'll actually take

### Unlock the dashboard
Key is in Infisical (`APP_GOVERNANCE_DASHBOARD_KEY`). Paste once; it sets a session cookie.

### Release a notification
Agents queue notifications; **nothing posts to a shared channel without a human saying so**. In a Claude Code session: "deliver queued notification N" — it posts via Slack, marks the notification `sent`, and records the message permalink in the audit log. The outbox lives on the dashboard Overview and via `governance_list_notifications`.

### Keep the Apps Admin sync alive
The sync runs headless daily (launchd, 9:17am) from a logged-in browser profile on Micah's machine, on Tailscale. When the Okta session expires it fails loudly (exit 2 in `~/.config/webflow-admin-sync/sync.log`) and the fix is one command, then complete Okta in the window that opens:

```bash
node packages/app-governance-db/scripts/sync-admin-apps.playwright.mjs --login
```

Fallback for any IC: run `scripts/admin-apps-snapshot.console.js` in the browser console on webflow.com/apps (ADMIN VIEW), then hand the downloaded JSON to `scripts/push-admin-apps.mjs`.

### Run a sync/triage cycle on demand
In a Claude Code session at the monorepo root: *"Run the app-governance agentic triage cycle per packages/app-governance-db/TRIAGE_RUNBOOK.md."* Safe to run any time — everything is idempotent.

### Subscribe a person/team to a signal
Subscriptions route notifications programmatically by scope: a **doc path prefix** (openapi-internal), a **category** (workstream), or a **source** (e.g. Apps Admin drift). Ask an agent: *"subscribe @name to category runtime-integrity because …"*. Current seeds: Paige → all MARKETPLACE doc pages; Sisco → private-apps.mdx; Micah → docs-overhaul; Pablo → runtime-integrity; #triage-marketplace-apps → Apps Admin drift.

### Flag a submission that contradicts the docs
Ask an agent to run `governance_flag_misalignment` with the doc path and what the submission did. It creates the finding, links the governed doc, and queues notifications to that path's subscribers — receipts throughout.

## Vocabulary

| Finding status | Meaning |
|---|---|
| flagged | Recorded, not yet worked |
| in_progress | Someone owns it and is moving |
| needs_decision ⚖️ | Blocked on a call only humans can make |
| shipped | Done and live |
| parked | Deliberately deferred (parking lot) |

Priorities P0 (drop everything) → P3 (someday). Item triage states: `new` (untriaged) → `categorized` / `linked` (evidence on a finding) / `ignored` (bot noise, social).

## Receipts

The Events page is the append-only audit log: every sync, categorization, finding change, subscription, and notification carries the acting agent or human and a payload. Notification lifecycle is `queued → sent/skipped/failed`, with the Slack permalink recorded on delivery. If you ever wonder "who did this and why" — it's on the Events page.

## Troubleshooting

| Symptom | Meaning | Fix |
|---|---|---|
| Dashboard bounces back to the key form | Wrong/expired key cookie | Re-enter the key from Infisical |
| A source shows AGING for hours | Normal between syncs | Syncs are agent-mediated on demand (the only scheduled job is the daily 9:17 admin-apps sync via launchd); run one any time |
| A source shows NEVER SYNCED (not "on-demand") | Its mechanism hasn't run | Run the triage cycle; for Apps Admin, check the login |
| Admin sync log shows exit 2 | Okta session expired or Tailscale down | `--login` run (above) |
| Doc check prints "fetch failed" | openapi-internal fetch couldn't reach GitHub | Needs `gh` auth for `micahwithwf`; check `gh auth status` |
| Notification stuck `queued` | Waiting for human release | Release it (above) or mark it `skipped` |

## Invariants (why you can trust it)

- D1 is the source of truth; Airtable is a projection.
- Agents write only through the MCP — every write is audited.
- Nothing posts to shared channels without explicit human authorization.
- All syncs are idempotent — re-running anything is always safe. (One migration exception: `migrations/0012_app_admin_endpoint_access.sql` uses bare `ALTER TABLE ADD COLUMN` and fails if re-applied; skip it when the columns already exist.)
