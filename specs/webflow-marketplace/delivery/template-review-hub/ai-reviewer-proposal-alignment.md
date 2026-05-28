# AI Reviewer Proposal Alignment

**Status:** Draft
**Date:** 2026-05-26
**External companion:** `/Users/micahjohnson/Downloads/Proposal - AI Reviewer.md`
**Related artifacts:** `ai-native-review-standardization-spec.md`, `review-orchestration-model.md`, `review-lane-contracts.md`, `visual-quality-proxy-canary-audit-2026-05-26.md`, `subjective-judge-panel-eval-harness.md`

## Purpose

Rohan's proposal and this repo's review-standardization work are compatible, but they answer different layers of the system.

The proposal describes the stakeholder-facing product shape:

- deterministic objective checks
- a panel of three LLM judges for subjective rubric criteria
- per-criterion convergence or escalation
- a precedent library that learns from human resolutions
- Airtable as the Phase 1 review surface

The repo artifacts define the safety layer needed to make that product shape reliable:

- locked rubric snapshots
- lane contracts
- read-only agent-controlled validator outputs
- D1 evidence ledger
- calibration reports
- golden-set canaries
- human-approved policy promotion

The merged architecture should keep the proposal's judge-panel idea, but place it behind the artifact and calibration gates already defined here.

## Compatibility Decision

Adopt the proposal as the product direction for the reviewer system, with one important implementation constraint:

**The three-judge panel is a subjective judgment lane, not the primary review engine.**

It should run only after deterministic checks, context normalization, and precedent retrieval have produced structured artifacts. The panel may score subjective rubric criteria and explain uncertainty. It must not bypass the review ledger, promote new policy, write final decisions, or create creator-facing rejection language without a human gate.

## Where The Proposal Maps Cleanly

| Proposal concept | Repo artifact | Alignment |
| --- | --- | --- |
| Deterministic objective checks | `rule-catalog.phase1.json`, `ai-native-review-phase-1-subset.md` | Already the Phase 1 core. |
| Subjective LLM judges | `review-orchestration-model.md`, `review-lane-contracts.md` | Add as a `subjective_judgment_panel` lane. |
| Per-criterion convergence routing | `review_recommendations`, lane conflicts, manual checks | Store criterion-level scores and escalation flags before composing a recommendation. |
| Human resolution becomes precedent | `reviewer_overrides`, proposed precedent tables | Add explicit precedent records, approval status, and supersession. |
| Airtable review surface | `ai-native-review-standardization-spec.md` | Keep Airtable as the operational surface and mirror, not the canonical AI ledger. |
| Vector DB precedent retrieval | similarity/vector guidance | Use a vector store for retrieval, with D1 metadata and approval state. |
| Held-out eval set | `calibration-sampling-protocol.md`, visual canaries | Required before reviewer-facing automation. |
| Cost and latency controls | runbook plus future observability | Add panel call counts, spend caps, and fallback behavior to implementation planning. |

## Adjusted Phase 1 Shape

The proposal calls Phase 1 a production system, not a throwaway prototype. That is compatible with this spec if "production" means durable read-only or reviewer-assisted operation first, not autonomous final decisions.

Recommended Phase 1:

1. Use Airtable as the reviewer workspace and current status source.
2. Use D1 as the durable AI-native evidence ledger.
3. Use deterministic validators for objective criteria.
4. Use the visual-quality proxy lane as evidence only.
5. Add a precedent retrieval lane that returns only human-approved precedents.
6. Add a three-judge subjective panel in shadow mode for selected manual criteria.
7. Store criterion-level judge outputs, convergence, cost, latency, and escalations.
8. Compare panel recommendations against human outcomes before enabling reviewer-facing summaries.

This keeps the proposal's speed-to-value while avoiding the unstable path of asking LLM judges to decide taste without versioned policy, controls, or approved precedents.

## Rubric Lock Is The Gate

The screenshot note is correct: rubrics are key.

The judge panel cannot be stable until the rubric is locked at the criterion level. Each subjective criterion needs:

- canonical name
- scoring scale
- pass/fail or band threshold
- examples of approved `Average`, approved `Good`, approved `Exceptional`, and rejected cases
- allowed evidence sources
- escalation threshold
- feedback constraints
- owner for human overrides

Without this, the panel will learn reviewer tone, category norms, and recent feedback phrasing instead of policy.

## Judge Panel Contract

The three-judge panel should be implemented as a lane with a strict contract:

Inputs:

- rubric criterion
- policy snapshot ID
- normalized case context
- deterministic findings
- visual proxy artifact
- screenshots or screenshot-derived observations
- retrieved human-approved precedents
- category and template-type context

Outputs:

- criterion score
- confidence
- evidence references
- agreement level
- disagreement summary
- escalation required flag
- cost and model metadata

Forbidden outputs:

- final approval
- final rejection
- final Exceptional or featured decision
- unapproved new precedent
- creator-facing feedback that is not tied to confirmed findings
- policy changes

## Precedent Library Contract

The precedent library should be treated as policy-adjacent data, not freeform memory.

Every precedent needs:

- criterion ID
- source Asset Version or review run
- human reviewer or calibration reviewer
- final resolved label
- reasoning summary
- evidence references
- policy snapshot ID
- approval status
- supersession status
- embedding metadata

Only approved precedents should be retrieved into judge prompts. Proposed precedents can be stored, but they must not influence review until a human promotes them.

## Data Store Decision

The proposal recommends Airtable as the Phase 1 data store and human-review surface. The repo recommendation remains:

- **Airtable:** operational reviewer surface, current Assets and Asset Versions status, reviewer workflow mirror.
- **D1:** canonical review ledger for runs, findings, panel outputs, overrides, policy snapshots, and precedent metadata.
- **R2:** bulky artifacts such as screenshots, crawls, validator reports, and judge transcripts if retained.
- **Vector store:** precedent and similarity retrieval indexes.

If implementation speed requires an Airtable-only pilot, keep it explicitly temporary and mirror only summaries. Do not make Airtable the long-term source of truth for policy snapshots, judge traces, or reproducibility.

## TypeScript vs Python

The proposal recommends a Python orchestrator. The repo already has TypeScript/Node review tooling and Cloudflare-oriented delivery patterns.

Recommended split:

- Keep TypeScript for the existing MCP server, normalized validators, D1/R2 writes, and Dify/Worker-facing tool surfaces.
- Use Python only where it materially helps: Lighthouse/axe orchestration wrappers, notebook-style eval analysis, image/vision experiments, or provider SDK experiments.
- Put all cross-language behavior behind lane contracts and artifact schemas.

The durable boundary is not the language. The durable boundary is the lane artifact.

## Visual Quality Implication

The proposal's judge panel is most tempting for visual quality, but this is also the least stable criterion.

Current canary evidence shows the visual proxy lane finds signals in rejected visual-quality cases, but also produces medium proxy load on approved controls. That means the visual lane can support human review, but should not yet auto-reject, auto-rate `Good`, or auto-flag `Exceptional`.

The judge panel should therefore start in shadow mode for visual quality:

- score the criterion
- cite precedent and evidence
- report disagreement
- escalate when judges diverge
- never decide the final outcome

## Immediate Build Step

The next concrete step is not to build the full panel. It is to run the judge-panel eval harness:

1. Select 20-30 locked-rubric cases with human outcome and reasoning.
2. Define two or three subjective criteria to test first.
3. Retrieve only approved precedents.
4. Run panel outputs in shadow mode.
5. Measure judge-vs-human agreement, false approval risk, false rejection risk, escalation rate, cost, and latency.
6. Promote only the criteria that pass the eval gate.

`subjective-judge-panel-eval-harness.md` and the `panel:eval:prepare`, `panel:eval:run`, and `panel:eval:score` scripts define this path. Provider-backed live mode is opt-in and still writes shadow artifacts only.

This turns the proposal into an implementable system without letting subjective automation outrun the standardization work.
