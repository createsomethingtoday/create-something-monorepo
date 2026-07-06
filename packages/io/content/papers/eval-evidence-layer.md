---
title: 'The Eval Evidence Layer'
subtitle: 'How Langfuse traces and Langfuse gates make agent workflows measurable'
authors: ['CREATE SOMETHING']
category: 'Research'
abstract: 'Agent workflows do not become production-ready because they have traces or evals. They become production-ready when each trace and eval maps to a decision: publish, hold, rollback, narrow scope, or graduate autonomy. This paper defines the Eval Evidence Layer as the quantitative companion to the Policy OS contract bundle. Dify carries the app, Langfuse explains the app runtime, Langfuse gates the CREATE SOMETHING-owned MCP contracts, and release evidence ties both systems to operator decisions.'
keywords:
  [
    'Eval Evidence Layer',
    'Langfuse',
    'Langfuse',
    'Dify',
    'MCP',
    'Policy OS',
    'Agent Governance',
    'Observability',
    'Release Evidence'
  ]
publishedAt: '2026-06-22'
readingTime: 17
difficulty: 'intermediate'
published: true
---

## Executive Thesis

Traces are not proof.

Evals are not governance.

Both become useful only when they change an operating decision.

A Dify app can produce a detailed runtime trace. A Langfuse eval can produce a pass/fail result. An MCP server can expose typed tools. A Policy OS contract bundle can define allowed behavior. None of those artifacts is enough by itself.

The missing layer is the **Eval Evidence Layer**: the quantitative layer that connects runtime traces, MCP eval gates, approval receipts, blocked states, and release decisions.

The core rule is simple:

> Measure only what can change a decision: publish, hold, rollback, narrow scope, or graduate autonomy.

For CREATE SOMETHING's current Dify-first operating model, the split is explicit:

| Surface               | Role                                         | Evidence                                                                                   |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dify                  | Carries the app and operator-facing workflow | app shape, Service API behavior, MCP server cards                                          |
| Langfuse              | Explains the Dify runtime                    | traces, sessions, prompt/model behavior, latency, cost, runtime errors                     |
| Langfuse            | Gates CREATE SOMETHING-owned MCP contracts   | expected tool use, forbidden tool use, write confirmation, secret refusal, policy boundary |
| Linear or release log | Records the decision                         | publish, hold, rollback, narrowed scope, graduation evidence                               |

The important move is not adding more dashboards. It is making each metric accountable to a release decision.

## Why This Paper Exists

The Policy OS contract bundle defines the operating boundary for governed AI work. It names the MCP contract, agent contract, outcome contract, golden tasks, and runbook.

The Workflow Trust Layer defines the decision states: auto-allow, approval-needed, and blocked.

Those papers answer what the workflow is allowed to do.

This paper answers a narrower question:

**What evidence is strong enough to change the workflow's status?**

That question matters because most agent teams accumulate traces and evals without making them operational.

They know:

- an app has logs
- an eval suite ran
- a trace captured a tool call
- a cost number exists
- an agent refused something once

But they cannot say:

- which threshold blocks publication
- which failure class forces rollback
- which pass rate justifies more autonomy
- which evidence can be public
- which evidence must stay private
- which system owns the trace of record

The Eval Evidence Layer turns those questions into a measurable release model.

## The Measurement Boundary

A governed workflow should not measure everything.

It should measure the smallest set of signals that prove the contract still holds.

For a Dify app with MCP tools, the first evidence set is:

| Measurement              | Source                            | Decision it supports                                                    |
| ------------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| Runtime latency          | Langfuse                          | Keep current path, tune prompt/context, or move a step behind a service |
| Runtime cost             | Langfuse                          | Keep model route, cap usage, or narrow scope                            |
| Runtime error rate       | Langfuse                          | Publish, hold, or rollback app changes                                  |
| Expected tool use        | Langfuse                        | Approve MCP tool descriptions and agent contract                        |
| Forbidden tool avoidance | Langfuse                        | Keep risky tools blocked, gated, or removed                             |
| Write confirmation       | Langfuse plus approval receipts | Permit write-capable tools under explicit review                        |
| Secret refusal           | Langfuse plus trace review      | Keep app client-facing or restrict audience                             |
| Blocked-state recovery   | Linear, runbook, operator notes   | Improve fallback path or policy language                                |
| Regression pass rate     | Langfuse                        | Publish, hold, rollback, or graduate autonomy                           |

This table is intentionally practical. It does not ask whether the agent is generally intelligent. It asks whether the current workflow is safe enough to operate under the current contract.

## The Two Evidence Streams

### 1. Langfuse: Runtime Evidence

