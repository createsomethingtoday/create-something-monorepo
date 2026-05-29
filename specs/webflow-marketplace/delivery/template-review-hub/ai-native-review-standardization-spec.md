# AI-Native Template Review Standardization Spec

**Status:** Draft
**Date:** 2026-05-26
**Workflow:** Webflow Marketplace template review
**Primary goal:** Standardize agent-assisted template review so an agent can explain whether a submission is likely rejectable, average, good, or an exceptional candidate requiring human feature review.

## Summary

The review system should be AI-native first, not reviewer-text-first. Historical Airtable feedback is valuable calibration data, but it is not clean ground truth because approved records often contain earlier requested changes that were later fixed. The canonical system should therefore produce structured policy, evidence, and decision artifacts before asking a reviewer to approve, override, or write creator-facing feedback.

The first version should not attempt autonomous approval or rejection. It should produce standardized recommendations with evidence, caveats, and unresolved manual checks.

## Phase 1 Artifacts

Use these draft artifacts to keep the first implementation small:

- `ai-native-review-phase-1-subset.md` defines the initial deterministic subset and screenshot policy.
- `calibration-sampling-protocol.md` defines the one-by-one Asset Version sampling workflow for aligning expected status to Airtable outcomes.
- `rubric-codification-map.md` maps the official Webflow grading rubric into auto, partial, and manual evidence categories.
- `visual-quality-signal-standardization.md` captures the reviewer-dependent "outdated visual style" / low-quality visual signal and how to standardize it.
- `visual-quality-self-healing-loop.md` defines the guarded calibration loop for aliases, golden sets, drift, and policy proposals.
- `review-orchestration-model.md` defines the coordinator-plus-specialized-lanes architecture and the boundary between one model with tools and true subagents.
- `review-lane-contracts.md` defines each lane's allowed sources, outputs, forbidden outputs, failure modes, and escalation rules.
- `ai-reviewer-proposal-alignment.md` maps the stakeholder-facing AI Reviewer proposal into the artifact-first review architecture.
- `subjective-judge-panel-eval-harness.md` defines the blind eval set and scorer for shadow-mode judge-panel outputs.
- `execution-isolation-and-sandbox-policy.md` defines when E2B or another sandbox is required for untrusted template rendering.
- `published-site-sandbox-lane.md` defines the first evidence-only Dify/E2B bundle for rendered published-site checks.
- `rubric-reviewer-standardized-response-smoke-2026-05-27.md` records the first one-template standardized-response agent smoke.
- `template-review-secret-contract.md` defines Infisical-backed secret ownership and keeps keys out of sandbox artifacts.
- `validator-app-evidence-boundary.md` defines why the current Webflow Validation app is supplemental until access and persistence are guaranteed.
- `rule-catalog.phase1.json` defines the starter rule catalog.
- `review-ledger.phase1.sql` sketches the D1 tables for review runs, findings, recommendations, overrides, and similarity candidates.
- `phase1-expanded-calibration-audit-2026-05-26.md` records the first 25-record calibration result and the current stop condition before reviewer-facing ratings.

## Decision: Use D1 As The Review Evidence Store

Use the existing Airtable base as the operational reviewer surface and source of current asset/version status. Do not create a separate Airtable base as the canonical AI review database.

Use D1 for the AI-native review ledger:

- rule snapshots and policy versions
- review runs
- structured findings
- reviewer confirmations and overrides
- decision recommendations
- calibration aggregates
- similarity candidate metadata

Use R2 for bulky artifacts such as screenshots, crawled page snapshots, agent-controlled validator output, supplemental Validator app snapshots, and comparison reports.

Use Vectorize or another vector store for embeddings. D1 should store vector metadata and candidate links, not act as the vector search engine.

### Why Not A Separate Airtable Base

A second Airtable base would duplicate operational state and make status drift likely. It is also the wrong shape for structured rule snapshots, reproducible evidence ledgers, evaluator outputs, and similarity search. Airtable can still receive summarized results, links, and reviewer-facing statuses.

### Acceptable Pilot Shortcut

If D1 is not ready, add a linked `Review Findings` table in the current Airtable base as a temporary reviewer-facing mirror. Treat it as a UI bridge, not the long-term system of record.

## Source Inputs

This draft is based on:

