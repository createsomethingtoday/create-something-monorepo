---
title: "The Workflow Trust Layer"
subtitle: "Why agents need handoffs, approval states, and evidence before they need more tools"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "AI teams usually reach for more tools when a workflow fails. The recent CREATE SOMETHING implementation trail points to a different conclusion: the missing layer is often not another connector, model, or agent runtime. It is a workflow trust layer that names the handoff, owner, data boundary, action rule, approval state, blocked state, and receipt before autonomy expands. This paper turns that lesson into a practical operating model for users evaluating agentic workflows. MCP exposes capability, Dify or another app surface makes the workflow usable, Cloudflare or repo-owned services provide durable runtime boundaries, and an SDK-backed service can graduate risky orchestration into code when the evidence justifies it. The trust layer is the artifact family that keeps those surfaces coherent."
keywords: ["Workflow Trust Layer", "Policy OS", "MCP", "Dify", "OpenAI Agents SDK", "Approval States", "Agent Governance", "Three-Tier Framework"]
publishedAt: "2026-06-20"
readingTime: 18
difficulty: "intermediate"
published: true
---

## Executive Thesis

Connection does not create trust.

An MCP server can expose a useful capability. A Dify app can make an agent workflow easy to inspect. A coding agent can operate across a repo. An SDK-backed service can route tools, pause for approval, store state, and emit traces.

None of those surfaces, by itself, tells a team what the workflow is allowed to do.

The missing layer is the **Workflow Trust Layer**: the operating boundary that turns a possible agent action into a controlled workflow step.

It answers seven questions before the agent does more work:

1. What handoff is this workflow trying to improve?
2. Who owns the approval?
3. Which data is the system allowed to read?
4. Which actions can run automatically?
5. Which actions must pause for review?
6. Which actions should stop with a reason?
7. What receipt proves what happened?

This paper is written for users who already feel the pressure to "add AI" to a real workflow. The practical recommendation is simple: do not start by asking which model, app, or connector should run the work. Start by building the trust layer underneath the work.

## The Failure Mode: More Capability, Less Confidence

Most agent failures do not begin with a missing model feature.

They begin with a workflow that was never named precisely enough:

- a support thread needs follow-up, but nobody knows when a reply can be posted automatically
- a sales handoff crosses CRM, email, notes, and Slack, but nobody owns the approval boundary
- a review process has a checklist, but the checklist does not say which findings are evidence and which are judgment
- an operator wants autonomy, but the system cannot explain why it stopped
- a team connects tools, but cannot reconstruct what changed

In that state, adding more tools makes the system more capable and less legible at the same time.

The user sees a chat box. The agent sees tools. The runtime sees API calls. The business still lacks an operating answer.

What should happen next?

That is a policy question, not a connector question.

## The Three Decision States

A workflow trust layer reduces agent behavior to three visible states.

| State | Meaning | User experience |
| --- | --- | --- |
| Auto-allow | The action is low-risk, scoped, and covered by an accepted rule. | The system acts and keeps a receipt. |
| Approval-needed | The action may be valuable, but a named human must decide. | The system pauses with context, options, and evidence. |
| Blocked | The action is outside scope, missing data, too risky, or not authorized. | The system stops with a reason and a recovery path. |

This is deliberately smaller than a full governance framework.

Users do not need a fifty-page policy manual before the first useful workflow. They need the first durable boundary:

- what can run
- what waits
- what stops

The first version can be written as a table. The important move is making the decision state explicit before the agent gets access to more capability.

## Why MCP Is Necessary But Not Sufficient

MCP is the right substrate for agent work because it makes capability explicit.

It can define:

- tools the model may call
- resources the application may provide
- prompts or policy artifacts a user may select
- input and output schemas
- auth and permission boundaries

That is a major improvement over hidden integration logic inside a general-purpose agent prompt.

But MCP answers **what can be called**. It does not automatically answer **what should be done**.

Consider a customer-support workflow with tools for reading tickets, summarizing account history, drafting replies, posting replies, issuing refunds, and updating CRM fields.

The tool inventory alone is not enough. The trust layer has to say:

- reading tickets is auto-allowed
- summarizing account history is auto-allowed if PII stays inside the authorized workspace
- drafting a reply is auto-allowed
- posting a reply needs approval unless the reply matches a low-risk template
- issuing a refund is blocked unless a separate finance policy is attached
- updating CRM status is approval-needed when it affects pipeline reporting

MCP gives the agent a controlled interface. The workflow trust layer gives the organization a controlled operating path.

