# Balanced 50-Case Multimodal Calibration

**Status:** Shadow calibration
**Date:** 2026-05-27
**Scope:** Read-only Airtable sample, direct E2B published-site evidence, desktop/mobile screenshots
**Related issue:** `CRE-452`

## Purpose

Widen the calibration set beyond the initial eight-case canary and reduce reviewer concentration before tuning subjective review behavior. This run tests whether published-site sandbox evidence can explain historical review outcomes and where specialized lanes are still required.

This artifact is private calibration evidence. It must not be used as creator-facing feedback, approval, rejection, rating, or featured/exceptional decisioning.

## Command

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- \
  --limit 50 \
  --strata approved_good,approved_exceptional,rejected_low_quality,iterative_review,policy_or_duplicate \
  --balance-reviewers \
  --max-reviewer-share 0.35 \
  --min-reviewers 4 \
  --max-pages 1 \
  --viewports desktop:1365x900,mobile:390x844 \
  --bootstrap-browser \
  --timeout-ms 240000 \
  --request-timeout-ms 240000 \
  --sandbox-timeout-ms 1200000 \
  --bootstrap-timeout-ms 600000 \
  --command-timeout-ms 1500000 \
  --out /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27
```

Packet command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp multimodal:packet -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-multimodal-packet-balanced-50-2026-05-27 \
  --max-screenshots 4
```

Reviewer-bias audit:

```bash
pnpm --filter @create-something/webflow-template-review-mcp calibration:reviewer-bias -- \
  --outcomes /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27/outcomes.private.jsonl \
  --visual-feedback /tmp/webflow-template-review-visual-quality-precedents-2026-05-27/visual-quality-feedback.normalized.jsonl \
  --out /tmp/webflow-template-review-reviewer-calibration-balanced-50-multimodal-2026-05-27
```

## Sample Shape

```json
{
  "selected_count": 50,
  "strata_counts": {
    "approved_good": 10,
    "approved_exceptional": 10,
    "rejected_low_quality": 10,
    "iterative_review": 10,
    "policy_or_duplicate": 10
  },
  "reviewer_counts": {
    "Mariana Segura": 18,
    "(missing reviewer)": 1,
    "Natalia Ledford": 14,
    "Eric Unger": 7,
    "Vicki Chen": 1,
    "Shea Sisco": 5,
    "Pablo Miranda": 4
  }
}
```

The sample is much wider than the eight-case canary and includes eight reviewer buckets. It is still not perfectly balanced: Mariana Segura is 36% of the slice against a requested 35% target because later fill passes can relax caps to satisfy the requested strata. Treat that as acceptable for this shadow run, but keep the reviewer concentration visible.

## Evidence Results

```json
{
  "evidence_status_counts": {
    "usable": 49,
    "unusable": 1
  },
  "screenshot_count": 98,
  "finding_count": 49,
  "alignment_counts": {
    "sandbox_minor_signals_on_approved_case": 13,
    "sandbox_consistent_with_approved_clean_evidence": 6,
    "sandbox_found_substantive_signal_on_approved_case": 1,
    "sandbox_did_not_explain_human_rejection": 17,
    "sandbox_inconclusive_partial_evidence": 1,
    "sandbox_did_not_explain_iterative_review": 10,
    "sandbox_found_substantive_signal_for_rejected_case": 2
  }
}
```

Finding frequency:

```json
{
  "published_site.static.images_missing_alt": 35,
  "published_site.render.console_errors": 3,
  "published_site.render.horizontal_overflow": 3,
  "published_site.static.h1_missing": 2,
  "sandbox.run.failed": 1,
  "sandbox.network.request_cap_reached": 2
}
```

## Interpretation

The sandbox lane is stable as an evidence collector:

- 49 of 50 cases produced usable evidence.
- 98 screenshots were captured and packetized.
- Objective findings were structured and repeatable enough for calibration.
- The lane did not write Airtable, D1, R2, Dify, approvals, rejections, ratings, or feedback.

The sandbox lane is not sufficient as a historical decision explainer:

- 17 rejected or policy cases were not explained by sandbox findings.
- 10 iterative-review cases were not explained by sandbox findings.
- Most low-quality and iterative outcomes appear to depend on reviewer feedback, visual quality, app/guideline context, duplicate/similarity context, or historical review state.

This is the expected architecture boundary. Published-site sandbox evidence should feed objective lanes and appeal consistency checks. It should not become the primary subjective quality judge.

## Creator-Appeal Consistency Case

A creator complaint referenced `Introx` as an approved published template with overflow issues while asking for `Automatia` to be reconsidered after a rejection for outdated/obsolete visual style.

