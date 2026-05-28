# Phase 1 Expanded Calibration Audit

**Status:** Draft
**Date:** 2026-05-26
**Sample directory:** `/tmp/webflow-template-review-calibration-2026-05-26-expanded`

## Summary

The 25-record expanded calibration run confirms the offline workflow works, but Phase 1 is not ready for reviewer-facing rating language.

The run used balanced Asset Version strata:

- approved Good: 5
- approved Exceptional: 5
- rejected Low quality: 5
- iterative review: 5
- policy, duplicate, guideline, or app issue: 5

The blind manifest passed the leakage check: 25 rows, 0 hidden outcome fields exposed before recommendation.

## Commands

The first attempt using the clipboard value failed with Airtable `401 AUTHENTICATION_REQUIRED`. The successful run used Infisical-backed `AIRTABLE_API_KEY`:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1 -- \
  --limit 25 \
  --run-validation \
  --max-pages 8 \
  --out /tmp/webflow-template-review-calibration-2026-05-26-expanded

pnpm --filter @create-something/webflow-template-review-mcp calibration:phase1:compare -- \
  --input /tmp/webflow-template-review-calibration-2026-05-26-expanded
```

## Comparison Summary

| Metric | Count |
| --- | ---: |
| Compared cases | 25 |
| Aligned | 2 |
| Acceptable caution | 7 |
| False blocker | 3 |
| Missed blocker | 4 |
| Manual gap | 2 |
| Data ambiguous | 7 |

Recommendation distribution:

| Recommendation | Count |
| --- | ---: |
| `hard_blocker_candidate` | 8 |
| `changes_requested_average` | 16 |
| `manual_quality_review_required` | 1 |

Audit-cause distribution:

| Audit cause | Count |
| --- | ---: |
| `aligned` | 2 |
| `likely_resolved_or_snapshot_gap` | 7 |
| `policy_exception_or_reviewer_override` | 3 |
| `manual_quality_gap` | 2 |
| `data_surface_gap` | 2 |
| `needs_manual_inspection` | 9 |

## Key Findings

### 1. Legacy IX2 Is The Main Policy Ambiguity

All three false blockers were approved Good outcomes where the current published site triggered `wf.template.code.no_legacy_ix2`:

| Case | Template | Agent recommendation | Actual outcome | Hard blocker |
| --- | --- | --- | --- | --- |
| `phase1_case_001` | Monose | `hard_blocker_candidate` | Approved Good | `wf.template.code.no_legacy_ix2` |
| `phase1_case_002` | Codara | `hard_blocker_candidate` | Approved Good | `wf.template.code.no_legacy_ix2` |
| `phase1_case_004` | Mintify | `hard_blocker_candidate` | Approved Good | `wf.template.code.no_legacy_ix2` |

Four iterative review cases also triggered the same hard blocker:

- NextAI
- CreatorTalk
- SaaAI
- Audial

This does not prove the detector is wrong. It proves the rule cannot be exposed as an automatic reviewer-facing rejection until the team answers whether current IX2 evidence is:

- a strict rejection rule that reviewers are currently overriding or missing
- a rule with exceptions that need to be encoded
- a reviewed-state snapshot issue because the current published site differs from review-time evidence
- a detector that is too broad for the intended policy

### 2. Approved Good And Exceptional Templates Still Have Objective Published-Site Warnings

Seven approved or exceptional outcomes were classified as `acceptable_caution` because the agent found content, asset, or accessibility errors. These findings are useful reviewer accelerators, but they are not approval blockers by themselves.

Phase 1 should continue to emit these as objective findings with direct evidence. It should not translate them into final quality-band decisions without human review.

### 3. UI/UX Rejections Are Correctly Outside Phase 1

Two rejected Low quality examples were UI/UX-driven:

- Upword
- Sham

The agent found objective issues, but not enough to justify the same rejection reason. These belong in `manual_quality_gap`, not `missed_blocker`, because Phase 1 deliberately avoids subjective visual-quality scoring.

### 4. App And Guideline Rejections Need A Different Data Surface

The run included app issue and guideline infringement cases that published-site evidence could not reliably classify:

- Connectfic: app issue
- Popflow: app issue
- Form Submission Viewer: app issue
- HTML Importer: guideline infringement
- Dynamic Map: guideline infringement

These require app/submission metadata, package configuration, listing context, or reviewer policy evidence outside the current published-template crawl.

## Calibration Decision

Do not expand this to reviewer-facing Dify rating language yet.

The workflow is useful as an offline calibration harness and evidence normalizer. It is not stable enough to say "likely reject", "average", "good", or "exceptional candidate" to a reviewer without stronger policy gates and better data surfaces.

## Recommended Changes Before The Next Sample

1. Add a policy-confirmation field to `wf.template.code.no_legacy_ix2`.
2. Keep IX2 as a finding, but do not let it produce automatic hard-blocker language until reviewer lead confirms the exact policy and exception model.
3. Split app-review and template-review calibration paths; app issue outcomes should not be scored from published template HTML alone.
4. Add reviewed-state artifact capture for future submissions so historical calibration does not depend on mutable current published URLs.
5. Add a feedback-normalization pass for the four missed/data-ambiguous rejection cases to identify whether the blocker was outside Phase 1 or hidden in freeform feedback.
6. Keep screenshots as attached evidence and measurement inputs, not scoring truth.

## Next Run Gate

Run another 25-50 cases only after the IX2 policy question is answered or the Phase 1 recommendation mapping is adjusted so IX2 cannot create an unreviewed hard blocker.

## Post-Gate Rerun

**Sample directory:** `/tmp/webflow-template-review-calibration-2026-05-26-ix2-gated`

The recommendation mapping was adjusted so IX2 remains an objective finding with `ix2_policy_confirmation`, but no longer creates `hard_blocker_candidate` by itself.

Post-gate comparison:

| Metric | Before gate | IX2 gate | Feedback-normalized |
| --- | ---: | ---: | ---: |
| Compared cases | 25 | 25 | 25 |
| Aligned | 2 | 5 | 5 |
| Acceptable caution | 7 | 10 | 10 |
| False blocker | 3 | 0 | 0 |
| Missed blocker | 4 | 2 | 0 |
| Manual gap | 2 | 2 | 4 |
| Data ambiguous | 7 | 6 | 6 |

Post-gate recommendation distribution:

| Recommendation | Count |
| --- | ---: |
| `changes_requested_average` | 24 |
| `manual_quality_review_required` | 1 |

This clears the most dangerous Phase 1 failure mode: approved examples are no longer receiving unreviewed hard-blocker recommendations from IX2 evidence.

It also confirms Phase 1 is currently a cautious changes-requested/evidence-normalization pass, not a reliable four-band rating system. In the IX2-gated comparison, the remaining two apparent missed blockers were rejected Low quality examples with rejection reason `Other`:

| Case | Template | Agent recommendation | Actual outcome | Rejection reason |
| --- | --- | --- | --- | --- |
| `phase1_case_014` | Automatia | `changes_requested_average` | Rejected Low quality | Other |
| `phase1_case_015` | Lawcrest | `changes_requested_average` | Rejected Low quality | Other |

Those two cases need feedback normalization or manual inspection before deciding whether Phase 1 missed a codifiable blocker or the true rejection reason was subjective/manual.

Feedback normalization found both `Other` rejections were driven by outdated visual style language. They now count as `manual_quality_gap`, not `missed_blocker`.

## Updated Next Gate

Do not run another broad calibration sample yet. First:

1. Decide whether `Other` rejection reasons should be excluded from hard-blocker recall metrics until reviewer feedback is bucketed.
2. Add a separate app/guideline data-surface path before scoring app issue, invalid submission, duplicate, or guideline infringement outcomes.
3. Keep IX2 as evidence-only until reviewer lead confirms the exact rule and exception model.
4. Add a design-quality/manual-rubric lane for visual style, modernity, typography, color, and UI-pattern judgments.
