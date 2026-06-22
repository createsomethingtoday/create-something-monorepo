---
title: 'The Proof Surface'
subtitle: 'Why agent work needs public receipts, private evidence, and owner authority once it leaves chat'
authors: ['CREATE SOMETHING']
category: 'Research'
abstract: 'Agent work becomes operational only when a buyer, operator, or reviewer can inspect what ran, what waited, what stopped, and what proves the decision. This paper defines the Proof Surface as the business-readable layer that sits above private logs, traces, deploy output, and workflow contracts. It turns evidence into receipts, separates public status from sensitive proof, keeps ownership visible after the agent has acted, and gives teams a practical template for one workflow.'
keywords: ['Proof Surface', 'Receipts', 'Workflow Trust Layer', 'Policy OS', 'Agent Governance', 'Delivery Records', 'Operator Surface', 'Three-Tier Framework']
publishedAt: '2026-06-22'
readingTime: 18
difficulty: 'intermediate'
published: true
---

## Executive Thesis

Proof is the product once work leaves chat.

A model response can sound right. A tool call can succeed. A trace can show every step. A deploy can pass. A Linear issue can close. None of those facts, alone, gives a buyer or operator a usable answer to the practical question:

What happened, what changed, who owns the next decision, and what evidence should we trust?

The missing layer is the **Proof Surface**: the business-readable layer that turns agent work into inspectable operating receipts.

The Proof Surface answers four questions:

1. What can run?
2. What must wait?
3. What must stop?
4. What proves the decision?

This is not a replacement for traces, evals, runbooks, or contracts. It is the layer that makes those artifacts legible to the people who have to inherit the workflow.

The practical recommendation is simple: before expanding agent authority, define the proof surface the operator will inspect after the work runs.

## What This Paper Gives You

Use this paper when an AI workflow is already capable enough to act, but not yet legible enough to inherit.

It gives you three practical outputs:

1. A distinction between raw evidence and proof receipts.
2. A public/private evidence boundary for workflow status surfaces.
3. A starter proof template that can be applied to one workflow before autonomy expands.

The target reader is the operator, founder, product lead, client sponsor, or builder who needs to know whether agent work can leave chat without losing accountability.

## Why Proof Needs A Surface

Most AI workflow demos end at the moment the agent responds.

Real operations begin after that moment.

The operator needs to know whether a customer-facing reply was only drafted or actually sent. The founder needs to know whether a production deploy touched the canonical domain or only a preview alias. The client sponsor needs to know which evidence is safe to share and which logs must stay private. The next teammate needs to know why an action stopped instead of pretending to finish.

Without a proof surface, the system creates a familiar failure mode: execution exists, but accountability is scattered.

- The chat transcript has the explanation.
- The CI run has the command output.
- The trace has the runtime steps.
- The issue tracker has the assignment.
- The deploy system has the URL.
- The client page has only a vague status.

Nobody is lying, but nobody can read the work as one operating path.

The Proof Surface brings those fragments into one inspectable object. It does not expose every private detail. It shows enough for a buyer, operator, or reviewer to understand the state of the work without receiving credentials, raw logs, private client data, or implementation noise.

## Proof Is Not The Same As Evidence

Evidence is the underlying material.

Proof is the interpreted receipt.

For agent workflows, evidence can include:

- command output
- test results
- trace IDs
- eval scores
- screenshots
- deploy IDs
- source URLs
- database snapshots
- policy decisions
- approval notes
- blocked-state records

Those artifacts matter, but most of them are not buyer-readable. A trace can prove runtime behavior to an engineer while still failing to explain the workflow to an operator. A deploy ID can prove promotion to a release owner while saying nothing about whether the customer-facing action was allowed. A screenshot can show a page rendered while hiding whether the data behind it was stale.

Proof is the layer that says what the evidence means.

