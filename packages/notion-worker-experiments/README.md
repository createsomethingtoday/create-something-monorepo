# Notion Worker Experiments

Small Notion Worker spike package for CREATE SOMETHING Custom Agent tools.

This package is intentionally separate from the Cloudflare Worker MCP packages. It validates Notion-native delivery for capabilities that should run inside Notion Custom Agents.

## Current Scope

- `summarizePage` - read-only page preview tool using `context.notion`.
- `appendPolicyNote` - write-capable page note appender. In Notion Custom Agents this should require user confirmation.
- `linearIssuesSync` - scheduled Worker Sync that mirrors Linear issues into a Notion-managed read-model database for PM review.
- `reconcile:agency-ops` - local dry-run reconciliation CLI that compares Linear issue snapshots with Notion PM snapshots and emits review-only findings.

No production deployment is configured at the repo root yet. Hosted Worker
updates are package-local and use this package's `workers.json`.

## Setup

Install the Notion CLI:

```bash
curl -fsSL https://ntn.dev | bash
ntn login
ntn doctor
```

Notion's Worker quickstart now lists Node.js `22+` and npm `10+` as the deploy
environment. The monorepo build may run under the repo's current Node version,
but hosted Worker deploy tests should use Node 22 before promotion.

For local execution, create a local `.env` from `.env.example` and set tokens from a secret manager or temporary shell session.

Required env by capability:

| Capability                                     | Env                |
| ---------------------------------------------- | ------------------ |
| `summarizePage`, `appendPolicyNote` local exec | `NOTION_API_TOKEN` |
| `linearIssuesSync`                             | `LINEAR_API_KEY`   |

Optional Linear sync env:

| Env                     | Default                          | Purpose                                 |
| ----------------------- | -------------------------------- | --------------------------------------- |
| `LINEAR_API_URL`        | `https://api.linear.app/graphql` | Override the Linear GraphQL endpoint.   |
| `LINEAR_TEAM_KEY`       | `CRE`                            | Limit the mirror to one Linear team.    |
| `LINEAR_SYNC_PAGE_SIZE` | `100`                            | GraphQL page size, clamped to `1..250`. |

## Local Tool Tests

```bash
cd packages/notion-worker-experiments

ntn workers exec summarizePage --local -d '{"pageId":"<page_id>","maxBlocks":5}'

ntn workers exec appendPolicyNote --local -d '{"pageId":"<page_id>","heading":"Policy note","note":"Test note from local Worker execution.","sourceUrl":null}'

LINEAR_API_KEY="$LINEAR_API_KEY" ntn workers sync trigger linearIssuesSync --local --preview
```

Run the Agency Ops reconciliation dry run without secrets:

```bash
pnpm reconcile:agency-ops -- --sample
pnpm reconcile:agency-ops -- --sample --format json
```

Run it against an exported snapshot:

```bash
pnpm reconcile:agency-ops -- --input ./agency-ops-snapshot.json
```

Export a live snapshot from Notion PM databases plus Linear API state:

```bash
NOTION_API_TOKEN="$NOTION_CREATE_SOMETHING_API_KEY" \
LINEAR_API_KEY="$LINEAR_API_KEY" \
pnpm reconcile:agency-ops -- --live --snapshot-out ./agency-ops-snapshot.json
```

The live mode defaults to the CREATE SOMETHING Agency Ops database IDs for
Tasks / Actions, Deliverables, and Engagements. Override them with:

```bash
NOTION_AGENCY_OPS_TASKS_DATABASE_ID=
NOTION_AGENCY_OPS_DELIVERABLES_DATABASE_ID=
NOTION_AGENCY_OPS_ENGAGEMENTS_DATABASE_ID=
```

Create review-only Notion suggestions from a snapshot:

```bash
NOTION_API_TOKEN="$NOTION_CREATE_SOMETHING_API_KEY" \
NOTION_AGENCY_OPS_OWNER_USER_ID="<notion-user-id>" \
NOTION_AGENCY_OPS_WORKSTREAM_ID="<agency-ops-pm-home-workstream-id>" \
pnpm reconcile:agency-ops -- --input ./agency-ops-snapshot.json --write-suggestions --max-suggestions 5
```

`--write-suggestions` creates or skips duplicate `Tasks / Actions` rows with
`Source = Agent`, `Agent suggestion = true`, `Reviewed = false`, and
`Status = Review`. It does not update Linear issues, engagement statuses,
deliverable statuses, owners, or source-of-truth fields.

