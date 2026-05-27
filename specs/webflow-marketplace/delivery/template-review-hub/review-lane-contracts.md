# Review Lane Contracts

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `review-orchestration-model.md`, `review-ledger.phase1.sql`, `rule-catalog.phase1.json`, `ai-reviewer-proposal-alignment.md`, `subjective-judge-panel-eval-harness.md`, `execution-isolation-and-sandbox-policy.md`, `published-site-sandbox-lane.md`

## Purpose

This document turns the coordinator-plus-lanes architecture into concrete contracts. A lane may be implemented as a deterministic script, a lane-shaped tool, or a true subagent. The contract should stay the same either way.

The stability goal is to prevent one lane's uncertainty from contaminating another lane's decision.

## Runtime Types

| Runtime type | Use when | Example |
| --- | --- | --- |
| `deterministic_tool` | extraction or validation is mostly code-driven | HTML/CSS proxy extraction |
| `retrieval_tool` | the lane retrieves approved context without judging it | precedent retrieval |
| `lane_tool` | code extraction plus limited LLM synthesis is useful | visual-quality evidence summarizer |
| `subagent` | independent reasoning, long runtime, separate permissions, or parallelism is needed | similarity/flooding reviewer |
| `judge_panel` | multiple independent model judgments and convergence routing are required | subjective rubric scoring |
| `human_gate` | final judgment, approval, rejection, or policy promotion is required | final review decision |

## Contracts

### 1. Intake Context Lane

```yaml
lane_id: intake_context
runtime_type: deterministic_tool
allowed_sources:
  - airtable_assets
  - airtable_asset_versions
  - current_review_status
may_emit:
  - normalized_case_context
  - prior_feedback_summary
  - reviewer_context
must_not_emit:
  - final_rating
  - rejection_language
  - policy_update
write_permissions: none
primary_artifact: normalized_case_context.json
failure_modes:
  - stale_airtable_state
  - historical_feedback_resolved
  - reviewer_wording_bias
escalation: mark data_ambiguous when current status and feedback conflict
```

### 2. Published-Site Validation Lane

```yaml
lane_id: published_site_validation
runtime_type: deterministic_tool
allowed_sources:
  - published_html
  - published_css
  - published_js
  - network_requests
  - agent_controlled_validator_output
may_emit:
  - objective_finding
  - hard_blocker_evidence
  - acceptable_caution
must_not_emit:
  - final_rejection
  - visual_quality_rating
  - app_policy_decision_without_app_metadata
write_permissions: none
primary_artifact: published_site_findings.json
sandbox_artifact: published_site_sandbox_output.v0.1.json
sandbox_posture: required for rendered/runtime checks; optional for static fetch-only checks
failure_modes:
  - mutable_current_site_differs_from_review_snapshot
  - policy_exception_not_encoded
  - validator_false_positive
escalation: policy_confirmation_required when a finding conflicts with approved outcomes
```

This lane only covers validation evidence the review system can obtain without
asking a creator or reviewer to open a Designer Extension. Manual Validator app
reports can be useful corroborating evidence, but they are not first-class
published-site evidence until the review workflow guarantees access and
persistence for every submitted template.

### 3. Designer And Webflow Way Lane

```yaml
lane_id: designer_webflow_way
runtime_type: lane_tool
allowed_sources:
  - designer_metadata
  - variables
  - components
  - styles
  - pages
  - assets
may_emit:
  - structural_checklist_finding
  - design_system_maturity_signal
  - missing_designer_data_warning
must_not_emit:
  - final_quality_rating
  - visual_taste_decision
write_permissions: none
primary_artifact: designer_checklist_findings.json
failure_modes:
  - designer_metadata_unavailable
  - incomplete_designer_payload
  - manual_validator_not_run
  - structural_proxy_overinterpreted_as_quality
escalation: manual_quality_review_required when structural signals imply visual risk
```

### 3a. Validator App Submission Contract Lane

