# OpenAI Agents SDK Sandbox Pilot Selection

Date: 2026-04-17
Scope: choose the single workflow for the first 30-day sandbox pilot

## Decision

Choose **Webflow Marketplace Submission Preflight** as the first sandboxed workflow pilot.

This is the strongest choice because it combines:

- documented business pain
- clear human approval boundaries
- obvious artifact and workspace needs
- the highest code readiness in the repo among the candidate workflows

This should be sold as a `Policy OS Trial` workflow, not as a generic audit tool.

## The workflow

### Working name

**Policy OS Trial: Webflow Marketplace Submission Preflight**

### User

- primary buyer: Webflow template or app teams trying to reduce review cycles
- secondary operator: internal reviewer or QA lead

### Job to be done

Before a template submission goes into review, run a governed preflight that:

- crawls the published site
- checks preview and designer signals
- captures screenshots and structured evidence
- scores failure patterns against current policy
- produces a creator-facing fix list and reviewer-facing evidence bundle

### Why this matters

The repo already shows that the biggest SLA problem is not reviewer speed. It is repeat review cycles.

`docs/TEMPLATE_REVIEW_SLA_PRESENTATION_2026-03-06.md` shows:

- `0` cycles: median `5.1 days`
- `1` cycle: median `10.6 days`
- `2+` cycles: median `18.6 days`

It also states the highest-leverage intervention is reducing multi-cycle approvals and repeat submissions. That makes preflight quality control the clearest business wedge.

## Why this wins against the alternatives

### Candidate comparison

| Workflow | Business pain | Sandbox-specific advantage | Code readiness | Why not first |
|---|---|---:|---:|---|
| **Webflow Marketplace Submission Preflight** | High | High | **High** | Chosen |
| `agency--proposal-rfp-drafter` | High | High | Low | Strong idea, but mostly playbook-level in this repo today |
| `agency--client-reporting-briefing` | Medium | Low | Medium | Useful recurring service, but sandbox is not the real differentiator |
| Half Dozen inbox / dedup / watchdog | Medium | Low | High | Good MCP orchestration proof, weak reason to introduce sandbox compute |

### Why not Proposal / RFP Drafter first

`packages/playbook-mcp/src/outcome-playbooks.ts` defines `agency--proposal-rfp-drafter` clearly, and it maps well to the OpenAI dataroom story:

- uploaded file set
- requirement extraction
- draft generation
- verification against checklist

But in this repo it is still mostly a playbook and packaging surface, not a production-ready workflow stack. Choosing it first would turn the pilot into a greenfield build instead of a leverage play.

### Why not Client Reporting first

Reporting is commercially real and recurring, but sandbox execution is not the main value unlock. The differentiated value there is synthesis, auditability, and approval posture, not controlled workspace execution.

### Why not Half Dozen first

The Half Dozen scenarios already prove MCP orchestration well. They do not strongly justify native sandbox compute, mounted workspaces, or isolated artifact generation. They are better as orchestration proofs than as sandbox wedge proofs.

## Codebase grounding

This workflow already has a real execution spine across multiple packages.

### 1. Automated published + preview review already exists

`packages/webflow-site-analyzer-mcp/README.md` and `packages/webflow-site-analyzer-mcp/src/index.ts` already expose:

- `run_template_review`
- `enqueue_template_review`
- `get_template_review_job`
- `list_template_review_jobs`

The analyzer already supports:

- browser-backed extraction
- screenshot capture
- published-site crawl
- policy versioning
- bounded async review jobs

### 2. A queue-based review API already exists

`packages/webflow-review/README.md` and `packages/webflow-review/workers/orchestrator/src/index.ts` already provide:

- single-page review
- full project review
- queue-backed background processing
- progress tracking
- persisted findings

### 3. Review workflow and queue semantics already exist

`packages/webflow-template-review-mcp/README.md` and `packages/webflow-template-review-mcp/src/tools.ts` already provide:

- queue listing
- review context
- reviewer-safe assignment and status writes
- bounded review mutations against confirmed Airtable fields

### 4. There is already an integration gap worth productizing

`packages/webflow-template-review-mcp/src/prompts.ts` references analyzer-backed review steps such as:

- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`
- `template_review_list_analyzer_reviews`

Those names do not currently exist as implemented tools in the package. That is useful signal, not a blocker:

- the desired integration is already implied by the repo
- the codebase already has both halves
- the pilot can unify them into one sellable flow

## Why sandboxing is genuinely useful here

This workflow is not "sandbox because it sounds modern."

It benefits from sandboxing because each run needs a controlled environment for:

- browser-backed crawling and capture
- generated screenshots and report artifacts
- policy snapshots tied to a review run
- temporary working files for normalization and export
- long-running, multi-step execution with clean isolation per submission

A sandboxed run can mount:

- preview and published URL inputs
- policy/rubric context
- optional uploaded assets

And produce:

- evidence bundle
- fix checklist
- exportable review summary
- machine-readable result for later routing

## One-page pilot brief

### Workflow name

Webflow Marketplace Submission Preflight

### Failure cost

- extra review cycles add days to approval time
- creators lose launch time and reviewer trust
- repeated submissions create unnecessary reviewer load
- quality misses delay marketplace revenue and publishing

### Systems involved

- Webflow preview URL
- published site URL
- `webflow-site-analyzer-mcp`
- `webflow-review`
- optional `webflow-template-review-mcp` queue handoff
- policy ingestion from the canonical Webflow guideline and rubric sources

### Why sandbox execution matters

- controlled browser/runtime isolation per submission
- generated artifacts need a predictable workspace
- evidence should be grouped per run, not mixed across sessions
- long-running analysis should survive host-side orchestration decisions

### Human approval points

- human decides whether to submit or resubmit after preflight
- human reviewer remains the final approval authority
- any creator-facing or reviewer-facing summary can be reviewed before sending

### Proof metric

Primary:

- reduce multi-cycle submissions for pilot users

Secondary:

- reduce time from submission to first approval decision
- increase first-pass "ready for review" quality
- reduce avoidable guideline and technical misses

### 30-day pilot deliverable

Ship one bounded flow:

1. input preview URL + published URL
2. run sandboxed preflight
3. generate structured issue list + evidence bundle
4. produce creator-facing fix brief
5. optionally hand off to reviewer queue tooling

### Conversion path into `Policy OS Core`

If the pilot works, expand into ongoing governance:

- preflight on every release or resubmission
- monthly policy/rubric updates
- creator or team-specific quality trend reporting
- approval and escalation tuning
- broader workflow coverage across template, app, and publishing QA

## Recommended scope boundary

Keep v1 tight:

- focus on template submission preflight, not full reviewer replacement
- do not promise full marketplace approval automation
- do not rebuild the entire Webflow review system
- use existing queue and analyzer surfaces where possible
- treat Airtable reviewer writes as optional downstream integration, not the core pilot

## Recommended next implementation move

Build the pilot around the already-existing analyzer path first:

1. `packages/webflow-site-analyzer-mcp`
2. `packages/webflow-review`
3. optional bridge into `packages/webflow-template-review-mcp`

This gives CREATE SOMETHING:

- a workflow with clear buyer value
- a sandboxed execution story that is real
- a 30-day path that starts from existing code instead of from a blank page