Linear-to-Notion missing-reference checks are intentionally scoped to explicit
PM surfaces: the `Client Delivery` and `CREATE SOMETHING Agent Coordination`
projects, or Linear labels such as `linear-coordination`, `client delivery`,
`handoff`, `meeting`, or `pm`. Normal engineering backlog items should stay in
Linear unless they are active and affect client communication, delivery status,
or operator follow-up.

The snapshot shape is intentionally small and review oriented:

```json
{
  "linearIssues": [
    {
      "identifier": "CRE-360",
      "title": "Create Notion Worker sync for Linear data",
      "url": "https://linear.app/createsomething/issue/CRE-360/...",
      "status": "Done",
      "statusType": "completed",
      "labels": ["linear-coordination"]
    }
  ],
  "notionTasks": [
    {
      "action": "Refresh Linear Issues cockpit placement",
      "status": "Next",
      "source": "Linear",
      "linearIssueUrl": "https://linear.app/createsomething/issue/CRE-360/..."
    }
  ],
  "deliverables": [{ "name": "Client handoff", "status": "Review", "evidenceCount": 0 }],
  "engagements": [
    { "name": "Client engagement", "status": "Active", "taskCount": 0, "lastPmReview": null }
  ]
}
```

With repo-managed secrets, use Infisical:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  env PATH="$HOME/.local/bin:$PATH" LINEAR_SYNC_PAGE_SIZE=2 \
  ntn workers sync trigger linearIssuesSync --local --preview --no-dotenv
```

Use the write tool only against disposable pages while testing.

## Hosted Worker Flow

```bash
cd packages/notion-worker-experiments
ntn login
ntn doctor

pnpm --filter @create-something/notion-worker-experiments build
ntn workers deploy --name create-something-linear-sync --local-build

ntn workers env set "LINEAR_API_KEY=$LINEAR_API_KEY"
ntn workers env set "LINEAR_TEAM_KEY=${LINEAR_TEAM_KEY:-CRE}"
ntn workers env set "LINEAR_SYNC_PAGE_SIZE=100"

ntn workers exec summarizePage -d '{"pageId":"<page_id>","maxBlocks":5}'
ntn workers sync trigger linearIssuesSync --preview
ntn workers sync trigger linearIssuesSync
ntn workers sync status linearIssuesSync
ntn workers runs list
```

Store external API keys with `ntn workers env set`. Do not commit secrets.
Use `--local-build` for hosted deploys from this monorepo package; the build
script emits a bundled Worker file so Notion's hosted runtime does not need to
resolve pnpm workspace transitive dependency symlinks.

## Design Notes

- Agent Tools are the preferred Notion Worker spike because they make CREATE SOMETHING capabilities available directly inside Notion.
- Syncs should be piloted only for greenfield Notion-managed databases until Notion supports syncing into existing client-owned databases.
- `linearIssuesSync` intentionally treats Linear as the source of truth and Notion as a managed read model. It uses replace-mode pagination so stale rows are removed after a complete successful sync run.
- Agency Ops reconciliation should stay review-only by default. It may create or suggest Notion PM tasks, but it must not automatically change Linear status, Notion engagement status, deliverable status, or source-of-truth ownership fields.
- Use reconciliation findings to identify drift between Linear engineering execution and Notion PM/operator records. Do not turn the Linear Issues mirror into a second tracker.
- The current `@notionhq/workers` package exposes `hints` in docs but does not yet type/copy that field in `ToolConfiguration`; `src/index.ts` patches the returned capability manifest for `readOnlyHint` so the experiment matches the documented Agent Tool behavior.
- `@notionhq/workers@0.3.0` currently peers against `@notionhq/client@^2.2.15`.
  Keep this package on the compatible peer range until the Workers SDK supports
  the standalone SDK v5 line. The `@notionhq/client` `5.21.0` guidance in the
  repo audit applies to non-Worker SDK packages that opt in to API
  `2026-03-11`.
- For Custom Agent calls, `context.notion` is authenticated by Notion with the
  Custom Agent's permissions. For local tests, syncs, webhooks, and CLI exec,
  supply `NOTION_API_TOKEN` explicitly.

## Related Docs

- `docs/guides/NOTION_WORKERS_AND_CLI_2026.md`
- `docs/guides/NOTION_API_COMPATIBILITY_AUDIT_2026.md`
- https://developers.notion.com/workers/guides/tools
- https://developers.notion.com/workers/guides/syncs
- https://developers.notion.com/workers/guides/api-client
- https://developers.notion.com/cli/get-started/overview