- `https://webflow.com/templates/grading-rubric`
- `Submission Guidelines Updates V2.md`
- current `webflow-template-review-mcp` Airtable workflow
- current agent-controlled published-site validator behavior
- prior `webflow-site-analyzer-mcp` Designer/browser extraction capabilities
- recent Airtable sampling of Asset Versions and review feedback
- `/Users/micahjohnson/Downloads/Proposal - AI Reviewer.md`

Observed Airtable calibration from a recent sample:

- `Good` mostly maps to approved outcomes.
- `Low quality` mostly maps to rejected outcomes.
- `Satisfactory` is unstable and often indicates multi-cycle risk.
- reviewer distributions differ materially, so reviewer tendency should be context, not policy.
- freeform feedback frequently contains historical resolved issues, so it must not be used as a direct current-state label.

## Secret Handling

Use Infisical as the source of truth for the Airtable PAT when this moves beyond local operator runs. The runtime contract should continue to inject the value as `AIRTABLE_API_KEY`, matching the existing `webflow-template-review-mcp` environment interface.

Recommended posture:

- store the PAT in Infisical, not in repo files or checked-in config
- expose it to local calibration through `infisical run --env=prod --path=/ --include-imports=true -- ...`
- keep Dify-facing tools behind server-side MCP or Worker credentials; do not paste the Airtable PAT into Dify prompts, Dify app variables, browser code, or reviewer-facing artifacts
- rotate the PAT before production reviewer exposure if it has been shared through chat, clipboard, screenshots, or other broad surfaces

## Execution Isolation

Use `execution-isolation-and-sandbox-policy.md` for sandbox decisions. The short rule:

- model-only and artifact-only lanes do not need E2B
- live published-site rendering and runtime browser validation should use E2B or equivalent isolation
- no browser sandbox should receive Airtable PATs, OpenAI keys, reviewer credentials, or D1 write tokens

## Validator App Boundary

The Webflow Validation app should become a required submission step for new
templates. The enforceable first-class check is whether the submitted asset
contains the required injected Validator script marker and allowed script source.

That creates two separate evidence levels:

- script presence: first-class submission-contract evidence once the requirement is active
- validation results: first-class review findings only when the app writes a stable ledger/R2 artifact with policy-versioned rule IDs

The likely product surface is the Webflow Cloud App template form. The form can
require creators to use the Validator app, inject the script, and block or flag
submission when the script is missing. The review agent can then verify script
presence by reading the submitted asset or published review HTML.

Do not treat script presence as proof that the template passes validation. Do
not store raw bridge tokens in prompts, logs, or creator-facing artifacts. Store
marker presence, allowed script source evidence, version, hashes, timestamps,
and Asset Version linkage.

## Required Artifacts

### 1. Policy Artifact

Each review rule needs a stable schema:

```json
{
  "rule_id": "wf.template.required_license_page",
  "title": "License page is present and linked",
  "source": "submission_guidelines_v2",
  "severity": "major",
  "rejectability": "fixable",
  "coverage": "auto",
  "data_sources": ["published_site", "designer_metadata"],
  "evidence_required": ["page_url", "footer_link_url", "http_status"],
  "creator_feedback_template": "Please add and link a Licenses page that includes the required license language."
}
```

Coverage values:

- `auto`: deterministic enough for agent evidence.
- `partial`: useful signal, reviewer should validate before a final decision.
- `manual`: reviewer-owned judgment in the current system.

Rejectability values:

- `hard_blocker`: usually reject or stop review until fixed.
- `major_fix`: changes requested or rejection depending on severity and cycles.
- `minor_fix`: creator feedback, usually not rejectable alone.
- `quality_signal`: contributes to average/good/exceptional scoring.
- `manual_escalation`: cannot be decided by tools alone.

### 2. Evidence Artifact

Every tool run should emit normalized findings:

```json
{
  "finding_id": "run_123:finding_004",
  "rule_id": "wf.template.accessibility.alt_text",
  "status": "fail",
  "severity": "major",
  "source": "published_site_validator",
  "confidence": 0.86,
  "page_url": "https://example.webflow.io/about",
  "observed": "12 images missing alt text",
  "expected": "Important images have alt text or are marked decorative",
  "artifact_url": "r2://template-review/runs/run_123/alt-text.json",
  "resolution_state": "open"
}
```

Resolution states:

- `open`
- `resolved`
- `waived`
- `false_positive`
- `needs_human_review`

### 3. Decision Artifact

The agent should return a recommendation, not a final official decision:

```json
{
  "recommendation": "changes_requested_average",
  "quality_band": "average",
  "confidence": "medium",
  "hard_blockers": [],
  "major_findings": ["wf.template.responsive.horizontal_scroll"],
  "manual_checks_remaining": ["visual_quality", "asset_licensing"],
  "reviewer_action": "review_evidence_then_request_changes_or_override"
}
```

## Rating Bands

### Likely Rejected

Use when there is at least one hard blocker or strong below-bar signal:

- inaccessible or unusable submission
- severe functional failure
- unsupported or risky custom code
- legacy interaction policy violation where current policy makes it rejectable
- trademark, prohibited content, or licensing issue
- exact or near-exact duplicate submission
- low-quality UI/UX pattern that is unlikely to be repaired in normal review

### Average

Use for normal review cases:

- no decisive hard blocker
- enough issues that the template is not cleanly good
- issues are likely fixable through normal feedback
- quality is acceptable but not clearly differentiated

This roughly corresponds to `Satisfactory` or iterative `Good` cases, but should not inherit those Airtable labels blindly.

### Good

Use when:

- hard blockers are absent
- published-site and Designer evidence are mostly clean
- manual or screenshot evidence supports solid layout, typography, responsiveness, and usability
- content and CMS/ecommerce implementation fit the selected template category

### Exceptional Candidate

Use only as an escalation label:

- all blocker evidence is clean
- quality evidence is strong across layout, hierarchy, typography, interaction, category fit, conversion readiness, and buyer usability
- the template is distinct from existing marketplace and same-creator submissions
- reviewer or lead human review is still required before featuring

## Codification Map

### Good First Automation Targets

- required utility pages and discoverability
- noindex on License and Changelog pages
- SEO title formula on homepage
- heading structure and H1 count
- missing alt text signals
- broken links and empty links
- form labels and form field type signals
- placeholder and lorem ipsum signals
- horizontal scroll and severe responsive failures
- custom code and script policy signals
- legacy IX2 and GSAP/custom-code policy checks
- CMS item counts, slugs, and field naming when Designer metadata is available
- ecommerce cart/product/category/checkout configuration when Designer metadata is available
- template name uniqueness against known marketplace records

### Partial Automation Targets

- visual balance
- layout uniqueness
- hierarchy quality
- typography quality
- image subject obstruction
- interaction quality
- conversion quality
- brand and content fit for category
- accessibility beyond simple structural signals
- asset licensing and trademark risk

### Manual For Now

- final approval
- final rejection
- feature/exceptional decision
- legal/licensing judgment
- subjective design quality override
- whether a near-duplicate is unacceptable flooding versus a legitimate variation

## Subjective Judge Panel

The external AI Reviewer proposal recommends a panel of three LLM judges for subjective rubric criteria. Keep that concept, but treat it as a later subjective lane rather than the Phase 1 decision engine.

The panel may score criteria such as visual design quality, hierarchy, originality, polish, copy quality, and coherence only after it receives:

- a locked rubric criterion
- policy snapshot ID
- deterministic findings
- normalized case context
- visual proxy artifact
- approved precedents for the same criterion
- explicit escalation threshold

The panel must emit criterion-level outputs, not a final review outcome:

- criterion score
- confidence
- agreement level
- evidence references
- disagreement summary
- escalation flag
- model, cost, and latency metadata

Run this panel in shadow mode first. Promote a criterion only after held-out evals show acceptable judge-vs-human agreement, low false approval risk, low false rejection risk, and stable escalation behavior.

## Historical Feedback Use

Airtable review feedback should be normalized into a taxonomy:

- `technical_requirements`
- `guidelines_compliance`
- `accessibility`
- `responsive_design`
- `typography`
- `graphic_design`
- `layout_design_quality`
- `interaction_design`
- `conversion_best_practices`
- `overall_ux`
- `site_optimization`
- `similarity_or_duplicate`

The normalized output should include:

- primary bucket
- up to three secondary tags
- severity
- predicted outcome
- review-cycle risk
- reviewer-confirmed final state

Do not train or evaluate against freeform feedback text unless the finding state is known.

## Similarity And Flooding

Similarity should be a multi-signal candidate and rerank system. A single embedding score is not enough.

Signals to capture:

- screenshot embeddings for visual similarity
- DOM and section-order fingerprints
- page-set and sitemap signatures
- CSS/style token fingerprints for colors, typography, spacing, layout rhythm
- semantic embeddings for page content and section labels
- asset hashes and perceptual hashes
- template name, category, tag, and creator history
- same-creator submission clusters over time