| Evidence | Proof receipt |
| --- | --- |
| A passing validation command | The workflow met its release gate. |
| A trace ID | The run followed the expected path. |
| A blocked-state JSON file | The action stopped for a named reason. |
| A deploy URL | The change is visible on a specific surface. |
| An approval comment | A named owner accepted a risky action. |
| A rollback note | The team knows how to recover if the change fails. |

This distinction keeps teams from oversharing private evidence while still giving stakeholders a trustworthy view of the work.

## The Four Visible States

The Proof Surface makes agent work readable through four states.

| State | Meaning | Receipt |
| --- | --- | --- |
| Run | Bounded work was allowed to proceed. | What action ran, against which object, under which rule. |
| Wait | A named owner must approve before impact. | The approval note, decision owner, and pending action. |
| Stop | The workflow exceeded scope, lacked data, or hit policy. | The reason code and recovery path. |
| Receipt | The result is preserved for review and handoff. | The link, command, trace, note, or delivery record that proves the state. |

These states are intentionally small.

Operators do not need to read an entire policy bundle to understand whether the system acted correctly. They need the operating state first. From there, the deeper evidence can remain attached for reviewers who need it.

The state language also prevents fake autonomy. An agent that stops with a reason is more trustworthy than an agent that guesses to preserve the appearance of completion.

## Public Status, Private Evidence

The proof surface has to separate what is visible from what is sensitive.

This is where many agent systems fail. They either expose too little and become opaque, or expose too much and leak credentials, raw client data, private logs, or internal reasoning that should never become a customer artifact.

A useful proof surface has two layers:

| Layer | Audience | Contents |
| --- | --- | --- |
| Public or client-safe status | Buyer, operator, client sponsor, next teammate | Workflow state, owner decision, safe summary, next action, non-sensitive links. |
| Private evidence packet | Builder, reviewer, release owner, security owner | Commands, trace IDs, raw validation output, secrets-adjacent context, rollback notes, detailed logs. |

The separation is not cosmetic. It preserves ownership.

The buyer should see enough to trust the system. The operator should see enough to act. The builder should preserve enough to debug. Sensitive proof should stay behind the right boundary.

That is the difference between transparency and leakage.

## How This Fits The Existing Stack

The Proof Surface follows the sequence already established by the CREATE SOMETHING research trail.

The **Workflow Trust Layer** names what can run, what waits, and what stops.

The **Policy OS Contract Bundle** defines the portable artifacts that govern capability, behavior, outcomes, regressions, and operations.

The **Eval Evidence Layer** makes traces, evals, approval receipts, and blocked states measurable enough to change release decisions.

The **Proof Surface** makes the result readable to the people who inherit the work.

Those layers should not collapse into one document.

| Layer | Primary question |
| --- | --- |
| Workflow Trust Layer | What is the workflow allowed to do? |
| Policy OS Contract Bundle | Which artifacts govern the workflow? |
| Eval Evidence Layer | Which measurements change release decisions? |
| Proof Surface | What can a human inspect after work runs? |

The proof surface is the user-facing edge of governance. It is where policy, evidence, and handoff become understandable.

## The Proof Path: Connect, Verify, Coordinate, Control

A practical proof surface follows the same path as governed delivery.

### 1. Connect

Name the system, account owner, and authority boundary.

This is where the workflow states what it can read, what it can write, and which system owns the source of truth. A connection without ownership is just latent risk.

The proof receipt should answer:

- Which account or system is involved?
- Who owns access?
- Which authority was granted?
- Which authority was not granted?

### 2. Verify

Check the claim before repeating it.

Verification can be a command, route response, screenshot, trace, eval, or direct source read. The important point is that the agent does not merely narrate confidence. It attaches evidence.

The proof receipt should answer:

- What was checked?
- When was it checked?
- What passed or failed?
- What is still unverified?

### 3. Coordinate

Keep ownership, status, and evidence with the work.

Agent work often spans multiple tools and sessions. Without coordination, the next operator inherits a scattered story. A useful proof surface preserves the handoff as an artifact, not as oral tradition.

The proof receipt should answer:

- Who owns the next decision?
- Which issue, delivery record, or runbook carries the state?
- What is blocked?
- What can continue safely?

