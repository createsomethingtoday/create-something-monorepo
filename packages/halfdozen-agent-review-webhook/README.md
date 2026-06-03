# Half Dozen Agent Review Webhook

Cloudflare Worker endpoint for Notion Automation `Send webhook` actions from the Half Dozen
`Agents / Tools` database. When Half Dozen flags an agent build for review, the webhook creates a
CREATE SOMETHING Linear issue and optionally sends a Slack webhook notification.

Linear issues are deduplicated by agent title, including completed issues. A repeated Notion fire
for the same agent reuses the existing review issue and appends a replay comment before rerunning
automation.

By default, each intake creates or reuses two Linear follow-up issues:

- `Build Half Dozen agent: <agent name>`
- `Run and share Half Dozen agent eval: <agent name>`

The Worker then runs the Dify Agent Builder Eval app when
`DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_API_KEY` is configured. If that Dify app is not configured yet,
the Worker falls back to the deterministic governance eval mirror that matches the same report
contract. The generated handoff follows the meeting contract: result, review summary, recommended
upgrades/modifications, final instructions, and archived submitted instructions. When the Notion integration can see the source page and
`Test Reports [OS]`, the Worker publishes the eval report to Test Reports, rewrites the submitted
agent page by appending the updated handoff and archived submitted-instructions section, flips the
source page from `Updating` to `Testing`, comments evidence back to Linear, and marks the
intake/build/eval issues complete. If any Notion handoff step fails, the run is recorded in Linear
but is not marked completed. If the eval result is `fail`, the Worker appends the report but leaves
the source page status unchanged instead of moving it to `Testing`.

```bash
pnpm agent:halfdozen:governance-eval -- --output .cache/halfdozen-agent-governance-eval.json
```

The Worker-generated report mirrors the repo-owned governance gate shape. It is always shared back
to Linear. If `TEST_REPORTS_DATABASE_ID` is configured, the same report is also published into
that database. Otherwise, the Worker searches the visible Notion workspace for `Test Reports [OS]`
and writes there when the database is visible to `NOTION_API_KEY`.

When a Notion page URL or page ID is present, the Worker reads the page's block children through
the Notion API and appends the flattened page instructions to the Linear issue and eval archive.
The Notion connection used by `NOTION_API_KEY` must have read/write access to the target page and
read/create access to `Test Reports [OS]`. In Notion, share the source page or its parent database
and Test Reports database with that integration before expecting full automation.

## Notion Setup

Use the deployed Worker URL in the Notion action:

```text
https://halfdozen-agent-review-webhook.createsomething.workers.dev/webhook
```

Add one custom header:

```text
Authorization: Bearer <WEBHOOK_SECRET>
```

Select these Notion properties in the webhook content when present:

- `Name`
- `Status`
- `Priority`
- `Type`
- `Agent URL`
- `Agent Description`
- `Activated`
- a page URL or formula property containing the Notion page URL

If CREATE SOMETHING needs a direct link back to the Notion record, expose that as a database URL
property and select it in the webhook content. Notion webhook actions only send selected database
properties, not page contents.

For one-off pages that do not yet have a URL property, configure `PAGE_URL_BY_AGENT_NAME_JSON`
with a JSON object mapping agent names to Notion page URLs.

## Runtime

```bash
pnpm --filter @create-something/halfdozen-agent-review-webhook check
pnpm --filter @create-something/halfdozen-agent-review-webhook deploy
```

Required secrets:

```bash
wrangler secret put WEBHOOK_SECRET
wrangler secret put LINEAR_API_KEY
wrangler secret put NOTION_API_KEY
```

Optional secrets:

```bash
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put PAGE_URL_BY_AGENT_NAME_JSON
wrangler secret put TEST_REPORTS_DATABASE_ID
wrangler secret put WEBHOOK_REPLAY_SECRET
wrangler secret put DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_API_KEY
```

`WEBHOOK_REPLAY_SECRET` is optional and intended for authenticated operator replay tests. It lets
the live Worker process a previously received Notion payload without rotating the Notion automation
secret.

Optional vars:

```toml
CREATE_WORKFLOW_ISSUES = "false" # disables build/eval follow-up issue creation
AUTO_COMPLETE_WORKFLOW = "false" # disables eval report generation and Linear auto-completion
UPDATE_SOURCE_AGENT_PAGE = "false" # disables source Notion page rewrite/status update
TEST_REPORTS_DATABASE_NAME = "Test Reports [OS]" # overrides database discovery name
DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_BASE_URL = "https://api.dify.ai/v1"
DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_TIMEOUT_MS = "120000"
DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_REQUIRED = "true" # fail instead of fallback when Dify errors
```

## Dify Agent Setup

The repo-owned Dify import file is:

```text
config/dify-agents/halfdozen-agent-builder-eval.dify.yml
```

Import it in Dify Studio as `Half Dozen Agent Builder Eval`, bind the installed Notion plugin to a
Notion integration that can read the source Half Dozen agent pages, publish the app, then store the
Service API key in `DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_API_KEY`. The import enables only Notion read
tools (`search_notion`, `query_database`, `retrieve_page`, `retrieve_database`) plus E2B `run_code`
for bounded JSON/lint checks. The Worker remains the Notion/Linear writer.
