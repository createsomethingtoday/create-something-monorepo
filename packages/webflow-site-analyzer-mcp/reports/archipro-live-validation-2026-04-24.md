# Archipro Live Validation

Generated: 2026-04-24
Reviewer lane: `https://wf-template-review-eric.mcp.createsomething.agency/mcp`
Preview URL: `https://preview.webflow.com/preview/archiprotemplate?utm_medium=preview_link&utm_source=designer&utm_content=archiprotemplate&preview=e5611c293ba192bf8e6d0f2f7704633f&locale=en&workflow=preview`
Published URL: `https://archiprotemplate.webflow.io/`

## Goal

Increase confidence that the Template Review MCP lane can use `webflow-site-analyzer-mcp` as a trustworthy evidence collector.

## Confidence Summary

- High confidence: published-site tools returned data that matched the fetched HTML on the live Archipro sample.
- Medium confidence: Designer preview extraction reliably surfaced a stable panel inventory, but that inventory is partial and panel-derived.
- Low confidence: Designer asset entries are not exact filenames. They are visible Assets panel labels, and some are truncated by the Webflow UI.

## What Was True In Live Checks

- `extract_seo` matched the published homepage HTML for the important fields: title was `Archipro - Webflow HTML website template`, canonical was missing, and `og:title` was missing.
- `get_provider_status` reported a healthy lane with `steel` active and `browserless` healthy as fallback.
- `extract_designer_metadata` returned `totalAssets=22` and `totalPages=5` on two separate live runs. The first five asset labels were identical across runs: `webf…o.png`, `cust…s.png`, `neth…e.png`, `marq…e.png`, `gsap…e.png`.
- `run_template_review` merged the published crawl and preview extraction successfully. On the sampled run it found `26` published URLs, while the preview metadata still exposed only `5` pages and `22` asset labels.

## Interpretation

- The repeated `22` result is credible as a Designer Assets panel count.
- The returned asset payload is not exact filename truth. It is UI-label truth.
- The preview page inventory is not exhaustive enough to be treated as canonical site inventory.
- Airtable submission assets and Designer panel assets are different truth surfaces and should stay separate in review output.

## Tool Check Matrix

All externally reachable analyzer tools on the Eric lane were exercised on 2026-04-24. Times below are coarse wall-clock measurements captured outside the tool contract.

| Tool | Result | Elapsed (s) | Notes |
|---|---|---:|---|
| `get_provider_status` | OK | 3.206 | `steel` active, `browserless` healthy |
| `extract_seo` | OK | 7.185 | Matched live HTML on title/canonical/OG findings |
| `get_page_structure` | OK | 8.335 | Returned section structure for published homepage |
| `analyze_images` | OK | 8.322 | Returned `53` images, formats `png,svg` |
| `get_performance` | OK | 7.578 | Returned timing metrics |
| `capture_screenshot` | OK | 6.908 | Returned screenshot payload |
| `analyze_touchpoints` | OK | 10.471 | Returned `67` touchpoints |
| `extract_designer_metadata` | OK | 66.746 | Stable `22` asset labels / `5` pages across two runs |
| `score_designer_checklist` | OK | 64.956 | Inherits preview extraction limits |
| `run_template_review` | OK | 70.113 | Score `56`, grade `D`, coverage `12%`, published URLs `26` |
| `enqueue_template_review` | OK | 4.406 | Returned job ID and running status |
| `get_template_review_job` | OK | 104.908 | Polled queued review to `succeeded` |
| `list_template_review_jobs` | OK | n/a | Returned job list; initial test harness misread the list shape |
| `get_webflow_review_policy` | OK | 2.853 | Reviewer lane correctly returned human-review gate text |
| `refresh_webflow_review_policy` | OK | 2.806 | Reviewer lane correctly returned human-review gate text |
| `list_script_versions` | OK | 2.8-3.3 | Each script currently exposes only `v1.0.0` |
| `get_version_metrics` | OK | 4.137 | Returned metrics for `seo-v1.0.0` |
| `run_analysis_cycle` | OK | 2.842 | Returned empty proposal set, no errors |
| `compare_versions` | Not exercisable | n/a | No script had more than one version to compare |
| `record_feedback` | Safe failure | 2.692 | Invalid version ID returned string error payload |
| `promote_version` | Safe failure | 2.726 | Missing version returned string error payload |
| `create_script_version` | Safe failure | 2.951 | Unknown script returned string error payload |

## Recommendations

- Treat published-site tools as the primary evidence path for page-level review confidence.
- Treat Designer preview extraction as supplemental evidence with explicit provenance.
- Keep Designer asset rows labeled as panel-derived asset labels, not canonical filenames.
- Keep timing outside the product contract. It is useful as operator diagnostics and report evidence, but not as core reviewer-facing output.

## Follow-up Patch

Post-validation, the crawler was updated to retain per-page same-origin link targets and to score `links.no_broken_internal` from those actual link targets instead of inferred discovered URLs. When linked targets are not crawled successfully, the row now reports `partial` instead of a false clean `pass`.

The static meta-tag review was also tightened. The published crawl now carries deterministic DOM checks for the HTML `<title>`, `meta description`, `og:title`, `og:description`, and `og:image`, and merges that evidence into the review summary so the `pages.meta_tags_static` row matches what it claims to verify.

The Steel preview extractor was also narrowed to stop injecting a hardcoded list of common page names from ambient UI text. Required-page checks now depend on parsed page rows instead of provider-specific page-name guesses.

The deterministic URL classifier was also tightened to stop treating `*-pages/*` static template routes as CMS detail pages and to recognize common instruction-page variants like `start-here`. The static SEO row now excludes clearly dynamic `cms-detail` pages instead of mixing them into the static-page result.

The Designer required-page heuristics were also expanded to recognize instruction-page variants such as `Start Here`, `Getting Started`, and `Documentation`, and the title-case heuristic now allows acronym plurals like `FAQs` and `CTAs`.

The instructions-page Designer check was also made more conservative: it now fails only on stronger signals of advanced interactions/components and otherwise falls back to `manual` when the preview evidence is suggestive but not decisive. Designer-derived confidence in unified rows was also reduced for heuristic naming/pattern checks versus direct panel-inventory checks.

Unified required-page rows for `Style Guide`, `Instructions`, and `Licenses` were also added and now blend Designer, published crawl, and precheck evidence. These rows can pass on published discovery even when preview extraction misses a page, and they only fail hard when the missing-page conclusion is better supported.

## Multi-Asset Follow-up

A follow-up live experiment was also run against three Airtable-backed reviewer-lane samples: `Grabin`, `Neura Nova`, and `Athelas`. The resulting artifact is in `required-pages-live-experiment-2026-04-24.md`.

That experiment confirmed the recommended required-pages system:

- `Style Guide` was `publishedOnly` on all 3 samples.
- `Licenses` was `publishedOnly` on all 3 samples.
- `Instructions` was `publishedOnly` on 2 samples and absent on 1 sample, while all 3 had policy triggers (`GSAP` and custom code).
- The live preview extractor missed every required page across the sample, so required-page truth should come from published precheck/crawl first, with Designer page names treated only as fallback evidence.

The same experiment also reconfirmed the live queue drift issue: sampled `websiteUrl`, `previewSiteUrl`, and marketplace status matched Airtable directly, while `latestReviewStatus` did not. That is separate from the analyzer truth surface and should remain a `webflow-template-review-mcp` queue fix.