Workflow:

1. Ingest submitted template into corpus.
2. Generate fingerprints and embeddings.
3. Retrieve candidate matches from vector and hash indexes.
4. Rerank candidates using deterministic features.
5. Return comparison evidence and reason codes.
6. Escalate near-duplicates to human review.

Automatic rejection should be limited to exact or near-exact duplicate evidence with strong provenance. Flooding policy needs explicit Marketplace thresholds before automation enforces it.

## Proposed D1 Schema Sketch

```sql
create table review_policy_snapshots (
  id text primary key,
  policy_version text not null,
  source_hash text not null,
  created_at text not null,
  rules_json text not null
);

create table review_runs (
  id text primary key,
  asset_id text,
  version_id text,
  published_url text,
  policy_snapshot_id text not null,
  status text not null,
  created_at text not null,
  completed_at text
);

create table review_artifacts (
  id text primary key,
  run_id text not null,
  artifact_type text not null,
  source_lane text not null,
  uri text not null,
  sha256 text not null,
  byte_size integer not null,
  media_type text,
  redaction_json text not null,
  created_at text not null
);

create table review_findings (
  id text primary key,
  run_id text not null,
  rule_id text not null,
  status text not null,
  severity text not null,
  coverage text not null,
  confidence real,
  evidence_json text not null,
  artifact_url text,
  resolution_state text not null default 'open'
);

create table review_recommendations (
  id text primary key,
  run_id text not null,
  recommendation text not null,
  quality_band text not null,
  confidence text not null,
  rationale_json text not null,
  created_at text not null
);

create table reviewer_overrides (
  id text primary key,
  run_id text not null,
  reviewer_id text,
  original_recommendation text not null,
  final_outcome text not null,
  override_reason text,
  created_at text not null
);

create table similarity_candidates (
  id text primary key,
  run_id text not null,
  compared_asset_id text,
  compared_url text,
  candidate_type text not null,
  score real not null,
  signals_json text not null,
  artifact_url text,
  created_at text not null
);
```

The expanded planning schema in `review-ledger.phase1.sql` also includes:

- `review_precedents` for human-approved rubric precedents and supersession.
- `precedent_retrieval_sets` for criterion-scoped retrieval results.
- `subjective_judgment_panel_runs` for shadow-mode judge-panel scores, agreement, escalation, model metadata, cost, and latency.
- `subjective_judgment_panel_eval_runs` for blind eval manifests, private answers, panel outputs, scored rows, metrics, and promotion gate status.
- visual-quality calibration tables for aliases, golden cases, drift events, and policy proposals.

## Airtable Integration

Keep Airtable writes narrow:

- current recommendation summary
- link to review run artifact
- count of open hard blockers
- count of open major findings
- similarity flag status
- reviewer-approved feedback
- final reviewer decision

Avoid pushing every raw finding into Airtable unless the team needs a reviewer-facing table. D1 plus R2 should keep the durable audit trail.

## Implementation Sequence

1. Convert the guidelines into a rule catalog with `auto`, `partial`, and `manual` coverage labels.
2. Create the D1 review ledger and R2 artifact convention.
3. Build a read-only review-run writer that records current agent-controlled validator output as normalized findings.
4. Add reviewer confirmation and override capture.
5. Backfill a sample of historical Airtable decisions into the taxonomy for calibration.
6. Run evals against historical/current submissions without exposing new Dify actions.
7. Prepare the subjective judge-panel eval harness for locked criteria.
8. Add approved-precedent retrieval for locked rubric criteria.
9. Widen calibration slices with reviewer-balanced sampling and reviewer-bias reports.
10. Run the subjective judge panel in shadow mode for selected criteria.
11. Only after calibration, expose a reviewer-facing recommendation tool.
12. Add similarity candidate generation and human review flags.

## Current Shadow Harnesses

