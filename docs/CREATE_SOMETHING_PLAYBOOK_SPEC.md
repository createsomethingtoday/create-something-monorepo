# CREATE SOMETHING Playbook Specification

> Status: draft v0.1
> Scope: operator-owned AI-native business systems
> Normative language: `MUST`, `MUST NOT`, `SHOULD`, and `MAY` are requirements,
> recommendations, and options within this specification.

## Purpose

A CREATE SOMETHING Playbook is the client-owned operating system for a bounded
business outcome. It gives people and approved AI the same picture of the work:
what changed, what should happen, who or what may act, where human judgment is
required, when the system must stop, how it recovers, and what evidence remains.

The Playbook is readable by an operator before it is executable by a system. It
is larger than a prompt chain, automation recipe, diagram, or collection of
standard operating procedures. Those artifacts MAY implement parts of a
Playbook, but none is the whole Playbook.

## Owned hierarchy

The terms are related but not interchangeable:

1. **Playbook** — the complete operating system for an outcome. It owns the
   objective, roles, systems, authority, Plays, Runbooks, evidence, recovery,
   and review rhythm.
2. **Play** — one outcome-bearing workflow inside the Playbook. A Play connects
   a signal to a decision and a proved result.
3. **Runbook** — the executable procedure for a known moment inside a Play. A
   Runbook defines its trigger, steps, owner, approval gate, stop condition,
   recovery path, and required receipt.
4. **Receipt** — the durable evidence of what ran, waited, stopped, changed,
   failed, recovered, or remained unknown.

An organization MAY own one Playbook with several Plays. One Play MAY call
several Runbooks. Every production Runbook MUST belong to a Play, and every Play
MUST name its owning Playbook.

## Required model

Every conforming Playbook MUST define three operating layers.

| Layer | Required question | Typical artifacts |
| --- | --- | --- |
| **Database** | What is true, where does state live, and who owns it? | source records, schema, state, bindings, history, receipts |
| **Automation** | What can observe, transform, route, or act? | tools, MCP servers, agents, skills, triggers, Runbooks |
| **Judgment** | What policy decides whether work may run, wait, stop, or escalate? | authority matrix, approval rules, evals, escalation policy |

A Playbook is incomplete if it describes Automation without the Database state
it acts on or the Judgment policy that bounds it.

## Required operating fields

A Playbook MUST contain:

| Field | Requirement |
| --- | --- |
| Identity | Stable name, owner, version, and status |
| Objective | Business outcome and explicit non-goals |
| Boundary | In-scope systems, data, people, agents, and environments |
| Roles | Accountable operator, decision owners, executors, and reviewers |
| Authority | Actions that may run, must wait, or must stop |
| Plays | Outcome-bearing workflows in the Playbook |
| Runbooks | Procedures for known triggers and states |
| Evidence | Required receipts, metrics, and unresolved unknowns |
| Recovery | Rollback, retry, escalation, and safe-stop behavior |
| Handoff | Client-owned artifacts, access, training, and review cadence |

Each field MUST be inspectable without access to a model prompt. Secrets,
credentials, private source data, and personal data MUST be referenced through
governed bindings rather than copied into the Playbook.

## Play contract

Every Play MUST define:

1. a named outcome;
2. an initiating Signal;
3. the source of truth for required context;
4. the allowed operator or agent roles;
5. the expected route through the work;
6. every human Decision gate;
7. explicit wait and stop conditions;
8. the Proof required to call the outcome complete;
9. a recovery or escalation path; and
10. the Runbooks used along the route.

The canonical operating loop is:

> Signal → Decision → Proof

The loop MUST NOT imply that every signal requires automation or that every
decision can be delegated.

## Runbook contract

Every production Runbook MUST define:

| Field | Meaning |
| --- | --- |
| Trigger | The observable condition that starts the procedure |
| Preconditions | Required data, permissions, state, and readiness |
| Executor | Named human, approved agent, tool, or bounded combination |
| Steps | Ordered actions and expected intermediate state |
| Decision gate | Human authority required before a protected action |
| Wait condition | State that pauses without declaring failure |
| Stop condition | State that prevents or terminates unsafe execution |
| Recovery | Retry, rollback, compensation, or escalation procedure |
| Receipt | Evidence produced by the run and its final status |
| Review | Owner and condition for revising the Runbook |

