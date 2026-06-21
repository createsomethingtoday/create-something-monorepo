---
title: "The Policy OS Contract Bundle"
subtitle: "The portable unit of governed AI work"
authors: ["CREATE SOMETHING"]
category: "Research"
abstract: "Most AI workflow projects start by choosing an agent surface, model, or connector. The more durable starting point is a contract bundle: the small set of artifacts that defines what the workflow may access, what it may do, when it must ask, how success is measured, and how the work can move between runtimes without losing governance. This paper explains the Policy OS contract bundle as the portable unit of governed AI work and gives teams a practical way to evaluate MCP servers, visual operator surfaces, repo-owned services, and SDK-backed orchestration."
keywords: ["Policy OS", "Contract Bundle", "MCP", "Dify", "OpenAI Agents SDK", "Golden Tasks", "Agent Governance", "Skills on MCP", "Three-Tier Framework"]
publishedAt: "2026-06-21"
readingTime: 18
difficulty: "intermediate"
published: true
---

## Executive Thesis

An agent is not an operating model.

A connector can expose useful capability. A workflow builder can make an interaction easy to inspect. A coding agent can work inside a repository. An SDK-backed service can route tools, store state, pause for approval, and emit traces.

Those surfaces matter, but they do not answer the practical questions a team needs before giving AI real work:

1. What systems may this workflow read?
2. What actions may run without approval?
3. What actions must pause for a named owner?
4. What actions are out of scope?
5. What counts as a successful outcome?
6. What evidence proves the workflow behaved correctly?
7. What changes when the workflow moves to a different agent surface?

The answer is the **Policy OS contract bundle**: a small, explicit artifact family that travels with the workflow.

The bundle is not documentation after the fact. It is the operating boundary. It defines the workflow before autonomy expands, keeps the workflow portable across agent clients, and gives humans a concrete object to review when the system changes.

The practical recommendation is simple: before asking which agent should run the work, ask whether the work has a contract bundle.

## What This Paper Gives You

Use this paper when an AI workflow is past the demo stage but not yet safe to treat as an operating system.

It gives you three practical outputs:

1. A way to explain why "we connected the tools" is not the same as "the workflow is governed."
2. A five-artifact bundle that turns access, behavior, success, regression testing, and operations into reviewable objects.
3. A migration rule for moving work between Dify, MCP servers, repo-owned services, coding agents, and SDK-backed orchestration without losing the policy boundary.

The target reader is not only an engineer. It is also the operator, founder, product lead, or client sponsor who needs to know whether an AI workflow can be trusted with real work.

## Why Agent Projects Drift

Most agent projects drift because the team chooses a surface before it names the work.

The surface can be impressive:

- a chat app connected to business systems
- a Dify workflow with MCP server cards
- a Codex setup for repository work
- a Claude or Cursor configuration for local development
- an SDK-backed service with durable state and traces

But the same failure mode appears across all of them.

The agent can do something, but nobody can say exactly what it is allowed to do.

The team has tool access, but not a tool boundary. It has prompts, but not policy ownership. It has a demo, but not regression cases. It has a user interface, but not an escalation model. It has a deployment, but not a rollback path.

When the workflow breaks, the debugging conversation gets vague:

- Was the data missing?
- Did the tool fail?
- Did the model choose the wrong action?
- Was the policy too permissive?
- Did the operator approve the wrong thing?
- Did the runtime surface stop matching the workflow?

Without a contract bundle, those questions collapse into one unhelpful conclusion: the agent did not work.

Policy OS separates them.

## The Bundle In One Page

Every governed AI workflow should ship with five core artifacts.

| Artifact | Job |
| --- | --- |
| `mcp_contract.yaml` | Defines tools, resources, prompts, auth scopes, schemas, and error behavior. |
| `agent_contract.yaml` | Defines allowed tools, approval mode, escalation triggers, guardrails, runtime surface, and graduation status. |
| `outcome_contract.md` | Defines the job to be done, success metrics, fallback path, ownership boundary, and review cadence. |
| `golden_tasks.yaml` | Defines repeatable examples that prove the workflow still behaves correctly. |
| `runbook.md` | Defines setup, operation, incident response, rollback, and human handoff. |

This bundle is small enough to write for one workflow and strong enough to govern real work.

The bundle is finished when a reviewer can answer five questions without reading the implementation:

