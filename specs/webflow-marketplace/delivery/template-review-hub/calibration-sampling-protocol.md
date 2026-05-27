# Calibration Sampling Protocol

**Status:** Draft
**Date:** 2026-05-26
**Parent spec:** `ai-native-review-standardization-spec.md`

## Purpose

Review a small set of historical and current template submissions one by one, generate an AI-native expected review status from structured evidence, then compare it against the actual Airtable outcome. The goal is not to prove the agent can replace reviewers. The goal is to calibrate rule coverage, status mapping, and escalation boundaries.

## Review Unit

Use `Asset Versions` as the primary review unit.

Join the parent `Assets` record for:

- template name
- published URL
- preview URL when needed for manual context
- marketplace status
- latest parent status
- creator/category/tag context when available

Do not use the parent `Assets` row alone as the calibration unit. Parent rows can collapse multiple review rounds and may hide the version-level state that produced the actual decision.

## Initial Sample

Start with 25-50 `Asset Versions`.

Include:

- 8-10 approved `Good`
- 3-5 approved `Exceptional`
- 8-10 rejected `Low quality`
- 5-10 `Changes Requested` or `Response to Review`
- 2-5 duplicate, same-design, app issue, or guideline-infringement examples if available

Include multiple reviewers, but treat reviewer identity as context only.

## Widened Reviewer-Balanced Sample

The first eight-case multimodal set was useful as a safety canary, but it was reviewer-concentrated. Widen the next calibration slice before tuning subjective prompts:

- target 50-100 `Asset Versions` before promoting any quality-band language
- keep approved Good, approved Exceptional, rejected Low quality, iterative-review, and policy/duplicate controls represented
- cap any single reviewer at roughly 35-40% of the slice unless intentionally measuring that reviewer
- track reviewer concentration per status band, not only globally
- add counter-samples when one reviewer dominates a status band before changing prompts
- keep reviewer identity in private outcomes and sampling summaries only

Reviewer balancing is for removing calibration skew. It must not become reviewer-specific policy. The agent should learn canonical buckets and approved precedents, not "Mariana-style" or "Natalia-style" review behavior.

## Blind Recommendation Rule

The agent should not read final review status, quality rating, rejection reason, or reviewer feedback until after it has produced its expected status.

Historical calibration has one important caveat: the published URL is a current public artifact, not a guaranteed snapshot of the site at the exact review decision time. A mismatch may indicate an agent error, a reviewer override, a fixed/resubmitted site, or a non-snapshotted historical state. Use `data_ambiguous` when that distinction cannot be resolved.

Allowed before recommendation:

- asset/version identifiers
- template name
- published URL
- template type/category/tag metadata
- current public site evidence
- agent-controlled validator output
- supplemental Validator app output only when already available and marked non-gating
- browser runtime measurements
- rule catalog
- rubric map

Hidden until comparison:

- actual review status
- quality rating
- improvement areas
- review feedback
- rejection reason
- reviewer identity

## Expected Status Labels

Use these Phase 1 expected statuses:

- `hard_blocker_candidate`
- `changes_requested_average`
- `clean_good_candidate`
- `manual_quality_review_required`

Later, after calibration, these can map to reviewer-facing language:

| Phase 1 label | Possible reviewer-facing mapping |
| --- | --- |
| `hard_blocker_candidate` | likely rejected or major revision |
| `changes_requested_average` | average / satisfactory / changes requested |
| `clean_good_candidate` | good candidate |
| `manual_quality_review_required` | needs human review, possible exceptional if supported |

## Comparison Labels

After revealing Airtable outcome, classify each run:

- `aligned`: expected status matches actual outcome reasonably.
- `acceptable_caution`: agent was stricter than final outcome, but had valid evidence.
- `missed_blocker`: agent failed to flag a real blocker.
- `false_blocker`: agent flagged a blocker that reviewer evidence does not support.
- `manual_gap`: mismatch depends on manual quality, licensing, originality, or reviewer judgment not covered by Phase 1.
- `data_ambiguous`: Airtable state or feedback history is not clean enough for ground truth.

Also record an audit cause:

- `likely_resolved_or_snapshot_gap`: current public site does not prove reviewed-state issue.
- `manual_quality_gap`: actual decision depends on UX, visual quality, originality, or taste not covered by Phase 1.
- `data_surface_gap`: actual decision depends on app, access, packaging, or another surface Phase 1 did not inspect.
- `policy_exception_or_reviewer_override`: deterministic evidence conflicts with an approved outcome.
- `possible_tool_bug`: raw evidence does not support the tool finding.
- `needs_manual_inspection`: not enough evidence to classify.

## What To Record

For each sampled version, record:

```json
{
  "asset_id": "rec...",
  "version_id": "rec...",
  "published_url": "https://example.webflow.io",
  "agent_expected_status": "changes_requested_average",
  "agent_confidence": "medium",
  "open_hard_blockers": [],
  "open_objective_findings": ["wf.template.accessibility.single_h1"],
  "quality_proxy_signals": ["wf.template.css.fixed_height_density"],
  "manual_checks_remaining": ["visual_quality", "asset_licensing", "similarity_flooding"],
  "actual_review_status": "✅Approved",
  "actual_quality_rating": "✅Good",
  "comparison_label": "acceptable_caution",
  "calibration_notes": "Approved after prior requested changes; feedback text contains resolved issues."
}
```

## Alignment Rules

Treat these as aligned:

- `clean_good_candidate` with approved `Good`
- `manual_quality_review_required` with approved `Exceptional`
- `hard_blocker_candidate` with rejected `Low quality`, invalid submission, app issue, or guideline infringement
- `changes_requested_average` with changes requested, response to review, or satisfactory multi-cycle cases

Treat these as likely calibration failures:

- `clean_good_candidate` against rejected hard blocker
- `hard_blocker_candidate` against approved outcome with no reviewer-confirmed blocker
- `manual_quality_review_required` for every uncertain case without narrowing evidence

## Reviewer Feedback Use

After the comparison, use review feedback to explain the difference:

- convert feedback into canonical finding buckets
- mark whether the feedback describes open issues, resolved issues, or historical context
- record whether the agent missed the bucket or lacked evidence access

Do not use freeform feedback as current-state ground truth without resolution context.

## Metrics

Track:

- hard-blocker false-positive rate
- hard-blocker miss rate
- objective finding precision
- manual-gap rate
- data-ambiguous rate
- clean-good candidate precision
- reviewer override frequency
- reviewer concentration by status band
- reviewer-correlated visual-signal and outdated-style phrase rates
- average findings per run

Phase 1 should prioritize low false blockers over aggressive rejection prediction.

## Stop Conditions

Pause before reviewer-facing rollout if:

- hard-blocker false positives appear in approved examples
- the agent misses repeated known rejection patterns
- more than one third of comparisons are `data_ambiguous`
- screenshots or subjective visual notes become the primary reason for most recommendations
- reviewer feedback cannot be separated into open versus resolved findings

The 2026-05-26 expanded sample hit this stop condition: three approved Good examples were classified as hard-blocker candidates from current published-site IX2 evidence. Treat that as a policy/snapshot/calibration issue to resolve before exposing hard-blocker language to reviewers.

The IX2-gated and feedback-normalized rerun cleared hard-blocker false positives and hard-blocker misses in the 25-record sample. It still left too many acceptable-caution, data-surface, and manual-quality cases for reviewer-facing ratings.

## Recommended First Pass

Run the first pass as an offline calibration table:

1. Select 25 `Asset Versions`.
2. Hide outcome fields from the agent.
3. Run Phase 1 deterministic review.
4. Store evidence and expected status in D1 or a temporary local JSONL.
5. Reveal Airtable outcomes.
6. Label comparison results.
7. Update the rule catalog only where evidence supports a deterministic or partial rule.

## Operator Script

Use the local calibration script to build the blind manifest and private outcome file:

```bash
AIRTABLE_API_KEY=... pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1 -- --limit 25
```

For the widened slice, use reviewer-balanced sampling so one reviewer's historical taste does not drive prompt tuning:

```bash
AIRTABLE_API_KEY=... pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1 -- \
  --limit 75 \
  --balance-reviewers \
  --max-reviewer-share 0.4 \
  --min-reviewers 3 \
  --out /tmp/webflow-template-review-calibration-balanced-75
```

Default output:

```text
/tmp/webflow-template-review-calibration/
  manifest.blind.jsonl
  outcomes.private.jsonl
  summary.json
```

Optional read-only validation run:

```bash
AIRTABLE_API_KEY=... pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1 -- --limit 25 --run-validation --max-pages 8
```

This also writes:

```text
phase1-runs.jsonl
```

The script performs no Airtable writes and does not expose outcomes in the blind manifest.

After `phase1-runs.jsonl` exists, compare expected statuses to private outcomes:

```bash
pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1:compare -- --input /tmp/webflow-template-review-calibration
```

This writes:

```text
comparison.jsonl
comparison-summary.json
```

Use the summary to decide whether to update the rule catalog, expand the sample, or pause because Phase 1 evidence is too noisy.

After a calibration or visual-quality run, audit reviewer concentration and reviewer-correlated phrasing:

```bash
pnpm --filter @create-something/webflow-template-review-mcp calibration:reviewer-bias -- \
  --outcomes /tmp/webflow-template-review-calibration-balanced-75/outcomes.private.jsonl \
  --visual-feedback /tmp/webflow-template-review-visual-quality-calibration/visual-quality-feedback.normalized.jsonl \
  --model-results /tmp/webflow-template-review-exceptional-candidate-lane/exceptional-candidate-results.jsonl \
  --out /tmp/webflow-template-review-reviewer-calibration
```

Use this report to rebalance samples and normalize language. Do not feed reviewer labels into the active judging prompt.

## 2026-05-27 Balanced Selector Smoke

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1 -- \
  --limit 20 \
  --balance-reviewers \
  --max-reviewer-share 0.4 \
  --min-reviewers 3 \
  --out /tmp/webflow-template-review-calibration-balanced-20-2026-05-27
```

Result:

```json
{
  "selected_count": 20,
  "strata_counts": {
    "approved_good": 4,
    "approved_exceptional": 4,
    "rejected_low_quality": 4,
    "iterative_review": 4,
    "policy_or_duplicate": 4
  },
  "reviewer_counts": {
    "Mariana Segura": 8,
    "(missing reviewer)": 1,
    "Natalia Ledford": 6,
    "Shea Sisco": 3,
    "Pablo Miranda": 2
  },
  "selection_warnings": []
}
```

This is a materially better calibration slice than the eight-case canary because it covers all target outcome strata while capping the largest reviewer share at 40%. It is still a smoke-sized sample, not a promotion set.

Reviewer-bias audit:

```bash
pnpm --filter @create-something/webflow-template-review-mcp calibration:reviewer-bias -- \
  --outcomes /tmp/webflow-template-review-calibration-balanced-20-2026-05-27/outcomes.private.jsonl \
  --visual-feedback /tmp/webflow-template-review-visual-quality-precedents-2026-05-27/visual-quality-feedback.normalized.jsonl \
  --model-results /tmp/webflow-template-review-exceptional-candidate-lane-openai-8case-precedents-v1-2026-05-27/exceptional-candidate-results.jsonl \
  --out /tmp/webflow-template-review-reviewer-calibration-balanced-20-2026-05-27
```

Result:

```json
{
  "outcome_count": 20,
  "visual_feedback_count": 170,
  "model_result_count": 8,
  "unmatched_model_result_count": 8,
  "global_visual_signal_rate": 0.5412,
  "global_exact_outdated_rate": 0.0471,
  "reviewer_count": 7,
  "policy": {
    "use_reviewer_identity_as": "calibration_metadata_only",
    "must_not_create": "reviewer_specific_policy",
    "correction_strategy": "rebalance_samples_normalize_language_and_require_cross_reviewer_validation"
  }
}
```

The unmatched model rows are expected because the model-results file came from the prior eight-case exceptional-lane run, not the new balanced sample. The audit now reports those rows separately instead of assigning them to a fake missing-reviewer bucket.
