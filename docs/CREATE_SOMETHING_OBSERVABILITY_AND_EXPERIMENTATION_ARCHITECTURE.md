# CREATE SOMETHING Observability And Experimentation Architecture

This document defines how CREATE SOMETHING should use house telemetry, Langfuse, Braintrust, Pi, Emdash, and meta-harness style optimization when building the product and improving it over time.

The goal is not to add more dashboards. The goal is to make the business improve itself through versioned policy artifacts, governed execution, and repeatable experiments.

## Decision

- Cloudflare traces, house telemetry, and Langfuse are the authoritative record for governed execution.
- Braintrust is operator-facing amplification for LLM spans, evals, smoke runs, and experiment analysis.
- Braintrust can be used throughout CREATE SOMETHING when it improves legibility, provided governed paths still emit the authoritative house trace fields.
- `packages/harness`, `packages/orchestration`, `packages/judgment-layer`, and the Hub remain the system of record for execution, review, escalation, and promotion.
- Pi is the preferred engineer inner loop when a programmable terminal harness is useful.
- Emdash is an operator cockpit for parallel work, worktrees, diffs, and remote supervision.
- Meta-harness style search is an outer-loop optimizer for the harness itself, not a replacement for policy governance.

## System Roles

| Surface | Primary job | Not the source of truth for |
|---|---|---|
| Cloudflare traces + house telemetry + Langfuse | governed route evidence, correlation, retries, quotas, lane attribution | prompt iteration, eval comparison, candidate ranking |
| Braintrust | LLM span visibility, evals, smoke traces, candidate comparison | authorization proof, quota proof, policy proof on its own |
| CREATE SOMETHING harness + orchestration + judgment-layer + Hub | execution, checkpoints, review blocking, Andon, promotion | ad hoc operator convenience |
| Pi | focused engineer inner loop, programmable local worker, proposer runtime | production governance, approval policy |
| Emdash | parallel operator cockpit, remote worktree visibility, diff and PR supervision | canonical execution history, policy decisions |
| Meta-harness lane | propose and score candidate harness or MCP improvements | direct production rollout without review |

## Default Operating Model

### 1. Engineer inner loop

Use Pi when the work benefits from a programmable terminal harness, repo-aware context engineering, or fast local iteration. The output of that loop should still be normal repo artifacts: code, docs, tests, specs, policies, or review notes.

### 2. Operator cockpit

Use Emdash when a human needs to supervise many parallel tasks, compare candidates, manage remote worktrees, or inspect diffs quickly. Emdash improves legibility. It does not replace CREATE SOMETHING's execution governance.

### 3. Governed execution

When work touches named lanes, Hub routing, approval posture, account isolation, or policy-backed MCP execution, the canonical path remains:

1. tracked work in Loom
2. execution through CREATE SOMETHING harness and orchestration surfaces
3. policy and approval behavior through the judgment layer
4. governed route evidence through house telemetry and Langfuse
5. operator amplification and eval analysis in Braintrust

### 4. Outer-loop optimization

Use a meta-harness lane to improve the harness, MCP wrappers, prompts, routing rules, and policy artifacts. Candidate changes should be generated against an allowlisted artifact set, evaluated on search and holdout sets, and promoted only after review.

## Governed Trace Contract

Every governed MCP or Hub trace must carry enough information to explain the business decision behind execution.

Required fields:

- `account_id`
- `tenant_id`
- `correlation_id`
- `route_classification`
- `authz_decision`
- `lane_slug` or `bound_host`

Recommended when available:

- `user_id`
- `session_id`
- `request_id`
- `policy_id`
- `entrypoint`

Recommended experiment metadata for candidate runs:

- `experiment_id`
- `candidate_id`
- `baseline_id`
- `cohort`
- `phase`

The governance fields are required for authoritative traceability. The experiment fields are for comparison and promotion decisions.

## Standard Wrappers

### MCP servers