Langfuse is strongest when the question is:

**What happened inside the app runtime?**

For Dify apps, this includes:

- conversation and session traces
- prompt and model behavior
- latency
- token usage
- cost
- runtime errors
- repeated failure patterns
- user feedback or operator annotations when available

This evidence answers operational questions:

- Did the app become slower after the prompt changed?
- Did a model route increase cost without improving outcomes?
- Did runtime errors cluster around one workflow path?
- Did the app produce enough trace context for an operator to debug the issue?

Langfuse does not replace the workflow contract. It explains the runtime.

### 2. Langfuse: MCP Gate Evidence

Langfuse is strongest when the question is:

**Did the MCP-backed workflow obey the contract?**

For CREATE SOMETHING-owned MCPs, this includes:

- expected tool use
- forbidden tool use
- write confirmation
- secret refusal
- policy-boundary behavior
- grounded answer checks
- tenant isolation checks
- error recovery checks
- regression pass rate after prompt, tool, model, or policy changes

This evidence answers release questions:

- Did the agent call the right tool for the golden task?
- Did it avoid the write tool when the case was read-only?
- Did it pause before a customer-facing or irreversible action?
- Did it refuse credential requests and private trace disclosure?
- Did the same workflow still pass after the MCP description changed?

Langfuse does not need to own every Dify trace. It gates the contracts CREATE SOMETHING owns.

## Decision Thresholds

Thresholds should be written before the release.

If thresholds are invented after a failure, they become justification theater.

The first version can be conservative:

| Gate                 | Minimum threshold                                            | Release decision                                                  |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| API health           | 100% on required smoke cases                                 | Hold if any required app or MCP path is unreachable               |
| Expected tool use    | 100% on required golden tasks                                | Hold if the agent misses a required tool call                     |
| Forbidden tool use   | 0 disallowed tool calls                                      | Hold or remove tool scope                                         |
| Write confirmation   | 100% pause before write-capable action                       | Hold if a write can occur without explicit confirmation           |
| Secret refusal       | 100% refusal on required negative cases                      | Hold if credentials, private traces, or broad exports are exposed |
| Runtime latency      | Within the workflow budget                                   | Tune or narrow scope if the budget is exceeded                    |
| Runtime cost         | Within the cost envelope                                     | Tune model/context or add usage limits                            |
| Regression pass rate | 100% for blocking gates, agreed threshold for advisory gates | Publish, hold, or rollback by gate class                          |

The point is not that every workflow must use the same number forever.

The point is that the number must be attached to a decision.

## Gate Classes

Not every gate has the same consequence.

The Eval Evidence Layer separates gates into three classes:

| Class     | Meaning                                                  | Examples                                                  | Failure action               |
| --------- | -------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Blocking  | The workflow cannot publish if this fails                | API health, forbidden write, secret refusal               | hold or rollback             |
| Guardrail | The workflow can publish only with constrained scope     | latency budget, cost envelope, missing-data recovery      | narrow scope or add fallback |
| Advisory  | The workflow can publish, but improvement work is queued | phrasing quality, answer style, low-risk retrieval misses | log follow-up                |

This prevents two common mistakes.

The first mistake is treating every eval failure as equally severe. That creates noise and slows useful delivery.

The second mistake is treating every eval failure as optional. That creates silent risk.

Gate class turns eval output into release policy.

## The Evidence Ledger

Every release should leave a short evidence ledger.

It does not need to expose private traces. It needs enough structure for another operator to reconstruct the decision.

Minimum fields:

| Field                | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| Workflow ID          | Which app, agent, or MCP-backed workflow changed            |
| Runtime surface      | Dify, repo-owned service, SDK-backed service, or mixed path |
| Contract version     | Which MCP and agent contract governed the release           |
| Langfuse trace set   | Which runtime traces or sessions were reviewed              |
| Langfuse run       | Which eval run or experiment gated the MCP behavior         |
| Blocking gate result | Pass/fail for release blockers                              |
| Guardrail result     | Pass/fail/accepted risk for operating limits                |
| Decision             | publish, hold, rollback, narrow scope, graduate             |
| Owner                | Who accepted the decision                                   |
| Rollback path        | How to return to the previous safe state                    |

This is the difference between "we ran evals" and "we have release evidence."

## A Worked Example: Support Triage

Consider a support triage Dify app with MCP tools for reading tickets, searching account context, drafting replies, posting replies, and escalating cases.

The contract says:

- reading tickets is auto-allowed
- searching account context is auto-allowed
- drafting replies is auto-allowed
- posting replies requires approval
- refunds, deletions, legal issues, and security cases route to a named human
- credential requests and private trace requests are refused

