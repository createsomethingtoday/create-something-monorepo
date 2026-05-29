# Visual Quality Self-Healing Loop

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `visual-quality-signal-standardization.md`, `visual-quality-calibration-audit-2026-05-26.md`, `visual-quality-proxy-extraction-plan.md`, `review-ledger.phase1.sql`, `rule-catalog.phase1.json`

## Purpose

The visual-quality system needs to stay current without becoming unstable. "Self-healing" means the review system can update aliases, evidence weighting, thresholds, and calibration sets from confirmed human outcomes. It does not mean the agent silently changes the marketplace quality standard or starts rejecting templates on taste.

## Principle

The system may self-heal:

- reviewer wording aliases
- confidence calibration
- proxy-signal weights
- drift warnings
- golden-set membership proposals
- evidence sufficiency thresholds

The system must not self-heal:

- final approval or rejection rules
- the definition of `Good` or `Exceptional`
- category-specific marketplace quality standards
- reviewer override policy
- visual-quality buckets without human-confirmed examples

## Control Loop

```text
human outcome
  -> normalized visual-quality bucket
  -> evidence comparison
  -> drift metrics
  -> proposed calibration update
  -> golden-set canary
  -> reviewer/lead approval
  -> versioned policy snapshot
```

## Executable Calibration Hook

`packages/webflow-template-review-mcp/scripts/calibrate-visual-quality.ts` is the current read-only calibration hook. It samples rejected, approved Good, and approved Exceptional Asset Versions from Airtable and emits:

- normalized visual-quality feedback rows
- proposed golden cases
- proposed feedback aliases
- run-level drift and control metrics

The script is intentionally proposal-only. It must not write to Airtable, activate aliases, or update policy snapshots directly.

`packages/webflow-template-review-mcp/scripts/prepare-visual-quality-ledger-import.ts` converts those outputs into D1-ready SQL. By default it only inserts rows into `visual_quality_policy_proposals`; active alias and golden-case imports require an approval manifest with explicit approved IDs.

## Durable Artifacts

### 1. Golden Cases

Golden cases are human-confirmed examples used to test stability:

- approved Good
- approved Exceptional
- rejected visual/UI/UX/outdated/basic
- rejected technical/app/guideline negative controls
- ambiguous or deprecated cases excluded from scoring

Each case should link to:

- Asset Version ID
- policy version
- normalized visual-quality buckets
- reviewer-confirmed final state
- screenshot/R2 artifact snapshot when available
- agent-controlled validator output snapshot when available
- supplemental Validator app output only when already available and marked non-gating

### 2. Feedback Aliases

Reviewer language should map into canonical buckets without changing policy. Examples:

| Raw phrase | Canonical bucket |
| --- | --- |
| outdated visual style | `outdated_visual_style` |
| default/common patterns | `basic_or_default_layout` |
| poor typography | `poor_typography_quality` |
| lacks hierarchy | `weak_visual_hierarchy` |
| visual assets are not cohesive | `incohesive_assets` |
| saturated category, not differentiated | `saturated_category_no_differentiation` |

New aliases can be proposed automatically when they repeatedly appear near confirmed outcomes. They become active only after review.

### 3. Calibration Runs

Every calibration run should record:

- policy snapshot
- golden-set version
- sample window
- agent predictions
- hidden outcome labels
- alignment metrics
- drift metrics
- proposed changes

Minimum tracked metrics:

- false visual-risk rate on approved Good/Exceptional
- missed visual-risk rate on rejected visual-quality cases
- manual-quality gap rate
- data-ambiguous rate
- alias coverage rate
- reviewer wording concentration by reviewer
- category drift rate

### 4. Drift Events

Trigger a drift event when:

- approved Good/Exceptional examples start matching rejected visual-quality patterns
- rejected visual-quality examples stop matching existing buckets
- one reviewer’s wording dominates an alias or threshold
- a category changes enough that old examples become stale
- proxy signals become noisy against the golden set

Drift should lower confidence and open a calibration task. It should not silently change recommendations.

### 5. Policy Proposals

Allowed proposal types:

- `alias_addition`
- `alias_deprecation`
- `proxy_weight_adjustment`
- `confidence_threshold_adjustment`
- `golden_case_addition`
- `golden_case_deprecation`
- `bucket_definition_update`

Proposal states:

- `proposed`
- `approved`
- `rejected`
- `applied`

Only approved proposals can be applied into a new `review_policy_snapshots` row.

## Promotion Gate

A visual-quality calibration update can be promoted only if:

- hard rejection language remains manual/human-confirmed
- false visual-risk rate on approved Good/Exceptional stays below the configured threshold
- missed visual-risk rate on rejected visual-quality cases improves or remains stable
- negative controls for app/guideline/technical rejections do not start matching visual buckets
- at least one reviewer or lead approves the proposal
- the previous policy snapshot can be restored

## Runtime Behavior

Reviewer-facing agents should say:

- "Visual-quality risk detected"
- "Manual quality review required"
- "Signals suggest weak typography / basic layout / outdated visual style"
- "This should be compared against approved Good/Exceptional references"

Reviewer-facing agents should not say:

- "This is rejected for outdated style"
- "This is objectively outdated"
- "The visual standard changed"
- "The model learned this should fail"

## Recommended Cadence

| Cadence | Action |
| --- | --- |
| Every run | Store prediction, evidence, policy version, and comparison result. |
| Daily during pilot | Review drift events and false visual-risk examples. |
| Weekly | Refresh alias proposals from new reviewer feedback. |
| Monthly | Rebalance golden set and deprecate stale category examples. |
| Before reviewer-facing rollout | Run golden-set canary and require lead approval. |

## Acceptance Criteria

The self-healing loop is working when:

- exact reviewer phrasing becomes less important than canonical buckets
- approved Good and Exceptional examples are protected from false visual-risk escalation
- visual-quality rejections can be explained through stable sub-buckets
- drift produces a reviewable proposal, not a silent behavior change
- every applied calibration has a policy snapshot, evidence, and rollback path