## The Runtime Question Comes Later

Teams often collapse three decisions into one:

1. Where should the user interact with the workflow?
2. Where should durable runtime logic live?
3. When should orchestration graduate into code?

Those are different decisions.

A practical stack can use multiple surfaces without contradiction.

| Surface | Best role | Trust-layer question |
| --- | --- | --- |
| Dify or another visual app surface | Client-facing workflow UX, visual inspection, app publishing, service API access, non-engineer review | Can the operator inspect and change the workflow without a code deployment? |
| Cloudflare or repo-owned services | Auth, queues, D1 state, tenant boundaries, custom endpoints, recovery paths, package-local validation | Does this workflow need durable infrastructure and explicit runtime ownership? |
| MCP server | Tool/resource/prompt boundary across agent clients | Which capabilities are exposed, scoped, and observable? |
| SDK-backed workflow service | Code-owned orchestration, approval pauses, traces, evals, CI-backed golden tasks | Has this workflow earned the platform burden of custom runtime ownership? |

The runtime question should not be treated as a brand preference.

Dify is useful when the workflow needs visual editing, app publishing, and non-engineer inspection. Cloudflare is useful when the workflow needs custom runtime state and recovery paths. MCP is useful when capability boundaries must be explicit and portable. An SDK-backed service is useful when the workflow has outgrown visual orchestration and now needs code-owned routing, approval pauses, traces, evals, and repeatable golden tasks.

The trust layer is what lets those surfaces cooperate instead of competing.

## A Practical Model: Map, Pilot, Operate

The workflow trust layer becomes useful when it is tied to a delivery path.

### 1. Trust Map

The first artifact is a map of one workflow.

It should name:

- the workflow owner
- the human task
- the AI task
- the system task
- the source systems
- the data objects
- the action boundary
- the approval owner
- the failure modes
- the evidence receipt

The output is not "an automation idea." The output is a bounded workflow map.

The best first map is usually one painful handoff, not a broad automation wishlist. A good candidate crosses systems, teams, permissions, or customer expectations. A weak candidate has no approval owner, no visible failure mode, or only a vague wish for unattended action.

### 2. Workflow Pilot

The second artifact is one controlled workflow in production or preview.

It should include:

- the MCP capability boundary
- the user-facing app surface
- the runtime state boundary
- the three decision states
- the first runbook
- the release evidence
- the fallback path

The pilot should prove the handoff, not the platform.

The question is not "Can an agent do something impressive?" The question is "Can this workflow move from manual rescue to controlled operation?"

### 3. Trust Layer

The third artifact is recurring control around live work.

It should include:

- incident notes
- blocked-state reviews
- golden-task regressions
- approval queue review
- tool-scope review
- policy tuning
- runtime graduation or rollback review

This is where the system becomes operational instead of merely implemented.

The trust layer is not a project kickoff document. It is a standing control loop.

## The Artifact Family

The Workflow Trust Layer is easier to understand when treated as a concrete artifact bundle.

| Artifact | Purpose |
| --- | --- |
| `workflow_map.md` | Names the handoff, owner, tasks, systems, and failure points. |
| `mcp_contract.yaml` | Defines tools, resources, prompts, auth scopes, and error model. |
| `agent_contract.yaml` | Defines allowed tools, approval mode, escalation triggers, runtime surface, and graduation status. |
| `decision_states.yaml` | Lists auto-allowed, approval-needed, and blocked actions. |
| `golden_tasks.yaml` | Provides regression examples for the workflow's most important behavior. |
| `runbook.md` | Defines setup, operation, incident response, and rollback. |
| `evidence_log.md` | Records validation commands, trace IDs, deploy IDs, review notes, and handoff receipts. |

This bundle gives users something agents alone do not provide: a way to inspect and transfer responsibility.

## Database, Automation, Judgment

The Workflow Trust Layer follows the Three-Tier Framework.

### Database: what exists

The Database layer contains the workflow state:

- source records
- account and entitlement state
- policy versions
- approved workflow definitions
- previous decisions
- evidence logs
- trace IDs
- runbook versions

If the data is stale or missing, the agent should not compensate by guessing. It should stop, ask for the missing substrate, or route to a manual fallback.

### Automation: what happens

The Automation layer contains the tool calls and deterministic execution paths:

- MCP tool invocation
- Dify workflow steps
- Cloudflare Worker endpoints
- queues
- webhooks
- SDK agent routing
- eval runs
- golden-task checks

