# CREATE SOMETHING Reference Mission

> Status: canonical internal reference implementation
> Linear: CRE-1402 map, CRE-1403 contract
> Machine-readable contract: `packages/workflow-compiler/fixtures/internal-delivery/`

## Destination

CREATE SOMETHING is the Performance Lab for workflows.

We train workflows under pressure, govern them in operation, and prove them
through receipts. The first reference mission is our own delivery loop:

```text
Signal
  -> governed Linear scope
  -> bounded agent implementation
  -> source-backed verification
  -> authorized promotion
  -> live proof
  -> recovery or lesson
```

This is the operating proof behind the identity. The system must work here
before it becomes a client claim, public case, reusable policy pack, or stable
Canon extension.

## Reference boundary

`Nike x NASA for workflows` is a private heuristic, never public positioning.
It combines two operating ideas:

- human-centered performance experimentation: begin with the operator, test
  under realistic pressure, measure the result, and improve the system;
- mission-grade systems assurance: make requirements, authority, telemetry,
  verification, anomaly response, recovery, and lessons explicit.

Do not use third-party names, marks, endorsement language, recognizable trade
dress, sneaker styling, or generic space imagery in public output. The owned
synthesis is:

> Human performance under pressure + calm mission operations + controlled
> water + proof-bearing interfaces.

## Three-Tier ownership

| Tier       | Reference-mission ownership                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Database   | Linear scope and evidence history, Git artifacts, `.agency` governance records, deployment records, and live observations |
| Automation | Canonical agent harness, workflow compiler, checks, delivery adapters, and read-only verifiers                            |
| Judgment   | Policy OS, authority and approval rules, public projection rules, exception handling, and Canon promotion                 |

The reference mission composes existing owners. It does not create another
harness, deployment system, or receipt store.

## Mission stages

| Stage        | Canonical state          | Required source of truth                                     | Required evidence                                                   |
| ------------ | ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Signal       | `signal_received`        | Request, incident, source event, or governance signal        | source, objective, observation time                                 |
| Decision     | `scope_governed`         | Linear plus owning policy                                    | owner, scope, authority, done boundary                              |
| Action       | `implementation_bounded` | Isolated worktree and exact source revision                  | issue, base SHA, changed paths, authority envelope                  |
| Verification | `verified`               | Package checks, tests, build, browser, API, or owning system | commands, results, source revision, unresolved failures             |
| Promotion    | `promoted`               | Review gate and immutable delivery artifact                  | approval, artifact, target, rollback artifact or procedure          |
| Proof        | `live_proven`            | Rendered live surface and owning runtime                     | claim, verifier, artifact identity, observed time, receipt          |
| Recovery     | `recovered`              | Delivery and incident records                                | failed artifact, recovery action, independent recovery verification |
| Lesson       | `lesson_canonized`       | Canon candidate and Linear decision history                  | repeated finding, evidence, scope, promotion state                  |

These are canonical translation states, not a replacement global enum. Each
owning system retains its domain states. The machine-readable identity contract
maps those states into this shared operating narrative.

## Receipt envelope

Every consequential action emits:

| Field             | Contract                                                   |
| ----------------- | ---------------------------------------------------------- |
| `workflow_id`     | Versioned workflow identity                                |
| `action_id`       | Versioned action identity                                  |
| `correlation_id`  | One trace across scope, execution, verification, and proof |
| `outcome`         | Pass, approval required, or blocked                        |
| `intent`          | Business or operator objective                             |
| `authority`       | Why this actor can act now                                 |
| `source_of_truth` | Which system can disprove the claim                        |
| `action`          | What changed, where, and through which boundary            |
| `verification`    | How success was distinguished from failure                 |
| `recovery`        | Rollback, retry, compensation, or escalation path          |
| `client_proof`    | Concise evidence safe for the intended audience            |

This envelope specializes the
[Agent-Run Receipt Charter](./AGENT_RUN_RECEIPT_CHARTER.md). CRE-1304 owns the
canonical harness validator and Linear done gate; this mission fixture proves
the complete envelope without replacing that work.

## Expression contract

The mission has four surface modes:

| Mode     | Primary job                      | Visual and interaction priority                                      |
| -------- | -------------------------------- | -------------------------------------------------------------------- |
| Campaign | Establish stakes and consequence | Human pressure, controlled-water material, one decisive proof object |
| Product  | Help someone orient and proceed  | Scope, state, owner, boundary, and next action                       |
| Operator | Run and recover the system       | Telemetry, authority, anomaly, recovery, evidence density            |
| Proof    | Defend a claim                   | Claim, verifier, receipt, time, provenance, and recovery boundary    |

Across every mode:

- controlled water expresses channel, pressure, wake, trace, turbulence, and
  settlement;
- signal blue, proof green, and hazard red remain semantic, sparse colors;
- operating artifacts carry the brand; atmosphere cannot substitute for data;
- motion explains state transition, causality, or pressure, never decoration;
- normal, empty, waiting, blocked, anomalous, recovered, and proven states are
  designed as first-class experiences.

## Agent extension declaration

An agent extending the identity must declare:

1. `mode`: campaign, product, operator, or proof;
2. `invariants_preserved`: the identity rules retained by the extension;
3. `source_truth`: the records that own displayed claims and states;
4. `proof`: the verifier and receipt produced;
5. `exception`: any requested deviation, or `none`;
6. `recovery`: what happens when the extension or its data fails.

Project-local extensions remain local until repeated evidence supports the
existing Canon path: project-local -> candidate -> stable -> deprecated.

## Public projection

Public surfaces may show sanitized objective, scope, state, authority class,
verification summary, proof summary, recovery summary, and observation time.

They must remove credentials, private context, private URLs, and subject
identifiers. A data-looking surface is not proof unless the displayed values
come from a named source, have a freshness boundary, and can be reverified.

## Validation

```bash
pnpm --filter @create-something/workflow-compiler check
pnpm --filter @create-something/workflow-compiler test
pnpm --filter @create-something/workflow-compiler test:acceptance
pnpm exports @create-something/workflow-compiler compileWorkflowDefinition
git diff --check
```

The reference-mission test compiles the machine-readable workflow through the
public compiler interface, replays allowed and fail-closed cases, verifies the
identity invariants and state translations, and rejects an incomplete receipt
contract.

## Non-goals

- replacing CRE-1298 canonical harness work;
- replacing CRE-1304 receipt-validator work;
- claiming production proof from representative fixture data;
- publishing private or client data;
- using the private third-party heuristic as public brand language;
- migrating every Performance surface before this reference mission has live
  evidence.