```yaml
lane_id: validator_app_submission_contract
runtime_type: deterministic_tool
availability: required_when_policy_enabled
allowed_sources:
  - submitted_asset_html
  - published_html
  - webflow_cloud_app_template_form_payload
  - validator_script_marker
  - validator_script_src
may_emit:
  - validator_script_present
  - validator_script_missing_requirement_finding
  - validator_contract_unavailable
must_not_emit:
  - validation_result_finding_without_result_artifact
  - final_rejection
  - final_rating
  - visual_quality_rating
write_permissions: none
primary_artifact: validator_app_submission_contract.json
evidence_required:
  - marker_name
  - script_src_host_or_hash
  - script_version_when_available
  - observed_url_or_submitted_asset_id
  - checked_at
policy_states:
  - disabled_or_legacy_submission: missing script is an availability warning only
  - enabled_for_new_submission: missing script is a first-class submission requirement finding
failure_modes:
  - submitted_asset_not_available
  - published_site_differs_from_submitted_asset
  - script_removed_after_submission
  - marker_present_but_script_blocked
  - raw_bridge_token_leaked_into_logs
escalation: human_reviewer_required before creator-facing rejection language
```

This lane makes Validator app use enforceable once Marketplace policy requires
it. The first check is script presence on the submitted asset or published
review surface. Script presence proves the submission contract was followed; it
does not, by itself, prove the template passed validation.

Do not store raw bridge tokens in logs, prompts, creator-facing feedback, or
review artifacts. Store only marker presence, allowed script source evidence,
version, hashes, and provenance.

### 3b. Validator App Supplemental Results Lane

```yaml
lane_id: validator_app_supplemental_results
runtime_type: deterministic_tool
availability: optional_until_result_persistence_is_required
allowed_sources:
  - persisted_validator_app_report
  - manually_run_validator_report
  - review_bridge_output_when_installed
  - designer_extension_output_when_creator_or_reviewer_launches_app
may_emit:
  - supplemental_objective_finding
  - persisted_validator_objective_finding
  - creator_self_service_hint
  - missing_validator_access_warning
must_not_emit:
  - final_rejection_without_human_gate
  - final_rejection
  - final_rating
  - policy_decision
write_permissions: none
primary_artifact: validator_app_report.snapshot.json
failure_modes:
  - app_not_launched
  - creator_or_reviewer_did_not_run_validation
  - bridge_output_not_persisted
  - rule_mapping_not_calibrated
promotion_requirements:
  - validation is enforced on the submitted asset through the required submission flow
  - script presence is validated by validator_app_submission_contract
  - validation runs in the background or in the required submission step
  - output persists to the review ledger or R2 with provenance
  - rule IDs map to a policy snapshot
  - findings are calibrated against approved and rejected outcomes
escalation: mark validator_app_results_unavailable when missing; do not infer validation pass or failure without an output artifact
```

The required Validator app flow should be enforced on the submitted asset, for
example through the Webflow Cloud App template form. Checking for the injected
script can be first-class immediately after that policy is active. Detailed app
findings become first-class only when the validation output is persisted with a
stable schema and policy snapshot.

### 4. Visual Quality Lane

```yaml
lane_id: visual_quality
runtime_type: lane_tool
allowed_sources:
  - visual_quality_feedback_aliases
  - approved_golden_cases
  - rejected_visual_quality_golden_cases
  - published_html
  - published_css
  - section_fingerprints
  - screenshots
may_emit:
  - visual_quality_bucket
  - proxy_signal
  - drift_event
  - manual_quality_review_required
must_not_emit:
  - automatic_rejection
  - good_rating
  - exceptional_rating
  - active_alias_without_approval
write_permissions: proposed_policy_only
primary_artifact: visual_proxy_features.json
sandbox_posture: required for screenshots and rendered layout; optional for static CSS-only proxy extraction
failure_modes:
  - reviewer_taste_overfit
  - screenshot_variability
  - approved_template_has_visual_notes
  - category_context_missing
escalation: human_reviewer_required for any creator-facing visual-quality feedback
```

### 4a. Exceptional Candidate Lane

```yaml
lane_id: exceptional_candidate
runtime_type: judge_panel
allowed_sources:
  - policy_snapshot
  - approved_exceptional_golden_cases
  - approved_good_golden_cases
  - rejected_visual_quality_golden_cases
  - visual_quality_artifact
  - objective_findings
  - screenshots
  - precedent_retrieval
may_emit:
  - exceptional_human_review_candidate
  - not_exceptional_enough
  - insufficient_exceptional_evidence
  - lead_review_required
must_not_emit:
  - final_approval
  - final_rejection
  - final_rating
  - featured_decision
  - creator_facing_feedback
write_permissions: review_run_artifacts_only
primary_artifact: exceptional_candidate_panel.json
failure_modes:
  - over_promotes_trendy_but_unfinished_templates
  - misses_minimal_or_category_specific_exceptional_work
  - confuses good_candidate_with_exceptional_candidate
  - ignores rejected_visual_quality_precedent
escalation: human_lead_required for every positive exceptional candidate
promotion_gate: zero false approvals against rejected_low_quality and iterative_review canaries; zero missed exceptional on locked exceptional canaries
```

