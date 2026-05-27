# Execution Isolation And Sandbox Policy

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `review-orchestration-model.md`, `review-lane-contracts.md`, `subjective-judge-panel-eval-harness.md`, `visual-quality-proxy-extraction-plan.md`, `published-site-sandbox-lane.md`, `template-review-secret-contract.md`

## Decision

Use a sandbox for lanes that execute, render, crawl, or inspect untrusted published template pages. Do not use a sandbox for every lane by default.

The subjective judge panel does not need E2B for normal operation. It reads already-normalized artifacts and calls model providers. Its safety boundary is prompt/data isolation, not OS/browser isolation.

The published-site and visual-proxy lanes should use E2B or an equivalent isolated browser runtime once they move beyond lightweight HTML fetching, because they may load arbitrary creator-controlled JavaScript, third-party assets, tracking scripts, redirects, and heavy media.

Secrets are owned by the coordinator layer. `template-review-secret-contract.md` defines the Infisical-backed secret names and the rule that E2B/Dify/API keys must not be copied into the generated browser runner or normalized evidence artifacts.

## Sandbox Required

Require a sandbox for:

- browser rendering of arbitrary submitted template URLs
- executing page JavaScript
- network capture and request inspection
- screenshot generation at multiple viewports
- Lighthouse or axe runs that load the live page
- DOM/runtime extraction after scripts execute
- interaction replay, hover/click checks, or responsive state exploration
- any future bundle/code execution from submitted package files

## Sandbox Optional

Use a sandbox when available, but allow local/operator execution for:

- static HTML fetches with scripts disabled
- CSS parsing from downloaded stylesheets
- small offline fixture tests
- prompt generation
- JSONL scoring
- D1 SQL validation
- Airtable read-only calibration sampling

## Sandbox Not Needed

Do not add sandbox overhead for:

- subjective judge panel calls that only read normalized artifacts
- recommendation composition from lane outputs
- feedback draft generation from confirmed findings
- calibration comparison against private answer files
- policy/schema validation

## E2B Runtime Contract

When E2B is used, the lane should receive:

- run ID
- source URL
- allowed host policy
- timeout
- viewport list
- max page count
- max network requests
- artifact destination
- policy snapshot ID

The lane should emit:

- normalized findings
- sandbox metadata
- captured artifact URLs
- network summary
- errors and timeout state
- reproducibility hints

The lane must not emit:

- final approval or rejection
- creator-facing feedback
- raw secrets
- unbounded network logs
- active policy updates

## Minimum Controls

Sandboxed review runs should enforce:

- no access to Airtable PAT, OpenAI key, reviewer credentials, or D1 write tokens inside the browser sandbox
- explicit timeout per page
- max pages per run
- max bytes per artifact
- max network request count
- blocked local network access
- blocked file-system access except the artifact working directory
- screenshot and crawl artifact redaction when needed
- deterministic viewport set
- user agent recorded in artifact metadata

## Lane Mapping

| Lane | Sandbox posture | Reason |
| --- | --- | --- |
| `published_site_validation` | required for rendered/runtime checks | Loads arbitrary submitted pages and page JavaScript. |
| `visual_quality` | required for screenshots and rendered layout; optional for static CSS-only proxy extraction | Visual evidence depends on rendered page state. |
| `designer_webflow_way` | optional | Mostly Designer metadata and structural inspection. |
| `similarity_flooding` | optional to required | Required when generating new screenshots or runtime fingerprints; optional for pure vector/hash reranking. |
| `app_guideline` | required if executing package code; optional for metadata-only review | Submitted code/package inspection may be untrusted. |
| `subjective_judgment_panel` | not needed | Reads artifacts and calls model APIs only. |
| `calibration_eval` | not needed | Reads local/private answer artifacts and metrics. |

## Operational Recommendation

Start with local artifact-only harnesses for calibration. Introduce E2B at the boundary where the system needs deterministic browser rendering of untrusted published URLs.

The first E2B-backed lane should be `published_site_validation` or `visual_quality` screenshot extraction, not the judge panel.

The first package-level implementation is the evidence-only sandbox bundle prepared by:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- --url <published-url>
```