- What may this workflow access?
- What may it do?
- When must it ask?
- What result is it trying to produce?
- What evidence proves the behavior still holds?

It also changes the buyer conversation. The question stops being "Do you have an AI agent?" and becomes:

- Which workflows are approved?
- Which tools are available?
- Which writes need approval?
- Which failures stop the system?
- Which tests prove the behavior?
- Which runtime currently owns the workflow?
- Which evidence supports graduation or rollback?

Those questions are more useful than a demo because they expose whether the system can survive contact with operations.

## The MCP Contract: What Exists

The `mcp_contract.yaml` is the connectivity boundary.

It describes what the workflow can see and call:

- tool names
- resource URI patterns
- prompt IDs
- auth scopes
- input and output schemas
- error model
- ownership of external connections

This contract is where MCP earns its place in the architecture. MCP makes capability explicit. It gives agent clients a typed way to discover tools, resources, and prompts instead of hiding integration logic inside a general-purpose prompt.

But the MCP contract should not be treated as the whole system.

MCP answers what can be exposed. The rest of the bundle answers what should happen with that exposure.

For a support workflow, the MCP contract might expose tools to read tickets, search customer history, draft replies, post replies, and update account tags. That tool list is necessary. It is not enough.

The governing question is not "Can the agent post a reply?" It is "Under which policy, for which class of ticket, with which approval owner, and with what receipt?"

That answer belongs in the rest of the bundle.

## The Agent Contract: What May Happen

The `agent_contract.yaml` is the behavior boundary.

It tells the agent which actions belong inside the workflow and which actions do not. It names:

- allowed tools
- blocked tools
- approval mode
- write-operation behavior
- destructive-operation behavior
- escalation triggers
- budget and latency guardrails
- policy artifacts
- runtime surface
- graduation status

The runtime fields matter because the same workflow may move across surfaces over time.

A workflow might start in Dify because the client needs visual editing, app publishing, Service API access, MCP server cards, and non-engineer inspection. The same workflow might later move one risky step behind a repo-owned service because it needs queues, tenant boundaries, durable state, custom endpoints, or package-local validation. A mature path might graduate a portion of orchestration into an OpenAI Agents SDK service when tool routing, approval pauses, traces, evals, and CI-backed golden tasks justify the platform burden.

The agent contract prevents that migration from becoming a silent rewrite.

It should always be possible to answer:

- What is the current runtime surface?
- Is the workflow still a prototype, Dify-first path, SDK candidate, SDK-graduated path, or rollback-required path?
- Which platform affordances would be lost in a move?
- Which evidence justifies the change?

Runtime choice is part of governance. It is not an implementation detail.

## The Outcome Contract: What Success Means

The `outcome_contract.md` is the business boundary.

It names the workflow in human terms:

- the target workflow
- the user or operator
- the manual fallback path
- the success metrics
- the ownership boundary
- the review cadence
- the customer-facing language

This contract prevents a common mistake: measuring the agent instead of measuring the workflow.

An agent can produce a polished answer while the workflow remains broken. A support reply can be well-written and still violate policy. A research brief can be fluent and still omit required evidence. A data-sync task can complete and still write to the wrong system.

The outcome contract says what matters outside the model.

For example, a billing triage workflow might define success as:

- reads authorized email and account context only
- classifies refund, deletion, payment, and escalation cases
- drafts a reply without posting it
- routes account deletion to human review
- refuses to request or expose secrets
- logs evidence for every proposed action
- completes under a defined latency and cost budget

That is more useful than "the agent answers billing questions." It gives the system something to pass or fail.

## Golden Tasks: What Must Stay True

The `golden_tasks.yaml` file is the regression boundary.

It captures the examples that must keep working after prompts, tools, models, policies, or runtimes change.

Golden tasks should cover:

- happy paths
- approval paths
- blocked paths
- missing-data paths
- forbidden tool use
- secret refusal
- latency and cost budgets
- required evidence
- runtime parity when a workflow is migrating

Golden tasks make governance testable.

They also make runtime graduation honest. If a Dify workflow is working for operators, an SDK-backed path should not replace it merely because code feels more powerful. The new path should prove parity where parity matters and improvement where improvement is claimed.

If the SDK path improves traceability but loses non-engineer inspection, that is a governance tradeoff. If it improves routing but makes rollback unclear, that is not a graduation. If it improves latency and preserves approval behavior, that evidence belongs in the contract.

