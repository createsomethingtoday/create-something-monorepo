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
- `GOVERNANCE_SLACK_CHANNELS`: watched-channel config, when channel IDs should stay out of repo-visible Pages vars.

Required vars:

- `GOVERNANCE_SLACK_CHANNELS`: watched-channel config, only when the channel list is safe to expose as normal Pages configuration.
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

The Slack app must be installed in the watched channels and able to read channel history. Prefer a Pages secret for `GOVERNANCE_SLACK_CHANNELS` when the config contains internal channel IDs or private workflow names; Cloudflare exposes secrets and vars to the runtime through the same `env` binding.

## Sync Monitor Configuration

Use the package sync utility instead of hand-writing `gh secret set` or `wrangler pages secret put` commands. It reads values from environment variables or Infisical, refuses missing or placeholder values, prints only names/status/lengths, and passes secret values to provider CLIs through stdin.

Dry-run from exported environment variables:

```bash
pnpm --filter @create-something/agency governance:sync-monitor-config -- --source env --dry-run
```

Dry-run from Infisical:

```bash
pnpm --filter @create-something/agency governance:sync-monitor-config -- --source infisical --infisical-env prod --infisical-path / --dry-run
```

Apply only after the dry-run reports `ready`:

```bash
pnpm --filter @create-something/agency governance:sync-monitor-config -- --source infisical --infisical-env prod --infisical-path / --apply
```

Sync targets:

- GitHub Actions: `AGENCY_INTERNAL_API_KEY`
- Cloudflare Pages: `AGENCY_INTERNAL_API_KEY`, `SLACK_BOT_TOKEN`, `GOVERNANCE_SLACK_CHANNELS`
- Cloudflare Pages optional: `GOVERNANCE_SLACK_WORKSPACE_URL`

The sync command intentionally fails when `SLACK_BOT_TOKEN` or `GOVERNANCE_SLACK_CHANNELS` is missing, `*not found*`, `replace-me`, or another placeholder. Do not use `--key <value>` or other inline secret flags in shell history.

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
infisical run --env=prod --path=/ --include-imports=true -- pnpm --filter @create-something/agency governance:slack-monitor -- --dry-run
infisical run --env=prod --path=/ --include-imports=true -- pnpm --filter @create-something/agency governance:slack-monitor -- --base-url https://createsomething.agency
```

Production scheduler runs should require the Slack monitor to be fully configured:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm --filter @create-something/agency governance:slack-monitor -- --base-url https://createsomething.agency --require-configured
```

For preview or local endpoints:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm --filter @create-something/agency governance:slack-monitor -- --url https://preview.example.workers.dev/api/governance/monitors/slack
```

The response summary reports:

- channels scanned
- messages fetched
- Signals created
- ignored messages
- channel-level errors
- latest cursor per channel

A `202` response with `status: "not_configured"` means the endpoint is deployed but `SLACK_BOT_TOKEN` or `GOVERNANCE_SLACK_CHANNELS` is missing.
Passing `--require-configured` makes that response exit nonzero so production automation does not silently pass without watched sources.

## Scheduling Boundary

The owned automation primitive is the protected HTTPS trigger plus D1 cursor state. This repository deploys `.agency` as Cloudflare Pages and schedules the production Slack monitor through GitHub Actions.

Owned scheduled workflow:

- workflow: `Agency Governance Slack Monitor`
- file: `.github/workflows/agency-governance-slack-monitor.yml`
- cadence: hourly at minute 17
- manual dispatch inputs: `base_url`, `require_configured`

Scheduler rules:

- run at most one monitor invocation at a time
- use the production URL only after D1 migrations and vars are verified
- keep `AGENCY_INTERNAL_API_KEY` in GitHub Actions secrets
- keep `require_configured` enabled for production scheduled runs
- treat channel errors as actionable operations evidence, not silent failures
- expect scheduled runs to fail until `SLACK_BOT_TOKEN` and `GOVERNANCE_SLACK_CHANNELS` are configured in production

## Operator Workflow

1. Scheduler or operator invokes the Slack monitor.
2. Slack messages are classified through Signal intake.
3. Updates requiring documentation or process review appear in `/admin/governance`.
4. Human reviewers complete Inbox actions.
5. Decisions and Proof attach back to the Signal and, where configured, Atlas map context.

## Verification

Run the production readiness audit before and after changing monitor configuration:

```bash
pnpm --filter @create-something/agency governance:readiness
pnpm --filter @create-something/agency governance:readiness -- --json
```

The audit is read-only and secret-safe. It checks public product routes, the composition manifest, the Slack monitor auth gate, the scheduled GitHub workflow, GitHub Actions secret names, Cloudflare Pages secret names, Pages vars, remote D1 migrations, and remote D1 governance tables. It prints only whether required secrets and vars are configured, never their values.

Expected production state before monitor source configuration is complete:

- product routes, composition manifest, auth gate, scheduled workflow, D1 migrations, and D1 tables pass
- `Cloudflare Pages monitor secrets` fails until `SLACK_BOT_TOKEN` is set
- `Cloudflare Pages monitor source config` fails until `GOVERNANCE_SLACK_CHANNELS` is set as either a Pages secret or Pages var
- `GitHub Actions monitor credential` fails until the repository secret `AGENCY_INTERNAL_API_KEY` is set

Expected production state after the credential exists but before watched Slack sources are configured:

- `governance:sync-monitor-config -- --source infisical --dry-run` fails without printing values
- `governance:readiness` reports only missing Slack monitor source configuration
- `governance:slack-monitor -- --require-configured` exits nonzero if the API returns `status: "not_configured"`

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
- `packages/agency/scripts/sync-governance-monitor-config.mjs`
- `packages/agency/scripts/lib/governance-monitor-config-sync.mjs`
