# Review Orchestration Model

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `ai-native-review-standardization-spec.md`, `ai-native-review-phase-1-subset.md`, `review-lane-contracts.md`, `visual-quality-proxy-extraction-plan.md`, `review-ledger.phase1.sql`, `ai-reviewer-proposal-alignment.md`, `subjective-judge-panel-eval-harness.md`, `execution-isolation-and-sandbox-policy.md`, `published-site-sandbox-lane.md`, `template-review-secret-contract.md`, `validator-app-evidence-boundary.md`

## Decision

Use one review coordinator with specialized lanes.

Do not build a single free-form agent that reads every field, crawls every page, applies every policy, judges visual taste, checks similarity, writes feedback, and decides a final rating in one context window.

Also do not start with a loose swarm of autonomous agents. The stable shape is:

```text
review coordinator
  -> deterministic tools
  -> specialized lane workers
  -> normalized evidence artifacts
  -> recommendation composer
  -> human reviewer / lead gate
```

The coordinator can be a high-capability GPT-5.5-class model. The stability should come from scoped lanes, schemas, ledgers, policy snapshots, and evals rather than from trusting a larger model to keep the whole review standard in working memory.

## How The AI Reviewer Proposal Fits

The companion AI Reviewer proposal recommends deterministic checks plus a three-judge LLM panel for subjective rubric criteria. This orchestration model keeps that product direction, but changes where the panel sits in the execution graph.

The judge panel should be a specialized lane:

```text
deterministic evidence
  -> precedent retrieval
  -> subjective judgment panel
  -> criterion-level convergence or escalation
  -> recommendation composer
```

It should not be the first system to inspect a template, and it should not own the final decision. The panel becomes useful after rubrics, evidence artifacts, and approved precedents are available. Before that, it is a shadow-mode evaluator that creates calibration evidence.

## Why Specialized Lanes Are More Stable

The review task has multiple evidence surfaces with different failure modes:

| Lane | Data surface | Main failure mode | Stable output |
| --- | --- | --- | --- |
| Intake and Airtable context | Assets, Asset Versions, prior reviews, reviewer identity | historical feedback may be stale or reviewer-dependent | normalized case context |
| Published-site validation | HTML/CSS/JS/assets/runtime | false hard blockers from mutable current site state | objective findings |
| Designer/Webflow Way validation | Designer metadata, variables, components, styles, pages | unavailable or partial Designer data | structural checklist findings |
| Validator app submission contract | submitted asset HTML, script marker, script source | script presence can be confused with validation result quality | requirement finding when policy is active |
| Validator app supplemental results | persisted or manually run app report | human launch may be required unless output persistence is enforced | supporting guidance or persisted objective findings |
| Visual quality | screenshots, CSS, layout fingerprints, reviewer feedback | subjective taste and drifting standards | manual-quality buckets and proxy evidence |
| App/guideline review | app metadata, submitted package, API usage, marketplace rules | published URL is insufficient | app/guideline findings |
| Similarity/flooding | existing marketplace inventory, same-creator history, embeddings, screenshots | over-blocking legitimate template variations | similarity candidates, not final duplicate decisions |
| Precedent retrieval | human-approved prior resolutions, rubric criterion embeddings | retrieving stale or unapproved decisions | criterion-scoped precedent set |
| Appeal/equity comparison | rejected template, creator-cited examples, current published evidence, prior outcomes | comparing objective bugs to subjective quality bands without policy context | evidence-only consistency questions |
| Subjective judgment panel | rubric criterion, evidence artifacts, precedents, screenshots | model consensus on wrong or stale taste | criterion score plus escalation flag |
| Calibration/eval | hidden outcomes, golden cases, overrides | learning reviewer phrasing instead of policy | metrics, drift events, proposals |
| Feedback composer | confirmed findings and templates | writing beyond evidence or implying final authority | creator-facing draft feedback |

Putting all of this into one model call increases context mixing. A visual note can contaminate a hard-blocker decision. App-review boilerplate can contaminate visual-style aliases. Historical resolved feedback can be mistaken for current state. Specialized lanes reduce those risks because each lane has a smaller contract and narrower permission boundary.

## What The Coordinator Owns

The coordinator owns:

- selecting which lanes to run
- enforcing policy version and artifact IDs
- combining normalized findings
- identifying unresolved manual checks
- producing the internal recommendation label
- refusing to turn partial evidence into final reviewer language

The coordinator does not own:

- raw Airtable mutation
- final approval or rejection
- final Exceptional/featured decision
- silent policy updates
- unapproved alias or golden-case promotion

## Lane Contracts

Concrete lane contracts live in `review-lane-contracts.md`.

Each lane should have:

- a name
- a data-source allowlist
- a policy snapshot
- an input schema
- an output schema
- a confidence model
- a failure mode label
- eval cases
- an escalation rule

Example:

```json
{
  "lane_id": "visual_quality_proxy",
  "allowed_sources": ["published_html", "published_css", "section_fingerprint"],
  "output": "visual_proxy_features.v0.1",
  "may_emit": ["proxy_signal", "manual_visual_quality_finding"],
  "must_not_emit": ["final_rejection", "good_rating", "exceptional_rating"],
  "escalates_to": "manual_quality_review_required"
}
```