Golden tasks keep those claims from becoming taste.

## The Runbook: How Humans Stay In Control

The `runbook.md` is the operating boundary.

It explains how humans run the workflow when everything is normal and what they do when the system stops.

A useful runbook includes:

- setup steps
- required secrets and where they live
- smoke commands
- approval workflow
- incident response
- rollback steps
- owner contacts
- review cadence
- known failure modes
- evidence locations

This matters because governed AI is not just a system behavior. It is an operating cadence.

Someone has to review blocked actions. Someone has to tune policy. Someone has to notice golden-task drift. Someone has to decide when a workflow deserves more autonomy or less.

The runbook keeps that human control explicit.

## Portability Is The Point

The contract bundle is portable by design.

The same workflow may need to run through different surfaces:

| Surface | Role |
| --- | --- |
| Codex | Primary setup, repository work, task execution, policy-aware implementation. |
| Pi | Installable skills, prompts, extensions, and quality gates for coding agents. |
| Claude Code or Cursor | Repo-local harnesses that can consume the same MCP and policy artifacts. |
| Dify | Client-facing visual workflow UX, publishing, MCP server cards, and operator inspection. |
| Cloudflare or repo-owned services | Durable state, queues, auth, tenant boundaries, recovery paths, and validation. |
| OpenAI Agents SDK | Code-owned orchestration when approval pauses, traces, evals, and CI-backed golden tasks are worth the burden. |

Portability does not mean every runtime is equivalent.

It means the workflow's governing artifacts should survive movement across runtimes.

The MCP contract keeps capability portable. The agent contract keeps behavior portable. The outcome contract keeps success portable. The golden tasks keep proof portable. The runbook keeps operations portable.

Without those artifacts, changing surfaces becomes a rebuild. With them, changing surfaces becomes a governed migration.

## What Proof Looks Like

The contract bundle should not remain a theory.

A serious implementation leaves behind proof in several forms:

- template workflows that declare which tools are enabled and which writes require confirmation
- inventory records that name the live agent surface, smoke cases, and MCP server cards
- contract bundles for concrete scenarios such as deduplication, inbox triage, or fleet reliability
- smoke runners that can execute those scenarios or at least verify connectivity
- installable agent packages that carry skills, prompts, and quality gates into developer workspaces
- policy evaluators that compile and test the same constraints outside a prompt

Those artifacts do not all need to be public. But they need to exist.

Without them, the team is trusting a claim. With them, the team can inspect the operating boundary:

- this is the workflow
- this is the tool surface
- this is the approval rule
- this is the test case
- this is the runtime owner
- this is the rollback path

The important shift is from "the agent is configured correctly" to "the workflow has inspectable evidence."

## Dify-First Does Not Mean Dify-Only

For many client workflows, Dify is the right front door.

It gives teams visual editing, app publishing, Service API access, MCP server cards, and a surface non-engineers can inspect. Those are not minor conveniences. They are operator affordances.

Policy OS treats those affordances as part of the contract.

A workflow should graduate from a Dify-first path only when repo-owned runtime control is more valuable than platform-managed editing speed. That usually means the workflow needs one or more of these:

- code-owned orchestration
- explicit tool routing
- approval pauses
- durable state
- traces
- evals
- CI-backed golden tasks
- repeatable cost controls
- custom recovery paths

Even then, the recommended pattern is usually not "replace Dify."

The better pattern is:

1. Keep Dify as the client-facing entry point.
2. Move only the expensive, risky, or orchestration-heavy step behind a service.
3. Run the same golden tasks against both paths.
4. Promote only when behavior, cost, latency, reliability, or operator visibility improves.

That is runtime graduation under policy, not platform switching by preference.

## The Three-Tier View

The Policy OS contract bundle maps directly to the Three-Tier Framework.

### Database: what exists

The Database layer contains the state the workflow depends on:

- business records
- tool inventories
- resource URIs
- auth scopes
- entitlement state
- policy versions
- contract versions
- trace and evidence logs

The MCP contract lives closest to this layer because it defines available substrate.

### Automation: what happens

The Automation layer contains execution:

- MCP tool calls
- Dify workflow steps
- Cloudflare endpoints
- queues
- webhooks
- SDK agent routing
- smoke scripts
- eval runs