### 5. Precedent Retrieval Lane

```yaml
lane_id: precedent_retrieval
runtime_type: retrieval_tool
allowed_sources:
  - approved_precedents
  - rubric_criterion_embeddings
  - policy_snapshots
  - reviewer_overrides
  - golden_cases
may_emit:
  - criterion_scoped_precedent_set
  - retrieval_confidence
  - missing_precedent_warning
must_not_emit:
  - new_precedent
  - final_decision
  - policy_update
  - unapproved_precedent_context
write_permissions: none
primary_artifact: precedent_retrieval.json
failure_modes:
  - stale_precedent
  - unapproved_resolution_retrieved
  - category_context_mismatch
  - rubric_snapshot_mismatch
escalation: omit precedent and mark criterion_uncalibrated when approved precedent is unavailable
```

### 5a. Appeal And Equity Comparison Lane

```yaml
lane_id: appeal_equity_comparison
runtime_type: lane_tool
allowed_sources:
  - normalized_case_context
  - cited_template_urls
  - published_site_validation_artifacts
  - screenshots
  - prior_review_outcomes
  - cited_status_verification_artifacts
  - visual_quality_buckets
  - similarity_candidates
may_emit:
  - evidence_only_consistency_question
  - cited_template_objective_finding
  - rejected_template_objective_finding
  - cited_template_status_verification
  - subjective_quality_gap
  - needs_human_reviewer_resolution
must_not_emit:
  - final_appeal_decision
  - reversal_recommendation
  - final_rejection
  - final_approval
  - creator_facing_feedback_without_human_review
write_permissions: review_run_artifacts_only
primary_artifact: appeal_equity_comparison.json
current_scripts:
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-comparison.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-batch.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-intake.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-casebook.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-capture-queue.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-external-comparison.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-shadow-eval.ts
  - packages/webflow-template-review-mcp/scripts/run-appeal-equity-status-verification.ts
  - packages/webflow-template-review-mcp/scripts/score-appeal-equity-casebook.ts
failure_modes:
  - compares_objective_bug_to_subjective_quality_band
  - treats_approved_template_issue_as_policy_exception_without_context
  - misses_review_lifecycle_state
  - uses_current_public_site_as_exact_historical_snapshot
  - treats_creator_cited_approval_as_verified_status
escalation: human_reviewer_required for every appeal or creator-cited comparison
```

This lane exists because creator appeals often compare a rejected submission with a published template that has visible technical issues. The lane should not decide the appeal. It should produce a normalized comparison: what objective issues exist in each template, what subjective quality finding remains unexplained by objective evidence, and what human policy question needs resolution.

The first implementation is a local artifact comparator over calibration output:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --cited Introx \
  --out /tmp/webflow-template-review-appeal-equity-automatia-vs-introx-2026-05-27
```

It reads existing `manifest.blind.jsonl`, `outcomes.private.jsonl`, `sandbox-results.jsonl`, `status-alignment.jsonl`, and normalized finding JSONL files. It does not call Airtable, E2B, OpenAI, D1, R2, or Dify.

Batch mode selects conservative appeal/equity candidates from the same calibration directory:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-batch-low-quality-vs-approved-issues-2026-05-27 \
  --limit 8
```

Batch mode is not a replacement for real creator-cited examples. It exists to surface repeated consistency questions and identify where the policy needs clearer language before reviewer-facing use.

Real creator claims should enter through intake mode:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:intake -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27 \
  --run-comparisons
```

The intake artifact status values are:

- `comparison_generated`: target and cited examples resolved and a comparison packet exists
- `ready_for_comparison`: target and cited examples resolved, but comparison was not requested
- `needs_target_evidence_capture`: target does not resolve to captured evidence
- `needs_cited_evidence_capture`: cited comparison does not resolve to captured evidence
- `ambiguous_resolution`: lookup matched multiple possible cases and needs manual mapping

Intake also writes `appeal-equity-evidence-capture-queue.jsonl`. Queue items are emitted for unresolved or ambiguous target/cited examples and include:

- appeal id
- target or cited role
- original lookup
- reason (`unresolved_lookup` or `ambiguous_lookup`)
- lookup type (`marketplace_url`, `web_url`, or `case_or_name`)
- priority
- next mapping or evidence-capture step
- ambiguous candidate cases when available

This keeps creator-cited evidence distinct from calibration-selected examples and gives follow-up agents a bounded capture queue instead of an open-ended appeal investigation.

Capture queue mode plans or prepares the missing evidence:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:capture-queue -- \
  --queue /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-capture-queue-plan-2026-05-27
```

