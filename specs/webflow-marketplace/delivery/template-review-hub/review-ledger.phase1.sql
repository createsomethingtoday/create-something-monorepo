-- Phase 1 AI-native template review ledger sketch.
-- Target database: Cloudflare D1.
-- This file is a planning artifact, not an applied migration.

create table if not exists review_policy_snapshots (
  id text primary key,
  catalog_version text not null,
  source_label text not null,
  source_hash text not null,
  created_at text not null,
  rules_json text not null
);

create table if not exists review_runs (
  id text primary key,
  asset_id text,
  version_id text,
  published_url text not null,
  policy_snapshot_id text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  created_at text not null,
  completed_at text,
  error_json text,
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create table if not exists review_artifacts (
  id text primary key,
  run_id text not null,
  artifact_type text not null check (
    artifact_type in (
      'published_site_sandbox_output',
      'published_site_sandbox_findings',
      'validator_app_submission_contract',
      'validator_app_submission_contract_summary',
      'validator_app_results_normalized',
      'validator_app_results_findings',
      'validator_app_results_ledger_sql',
      'validator_app_results_summary',
      'quality_band_readiness_summary',
      'quality_band_readiness_summary_markdown',
      'quality_band_readiness_ledger_sql',
      'quality_band_readiness_ledger_summary',
      'quality_band_readiness_artifact_manifest',
      'visual_proxy_features',
      'screenshot',
      'html_snapshot',
      'network_log',
      'creator_guidance_draft',
      'other'
    )
  ),
  source_lane text not null,
  uri text not null,
  sha256 text not null,
  byte_size integer not null,
  media_type text,
  redaction_json text not null default '{}',
  created_at text not null,
  foreign key (run_id) references review_runs(id)
);

create index if not exists idx_review_artifacts_run_id on review_artifacts(run_id);
create index if not exists idx_review_artifacts_type on review_artifacts(artifact_type);
create index if not exists idx_review_artifacts_sha256 on review_artifacts(sha256);

create table if not exists review_findings (
  id text primary key,
  run_id text not null,
  rule_id text not null,
  status text not null check (status in ('pass', 'fail', 'partial', 'manual', 'error')),
  severity text not null check (severity in ('critical', 'major', 'minor', 'info')),
  coverage text not null check (coverage in ('auto', 'partial', 'manual')),
  rejectability text not null,
  finding_bucket text not null,
  confidence real,
  page_url text,
  evidence_json text not null,
  artifact_url text,
  resolution_state text not null default 'open' check (
    resolution_state in ('open', 'resolved', 'waived', 'false_positive', 'needs_human_review')
  ),
  created_at text not null,
  foreign key (run_id) references review_runs(id)
);

create index if not exists idx_review_findings_run_id on review_findings(run_id);
create index if not exists idx_review_findings_rule_id on review_findings(rule_id);
create index if not exists idx_review_findings_resolution_state on review_findings(resolution_state);

create table if not exists review_recommendations (
  id text primary key,
  run_id text not null,
  recommendation text not null check (
    recommendation in (
      'hard_blocker_candidate',
      'changes_requested_average',
      'clean_good_candidate',
      'manual_quality_review_required'
    )
  ),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  hard_blocker_count integer not null default 0,
  objective_finding_count integer not null default 0,
  quality_proxy_count integer not null default 0,
  manual_check_count integer not null default 0,
  rationale_json text not null,
  created_at text not null,
  foreign key (run_id) references review_runs(id)
);

create table if not exists reviewer_overrides (
  id text primary key,
  run_id text not null,
  reviewer_id text,
  original_recommendation text not null,
  final_outcome text not null,
  override_reason text,
  created_at text not null,
  foreign key (run_id) references review_runs(id)
);

create table if not exists similarity_candidates (
  id text primary key,
  run_id text not null,
  compared_asset_id text,
  compared_url text,
  candidate_type text not null check (
    candidate_type in ('exact_duplicate', 'near_duplicate', 'same_creator_cluster', 'visual_similarity', 'content_similarity')
  ),
  score real not null,
  signals_json text not null,
  artifact_url text,
  created_at text not null,
  foreign key (run_id) references review_runs(id)
);

create index if not exists idx_similarity_candidates_run_id on similarity_candidates(run_id);
create index if not exists idx_similarity_candidates_score on similarity_candidates(score);

create table if not exists review_precedents (
  id text primary key,
  criterion_id text not null,
  source_run_id text,
  asset_id text,
  version_id text,
  resolved_label text not null,
  reasoning_summary text not null,
  evidence_json text not null,
  policy_snapshot_id text not null,
  approval_status text not null default 'proposed' check (
    approval_status in ('proposed', 'approved', 'rejected', 'deprecated')
  ),
  supersedes_precedent_id text,
  embedding_ref text,
  created_at text not null,
  reviewed_at text,
  reviewed_by text,
  foreign key (source_run_id) references review_runs(id),
  foreign key (policy_snapshot_id) references review_policy_snapshots(id),
  foreign key (supersedes_precedent_id) references review_precedents(id)
);

create index if not exists idx_review_precedents_criterion on review_precedents(criterion_id);
create index if not exists idx_review_precedents_approval on review_precedents(approval_status);
create index if not exists idx_review_precedents_policy on review_precedents(policy_snapshot_id);

create table if not exists precedent_retrieval_sets (
  id text primary key,
  run_id text not null,
  criterion_id text not null,
  policy_snapshot_id text not null,
  candidate_count integer not null default 0,
  retrieval_json text not null,
  artifact_url text,
  created_at text not null,
  foreign key (run_id) references review_runs(id),
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_precedent_retrieval_sets_run on precedent_retrieval_sets(run_id);
create index if not exists idx_precedent_retrieval_sets_criterion on precedent_retrieval_sets(criterion_id);

create table if not exists subjective_judgment_panel_runs (
  id text primary key,
  run_id text not null,
  criterion_id text not null,
  policy_snapshot_id text not null,
  precedent_retrieval_set_id text,
  panel_version text not null,
  status text not null check (status in ('shadow', 'completed', 'failed', 'blocked')),
  agreement_level text not null check (agreement_level in ('unknown', 'low', 'medium', 'high')),
  escalation_required integer not null default 1 check (escalation_required in (0, 1)),
  scores_json text not null,
  reasoning_json text not null,
  model_metadata_json text not null,
  cost_usd real,
  latency_ms integer,
  artifact_url text,
  created_at text not null,
  foreign key (run_id) references review_runs(id),
  foreign key (policy_snapshot_id) references review_policy_snapshots(id),
  foreign key (precedent_retrieval_set_id) references precedent_retrieval_sets(id)
);

create index if not exists idx_subjective_panel_runs_run on subjective_judgment_panel_runs(run_id);
create index if not exists idx_subjective_panel_runs_criterion on subjective_judgment_panel_runs(criterion_id);
create index if not exists idx_subjective_panel_runs_escalation on subjective_judgment_panel_runs(escalation_required);

create table if not exists subjective_judgment_panel_eval_runs (
  id text primary key,
  eval_set_version text not null,
  policy_snapshot_id text,
  criteria_json text not null,
  blind_cases_artifact_url text not null,
  private_answers_artifact_url text not null,
  panel_outputs_artifact_url text,
  scored_rows_artifact_url text,
  status text not null check (status in ('prepared', 'scored', 'failed', 'deprecated')),
  metrics_json text,
  promotion_gate_status text check (promotion_gate_status in ('blocked', 'candidate_for_human_review')),
  created_at text not null,
  scored_at text,
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_subjective_panel_eval_version on subjective_judgment_panel_eval_runs(eval_set_version);
create index if not exists idx_subjective_panel_eval_status on subjective_judgment_panel_eval_runs(status);

create table if not exists quality_band_readiness_runs (
  id text primary key,
  policy_snapshot_id text,
  eval_set_version text,
  schema_version text not null,
  review_posture text not null check (review_posture in ('shadow_calibration_only')),
  readiness_level text not null check (
    readiness_level in (
      'blocked_no_calibration',
      'creator_guidance_only',
      'shadow_only',
      'reviewer_assist_candidate',
      'quality_band_shadow_expansion_candidate'
    )
  ),
  promotion_gate_status text not null check (promotion_gate_status in ('blocked', 'candidate_for_human_review')),
  aggregate_metrics_json text not null,
  thresholds_json text not null,
  metric_snapshots_json text not null,
  gate_reasons_json text not null,
  input_exclusions_json text not null,
  notes_json text not null default '[]',
  artifact_url text,
  created_at text not null,
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_quality_band_readiness_policy on quality_band_readiness_runs(policy_snapshot_id);
create index if not exists idx_quality_band_readiness_level on quality_band_readiness_runs(readiness_level);
create index if not exists idx_quality_band_readiness_gate on quality_band_readiness_runs(promotion_gate_status);

create table if not exists quality_band_readiness_artifacts (
  id text primary key,
  readiness_run_id text not null,
  artifact_type text not null check (
    artifact_type in (
      'quality_band_readiness_summary',
      'quality_band_readiness_summary_markdown',
      'quality_band_readiness_ledger_sql',
      'quality_band_readiness_ledger_summary',
      'quality_band_readiness_artifact_manifest'
    )
  ),
  uri text not null,
  sha256 text not null,
  byte_size integer not null,
  media_type text,
  redaction_json text not null default '{}',
  created_at text not null,
  foreign key (readiness_run_id) references quality_band_readiness_runs(id)
);

create index if not exists idx_quality_band_readiness_artifacts_run on quality_band_readiness_artifacts(readiness_run_id);
create index if not exists idx_quality_band_readiness_artifacts_type on quality_band_readiness_artifacts(artifact_type);
create index if not exists idx_quality_band_readiness_artifacts_sha on quality_band_readiness_artifacts(sha256);

-- Quality-band readiness rows intentionally store calibration evidence only.
-- Do not add popularity, sales, views, favorites, or engagement columns here.

create table if not exists visual_quality_golden_cases (
  id text primary key,
  asset_id text,
  version_id text not null,
  golden_set_version text not null,
  case_label text not null check (
    case_label in (
      'approved_good',
      'approved_exceptional',
      'rejected_visual_quality',
      'rejected_technical_control',
      'rejected_app_or_guideline_control',
      'ambiguous_excluded'
    )
  ),
  normalized_buckets_json text not null,
  evidence_json text not null default '{}',
  reviewer_confirmed integer not null default 0 check (reviewer_confirmed in (0, 1)),
  reviewer_id text,
  evidence_artifact_url text,
  policy_snapshot_id text,
  status text not null default 'active' check (status in ('active', 'deprecated', 'proposed')),
  created_at text not null,
  deprecated_at text,
  deprecated_reason text,
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_visual_quality_golden_cases_version on visual_quality_golden_cases(golden_set_version);
create index if not exists idx_visual_quality_golden_cases_label on visual_quality_golden_cases(case_label);
create index if not exists idx_visual_quality_golden_cases_status on visual_quality_golden_cases(status);

create table if not exists visual_quality_feedback_aliases (
  id text primary key,
  raw_phrase text not null,
  canonical_bucket text not null,
  reviewer_id text,
  source_count integer not null default 1,
  confidence real,
  status text not null default 'proposed' check (status in ('proposed', 'active', 'deprecated', 'rejected')),
  evidence_json text not null,
  policy_snapshot_id text,
  created_at text not null,
  reviewed_at text,
  reviewed_by text,
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_visual_quality_aliases_bucket on visual_quality_feedback_aliases(canonical_bucket);
create index if not exists idx_visual_quality_aliases_status on visual_quality_feedback_aliases(status);
create index if not exists idx_visual_quality_aliases_reviewer on visual_quality_feedback_aliases(reviewer_id);

create table if not exists visual_quality_calibration_runs (
  id text primary key,
  policy_snapshot_id text not null,
  golden_set_version text not null,
  sample_window_start text,
  sample_window_end text,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  metrics_json text not null,
  proposed_changes_json text,
  created_at text not null,
  completed_at text,
  foreign key (policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_visual_quality_calibration_policy on visual_quality_calibration_runs(policy_snapshot_id);
create index if not exists idx_visual_quality_calibration_golden_set on visual_quality_calibration_runs(golden_set_version);

create table if not exists visual_quality_drift_events (
  id text primary key,
  calibration_run_id text not null,
  drift_signal text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  baseline_value real,
  observed_value real,
  threshold_value real,
  action_required text not null check (
    action_required in ('monitor', 'lower_confidence', 'open_calibration_review', 'block_policy_promotion')
  ),
  evidence_json text not null,
  created_at text not null,
  resolved_at text,
  foreign key (calibration_run_id) references visual_quality_calibration_runs(id)
);

create index if not exists idx_visual_quality_drift_run on visual_quality_drift_events(calibration_run_id);
create index if not exists idx_visual_quality_drift_signal on visual_quality_drift_events(drift_signal);
create index if not exists idx_visual_quality_drift_action on visual_quality_drift_events(action_required);

create table if not exists visual_quality_policy_proposals (
  id text primary key,
  calibration_run_id text,
  proposal_type text not null check (
    proposal_type in (
      'alias_addition',
      'alias_deprecation',
      'proxy_weight_adjustment',
      'confidence_threshold_adjustment',
      'golden_case_addition',
      'golden_case_deprecation',
      'bucket_definition_update'
    )
  ),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'applied')),
  proposal_json text not null,
  evidence_json text not null,
  approved_by text,
  approved_at text,
  applied_policy_snapshot_id text,
  created_at text not null,
  foreign key (calibration_run_id) references visual_quality_calibration_runs(id),
  foreign key (applied_policy_snapshot_id) references review_policy_snapshots(id)
);

create index if not exists idx_visual_quality_policy_proposals_status on visual_quality_policy_proposals(status);
create index if not exists idx_visual_quality_policy_proposals_type on visual_quality_policy_proposals(proposal_type);

create table if not exists visual_quality_proxy_snapshots (
  id text primary key,
  run_id text,
  source_url text not null,
  extraction_version text not null,
  features_json text not null,
  artifact_url text,
  created_at text not null,
  foreign key (run_id) references review_runs(id)
);

create index if not exists idx_visual_quality_proxy_snapshots_run on visual_quality_proxy_snapshots(run_id);
create index if not exists idx_visual_quality_proxy_snapshots_source_url on visual_quality_proxy_snapshots(source_url);