## One Agent With Tools vs Specialized Subagents

### One Agent With Tools Is Manageable When

- the task is a single template review
- the agent receives structured artifacts instead of raw broad context
- deterministic tools do most extraction
- the model only composes evidence and asks for human review
- the recommendation labels remain internal and cautious
- the run has a strict schema and policy snapshot

### Specialized Subagents Are More Stable When

- multiple data surfaces must be inspected in parallel
- the lane needs different evals or thresholds
- the lane has different access permissions
- the lane is expensive or long-running
- errors in one lane should not contaminate another lane
- reviewer-facing language must be generated only from confirmed findings

The eight-case multimodal rubric eval reinforces this split. A single broad prompt became safer when visual-risk guardrails were added, but then lost exceptional recall. When the prompt was tuned for exceptional recall, it over-promoted a historically rejected low-quality case and a changes-requested case. Treat this as evidence that the primary reviewer should stay conservative, while exceptional routing should be handled by a separate specialist lane with its own golden-set gate.

## Recommended Pilot Shape

Start with a single coordinator and lane-shaped tools. Add true subagents only where they materially improve reliability or parallelism.

Phase 1:

1. Coordinator calls deterministic tools:
   - Airtable context sampler
   - agent-controlled published-site validators
   - visual proxy extractor
   - calibration comparator
2. Coordinator writes one normalized recommendation artifact.
3. Human reviewer confirms or overrides.
4. Optional: prepare the subjective judge-panel eval harness from locked cases.
5. Optional: run the subjective judgment panel in shadow mode for locked criteria, storing outputs only as calibration artifacts.

Phase 2:

1. Split long-running or high-risk lanes into workers:
   - visual-quality worker
   - app/guideline worker
   - similarity worker
   - appeal/equity comparison worker
   - precedent retrieval worker
   - subjective judgment panel worker
   - feedback-composer worker
2. Store each lane output in D1 under the same review run.
3. The coordinator only composes from lane outputs.

Phase 3:

1. Add parallel lane execution.
2. Add lane-specific eval gates.
3. Add reviewer-facing summaries only after golden-set stability.

## Sandbox Boundary

Use E2B or equivalent isolation for lanes that render or execute untrusted published template pages. Do not put every lane in a sandbox.

Sandbox-backed:

- published-site runtime validation
- screenshot extraction
- browser interaction checks
- package-code execution or bundle inspection

Artifact-only:

- subjective judge panel
- recommendation composer
- calibration scorer
- feedback composer

This keeps browser and network risk isolated without adding cost and operational complexity to model-only lanes.

## Dify Implementation Guidance

In Dify, prefer a workflow graph over a single open-ended agent prompt:

```text
input URL / Asset Version
  -> context fetch node
  -> Validator app submission-contract node
  -> agent-controlled deterministic validator nodes
  -> visual proxy node
  -> optional Validator app results node when persisted or already available
  -> optional precedent retrieval node
  -> optional subjective judge panel node
  -> optional app/guideline node
  -> optional similarity node
  -> optional appeal/equity comparison node
  -> coordinator LLM node
  -> coordinator exposure output gate
  -> reviewer summary node
```

Use subagents for lane work only when the lane requires separate context or independent reasoning. Do not let every node become an unrestricted agent.

The Dify-facing coordinator should receive:

- normalized Airtable context
- Validator app script-presence finding when the requirement is active
- normalized agent-controlled validator findings
- Validator app result snapshots only when persisted or already available
- visual proxy findings
- approved precedent retrieval results
- subjective panel outputs when enabled
- similarity candidates
- policy snapshot ID
- calibration warnings

It should not receive:

- raw Airtable PAT
- raw Validator bridge tokens
- broad unfiltered Airtable dumps
- unbounded screenshots without extracted evidence
- missing manual Validator app output as a defect
- unapproved policy proposals as active policy

The coordinator should not directly emit reviewer-visible or creator-visible content. It should first produce a small output request that names `requested_outputs`, `requested_lanes`, `input_sources`, `intended_audience`, and `human_gate_confirmations`; the output gate should then allow or block the emission against the current coordinator exposure policy.

The reusable fixture contract is `fixtures/coordinator-output-requests/manifest.json` in `packages/webflow-template-review-mcp`. Run `pnpm --filter @create-something/webflow-template-review-mcp coordinator:contract-smoke` before changing Dify coordinator output wiring.

## Stability Rule

The model can be powerful, but the review standard should live in artifacts.

Stable:

- policy snapshots
- lane schemas
- deterministic tools
- D1 review ledger
- quality-band readiness artifacts
- coordinator exposure policy artifacts
- golden-set canaries
- approved precedent sets
- shadow-mode judge-panel evals
- reviewer override records

Unstable:

- one long prompt with all rules
- raw historical feedback as ground truth
- model-only visual taste scoring
- silent self-healing
- reviewer-facing final decisions before evals

## Recommendation

Use GPT-5.5-class orchestration for coordination and synthesis, not as a monolithic judge.

The most stable architecture is a coordinator-plus-lanes system where the coordinator can be very capable, but each lane remains independently measurable, reviewable, and replaceable.
