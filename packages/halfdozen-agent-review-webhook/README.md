# Half Dozen Agent Review Webhook

Cloudflare Worker endpoint for Notion Automation `Send webhook` actions from the Half Dozen
`Agents / Tools` database. When Half Dozen flags an agent build for review, the webhook creates a
CREATE SOMETHING Linear issue and optionally sends a Slack webhook notification.

Linear issues are deduplicated by agent title, including completed issues. A repeated Notion fire
for the same agent reuses the existing review issue and appends a replay comment before rerunning
automation.

Normal webhook deliveries enqueue the long-running eval/writeback job in Cloudflare Queues so the
Notion automation receives a fast 2xx response while Dify, Notion, and Linear work can continue
outside the request lifecycle.

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

## Eval Scope

This flow is an external instruction-readiness review for a Notion agent draft. It is useful because
the Notion drafting agent and the external eval agent have separate jobs:

- the Notion agent drafts or updates the source instructions in the Half Dozen workspace
- the external eval agent reviews those instructions against a stable rubric and returns an
  advisory `proposed_patch`
- the Worker owns all Notion and Linear writes, versioning, status movement, and evidence comments

The eval can say whether the submitted instructions are complete, safe, reference-aware, and ready
for human testing. It does not prove that the live Notion agent runtime behaves correctly. The
runtime proof remains the live testing checklist on the Test Reports item and source page before
moving an agent from `Testing` to `Validated` or `Active`.

Keep linked Notion pages and databases as references in the canonical instructions. The Worker
preserves Notion mention hrefs as Markdown links for the external eval packet and prefers the
canonical page content before historical `Agent Eval Update` sections. Historical eval sections are
append-only evidence, not the primary source of truth for the next review.

The Dify app should not be given responsibility for source-page mutation in this workflow. Its
strongest role is reasoning over the submitted instructions, returning the final instruction text,
the review details, and a structured patch proposal. The Worker then validates that proposal with
deterministic checks and applies the versioned Notion/Linear handoff only when the patch allows the
`Updating` to `Testing` transition and the Worker rubric passes.

The Live Testing Handoff is intentionally operator-facing. Team members should paste only the full
text after `Prompt to paste` into the actual Notion agent. They should not paste the scenario label,
expected behavior, report evidence, archived instructions, or any other eval text. The expected
behavior stays on the Test Reports item as the pass/fail rubric.

This aligns with the June 2 MJ x DM workflow discussion:

- `Status = Updating` is the external eval trigger.
- Webhook fires for any other status, including `Testing`, are treated as echoes and skipped with
  Linear evidence instead of starting another eval.
- The eval result creates a new, versioned Test Reports item instead of overwriting prior evals.
- The source agent page receives the final instructions, recommended upgrades, archived submitted
  instructions, and a Testing handoff.
- A passing instruction-readiness eval moves the source page to `Testing`, not `Validated`.
- Humans then test the actual Notion agent with the handoff prompts before any `Validated` or
  `Active` promotion.
- Failed live testing feedback should be added back to the source page and the page should move
  through `Updating` again for the next eval version.

When a Notion page URL or page ID is present, the Worker reads the page's block children through
the Notion API and appends the flattened page instructions to the Linear issue and eval archive.
The Notion connection used by `NOTION_API_KEY` must have read/write access to the target page and
read/create access to `Test Reports [OS]`. In Notion, share the source page or its parent database
and Test Reports database with that integration before expecting full automation.

If the queued automation fails after the initial Linear intake comment, the Worker writes a failure
comment back to the parent Linear issue with the webhook request ID and error. A received comment
without a later completed, incomplete, skipped, or failed comment means the run used an older Worker
version, the queue binding was unavailable and the Worker fell back to `waitUntil`, or the process
failed before this failure-evidence guard existed.

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

Create the queue before the first deploy that uses the queue binding:

```bash
pnpm --filter @create-something/halfdozen-agent-review-webhook exec wrangler queues create halfdozen-agent-review-webhook-jobs
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
DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_TIMEOUT_MS = "240000"
DIFY_HALFDOZEN_AGENT_BUILDER_EVAL_REQUIRED = "true" # fail instead of fallback when Dify errors
```

Queue binding:

```toml
[[queues.producers]]
binding = "AGENT_REVIEW_QUEUE"
queue = "halfdozen-agent-review-webhook-jobs"

[[queues.consumers]]
queue = "halfdozen-agent-review-webhook-jobs"
max_batch_size = 1
max_batch_timeout = 5
max_retries = 2
retry_delay = 60
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
for bounded JSON/lint checks. The Worker remains the Notion/Linear writer. The app response should
include `final_instructions` and may include `proposed_patch`. To keep long runs reliable, Dify
does not need to duplicate `final_instructions` inside `proposed_patch.replace_section.markdown`
and does not need to echo the submitted instructions in `archived_instructions`; the Worker
normalizes missing patch text and archives the original submitted instructions from the source
payload. Older responses without `proposed_patch` are still accepted and normalized by the Worker
for backward compatibility.