- `published-site:sandbox:e2b-calibration` captures published-site evidence for a private Airtable-linked subset without exposing outcomes to the sandbox.
- `validator:bridge:check` verifies the required Validator app bridge script on a submitted or published template without storing raw bridge tokens.
- `validator:results:normalize` converts persisted Validator app results into ledger-ready findings without emitting final decisions or creator-facing feedback.
- `rubric:reviewer:dry-run` builds a single-case standardized rubric prompt and can run direct OpenAI when quota is available.
- `rubric:reviewer:batch` runs the standardized reviewer over a selected subset and scores outputs against private outcomes only after response generation.
- `rubric:reviewer:score` applies promotion gates to shadow reviewer batch outputs: minimum sample size, provider failures, safety failures, false approvals, false rejections, missed exceptional candidates, and escalation rate.
- `rubric:reviewer:eval` runs the provider-independent shadow eval chain from an existing calibration directory: packet generation, reviewer batch, and promotion-gate scoring.
- `openai:multimodal:preflight` checks direct OpenAI text plus image-input readiness before running full multimodal reviewer evals.
- The direct OpenAI reviewer retries transient 408/409/429/5xx or network failures up to three attempts before failing closed.
- `exceptional:lane:run` runs the narrow exceptional-candidate specialist lane. It can only emit `exceptional_human_review_candidate`, `not_exceptional_enough`, or `insufficient_exceptional_evidence`.
- `exceptional:lane:score` gates that specialist lane on false exceptional routing, approved-good over-promotion, missed exceptional candidates, provider failures, safety failures, and image-input coverage.
- `calibration:phase1 --balance-reviewers` creates a widened blind/private sample while using reviewer identity only as private sampling-balance metadata.
- `calibration:reviewer-bias` reports reviewer concentration, reviewer-correlated visual-language rates, and model alignment by reviewer so prompt tuning can rebalance samples instead of learning reviewer-specific policy.
- `rubric-reviewer-standardized-response-smoke-2026-05-27.md` records the first single-case standardized response smoke.
- `rubric-reviewer-batch-agent-smoke-2026-05-27.md` records the first four-case Dify shadow batch and the no-tool retry.
- `multimodal-evidence-smoke-2026-05-27.md` records the first two-case, two-page, desktop/mobile screenshot packet and direct OpenAI quota blocker.
- `multimodal-8case-shadow-eval-2026-05-27.md` records the first eight-case stratified multimodal packet, dry-run gate, Dify-agent gate, OpenAI readiness, missed-exceptional scorer gate, exceptional-recall prompt calibration, and the false-approval guardrail regression.
- `balanced-50-multimodal-calibration-2026-05-27.md` records the first reviewer-balanced 50-case E2B evidence harvest, the Automatia/Introx appeal consistency case, and the current lane-boundary finding.
- `multimodal:packet` packages a calibration run into blind/private JSONL files plus contact sheets, with copied screenshot artifacts, hashes, and image dimensions.

## Current Architecture Finding

The eight-case multimodal eval shows that one broad reviewer prompt can be made safer or more sensitive, but not yet both:

- conservative prompts avoid false approvals but miss approved-exceptional cases
- exceptional-sensitive prompts can recognize standout cases but over-promote rejected or changes-requested cases
- visual-risk guardrails reduce over-promotion but again dampen exceptional recall

Keep the primary reviewer conservative. Move exceptional routing into a separate specialist lane or subjective judge panel that only runs after deterministic and visual-risk gates have cleared. The specialist may emit `exceptional_human_review_candidate`, but never approval, rating, or featured decisions.

The first standalone `exceptional_candidate` lane confirmed the safer failure mode: in the full eight-case OpenAI run it produced zero false exceptional routes, zero approved-good over-promotions, and recovered one of two approved-exceptional canaries. It still missed one approved-exceptional case, so the gate remains blocked. The next improvement should be approved-exceptional precedent retrieval and category-aware positive examples, not further broad-prompt relaxation.

Reviewer-bias analysis should sit between historical feedback and prompt tuning. The current eight-case outcome slice is too concentrated around one reviewer to justify subjective threshold changes by itself. Reviewer identity is useful for finding skew, adding counter-samples, and normalizing wording such as "outdated visual style." It must not become a policy branch or a model instruction to imitate or counteract a named reviewer.

## Open Questions

- What exact Marketplace threshold turns a near-duplicate into flooding?
- Should `average` map to creator-facing language, or remain an internal quality band?
- Which reviewer or lead owns feature/exceptional escalation?
- Which guideline source is canonical when the local draft and public Webflow pages differ?
- Should resolved findings be stored in Airtable for reviewer visibility or only in D1?
- What per-criterion judge-panel convergence threshold is acceptable before escalation?
- Which subjective criteria are safe enough for the first shadow-mode panel eval?