The agent contract and golden tasks live close to this layer because they define and test allowed behavior.

### Judgment: what should happen

The Judgment layer contains policy:

- approval mode
- escalation policy
- blocked-state behavior
- review cadence
- operator decision rights
- rollback criteria
- graduation criteria

The outcome contract and runbook live close to this layer because they define why the workflow exists and how humans stay in control.

The bundle matters because it keeps those tiers from blending into one prompt.

## A Practical Adoption Path

The first contract bundle should be narrow.

Do not start with an enterprise-wide agent governance program. Start with one workflow where the handoff is painful and the approval boundary is visible.

A good first candidate has:

- a real operator
- a repeatable input
- a known manual fallback
- a measurable output
- at least one approval boundary
- at least one safe read-only path
- clear evidence of whether the workflow succeeded

Then write the bundle in this order:

1. **Outcome contract:** name the job, owner, success metric, and fallback.
2. **MCP contract:** define the tools, resources, prompts, auth scopes, and errors.
3. **Agent contract:** define allowed actions, blocked actions, approvals, guardrails, runtime surface, and graduation status.
4. **Golden tasks:** capture happy, approval, blocked, and failure examples.
5. **Runbook:** document operation, review, incident response, rollback, and evidence.

This sequence keeps the work grounded. The business outcome comes before tool exposure. Tool exposure comes before agent behavior. Agent behavior comes before regression testing. Regression testing comes before recurring operation.

## A Starter Bundle Example

Imagine a customer inbox triage workflow.

The weak version says: "Use AI to help with support."

The contract-bundle version says:

| Artifact | Example content |
| --- | --- |
| `outcome_contract.md` | The workflow classifies inbound customer messages, drafts responses, and routes refund, deletion, legal, and security cases to named humans. It never sends customer-facing mail without approval. |
| `mcp_contract.yaml` | The workflow can read authorized inbox threads, read customer account status, search approved help content, draft a reply, and create an internal handoff note. It cannot issue refunds, delete accounts, or send email directly. |
| `agent_contract.yaml` | Low-risk classification is auto-allowed. Drafting is auto-allowed. Sending, refunding, deleting, exporting, and policy exceptions are approval-needed or blocked. Missing account context stops the workflow with a reason. |
| `golden_tasks.yaml` | Examples cover normal support, refund request, account deletion, missing customer record, suspicious attachment, angry but non-policy-breaking message, and secret exposure attempt. |
| `runbook.md` | The support owner reviews blocked cases daily, checks golden-task drift after prompt or tool changes, and falls back to manual triage if the inbox connector, account lookup, or approval queue fails. |

That small bundle communicates more than a demo because it makes the operating boundary visible.

It tells an operator what will happen. It tells an engineer what to expose. It tells a reviewer what to test. It tells a buyer what evidence to request.

## What To Ask Vendors

If you are evaluating an AI workflow vendor, ask for the contract bundle.

Ask:

- Show me the MCP contract or equivalent capability inventory.
- Show me which tools are allowed, blocked, and approval-gated.
- Show me the outcome contract for the first workflow.
- Show me the golden tasks that prove behavior after a prompt, model, tool, or runtime change.
- Show me the runbook for incidents and rollback.
- Show me the current runtime surface and graduation status.
- Show me the evidence that justifies any move from visual workflow tooling into custom runtime code.

These questions are concrete enough to separate productized governance from a demo.

A good answer may still be lightweight. The first bundle does not need to be large. It needs to be explicit.

A weak answer usually sounds like confidence without artifacts:

- "The agent knows not to do that."
- "We can add approvals later."
- "The prompt handles it."
- "The workflow can be moved to code when needed."
- "The logs are somewhere in the platform."

Those answers may be true in a narrow demo. They are not enough for governed work.

## Conclusion

The useful unit of governed AI work is not the model, the prompt, the connector, or the workflow canvas.

It is the contract bundle.

The bundle makes capability explicit, behavior inspectable, outcomes measurable, regressions repeatable, operations recoverable, and runtime migration governable.

That is why Policy OS starts with MCP but does not stop at MCP. Connectivity establishes trust boundaries. Skills and agents provide behavior. Contracts, golden tasks, runbooks, and review cadence turn that behavior into an operating system.

Before expanding autonomy, write the bundle.

Before graduating runtime, test the bundle.

Before trusting the agent, inspect the bundle.
