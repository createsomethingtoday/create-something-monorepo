# Phase 1 Smoke Mismatch Audit

**Status:** Draft
**Date:** 2026-05-26
**Sample directory:** `/tmp/webflow-template-review-calibration-e2e-smoke`

## Summary

The first five-record end-to-end smoke proved the calibration loop works mechanically, but it also showed that Phase 1 evidence should not be scaled blindly yet.

Original comparison:

- `aligned`: 1
- `acceptable_caution`: 1
- `false_blocker`: 1
- `missed_blocker`: 2

After mismatch review, the two apparent missed blockers separate into known non-Phase-1 coverage gaps:

- one UI/UX rejection: manual quality gap
- one app-issue rejection: data-surface gap

Current compare-script output:

- `aligned`: 1
- `acceptable_caution`: 1
- `false_blocker`: 1
- `manual_gap`: 1
- `data_ambiguous`: 1

Current audit-cause output:

- `aligned`: 1
- `likely_resolved_or_snapshot_gap`: 1
- `policy_exception_or_reviewer_override`: 1
- `manual_quality_gap`: 1
- `data_surface_gap`: 1

## Case Review

| Case | Template | Agent recommendation | Actual outcome | Mismatch class | Audit cause |
| --- | --- | --- | --- | --- | --- |
| `phase1_case_001` | Monose | `hard_blocker_candidate` | Approved Good | false blocker | `policy_exception_or_reviewer_override` |
| `phase1_case_002` | Frentavo | `changes_requested_average` | Approved Exceptional | acceptable caution | `likely_resolved_or_snapshot_gap` |
| `phase1_case_003` | Upword | `changes_requested_average` | Rejected Low quality / UI/UX | manual gap | `manual_quality_gap` |
| `phase1_case_004` | Cookie Consent Hub | `changes_requested_average` | Changes Requested | aligned | `aligned` |
| `phase1_case_005` | Connectfic | `changes_requested_average` | Rejected / App issue | data ambiguous | `data_surface_gap` |

## Monose IX2 Note

The current Monose published homepage contains raw IX2 evidence:

- `data-w-id` attributes: 97
- `w-mod-ix` markers: 7
- external Webflow chunk contains `Webflow.require("ix2").init(...)`
- submitted timestamp in the sampled Asset Version: `2026-05-20T12:04:32.000Z`

Because the Airtable outcome is Approved Good, this should not be automatically treated as a detector bug. It needs one of these explanations:

- policy exception
- reviewer override or reviewer miss
- current published site differs from reviewed-state evidence
- policy interpretation is narrower than the validator assumes

Before scaling, the reviewer lead should confirm how to treat this IX2 pattern.

## Calibration Implications

- Phase 1 should not claim it catches UI/UX rejection reasons.
- Phase 1 should not claim it catches app-review or packaging rejection reasons.
- Historical rows need a reviewed-state artifact link; current published URLs are insufficient for clean retrospective ground truth.
- `false_blocker` should always trigger manual inspection before any threshold change.
- The compare script now records both `comparison_label` and `audit_cause`.