The balanced run captured both cases:

```json
[
  {
    "template_name": "Introx",
    "selection_stratum": "approved_good",
    "expected_review_status": "approved",
    "expected_quality_rating": "good",
    "reviewer": "Natalia Ledford",
    "evidence_status": "usable",
    "finding_count": 3,
    "substantive_finding_count": 2,
    "finding_rule_ids": [
      "published_site.static.images_missing_alt",
      "published_site.render.horizontal_overflow"
    ],
    "alignment_label": "sandbox_found_substantive_signal_on_approved_case"
  },
  {
    "template_name": "Automatia",
    "selection_stratum": "rejected_low_quality",
    "expected_review_status": "rejected",
    "expected_quality_rating": "low_quality",
    "reviewer": "Natalia Ledford",
    "evidence_status": "usable",
    "finding_count": 0,
    "substantive_finding_count": 0,
    "finding_rule_ids": [],
    "alignment_label": "sandbox_did_not_explain_human_rejection"
  }
]
```

Detailed `Introx` overflow evidence:

- desktop document width `1378` vs viewport width `1365`
- mobile document width `414` vs viewport width `390`
- 8 overflowing elements on desktop
- 15 overflowing elements on mobile
- 75 missing-alt images out of 104 images

This does not prove the Automatia rejection was incorrect. It does prove the review system needs a standardized appeal/equity check:

- approved examples can contain objective issues
- rejected examples can be technically clean while failing subjective visual-quality standards
- creator-facing explanations should distinguish objective implementation issues from subjective quality bands
- similar/comparison claims should produce evidence packets rather than ad hoc debate

Appeal/equity comparison command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --cited Introx \
  --out /tmp/webflow-template-review-appeal-equity-automatia-vs-introx-2026-05-27
```

Generated artifacts:

- `/tmp/webflow-template-review-appeal-equity-automatia-vs-introx-2026-05-27/appeal-equity-comparison.json`
- `/tmp/webflow-template-review-appeal-equity-automatia-vs-introx-2026-05-27/appeal-equity-comparison.md`

The artifact emitted 3 comparison findings and 5 consistency questions:

- `Automatia` has a rejected/low-quality outcome, but the sandbox found no objective implementation issue in the captured published-site evidence.
- `Introx` is an approved cited example with substantive sandbox findings.
- The cases appear to use different decision surfaces: subjective visual-quality rejection versus objective implementation findings despite approval.
- Required human questions include subjective-quality precedent support, approved-template issue tolerance, same-reviewer consistency, snapshot currency, and creator-facing response boundaries.

The artifact keeps the same safety boundary as the lane contract: no final appeal decision, no reversal recommendation, no approval/rejection, no quality rating, and no creator-facing feedback without human review.

Batch expansion command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-batch-low-quality-vs-approved-issues-2026-05-27 \
  --limit 8
```

Batch output:

- `/tmp/webflow-template-review-appeal-equity-batch-low-quality-vs-approved-issues-2026-05-27/appeal-equity-batch-summary.json`
- `/tmp/webflow-template-review-appeal-equity-batch-low-quality-vs-approved-issues-2026-05-27/appeal-equity-batch-summary.md`
- 8 per-target comparison packets

Batch selection results:

```json
{
  "target_candidate_count": 9,
  "cited_candidate_count": 1,
  "comparison_count": 8,
  "same_reviewer_comparison_count": 4
}
```

The batch is intentionally narrow. It found only one approved comparison candidate with substantive objective findings in this 50-case slice: `Introx`. That makes the same-reviewer comparisons most useful for immediate calibration, while the cross-reviewer comparisons should be treated as weaker policy prompts until real creator-cited examples are added.

Creator-cited intake command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:intake -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27 \
  --run-comparisons
```

Intake proof output:

- `/tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27/appeal-equity-intake-summary.json`
- `/tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27/appeal-equity-intake-summary.md`
- `/tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27/appeal-equity-intake-resolved.jsonl`
- `/tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27/automatia-introx-creator-claim-comparison/appeal-equity-comparison.md`

The intake proof resolved:

- target `Automatia` -> `e2b_calibration_case_026`
- cited marketplace URL `https://webflow.com/templates/html/introx-website-template` -> `e2b_calibration_case_006`

This is now the preferred path for real creator claims. Batch mode is useful for policy discovery, but intake mode preserves the actual creator-cited comparison and marks unresolved cited examples for evidence capture.

