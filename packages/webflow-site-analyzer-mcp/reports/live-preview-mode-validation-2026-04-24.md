# Live Preview-Mode Validation — 2026-04-24

Scope: validate that the deployed `webflow-site-analyzer-mcp` can complete template review without letting unstable Webflow Designer preview extraction block the whole review.

Target:
- Published URL: `https://grabin.webflow.io/`
- Preview URL: Grabin Webflow preview link from Airtable-backed review flow
- Analyzer endpoint: `https://analyzer.mcp.createsomething.agency/mcp`
- Deployment version: `a6ab83bb-1441-43e9-85d0-f9be3946d70f`

## Results

| Check | Input | Outcome | Evidence |
| --- | --- | --- | --- |
| `run_template_review` | `designerMode=skip`, `crawlMaxPages=3`, `crawlMaxDepth=1`, `timeout=30000` | Passed | Returned `designer.source=fallback-manual`, no `previewUrl`, `rows=32`, `published.probes.fetch.surface=fetch-precheck`, `published.probes.browser.surfaces=["browser-dom"]`, `visitedPages=3` |
| `run_template_review` | `designerMode=best-effort`, `designerTimeout=15000`, `crawlMaxPages=3`, `crawlMaxDepth=1`, `timeout=30000` | Passed | Returned `designer.source=fallback-manual` with note `Designer checklist extraction timed out after 15000ms`, `rows=32`, `visitedPages=3` |
| `run_template_review` | `designerMode=required`, `designerTimeout=15000`, `crawlMaxPages=3`, `crawlMaxDepth=1`, `timeout=30000` | Failed as designed | Returned tool error payload: `Designer checklist extraction timed out after 15000ms` |
| `extract_designer_metadata` | `timeout=15000` | Unstable | No response within client `--max-time 35`; curl exited with timeout and received `0 bytes` |
| `enqueue_template_review` + `get_template_review_job` | `designerMode=best-effort`, `designerTimeout=15000`, `crawlMaxPages=3`, `crawlMaxDepth=1`, `timeout=30000` | Passed | Job `template-review-1777068644337-z30bq8` moved past Designer into published crawl and completed successfully with `designer.source=fallback-manual`, `rows=32`, `visitedPages=3` |

## Timing

Reviewer-facing timing should stay out of the normal contract, but operator timing is useful for judging value and failure modes.

- Sync `designerMode=skip`: completed in a short single-digit/low-double-digit window during CLI smoke.
- Sync `designerMode=best-effort`: bounded by the 15s Designer timeout plus published crawl work; observed as materially slower than `skip` but still deterministic.
- Sync `designerMode=required`: returned the timeout error quickly once the 15s bound elapsed.
- Direct `extract_designer_metadata`: still exceeded a 35s client bound despite `timeout=15000`, which confirms the preview extractor is the unstable surface.
- Async queued best-effort review:
  - `queuedAt`: `2026-04-24T22:10:44.338Z`
  - `completedAt`: `2026-04-24T22:11:17.981Z`
  - End-to-end duration: about `33.6s`

## Conclusion

Best system for deterministic review confidence:

1. Treat published review as the primary automated surface.
2. Treat Designer preview extraction as optional enrichment.
3. Use `designerMode=best-effort` for production review orchestration so unstable preview lanes degrade to explicit manual coverage instead of hanging jobs.
4. Keep `designerMode=required` for debugging or when a reviewer explicitly wants strict preview validation.

What this does **not** prove:

- Published URL alone can fully replace Designer truth.
- The analyzer no longer uses a browser provider. The live runs still reported `provider=steel`; this change removes preview extraction from the critical path, not all browser automation from the system.

What published-only review can cover well:

- SEO/meta signals
- accessibility/link hygiene
- utility-page presence
- published CMS output
- image usage/output
- script/custom-code detection

What still cannot be trusted from published HTML alone:

- true Designer component inventory
- unused component/class cleanup
- breakpoint mode configuration in Designer
- variable setup
- Assets-panel inventory