With mappings, it can prepare local sandbox bundles:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:capture-queue -- \
  --queue /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl \
  --mappings packages/webflow-template-review-mcp/fixtures/appeal-equity-capture-mapping.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-capture-queue-mapped-prepare-2026-05-27 \
  --prepare-bundles
```

E2B capture is explicitly opt-in with `--run-e2b`. Default and bundle-preparation modes do not write Airtable, D1, R2, final decisions, ratings, or creator-facing feedback.

Before a captured cited template is treated as an approved or published precedent, verify that status through a separate status artifact:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:verify-status -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --lookup https://webflow.com/templates/html/introx-website-template \
  --out /tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27
```

The strongest verification level is `trusted_or_historical_review`, because it comes from captured review outcomes or a trusted status export. `current_public_listing_only` is weaker and should not be treated as historical approval.

After capture and status verification, external comparison mode re-enters the appeal/equity lane without requiring the cited template to exist in the calibration manifest:

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

Without `--status-verification`, the external cited status claim remains explicitly unverified. With status verification, the comparison may state that the cited template status is verified, but still must not convert that into an appeal decision.

For more than one creator-cited appeal row, use casebook mode as the coordinator:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:casebook -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --run-external-comparisons
```

Casebook mode does not add new judgment. It runs the smaller lane scripts, then summarizes which appeals are ready for human review, blocked on missing evidence capture, ambiguous, or failed. This is the recommended widening path because it preserves the same boundaries while allowing a growing appeal set.

Score casebook output before handing it to reviewers:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:score-casebook -- \
  --input /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-casebook-score-automatia-introx-2026-05-27
```

The score gate is structural only. Passing means the casebook has resolved target evidence, resolved cited evidence, verified cited status, comparison packets, and required reviewer-boundary questions. It must not be interpreted as an appeal decision.

The operator-facing wrapper runs both stages:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-shadow-eval-automatia-introx-2026-05-27
```

This command is suitable for an agent workflow because it returns one gate status while preserving nested casebook, status-verification, comparison, and score artifacts.

### 6. Subjective Judgment Panel Lane

```yaml
lane_id: subjective_judgment_panel
runtime_type: judge_panel
allowed_sources:
  - rubric_criterion
  - policy_snapshot
  - normalized_case_context
  - objective_findings
  - visual_proxy_artifact
  - screenshots
  - criterion_scoped_precedent_set
may_emit:
  - criterion_score
  - judge_reasoning_summary
  - agreement_level
  - disagreement_summary
  - escalation_required
  - model_cost_latency_metadata
must_not_emit:
  - final_approval
  - final_rejection
  - exceptional_feature_decision
  - creator_facing_feedback
  - policy_update
  - active_precedent
write_permissions: review_run_artifacts_only
primary_artifact: subjective_judgment_panel.json
sandbox_posture: not_needed
failure_modes:
  - judge_consensus_on_wrong_precedent
  - model_provider_bias
  - reviewer_taste_overfit
  - rubric_criterion_underspecified
  - cost_or_latency_budget_exceeded
escalation: human_reviewer_required when judges disagree, approved precedent is missing, or the criterion is feature/rejection critical
```

### 7. App And Guideline Lane

```yaml
lane_id: app_guideline
runtime_type: subagent
allowed_sources:
  - app_submission_metadata
  - package_files
  - app_manifest
  - custom_code_api_usage
  - marketplace_guidelines
may_emit:
  - app_policy_finding
  - guideline_finding
  - data_surface_gap
must_not_emit:
  - published_site_only_rejection
  - visual_quality_rating
write_permissions: none
primary_artifact: app_guideline_findings.json
sandbox_posture: required when executing package code; optional for metadata-only review
failure_modes:
  - published_url_insufficient
  - package_context_missing
  - app_template_lane_confusion
escalation: data_surface_gap when package or app metadata is unavailable
```

### 8. Similarity And Flooding Lane

```yaml
lane_id: similarity_flooding
runtime_type: subagent
allowed_sources:
  - marketplace_inventory
  - same_creator_history
  - embeddings
  - visual_snapshots
  - layout_fingerprints
  - content_fingerprints
may_emit:
  - similarity_candidate
  - exact_duplicate_candidate
  - same_creator_cluster