Unresolved intake proof:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:intake -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.unresolved.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27
```

Unresolved output:

- `/tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-intake-summary.md`
- `/tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl`

The unresolved proof produced:

```json
{
  "needs_cited_evidence_count": 1,
  "evidence_capture_queue_count": 1
}
```

The queue item preserved the cited marketplace URL and instructed the follow-up reviewer or agent to map it to a published Webflow URL or Asset Version before evidence capture.

Capture-queue plan command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:capture-queue -- \
  --queue /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-capture-queue-plan-2026-05-27
```

Plan output:

- `/tmp/webflow-template-review-appeal-equity-capture-queue-plan-2026-05-27/appeal-equity-capture-plan.jsonl`
- `/tmp/webflow-template-review-appeal-equity-capture-queue-plan-2026-05-27/appeal-equity-capture-summary.md`

Plan result:

```json
{
  "processed_count": 1,
  "needs_mapping_count": 1,
  "bundle_prepared_count": 0,
  "e2b_capture_completed_count": 0
}
```

Mapped bundle-preparation command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:capture-queue -- \
  --queue /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl \
  --mappings packages/webflow-template-review-mcp/fixtures/appeal-equity-capture-mapping.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-capture-queue-mapped-prepare-2026-05-27 \
  --prepare-bundles
```

Mapped result:

```json
{
  "processed_count": 1,
  "needs_mapping_count": 0,
  "bundle_prepared_count": 1,
  "e2b_capture_completed_count": 0
}
```

The mapped proof prepared a local published-site sandbox bundle and emitted the exact E2B command to run later. It did not execute E2B by default.

External comparison re-entry command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:external-compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --external-name Introx \
  --external-url https://introx1.webflow.io/ \
  --external-normalized-dir /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27/runs/e2b_calibration_case_006/e2b/normalized \
  --external-claim creator_cited_approved_claim \
  --out /tmp/webflow-template-review-appeal-equity-external-automatia-vs-introx-capture-2026-05-27
```

External comparison output:

- `/tmp/webflow-template-review-appeal-equity-external-automatia-vs-introx-capture-2026-05-27/appeal-equity-external-comparison.json`
- `/tmp/webflow-template-review-appeal-equity-external-automatia-vs-introx-capture-2026-05-27/appeal-equity-external-comparison.md`

External result:

```json
{
  "target": "e2b_calibration_case_026",
  "external_name": "Introx",
  "external_status_verified": false,
  "comparison_finding_count": 3,
  "consistency_question_count": 5
}
```

This is the post-capture re-entry path. It can compare a resolved calibration target against captured cited evidence even when the cited template was not in the original calibration manifest. The cited template's approval or marketplace status remains an unverified claim until a human or trusted system confirms it.

Status verification command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:verify-status -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --lookup https://webflow.com/templates/html/introx-website-template \
  --out /tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27
```

Status verification output:

- `/tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27/appeal-equity-status-verification.jsonl`
- `/tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27/appeal-equity-status-verification-summary.json`
- `/tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27/appeal-equity-status-verification-summary.md`

Status result:

```json
{
  "lookup_count": 1,
  "verified_count": 1,
  "unverified_count": 0,
  "ambiguous_count": 0,
  "matched_case": "e2b_calibration_case_006",
  "verification_level": "trusted_or_historical_review"
}
```

Verified external comparison command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:external-compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --external-name Introx \
  --external-url https://introx1.webflow.io/ \
  --external-normalized-dir /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27/runs/e2b_calibration_case_006/e2b/normalized \
  --external-claim creator_cited_approved_claim \
  --status-verification /tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27/appeal-equity-status-verification-summary.json \
  --out /tmp/webflow-template-review-appeal-equity-external-automatia-vs-introx-verified-2026-05-27
```

Verified external result:

```json
{
  "target": "e2b_calibration_case_026",
  "external_name": "Introx",
  "external_status_verified": true,
  "comparison_finding_count": 3,
  "consistency_question_count": 4,
  "comparison_findings": [
    "target_rejection_not_explained_by_sandbox",
    "external_cited_has_objective_issue",
    "external_cited_status_verified"
  ]
}
```

This closes the first appeal/equity evidence loop: the system can separately prove the cited template's captured review status, prove its objective overflow evidence, and still leave the subjective Automatia visual-style rejection to human precedent review.