Runbooks SHOULD be deterministic where the business rule is deterministic.
Model judgment MAY be used only where the Playbook names the policy, evaluator,
authority, uncertainty handling, and escalation path.

## Offense and defense

Offense and defense are operating responsibilities, not sports decoration.

**Offense** creates advantage. It detects useful signals, prepares context,
routes work, executes approved actions, shortens handoffs, and advances a known
business outcome.

**Defense** protects the operation. It verifies authority, checks evidence,
holds protected actions, exposes uncertainty, stops unsafe work, and preserves
recovery.

The opposing team is not another person or company. It is **ambiguity** when
people and AI do not share the same picture, **AI out of reach** when useful
capability cannot safely reach the operator, and **untrusted automation** when
authority, evidence, or recovery are unclear. The Playbook removes ambiguity.
Defense makes automation trustworthy. Offense creates useful access.

Every production Play MUST contain both. Offense without defense is unbounded
automation. Defense without offense is governance that does not improve the
operation.

## X/O visual projection

Court notation is the standard visual projection of this specification. A
reader MUST be able to understand the Play without basketball knowledge.

| Mark | Stable meaning |
| --- | --- |
| **O = owner** | a person or approved agent with a named role |
| **X = opposition** | ambiguity, AI out of reach, or untrusted automation blocking the outcome |
| **Route = delegated work** | the expected movement of context or action |
| **Gate = human decision** | authority that automation cannot pass on its own |
| **Receipt = proof** | evidence attached to the completed, held, or stopped run |
| **Zone = boundary** | a permission, system, environment, or risk region |

Color MUST be redundant with a label, shape, or state word. Motion MAY show
sequence, but the complete meaning MUST remain in the static and reduced-motion
rendering.

## Lifecycle

CREATE SOMETHING applies the specification through one lifecycle:

1. **Map defines the Playbook.** It names the operation, layers, owners,
   authority, Plays, Runbooks, stop conditions, recovery, and evidence.
2. **Build makes approved Runbooks executable.** It connects owned data,
   infrastructure, tools, agents, tests, and operator surfaces.
3. **Control runs and revises the Playbook.** It watches Signals, routes
   Decisions, preserves Proof, handles exceptions, and maintains recovery.
4. **Performance Lab tests Plays under pressure.** It evaluates readiness,
   failure behavior, evidence quality, and operator legibility.
5. **Field Reports improve the next version.** They separate what was measured,
   blocked, unknown, recovered, and changed.

## Handoff and ownership

A conforming handoff MUST leave the client able to inspect, operate, stop,
recover, and revise the system without hidden CREATE SOMETHING authority.

The handoff MUST include, where applicable:

- the current Map and Playbook version;
- Play and Runbook definitions;
- owned source, configuration, policies, prompts, and evals;
- infrastructure and data bindings;
- access and approval roles;
- deployment and rollback instructions;
- current receipts and known unknowns; and
- a review cadence and change owner.

Vendor services MAY provide infrastructure or intelligence. They MUST NOT be
presented as owning the Playbook.

## Conformance

A Playbook conforms when:

- all required fields and all three operating layers are present;
- every production Play includes offense and defense;
- every production Runbook includes authority, stop, recovery, and receipt;
- every protected action has a named human Decision gate;
- the client ownership and handoff path are explicit;
- the rendered X/O projection uses the stable legend and an accessible textual
  description; and
- evidence distinguishes measured facts, blocked actions, and unknowns.

A Playbook MUST fail conformance if a model, agent, or tool can infer new
authority from silence.

## External format boundary

The separate, external `PLAYBOOK.md` draft is a markdown format for sequential,
single-agent prompt and tool workflows. CREATE SOMETHING does not implement,
extend, or claim affiliation with that project in this specification.

Future adapters MAY import from or export to external workflow formats if they
can preserve this specification's ownership, Database, Automation, Judgment,
authority, offense, defense, evidence, recovery, and handoff contracts. Format
compatibility MUST NOT weaken the operator-owned Playbook.