### 4. Control

Ship the run, wait, stop, and rollback paths.

Control means the workflow can act inside bounds and stop outside them. It also means a future operator can recover. A proof surface without rollback context is incomplete whenever production, revenue, customer trust, or account authority is involved.

The proof receipt should answer:

- What can run automatically?
- What requires approval?
- What stops with a reason?
- How does the team recover?

## Delivery Records As Proof Surfaces

A delivery record is one of the most useful proof surfaces because it is naturally business-readable.

It can show:

- the workflow model
- the current status
- the owner boundary
- the visible decisions
- the private evidence boundary
- the next action

For a recruiter-gated workflow pilot, the delivery record can show the business model, agent boundary, remaining owner decisions, and client-safe proof without exposing private sourcing data or account credentials.

For a backend handoff, the delivery record can separate account ownership, credentials, app administration, database state, acceptance checks, and transfer options.

The pattern is the same in both cases:

1. Visible status for the client or operator.
2. Private evidence for the builder or release owner.
3. Named authority for the next decision.
4. A receipt trail that survives the handoff.

This is why proof surfaces are not marketing pages. They are operating artifacts with a public-safe face.

## A Worked Example: Support Recovery

Consider an ecommerce support workflow.

A customer writes in because an order has the wrong shipping address. The order is paid, the shipment is not yet fulfilled, and the warehouse cutoff has not passed.

The agent has access to four systems:

- the support case
- the customer record
- the order record
- the warehouse cutoff state

The raw capability looks simple: read the case, inspect the order, draft a reply, write an internal order note, and notify the warehouse.

The proof surface is what makes the workflow safe to inspect.

| Proof field | Support recovery example |
| --- | --- |
| Workflow | Address correction before fulfillment cutoff. |
| Current state | Run. |
| Named owner | Support lead owns exceptions; warehouse owns cutoff. |
| Allowed action | Add an internal order note and draft the customer reply. |
| Approval-needed action | Credit, refund, cancellation, or shipment reroute after cutoff. |
| Blocked action | Any payment change or address rewrite after warehouse cutoff. |
| Evidence summary | Order is paid, unfulfilled, and inside cutoff; address format validated. |
| Private evidence pointer | Case URL, order lookup, warehouse cutoff check, command output, trace ID. |
| Public receipt | "Address correction drafted; warehouse note prepared; no payment action taken." |
| Next action | Support lead reviews the drafted reply or lets the bounded note proceed. |

This example matters because the same agent capability can produce three different proof states.

If the order is unfulfilled and inside cutoff, the workflow can run. If the request includes a goodwill credit, it must wait for a named owner. If the customer asks for a refund above the support lane, it must stop with a reason.

The model may be the same in all three cases. The tools may be the same. The proof surface is what changes the operating state.

## Database, Automation, Judgment

The Proof Surface maps cleanly to the Three-Tier Framework.

### Database: what exists

The Database layer stores the proof material:

- workflow records
- delivery records
- source objects
- account ownership
- trace links
- eval results
- command output
- approval decisions
- blocked-state records
- rollback notes

The proof surface should not pretend to be the source of truth for everything. It should point to the source of truth and summarize the current state safely.

### Automation: what happened

The Automation layer produces the receipts:

- route checks
- validation commands
- deploys
- agent runs
- MCP tool calls
- CI checks
- evidence packaging
- handoff updates

Automation makes work fast. The proof surface makes automation inspectable.

### Judgment: what should happen

The Judgment layer interprets the receipt:

- Is this safe to publish?
- Does this need owner approval?
- Should this stop?
- Is the evidence sufficient?
- Does the workflow graduate, narrow scope, or roll back?

The proof surface carries this judgment back to the user in a form they can act on.

## What A Good Proof Surface Includes

A useful proof surface is compact, but it is not vague.

It should include:

- **Workflow name**: the business path, not the tool name.
- **Current state**: run, wait, stop, or receipt.
- **Named owner**: the person or role that owns approval.
- **Allowed action**: what the system may do without review.
- **Blocked action**: what the system refused or deferred.
- **Evidence summary**: what was checked and what passed.
- **Private evidence pointer**: where detailed proof lives.
- **Next action**: what should happen now.
- **Rollback or recovery note**: what to do if the path fails.

It should avoid:

- raw secrets
- full logs with private data
- unsupported status claims
- vague "completed" labels
- hidden approval assumptions
- unlinked evidence
- screenshots that are treated as the only proof

The test is simple: a new operator should be able to inspect the surface and understand what can happen next without asking the original agent to reconstruct the story.

## A Starter Proof Surface Template

A first proof surface can be written as a small operating record.

```yaml
workflow: support-recovery.address-correction
owner:
  approval: support_lead
  source_account: ecommerce_ops
state: run
boundary:
  can_run:
    - read_support_case
    - read_order
    - read_warehouse_cutoff
    - write_internal_order_note
    - draft_customer_reply
  must_wait:
    - issue_credit
    - post_customer_reply_without_template_match
    - reroute_after_cutoff
  must_stop:
    - refund_above_support_lane
    - missing_order_record
    - payment_state_unclear
evidence:
  public_summary: "Order is paid, unfulfilled, and inside warehouse cutoff."
  private_packet:
    - case_url
    - order_lookup_result
    - warehouse_cutoff_check
    - trace_id
receipt:
  public: "Address correction prepared; no payment action taken."
  private: "validation-output-2026-06-22.md"
next_decision:
  owner: support_lead
  action: review_customer_reply
rollback:
  note: "Remove internal note and escalate to warehouse owner if cutoff state changes."
```

This record is deliberately small. It is not trying to replace the contract bundle, runbook, trace, or eval ledger. It is the visible operating object that tells the next human how to read the work.

## Common Failure Modes

### Status Without Receipts

The page says "done," but no evidence is attached.

This is the most common failure. It creates confidence without transferability. A proof surface should avoid status claims that cannot be followed to evidence.

### Evidence Without Interpretation

The team has logs, traces, screenshots, and deploy IDs, but no one has translated them into an operating conclusion.

This creates the opposite problem: too much evidence, not enough proof. The proof surface must say what the evidence means.

### Public Proof With Private Leakage

The system exposes raw logs, secret-adjacent output, private customer data, or credential context because it treats transparency as unrestricted visibility.

The fix is to split public-safe status from private evidence packets.

### Approval Without An Owner

The workflow says an action needs approval, but it does not name who can approve it.

That is not a wait state. It is an abandoned state. A useful proof surface names the owner or stops with a reason.

### Agent Continuity Without Handoff

The agent can continue in its own context, but the human team cannot inherit the work.

Long-running agent systems need ownership, checkpoints, and evidence that survive tool boundaries. Otherwise continuity exists only inside the model session.

## A One-Workflow Starting Point

Teams do not need to build a full proof platform before using agents.

Start with one workflow your team already protects by hand.

Choose a workflow with:

- a visible owner
- repeated handoffs
- real risk when it fails
- at least one system connection
- at least one approval boundary
- evidence that can be checked

Then create a first proof surface with five sections:

1. **Workflow**: name the path and owner.
2. **Boundary**: list what can run, wait, and stop.
3. **Evidence**: summarize what was checked.
4. **Receipt**: link the delivery record, issue, trace, or validation output.
5. **Next decision**: name the owner and action.

If this feels too heavy, the workflow probably is not ready for more autonomy. If it feels clarifying, the proof surface is doing its job.

## Conclusion

Agent systems need more than capability, contracts, and metrics.

They need a surface where humans can inspect the work.

The Proof Surface is that layer. It turns private evidence into public-safe receipts. It keeps owners visible. It explains why work ran, waited, or stopped. It lets delivery records, runbooks, evals, traces, and release evidence become one operating story.

The result is not just a better report.

It is a safer delegation path: work can leave chat without leaving accountability behind.
