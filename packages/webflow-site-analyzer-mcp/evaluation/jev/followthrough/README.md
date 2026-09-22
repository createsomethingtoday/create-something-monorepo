# Documentation follow-through — CRE-2062

This study follows CRE-2060 and the current [TypeSafe building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [confidence guidance](https://docs.typesafe.ai/confidence), and [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13). Source baseline: `c7ed7a27fe68f488839b13abfca64716edfb3682`.

## Shipped candidate

Generic terms, legal, privacy and cookie paths should not claim template-license discovery. Explicit license paths remain critical. Narrow the deterministic rule and the Jev criteria together, using an explicit backticked state path. Page-content/license compliance remains separately checked. The 0.75 threshold, model pin, request bounds, URL preservation and no-retry fallback stay unchanged.

Sanitized receipts now distinguish timeout, network, rate-limit, overload, other HTTP failure, model mismatch and malformed answers. Valid answers separately count `abstained` and `lowConfidence`. These receipts contain no paths, provider response bodies or credentials. Full distributions below are restricted to these public/synthetic evaluation inputs, not routine production logging.

## Frozen comparison

`protocol.json` SHA256: `f9dca19500a3108bb7aed440753dd824c7f0c5e61561311ff746133420ff836b`.

12 development cases and 29 held-out cases were frozen before API calls. The held-out set includes eight observed Woven Wear hrefs, two live Agency legal-page paths, and 19 synthetic boundaries. Expected labels are operator-authored path-role expectations, not independent reviewer labels. No prompt or threshold was tuned after reading held-out results. Two repetitions in counterbalanced arm order; repeated cases are not independent samples.

| Set | Old implementation | Revised implementation |
| --- | --- | --- |
| Development, 12 cases twice | 14/24 | 24/24 |
| Held-out, 29 cases twice | 36/58 | 58/58 |
| Original frozen regression, 38 cases twice | 76/76 | 74/76 |
| Regression with user-approved terms correction | 74/76 | 76/76 |

The original regression failure is retained in `original-regression-results.json`. It expected `/condiciones-de-uso` to mean a license page. A legacy unit test likewise expected `/legal/terms` to be a critical license page. The user explicitly approved the narrower meaning on 2026-09-22. `approved-expectations.json` records that correction; the original protocol/results were not rewritten. The unit test now requires `utility:other` and low crawl priority.

At unchanged confidence 0.75 on the held-out run, Jev accepted 26/30 model-question observations, all matching the frozen expectations; two abstained and two low-confidence answers retained deterministic labels. There were no service fallbacks. At threshold zero, two additional model answers were wrong, supporting keeping uncertainty handling. The sweep is a diagnostic, not a fitted or generally calibrated threshold. Exact-rule cases are outside the model-acceptance denominator.

Held-out request-group p95 was 224ms revised versus 468ms baseline (six groups per arm; effectively a sample maximum). These small latency samples mix deterministic and inference work. They do not establish production p95, cost savings, or end-to-end crawl acceleration. The revised approved-regression median was 283ms versus 281ms baseline; the value of this change is clearer semantics and observability.

## Three further patterns: tested dispositions

`candidates.json` SHA256: `1ce155bdb1ff4d0591b6259d2feca82454915282182e04f8c0aa7b0c1dacbc7a`.

Public source snapshots and fetch hashes are in `sources.json`. Five available Webflow app pages supplied names and descriptions; Finsweet Table returned 404 and was excluded before the protocol was frozen. The labels select a specific described purpose over the technology used to implement it.

| Pattern | Observed result | Decision |
| --- | --- | --- |
| App categorization | Jev names/slugs 3/5; with actual descriptions 5/5 | Promising, not activated. Current consumer contract has no description and taxonomy examples overlap. Require a larger review-labeled corpus and description ingestion. |
| Source-value selection | Jev 4/4; deterministic lookup 4/4 | Do not add Jev to these license/privacy link selections: zero incremental correct answers and about 214ms extra mean latency. Reconsider only for genuinely ambiguous roles. |
| Field verification | 10/10: five verbatim source positives and five planted unsupported claims | Useful feasibility result, not rollout proof. No new runtime verifier activated. Need real extraction errors, subtle omissions/contradictions and independently labeled false-accept/escalation rates. |

The live app-audit incumbent returned HTTP200 on all five calls, but each body reported a deprecated Workers AI model and category `other` at confidence0.1. This is **service fallback**, not five working Llama predictions. Do not compare Jev speed/quality against it as successful inference. Source is `packages/webflow-apps-admin/workers/audit-agent/src/categorizer.ts`; raw sanitized public-input responses are retained. Restoring that workflow is a separate tracked operational follow-up.

No corpus here justifies automatic creator-review status changes, evidence approval, or replacing Astra. The [extraction cascade](https://docs.typesafe.ai/cookbooks/sde_cascade) and [skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion) remain patterns to evaluate rather than vendor benchmarks to inherit.

## Reproduction and gates

From the analyzer package with server-side `TYPESAFE_API_KEY` already set:

```sh
pnpm exec tsx evaluation/jev/followthrough/run.ts development
pnpm exec tsx evaluation/jev/followthrough/run.ts heldout
pnpm exec tsx evaluation/jev/followthrough/run.ts regression
pnpm exec tsx evaluation/jev/followthrough/candidates.ts
pnpm test
```

Live commands incur existing API usage. `run.ts` reconstructs the exact baseline with `git show`, evaluates both implementations, retains raw distributions/usage, and fails if revised results violate preservation, service-success, false-license, quality-nonregression or approved-regression gates. It does not adjust prompts. Candidate runs are research only and do not activate anything. Public source fetch hashes identify the reviewed snapshots; they are not current-health assertions.

Production promotion uses the same off/canary/active controls described in [the original runbook](../README.md). Record actual merge/deployment versions, authenticated held-out and corrected-regression readback, complete real crawl/precheck, and rollback in CRE-2062. Endpoint health and these source tests alone do not prove the full workflow.

## Production verifier repair

The unchanged production baseline could not complete `run_template_review`: it returned `Passed function cannot be serialized!`. Upstream Puppeteer's serialization validates functions with `new Function`, which the Workers runtime forbids. The Worker adapter now uses the pinned Cloudflare Puppeteer fork; the Node adapter retains upstream Puppeteer. A regression test runs serialization with Node's `--disallow-code-generation-from-strings` restriction. Local tests and bundle validation establish the repair mechanism; a successful production review is still required before claiming the workflow is verified.

The separate incumbent app categorization outage is tracked in [CRE-2064](https://linear.app/createsomething/issue/CRE-2064/restore-app-audit-categorization-after-workers-ai-model-deprecation). It is not evidence that Jev is more accurate than a functioning incumbent model.

Review correction: the legacy inference path now uses the same narrow license meaning and retains deterministic exact matches. `regression-provenance-correction.json` supplies hashes for the actual regression corpus and approved overlay while preserving original receipts; retained results were replayed against those inputs and every count matched. The runner now records selected protocol, overlay and evaluated-case hashes.