must_not_emit:
  - final_duplicate_rejection
  - creator_intent_judgment
write_permissions: none
primary_artifact: similarity_candidates.json
sandbox_posture: required when generating screenshots or runtime fingerprints; optional for pure vector/hash reranking
failure_modes:
  - overblocking_legitimate_variation
  - category_common_pattern_false_positive
  - stale_marketplace_inventory
escalation: human_reviewer_required when similarity score crosses threshold
```

### 9. Calibration And Eval Lane

```yaml
lane_id: calibration_eval
runtime_type: deterministic_tool
allowed_sources:
  - hidden_airtable_outcomes
  - golden_cases
  - reviewer_overrides
  - policy_snapshots
  - lane_outputs
may_emit:
  - alignment_metric
  - drift_event
  - policy_proposal
  - golden_case_proposal
must_not_emit:
  - active_policy_update
  - final_review_decision
write_permissions: proposed_policy_only
primary_artifact: calibration_report.json
sandbox_posture: not_needed
failure_modes:
  - leakage_from_hidden_outcomes
  - learning_reviewer_phrasing_instead_of_policy
  - mutable_current_site_snapshot_gap
escalation: block_policy_promotion when approved controls regress
```

### 10. Recommendation Composer Lane

```yaml
lane_id: recommendation_composer
runtime_type: coordinator
allowed_sources:
  - normalized_case_context
  - objective_findings
  - manual_quality_findings
  - subjective_judgment_panel
  - criterion_scoped_precedent_set
  - similarity_candidates
  - app_guideline_findings
  - calibration_warnings
may_emit:
  - internal_recommendation
  - confidence
  - manual_checks_remaining
  - reviewer_action
must_not_emit:
  - official_final_decision
  - unsupported_creator_feedback
  - unapproved_policy_change
write_permissions: review_run_artifacts_only
primary_artifact: review_recommendation.json
sandbox_posture: not_needed
failure_modes:
  - partial_signal_overweighted
  - lane_conflict_not_disclosed
  - reviewer_facing_language_too_decisive
escalation: needs_human_review when lanes conflict or confidence is low
```

### 11. Feedback Composer Lane

```yaml
lane_id: feedback_composer
runtime_type: lane_tool
allowed_sources:
  - confirmed_findings
  - approved_feedback_templates
  - reviewer_overrides
may_emit:
  - creator_feedback_draft
  - reviewer_note
must_not_emit:
  - new_unconfirmed_finding
  - legal_claim
  - final_decision
write_permissions: draft_only
primary_artifact: creator_feedback_draft.md
sandbox_posture: not_needed
failure_modes:
  - tone_overstates_evidence
  - combines_unrelated_lanes
  - leaks_internal_calibration_language
escalation: reviewer_edit_required before sending
```

## Promotion Rule

A lane can move from deterministic tool to true subagent only when at least one condition is true:

- the lane requires independent reasoning over a large context
- the lane has a separate permission boundary
- the lane can run in parallel without blocking other work
- the lane has its own eval set and measurable failure modes
- isolating it reduces contamination risk

Do not use subagents merely because the model supports them.

## Coordinator Input Contract

The coordinator should receive lane artifacts, not broad raw context:

```json
{
  "review_run_id": "run_...",
  "policy_snapshot_id": "phase1_...",
  "case_context_artifact": "r2://...",
  "published_site_findings_artifact": "r2://...",
  "visual_proxy_artifact": "r2://...",
  "precedent_retrieval_artifact": "r2://...",
  "subjective_judgment_panel_artifact": "r2://...",
  "similarity_candidates_artifact": "r2://...",
  "calibration_warnings": []
}
```

## Coordinator Output Contract

```json
{
  "recommendation": "changes_requested_average",
  "confidence": "medium",
  "hard_blocker_count": 0,
  "objective_finding_count": 4,
  "quality_proxy_count": 2,
  "manual_check_count": 3,
  "manual_checks_remaining": [
    "visual_quality",
    "asset_licensing",
    "similarity_flooding"
  ],
  "lane_conflicts": [],
  "reviewer_action": "review_evidence_then_request_changes_or_override"
}
```

## Stability Checklist

Before a lane is reviewer-facing:

- it has a contract in this file
- it writes normalized artifacts
- it has no raw secret access unless required
- it has at least one golden-set or control-set eval
- its false-positive behavior is known
- its findings are separated from final recommendations
- its failure modes are visible to the coordinator
- its sandbox posture is documented when it touches untrusted published pages or package code
