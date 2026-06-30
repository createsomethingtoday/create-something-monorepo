# Agency Governance Products Operations Runbook

## Purpose

Operate the `.agency` governance runtime in production.

Atlas is the Map. Signal, Decision, and Proof are the products attached to it:

- Signal records source updates that may require review.
- Decision records human-in-the-loop or agent actions.
- Proof records the evidence and outcome.
- The operator Inbox is `/admin/governance`; Atlas carries the workflow context.

The current watched-source monitor follows Slack channels, writes qualifying updates into Signal, and advances D1 cursors so repeated runs do not reprocess the same Slack message.

## Owned Surfaces

| Surface | Owner | Notes |
|---------|-------|-------|
| Signal intake | `.agency` API | `POST /api/governance/intake/source-update`, protected by `AGENCY_INTERNAL_API_KEY`. |
| Slack monitor | `.agency` API | `POST /api/governance/monitors/slack`, protected by `AGENCY_INTERNAL_API_KEY`. |
| Operator Inbox | `.agency` admin UI | `/admin/governance` shows Signals, Decisions, Proof, review actions, and intake classification. |
| Map attachment | Atlas | Governance records can carry Atlas canvas/node references. |
| Ledger storage | D1 | `create-something-db` stores governance records and monitor cursors. |

## Required Configuration

Production uses the D1 database configured in `packages/agency/wrangler.jsonc`:

- binding: `DB`
- database name: `create-something-db`

Required secrets:

- `AGENCY_INTERNAL_API_KEY`: shared internal write credential for governance write endpoints.
- `SLACK_BOT_TOKEN`: Slack bot token used for `conversations.history`.

Required vars:

- `GOVERNANCE_SLACK_CHANNELS`: watched-channel config.
- `GOVERNANCE_SLACK_WORKSPACE_URL`: optional Slack workspace base URL for Proof/source links.

Delimited channel config:

```text
C123|#api-updates|atlas_canvas_id|atlas_node_id,C456|#review-ops|atlas_canvas_id|atlas_node_id
```

JSON channel config:

```json
[
  {
    "id": "C123",
    "name": "#api-updates",
    "atlas_canvas_id": "atlas_canvas_id",
    "atlas_node_id": "atlas_node_id",
    "workspace_url": "https://example.slack.com"
  }
]
```

The Slack app must be installed in the watched channels and able to read channel history.

## Pre-Flight

Run from the monorepo root:

```bash
pnpm --filter @create-something/agency check
pnpm --filter @create-something/agency build
```

Confirm governance migrations exist:

```bash
ls packages/agency/migrations/0030_governance_runtime_records.sql
ls packages/agency/migrations/0031_governance_source_cursors.sql
```

## Apply D1 Migrations

Apply locally first:

```bash
pnpm --filter @create-something/agency db:migrate:local
```

Apply remote in a controlled window:

```bash
pnpm --filter @create-something/agency db:migrate
```

Verify remote tables:

```bash
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('governance_signals', 'governance_decisions', 'governance_proofs', 'governance_source_cursors') ORDER BY name;"
```

Expected tables:

- `governance_decisions`
- `governance_proofs`
- `governance_signals`
- `governance_source_cursors`

## Invoke The Slack Monitor

Use the package script instead of hand-writing `curl`:

```bash
AGENCY_INTERNAL_API_KEY=... pnpm --filter @create-something/agency governance:slack-monitor -- --dry-run
AGENCY_INTERNAL_API_KEY=... pnpm --filter @create-something/agency governance:slack-monitor -- --base-url https://createsomething.agency
```

For preview or local endpoints:

```bash
AGENCY_INTERNAL_API_KEY=... pnpm --filter @create-something/agency governance:slack-monitor -- --url https://preview.example.workers.dev/api/governance/monitors/slack
```

The response summary reports:

- channels scanned
- messages fetched
- Signals created
- ignored messages
- channel-level errors
- latest cursor per channel

A `202` response with `status: "not_configured"` means the endpoint is deployed but `SLACK_BOT_TOKEN` or `GOVERNANCE_SLACK_CHANNELS` is missing.

## Scheduling Boundary

The owned automation primitive is the protected HTTPS trigger plus D1 cursor state. This repository currently deploys `.agency` as Cloudflare Pages and does not define a separate scheduled Worker for governance monitors.

Use one of these schedulers until a dedicated Worker is added:

- GitHub Actions cron that runs `pnpm --filter @create-something/agency governance:slack-monitor`.
- Cloudflare Worker Cron Trigger that POSTs to `/api/governance/monitors/slack`.
- Another scheduler that can store `AGENCY_INTERNAL_API_KEY` securely and call the endpoint.

Scheduler rules:

- run at most one monitor invocation at a time
- use the production URL only after D1 migrations and vars are verified
- keep `AGENCY_INTERNAL_API_KEY` in the scheduler secret store
- treat channel errors as actionable operations evidence, not silent failures

## Operator Workflow

1. Scheduler or operator invokes the Slack monitor.
2. Slack messages are classified through Signal intake.
3. Updates requiring documentation or process review appear in `/admin/governance`.
4. Human reviewers complete Inbox actions.
5. Decisions and Proof attach back to the Signal and, where configured, Atlas map context.

## Verification

After a production monitor run:

```bash
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT source, title, status, created_at FROM governance_signals ORDER BY created_at DESC LIMIT 5;"
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT source_type, source_id, cursor_value, last_seen_at FROM governance_source_cursors ORDER BY updated_at DESC LIMIT 10;"
```

Then load `/admin/governance` and confirm the Inbox shows any newly created Signals with Docs review or Process review classifications.

## Rollback

Preferred rollback is to stop intake before deleting data:

1. remove or empty `GOVERNANCE_SLACK_CHANNELS`
2. rotate `AGENCY_INTERNAL_API_KEY` if a scheduler or caller is compromised
3. pause the external scheduler
4. inspect recent `governance_signals` rows
5. ship a forward corrective migration if stored data needs structural repair

Do not manually reset `governance_source_cursors` unless the operator intentionally wants a channel replay. Replaying Slack history can create duplicate governance Signals if source content has changed enough to bypass no-op classification.

## Source Anchors

- `packages/agency/src/routes/api/governance/monitors/slack/+server.ts`
- `packages/agency/src/lib/server/governance-slack-monitor.ts`
- `packages/agency/src/lib/server/governance-source-intake.ts`
- `packages/agency/src/routes/admin/governance/+page.svelte`
- `packages/agency/migrations/0030_governance_runtime_records.sql`
- `packages/agency/migrations/0031_governance_source_cursors.sql`
- `packages/agency/scripts/run-governance-slack-monitor.mjs`
