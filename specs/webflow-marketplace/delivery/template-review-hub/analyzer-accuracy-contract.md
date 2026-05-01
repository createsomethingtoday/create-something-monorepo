# Analyzer Accuracy Contract

**Status:** Working draft
**Audience:** Webflow Marketplace reviewers and Hub operators
**Workflow:** Template review Hub lane, Phase B analyzer posture

## Purpose

This contract defines how reviewers should read analyzer output in the Phase B reviewer Hub lane.

The analyzer is a deterministic evidence-gathering surface. It is not a browser-backed reviewer, does not replace human review, and must not be described as fully automated or 100% accurate.

## Runtime Posture

Phase B analyzer output comes from the narrow reviewer Hub surface:

- `webflow-template-review-mcp` for queue, asset, version, and review context
- `webflow-site-analyzer-mcp` for selected preview and published-site analysis tools

The Phase B lane keeps the reviewer Hub compact and review-focused. It should expose selected analysis tools only, not the full raw server catalog.

Analyzer checks must follow a no-browser deterministic contract. If a finding would require a live browser session, browser automation, Steel-backed browsing, logged-in Designer inspection, or manual Webflow UI inspection, the analyzer must mark that gap as `manual`, `partial`, or unavailable evidence instead of implying complete coverage.

## Finding Statuses

Analyzer findings use four reviewer-facing statuses.

| Status    | Meaning                                                                                                                    | Reviewer handling                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pass`    | The analyzer found direct evidence that an exact check is satisfied.                                                       | Can be used as evidence when the check is deterministic and the source is available.                                                         |
| `fail`    | The analyzer found direct evidence that an exact check is not satisfied.                                                   | Can be used as evidence when the check is deterministic and the source is available; important failures should still be reviewed in context. |
| `partial` | The analyzer found a useful signal, but the available inputs do not prove the whole checklist item.                        | Requires reviewer verification before it becomes a decision basis.                                                                           |
| `manual`  | The analyzer cannot evaluate the item with the available deterministic inputs, or the item is reviewer judgment by policy. | Reviewer-owned; use any attached context only as support.                                                                                    |

The analyzer should not collapse `partial` or `manual` into `pass` or `fail` to make a result look more complete.

## Confidence

`confidence` describes how much the reviewer can rely on the analyzer's evidence for the specific check.

Recommended values:

- `high`: direct, repeatable evidence from an available deterministic source
- `medium`: useful evidence exists, but coverage is incomplete or depends on a heuristic
- `low`: evidence is weak, missing, conflicting, or dependent on unsupported inputs

Confidence is not a percentage and is not an accuracy guarantee. A high-confidence finding can still be overridden when the reviewer sees better context.

## Source

`source` identifies where the analyzer evidence came from. Reviewer-facing output should name the source plainly enough that a reviewer can decide whether to trust it.

Examples:

- `airtable_context`: queue, asset, version, reviewer, or field-map data
- `http_response`: status, redirect, header, or fetch result
- `sitemap`: discovered page URL or crawl list
- `html`: static page markup, headings, forms, links, metadata, or media references
- `published_site`: fetchable published-site evidence
- `preview_site`: fetchable preview-site evidence
- `webflow_metadata`: available non-browser Webflow metadata exposed through current tooling
- `unavailable`: required input is not available to the deterministic analyzer

If the source is `unavailable`, the status should usually be `manual` or `partial`, and confidence should usually be `low`.

## Unsupported Or Unavailable Inputs

The Phase B analyzer must explicitly call out unsupported or unavailable inputs instead of implying coverage.

Current unsupported or unavailable inputs include:

- variables panel data
- class usage graph
- element-level combo stack depth
- collection slugs
- ecommerce setup
- browser-backed analysis hidden by the no-Steel posture

These gaps should be surfaced as `manual`, `partial`, `low` confidence, or `source: unavailable` depending on the checklist item.

## Reviewer Rule

Deterministic exact checks can be trusted as evidence when they include a concrete source and appropriate confidence.

Manual, partial, unavailable-source, or low-confidence checks require human verification before they drive feedback, rejection, approval, or escalation.

## Output Expectations

Each analyzer finding should include:

- checklist item or review area
- `status`
- `confidence`
- `source`
- concise evidence summary
- unsupported input note when the check depends on unavailable data
- reviewer next step when the status is `partial` or `manual`

Analyzer language should stay conservative:

- say "evidence suggests" for partial or heuristic checks
- say "not available to the deterministic analyzer" for hidden or unsupported inputs
- avoid "verified" unless the check is exact and source-backed
- avoid any claim that the analyzer completed the full reviewer rubric automatically