Governed MCP servers should use `@create-something/observability/mcp` and attach governance metadata through `getTraceContext(...)`. This keeps policy fields consistent across Langfuse and Braintrust and avoids copy-pasted trace logic in each server.

### LLM and agent spans

OpenAI and Agents SDK spans can be exported into Braintrust for operator visibility, but those spans should still carry correlation identifiers that let operators join them back to house telemetry and governed MCP traces.

### Evals and smoke runs

Use Braintrust evals for regression surfaces such as MCP contract, error paths, account isolation, latency, coverage, and intent routing. Use Promptfoo and Ground where they provide stronger deterministic evidence. Do not promote changes from Braintrust scores alone.

## Experiment Lifecycle

Every experiment should produce a small, reviewable artifact set and a clear decision record.

1. Write a hypothesis.
2. Define the treatment artifact set.
3. Define a search set and a separate holdout set.
4. Choose one primary metric and a small set of guardrails.
5. Run the baseline and candidate on the same surfaces.
6. Record the promotion decision with evidence.

Required evidence for each experiment:

- hypothesis
- files or policies changed
- baseline result
- candidate result
- holdout result
- promotion or rejection decision
- follow-up note if the result is inconclusive

## Promotion Rules

No candidate becomes the default path unless all of the following are true:

- the held-out primary metric improves
- account isolation and governed trace completeness do not regress
- policy compliance does not regress
- operator interrupt rate, review-block rate, latency, and cost stay within guardrails
- the change set is reviewable by a human without reconstructing hidden context

Human review is still required for:

- auth or entitlement changes
- destructive route policy changes
- client-visible tool exposure changes
- policy pack or approval posture changes that widen authority

## Business Improvement Loop

CREATE SOMETHING should treat research as an input to governed product improvement, not as a side activity.

The closed loop is:

1. research produces a hypothesis
2. the hypothesis becomes a versioned artifact such as a prompt, wrapper, policy, route rule, or reviewer change
3. the candidate is measured through Braintrust evals and house telemetry
4. the result is promoted, rejected, or revised
5. the learning is written back into docs, policies, or automation

Examples of business-level primary metrics:

- successful governed routed calls per operator hour
- time to ship a new named lane with policy evidence
- MCP eval pass rate on critical tool families
- policy exception rate per lane
- cost per successful automation outcome

Each experiment should choose one primary metric. Everything else is a guardrail.

## Allowlisted Optimization Surface

The outer-loop optimizer should focus on artifacts that are safe and reviewable:

- `packages/harness/**`
- `packages/orchestration/**`
- `packages/judgment-layer/**`
- `packages/observability/**`
- `packages/cs-mcp-hub-remote/**`
- MCP package wrappers and eval fixtures
- `docs/policies/**`
- experiment specs, dashboards, and runbooks

The outer-loop optimizer should not directly self-promote changes to:

- secrets or credential material
- tenant entitlements
- raw client data
- destructive production defaults

## Recommended First Rollout

1. Standardize governed trace context on the MCP surfaces that already use `@create-something/observability/mcp`.
2. Treat the existing Braintrust MCP eval pack as the default regression suite for candidate MCP and harness changes.
3. Add experiment metadata for baseline and candidate comparisons.
4. Run one pilot improvement lane on a single governed surface before broad rollout.

## Related Docs

- [BRAINTRUST_TRACING_QUICKSTART.md](./BRAINTRUST_TRACING_QUICKSTART.md)
- [guides/OBSERVABILITY_SETUP.md](./guides/OBSERVABILITY_SETUP.md)
- [guides/CODING_AGENT_HARNESS_PATTERN.md](./guides/CODING_AGENT_HARNESS_PATTERN.md)
- [HUB_EXECUTION_GOVERNANCE_PLAN.md](./HUB_EXECUTION_GOVERNANCE_PLAN.md)
- [internal/OPENAI_HARNESS_ENGINEERING_IMPLICATIONS_2026-03-09.md](./internal/OPENAI_HARNESS_ENGINEERING_IMPLICATIONS_2026-03-09.md)