This layer should make the action path repeatable. It should not hide policy inside improvised reasoning.

### Judgment: what should happen

The Judgment layer contains the selected policy:

- approval rules
- escalation criteria
- blocked actions
- human ownership
- cost and latency guardrails
- rollback criteria
- operator cadence

When this layer is missing, agents either ask constantly or guess silently. The trust layer makes judgment explicit enough to operate.

## What Users Actually Need

Most users do not need to learn the internals of agent runtimes before they can make progress.

They need a short diagnostic that forces the right operating questions:

1. Name the workflow in one sentence.
2. Name the person who currently rescues it.
3. Name the systems involved.
4. Name the action that would create risk if done wrong.
5. Name the action that is safe enough to automate.
6. Name the first approval-needed state.
7. Name the first blocked state.
8. Name the receipt the operator should keep.

If a team cannot answer those questions, it is too early to add more autonomy.

If a team can answer them, the first build path becomes much clearer.

## When to Graduate Runtime

A workflow does not graduate to a heavier runtime because an SDK exists.

It graduates when the operating evidence says the current surface is no longer enough.

Good graduation reasons include:

- visual workflow editing no longer captures the needed orchestration
- side-effecting tools need explicit approval pauses in code
- state must survive retries and recovery flows
- cost, latency, or reliability must be measured in CI-backed tasks
- traces and evals need to become part of release evidence
- tool routing has become too important to leave implicit

Bad graduation reasons include:

- "the new SDK is more powerful"
- "we want everything in code"
- "the visual tool feels less serious"
- "we can replace the operator once it is rebuilt"

The point of graduation is more governed control, not more engineering theater.

## The Main Design Rule

Do not connect a tool unless the workflow can explain the decision state attached to that tool.

For each capability, ask:

- What is the safest useful read?
- What is the first useful draft?
- What is the first side effect?
- Who approves that side effect?
- What would make the action blocked?
- What receipt proves the system behaved?

This rule is intentionally strict. It prevents the common failure where a team adds tool access first and tries to discover governance later.

Governance discovered after tool access is usually cleanup.

Governance defined before tool access is a trust layer.

## Example: Support Reply Drafting

A support reply workflow might start like this:

| Capability | Decision state | Receipt |
| --- | --- | --- |
| Read ticket text | Auto-allow | Ticket ID and timestamp |
| Summarize customer history | Auto-allow if scoped to the account | Source IDs used |
| Draft reply | Auto-allow | Draft text and policy note |
| Post reply | Approval-needed | Approver, final text, send timestamp |
| Offer refund | Approval-needed or blocked by finance policy | Approval ID or blocked reason |
| Delete account data | Blocked unless legal/privacy policy is attached | Escalation record |

The agent can still be helpful immediately. It can read, summarize, and draft. But the trust layer prevents helpfulness from becoming unauthorized action.

## Example: Marketplace Review

A review workflow might start like this:

| Capability | Decision state | Receipt |
| --- | --- | --- |
| Fetch published page evidence | Auto-allow | URL list and fetch timestamp |
| Extract Designer metadata | Auto-allow when authenticated to the review workspace | Workspace and page inventory |
| Normalize checklist findings | Auto-allow | Finding IDs and policy version |
| Recommend request-changes language | Auto-allow | Draft feedback and supporting evidence |
| Approve or reject submission | Blocked for automation | Human reviewer decision |
| Update source-of-truth status | Approval-needed | Approver and status change |

This distinction matters. The review system can become much more useful without pretending it owns final judgment.

## What the Paper Adds for Users

The user-facing value of this model is not theory.

It gives teams a way to slow down the right part of the conversation.

Instead of asking:

**"Which AI agent should we use?"**

Ask:

**"Which workflow handoff is ready for a trust layer?"**

Instead of asking:

**"Can the agent call this tool?"**

Ask:

**"Which decision state governs this tool?"**

Instead of asking:

**"Should we move this to a custom SDK runtime?"**

Ask:

**"What evidence shows the current runtime cannot govern this workflow well enough?"**

Those questions are less exciting than demos. They are more useful.

## Conclusion

The next useful layer in agent adoption is not another generic automation surface.

It is the workflow trust layer underneath agent work:

- one named handoff
- one owner
- one capability boundary
- three decision states
- one receipt trail
- one review cadence

MCP exposes capability. App surfaces make workflows usable. Runtime services make state durable. SDKs can graduate orchestration into code. But users still need the layer that tells the system what should happen, when to pause, and how to prove what occurred.

That layer is the product.