Casebook command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:casebook -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --run-external-comparisons
```

Casebook output:

- `/tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27/appeal-equity-casebook-summary.json`
- `/tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27/appeal-equity-casebook-summary.md`
- `/tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27/appeal-equity-casebook-cases.jsonl`
- nested intake, status-verification, and external-comparison artifacts

Casebook result:

```json
{
  "appeal_count": 1,
  "cited_count": 1,
  "target_resolved_count": 1,
  "cited_resolved_count": 1,
  "status_verified_count": 1,
  "external_comparison_count": 1,
  "ready_for_human_review_count": 1,
  "needs_evidence_capture_count": 0,
  "ambiguous_count": 0,
  "comparison_failed_count": 0
}
```

This becomes the practical widening path: add more real creator-cited appeal rows to the JSONL input, run the casebook, and only compare rows whose target, cited evidence, and cited status are resolved. Missing evidence remains queued instead of forcing speculative review.

Casebook score command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:score-casebook -- \
  --input /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-casebook-score-automatia-introx-2026-05-27
```

Passing score result:

```json
{
  "gate_status": "passed",
  "scored_count": 1,
  "ready_count": 1,
  "needs_evidence_capture_count": 0,
  "status_unverified_count": 0,
  "external_comparison_missing_count": 0,
  "required_question_missing_count": 0
}
```

Blocked fixture score result:

```json
{
  "gate_status": "blocked",
  "ready_count": 0,
  "needs_evidence_capture_count": 1,
  "status_unverified_count": 1,
  "external_comparison_missing_count": 1
}
```

The score gate gives the widening process a stable stop/go signal. It does not judge whether a rejection was fair; it only checks whether the evidence packet is complete enough for human review.

Shadow eval command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-shadow-eval-automatia-introx-2026-05-27
```

Passing eval result:

```json
{
  "gate_status": "passed",
  "appeal_count": 1,
  "cited_count": 1,
  "ready_count": 1,
  "needs_evidence_capture_count": 0,
  "status_unverified_count": 0,
  "external_comparison_missing_count": 0
}
```

Blocked eval result for the unresolved fixture:

```json
{
  "gate_status": "blocked",
  "ready_count": 0,
  "needs_evidence_capture_count": 1,
  "status_unverified_count": 1,
  "external_comparison_missing_count": 1
}
```

This wrapper is the best current command for a Dify-facing or operator-facing shadow review. It produces one machine-readable `gate_status` while keeping every underlying evidence artifact available for audit.

## Reviewer-Bias Audit

Reviewer-bias output:

```json
{
  "outcome_count": 50,
  "visual_feedback_count": 170,
  "model_result_count": 0,
  "unmatched_model_result_count": 0,
  "global_visual_signal_rate": 0.5412,
  "global_exact_outdated_rate": 0.0471,
  "reviewer_count": 8,
  "policy": {
    "use_reviewer_identity_as": "calibration_metadata_only",
    "must_not_create": "reviewer_specific_policy",
    "correction_strategy": "rebalance_samples_normalize_language_and_require_cross_reviewer_validation"
  }
}
```

Notable reviewer-correlated language:

- Mariana Segura remains high on visual-signal language relative to the global rate.
- Natalia Ledford remains high on exact outdated-style phrasing.
- Pablo Miranda, Shea Sisco, and Eric Unger are lower on visual-signal phrasing in the available visual-feedback pool.

Reviewer labels should continue to rebalance samples and audit language drift. They must not be used as policy branches.

## Exceptional Lane Follow-Up

The balanced 10-case smoke, with screenshots and precedent retrieval, remained safe but missed both approved Exceptional cases:

```json
{
  "scored_output_count": 10,
  "expected_exceptional_count": 2,
  "false_exceptional_risk_count": 0,
  "approved_good_overpromotion_count": 0,
  "missed_exceptional_candidate_count": 2,
  "missed_exceptional_candidate_rate": 1,
  "provider_failure_count": 0,
  "image_input_count": 10,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "missed_exceptional_rate 1 exceeded 0"
    ]
  }
}
```

Do not solve this by simply lowering the exceptional route floor. The missed examples indicate an evidence-design problem:

- one-homepage screenshot pairs are too thin for some exceptional judgments
- text-only precedents do not carry enough visual precedent context
- category/style-aware visual exemplars are needed
- full-route/page inventory and richer screenshots may be needed before the exceptional lane can improve recall safely

## Recommendation

Next stable improvement:

1. Expand the new appeal/equity comparison lane from the Automatia/Introx proof into a small appeal set with creator-cited approved examples.
2. Add visual precedent packets, not just text precedent snippets, for approved Exceptional, approved Good, and rejected visual-quality controls.
3. Keep the sandbox validators as objective evidence providers with `needs_visual_confirmation` for overflow and visual issues.
4. Keep reviewer identity as calibration metadata only.
5. Do not expose Dify quality-band automation until the visual-quality and exceptional lanes pass wider shadow gates.
