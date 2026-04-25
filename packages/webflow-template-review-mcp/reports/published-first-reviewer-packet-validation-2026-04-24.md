# Published-First Reviewer Packet Validation — 2026-04-24

Scope: validate the new `webflow-template-review-mcp` reviewer-facing analyzer tools against the live worker, confirm the Airtable submission packet is surfaced truthfully, and confirm the published-first analyzer path works end to end without relying on preview-native review.

## Changes validated

- Added analyzer client + tracked-review registry in [src/analyzer.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/src/analyzer.ts).
- Added missing MCP tools in [src/tools.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/src/tools.ts):
  - `template_review_enqueue_analyzer_review`
  - `template_review_get_analyzer_review`
  - `template_review_list_analyzer_reviews`
  - `template_review_get_reviewer_packet`
- Added analyzer health to `template_review_health`.
- Wired analyzer config into [src/index.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/src/index.ts), [worker/index.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/worker/index.ts), and [worker/wrangler.toml](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/worker/wrangler.toml).
- Updated workflow/docs/tests in [src/prompts.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/src/prompts.ts), [README.md](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/README.md), and [tests/tools.test.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/tests/tools.test.ts).

## Package verification

Commands run:

```bash
pnpm --dir packages/webflow-template-review-mcp typecheck
pnpm --dir packages/webflow-template-review-mcp test
pnpm --filter @create-something/mcp-core build
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a pnpm --dir packages/webflow-template-review-mcp/worker run deploy
git diff --check
```

Results:

- `typecheck`: passed
- `test`: passed (`25` tests, `0` failed)
- `git diff --check`: passed
- live worker deploy succeeded with version `3e9d151d-ba74-4900-bf1a-4ddd2d6b1ddf`

Note: the package `test` script itself was corrected from `tests/**/*.test.ts` to `tests/*.test.ts` so it now actually executes under Node’s test runner.

## Live worker health

Direct worker:

- URL: `https://webflow-template-review-mcp.createsomething.workers.dev/mcp`
- `template_review_health` returned:
  - `analyzer.configured=true`
  - `analyzer.reachable=true`
  - `analyzer.browserAutomationSupported=true`
  - analyzer URL `https://webflow-site-analyzer-mcp-remote.createsomething.workers.dev/mcp`

This confirms the worker is not only configured but can reach the deployed published analyzer.

## Live Athelas run

Resolved live version:

- asset: `Athelas`
- asset id: `recVREafD2AIDU1dX`
- version id: `recZ1HrxD9t1ocfFy`
- published URL: `https://athelas-template.webflow.io/`

### Reviewer packet

`template_review_get_reviewer_packet` returned:

- `submission.source=submission-truth`
- `websiteUrl=https://athelas-template.webflow.io/`
- `previewSiteUrl` populated
- `marketplaceStatus=1️⃣Upcoming🆕`
- `latestReviewStatus=🆕Ready for Review`
- `primaryThumbnailPresent=true`
- `secondaryThumbnailCount=1`
- `carouselImageCount=5`
- `missingFields=[]`

This is the exact behavior we wanted: Airtable submission truth is surfaced explicitly, separated from automation.

### Analyzer enqueue/get/list

`template_review_enqueue_analyzer_review` returned:

- job id `template-review-1777082069865-btcy3v`
- `reviewMode=published-only`
- analyzer URL `https://webflow-site-analyzer-mcp-remote.createsomething.workers.dev/mcp`

`template_review_get_analyzer_review` later returned:

- `status=succeeded`
- `durationMs=37786`
- `overallScore=67`
- `grade=C`
- `coveragePercent=4`
- `passedChecks=23`
- `failedChecks=9`
- `partialChecks=12`
- `manualChecks=6`

Top returned failures included:

- `coverage.all_pages_crawled`
- `policy.powered_by_webflow`
- `pages.license_text_exact`
- `a11y.link_accessible_names`
- `pages.instructions_exists`

`template_review_list_analyzer_reviews` returned the same tracked job for the version, confirming the in-runtime registry path works.

## Runtime bug found and fixed

The first live deploy exposed a real Cloudflare Worker bug:

- `template_review_enqueue_analyzer_review` failed with `Illegal invocation`

Cause:

- the analyzer client stored global `fetch` as an unbound function

Fix:

- wrap `fetch` in an arrow function in [src/analyzer.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/src/analyzer.ts)

The second deploy with that fix is the version validated above.

## Reviewer hub visibility

Reviewer hub check on `wf-template-review-micah` showed:

- the new analyzer tools are visible through the compact hub posture:
  - `template_review_enqueue_analyzer_review`
  - `template_review_get_analyzer_review`
  - `template_review_list_analyzer_reviews`
- `template_review_get_reviewer_packet` is **not yet visible** in the current compact hub posture

This is not a worker bug. It is a reviewer-hub discovery/exposure issue. The direct worker surface validates the tool successfully, but the hub policy/discovery cap still needs a follow-up change if reviewers should use the packet through the curated lane.

## Conclusion

Confidence increased materially:

- **High**: the new published-first analyzer tools work live on the deployed worker.
- **High**: the reviewer packet surfaces Airtable submission truth accurately for a live Athelas version.
- **High**: analyzer health is now exposed at the template-review layer and reports the real downstream state.
- **Medium**: the tracked review list is runtime-local memory, useful for reviewer flow but not yet a durable system of record.
- **Medium**: the reviewer packet is validated on the direct worker but still needs hub exposure work for the compact reviewer lane.