The Eval Evidence Layer might define:

| Gate                          | Source                 | Threshold                      | Decision                              |
| ----------------------------- | ---------------------- | ------------------------------ | ------------------------------------- |
| Dify Service API smoke        | Dify plus smoke script | 100% reachable                 | hold if unreachable                   |
| Read/search expected tool use | Langfuse             | 100% required tool use         | hold if wrong tool path               |
| Post reply forbidden path     | Langfuse             | 0 post calls without approval  | hold and remove write scope if failed |
| Refund/delete escalation      | Langfuse             | 100% route to human            | hold if autonomous path appears       |
| Secret refusal                | Langfuse             | 100% refusal                   | hold if leaked                        |
| Latency budget                | Langfuse               | p95 under workflow budget      | tune before expanding scope           |
| Runtime cost                  | Langfuse               | within cost envelope           | tune model/context                    |
| Approval receipt              | Linear or app record   | receipt exists for every write | hold write capability if missing      |

The release decision is not based on a feeling.

It is based on which rows passed.

## Graduation Criteria

Autonomy should expand only when evidence improves.

A workflow can graduate from "draft-only" to "approval-needed write" when:

1. Required Langfuse gates pass for expected tool use, forbidden tool use, secret refusal, and write confirmation.
2. Langfuse traces show stable latency and cost under the operating envelope.
3. Approval receipts prove that humans can review the action with enough context.
4. Blocked-state recovery has a named fallback path.
5. The runbook describes rollback.

A workflow can graduate from "approval-needed write" to narrow auto-allow only when:

1. The write action is low-risk and reversible.
2. The action class has repeated clean approval history.
3. False positive and false negative costs are acceptable.
4. The blocking gates remain at 100%.
5. A human can audit the action after the fact.

Graduation is not a product milestone. It is an evidence threshold.

## Rollback Criteria

Rollback should also be quantitative.

Rollback is required when:

- a blocking gate fails after publication
- a write-capable tool executes outside the approval rule
- a secret or private trace is exposed
- runtime errors cluster around a customer-facing path
- latency or cost exceeds the envelope enough to break the workflow promise
- blocked-state recovery fails and the app keeps trying instead of stopping

Rollback is not failure. It is proof that the policy layer exists.

## Public Proof vs Private Evidence

The Eval Evidence Layer separates proof from evidence.

Public proof can include:

- gate names
- pass/fail status
- release notes
- sanitized examples
- route health
- high-level runtime posture
- the fact that Langfuse and Langfuse evidence exists

Private evidence should include:

- raw traces
- prompts
- account records
- secrets
- customer data
- approval receipts
- detailed eval inputs and outputs when they contain sensitive context

This split matters for Dify work. Buyers need confidence that the workflow is governed. Operators need detailed traces. Those are not the same artifact.

## Relationship To The Contract Bundle

The Eval Evidence Layer is not a replacement for the Policy OS contract bundle.

It is the measurement layer attached to it.

| Contract artifact     | Evidence layer attachment                                           |
| --------------------- | ------------------------------------------------------------------- |
| `mcp_contract.yaml`   | expected tool use, forbidden tool use, schema and error-path checks |
| `agent_contract.yaml` | approval behavior, blocked paths, secret refusal, graduation status |
| `outcome_contract.md` | business success metrics, fallback path, owner acceptance           |
| `golden_tasks.yaml`   | Langfuse regression cases and thresholds                          |
| `runbook.md`          | rollback, incident response, release ledger, evidence retention     |

The contract says what should happen.

The evidence layer says whether it happened enough to change the workflow status.

## The Practical Operating Loop

The operating loop is:

1. Name the workflow.
2. Write the contract bundle.
3. Attach Langfuse tracing to the runtime.
4. Attach Langfuse gates to the MCP contract.
5. Classify gates as blocking, guardrail, or advisory.
6. Set thresholds before release.
7. Run the smoke and eval gates.
8. Review the trace set.
9. Record the release decision.
10. Rerun the relevant gates after every prompt, model, tool, policy, or runtime change.

This loop keeps agent work from drifting into vibes.

## Conclusion

Agent systems do not need more observability for its own sake.

They need evidence that changes decisions.

Dify makes the workflow usable. Langfuse explains the runtime. Langfuse gates the MCP contracts. Policy OS names what the workflow is allowed to do. The Eval Evidence Layer turns those artifacts into a release model.

That is the measurable path from demo to operation:

- trace the runtime
- gate the contract
- classify the risk
- set the threshold
- record the decision
- graduate only with evidence

The workflow is not production-ready when the dashboard is full.

It is production-ready when the evidence is strong enough to decide.
