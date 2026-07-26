# Business Digital Thread Lifetime-Control Baseline

> Date: 2026-07-23
> Linear map: CRE-1399
> Research frontier: CRE-1400
> Scope: repository and generated-artifact audit; no production or third-party
> mutation

## Verdict

CREATE SOMETHING has a strong governed-execution foundation, but it does not
yet have a Business Digital Thread.

The repository already proves important vertical slices:

- canonical source identities and Atlas projections;
- versioned customer Map state, review events, shares, and immutable
  Map-to-Build handoffs;
- tenant-scoped Control activations bound to exact Map and Build evidence;
- governed run state with immutable, hash-chained receipts;
- first-party user, tenant, account, session, tool-mode, and scope contracts;
- present-day Topology, readiness, receipt, and management projections across
  API, MCP, and agent surfaces; and
- policy, approval, verification, rollback, and client-proof conventions.

Those proofs are fragmented by product and runtime. They do not yet share one
versioned contract that can reconstruct the business at an earlier time and
trace intent, requirements, interfaces, authority, decisions, baselines,
delivery, operation, evidence, retention, and applied learning across changing
people, contractors, agents, vendors, and tools.

The next architectural unit is therefore not another inventory or dashboard.
It is a temporal, typed, governed relationship model rooted in the business.

## Requirements, observations, and inferences

### User requirement

The system should support a business over a five-to-ten-year horizon and remain
coherent under collaboration and turnover comparable to very large,
multi-organization engineering programs.

### Observed repository baseline

The current generated organization review reports:

- 453 topology nodes and 930 edges;
- 453 mapped nodes and zero hard mapping gaps;
- 23 operating slices and four client overlays;
- 246 Automation records and 25 Database records; and
- 56 policy records and 55 guide records.

Authority: `packages/database-layer/data/create-something-organization-review.json`.
Freshness check: `pnpm substrate:agent-wiki:check` reported seven generated wiki
files current on 2026-07-23.

### Inference

Current mapping completeness measures whether present repository surfaces are
represented. It does not measure temporal reconstruction, bidirectional
requirements traceability, multi-party interface control, configuration
baselines, succession, or records disposition. A new lifetime verifier is
required; increasing the present topology node count would not close this gap.

## External reference model

NASA is used here as a systems-engineering reference, not as the product domain
or a bureaucracy template.

The relevant transferable controls are:

- lifecycle-wide, recursive and iterative systems engineering through design,
  realization, operation, and retirement: [NASA Systems Engineering
  Handbook](https://www.nasa.gov/reference/systems-engineering-handbook/);
- bidirectional requirements traceability and controlled requirement
  baselines: [NASA Requirements
  Management](https://www.nasa.gov/reference/6-2-requirements-management/);
- interface control across government, contractors, and distributed teams:
  [NASA Interface
  Management](https://www.nasa.gov/reference/6-3-interface-management/);
- configuration identification, change control, status accounting, and audits
  across a product lifecycle: [NASA Configuration
  Management](https://www.nasa.gov/reference/6-5-configuration-management/);
- technical data access, protection, legacy readability, retirement, and
  retention: [NASA Technical Data
  Management](https://www.nasa.gov/reference/6-6-technical-data-management/);
- explicit alternatives, assumptions, uncertainty, rationale, and final
  disposition for consequential decisions: [NASA Decision
  Analysis](https://www.nasa.gov/reference/6-8-decision-analysis/); and
- a lessons lifecycle that collects, records, disseminates, and applies
  learning: [NASA Lessons
  Learned](https://www.nasa.gov/learning-resources/for-professionals/appel-lessons-learned/).

The CREATE SOMETHING translation is smaller and software-native: preserve the
same control questions as versioned records and policies, while tailoring the
review burden to risk, reversibility, and scale.

## Status rubric

| Status                    | Meaning                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented               | A canonical contract and verifier exist for the current stated scope.                                                                                   |
| Partial                   | Strong implementation islands exist, but there is no thread-wide contract or verifier.                                                                  |
| Missing                   | No canonical contract or falsifiable verifier exists.                                                                                                   |
| External-policy-dependent | The system can implement a mechanism, but a legal, contractual, jurisdictional, or operator decision is required before production policy can be fixed. |

## Lifetime-control gap matrix

| Control family                                                       | Status                                                        | Tier owner            | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                  | Missing lifetime contract                                                                                                                                                                                                                                                                                                               | Required verifier                                                                                                                                                                               | Frontier routing                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Durable business identity and tenant root                            | Partial                                                       | Database              | `packages/database-layer/data/create-something-internal-topology.json` provides a stable CREATE SOMETHING root; `packages/identity-worker/src/types.ts` defines tenant/account identities; `packages/agency/migrations/0035_customer_map_workspaces.sql` scopes product state by account, tenant, and workspace account.                                                                                          | No versioned Business entity separates permanent canonical identity from legal names, brands, workspaces, programs, and source-system identifiers over time.                                                                                                                                                                            | Rename, reorganization, workspace migration, and tool replacement preserve one business ID and historical aliases without cross-tenant leakage.                                                 | Phase 2 contract, Phase 3 model                               |
| Organization, supplier, and participant relationships                | Missing                                                       | Database              | Client overlays and topology owners identify current packages and clients in `packages/database-layer/src/types.ts` and generated coverage artifacts.                                                                                                                                                                                                                                                             | No typed organization, organizational-unit, supplier, employment, contract, team, agent, or delegation relationship with effective interval, scope, provenance, and termination reason.                                                                                                                                                 | A 30,000-participant fixture reconstructs membership and responsibility at historical checkpoints and handles transfers and contract expiry.                                                    | Phase 2 contract, Phase 3 model                               |
| Temporal authority and delegation                                    | Partial                                                       | Database + Judgment   | Identity has expiring/revocable sessions, tenant IDs, tool modes, and allowed tool prefixes in `packages/identity-worker/src/types.ts`; Control stores actor role and tenant scope in `packages/agency/migrations/0039_customer_control_activations.sql`; Substrate tokens have role, workspace scope, and expiry in `packages/substrate-mcp/src/types.ts`.                                                       | Authority is runtime-specific. There is no canonical grant linking actor, represented organization, capability, object scope, valid interval, policy version, delegator, revocation, and evidence. Generic Substrate token revocation deletes the token row rather than preserving a first-class revocation fact.                       | Expired, revoked, wrong-tenant, superseded, and out-of-scope grants fail at the historical time of action; replacements do not inherit ambient authority.                                       | Phase 2 contract, Phase 3 model                               |
| Stakeholder intent and requirements traceability                     | Missing                                                       | Judgment + Database   | `templates/outcome_contract.md`, `templates/golden_tasks.yaml`, and `templates/runbook.md` capture objectives, workflows, success metrics, ownership, checks, and change-control conventions.                                                                                                                                                                                                                     | These are portable document templates, not canonical requirement records with parent/child allocation, rationale, baseline, source owner, verification method, status, and bidirectional links to implementation and operation.                                                                                                         | Trace from a business objective to every allocated requirement and verifier, and from any delivery or run back to its governing intent; orphan and gold-plated records fail.                    | Phase 2 contract and verifier specification                   |
| Cross-party interface agreements                                     | Partial                                                       | Database + Judgment   | MCP contracts, endpoint inventories, auth matrices, package exports, registry records, Atlas edges, and `source_record_relations` capture current technical relationships. `packages/app-governance-db/migrations/0009_source_record_relations.sql` preserves relation evidence and confidence.                                                                                                                   | No versioned interface record owns both parties, direction, schema/protocol, performance and policy constraints, compatibility window, acceptance, change authority, and unanimous or delegated approval where required.                                                                                                                | An interface change identifies affected requirements, systems, owners, tests, releases, fallback, and approvals before acceptance; incompatible versions remain blocked.                        | Phase 2 contract, Phase 3 impact engine                       |
| Configuration baselines and change impact                            | Partial                                                       | Database + Judgment   | Map versions and review events exist in `packages/agency/migrations/0035_customer_map_workspaces.sql`; immutable handoff resolution exists in `0037_customer_map_handoff_resolution.sql`; exact Map/Build/policy hashes and supersession/rollback exist in `0039_customer_control_activations.sql`; Control freezes activation state in `packages/owned-agent-runtime/migrations/0003_control_run_lifecycle.sql`. | These are product-specific baselines. There is no business-wide baseline containing approved versions of requirements, interfaces, policies, adapters, releases, data contracts, and evidence, nor a generic change-impact query.                                                                                                       | A proposed change returns the affected graph, responsible owners, required verification, risk, migration, rollback, and unresolved approvals before a new baseline can be approved.             | Phase 2 contract, Phase 3 impact engine                       |
| Decision context and rationale                                       | Partial                                                       | Judgment              | `DatabaseLayerReceipt` supports decision receipts; workflow actions support decision/approval kinds in `packages/app-governance-db/migrations/0010_workflow_actions.sql`; the Receipt Charter requires intent, authority, truth, action, verification, recovery, and proof in `docs/AGENT_RUN_RECEIPT_CHARTER.md`.                                                                                                | No canonical decision record requires the question, intended outcome, authority, alternatives, criteria, assumptions, uncertainty, analysis, recommendation, final choice, dissent or exception, impact, and supersession.                                                                                                              | A consequential decision cannot reach an approved terminal state without required context; later users can reproduce why it was made and see what invalidated it.                               | Phase 2 contract, Phase 3 model                               |
| Verification, validation, and proof lineage                          | Partial                                                       | Automation + Judgment | Golden tasks, readiness gates, package tests, receipt resources, immutable Map/Build/Control evidence, and hash-chained Control receipts are strong. Evidence includes `templates/golden_tasks.yaml`, `packages/database-layer/src/types.ts`, `packages/agency/migrations/0039_customer_control_activations.sql`, and `packages/owned-agent-runtime/migrations/0003_control_run_lifecycle.sql`.                   | Verification is not consistently bound to explicit requirements and baselines across the whole business. Present generated proof receipts can be projection evidence rather than outcome evidence. Validation of stakeholder need remains separate and inconsistently modeled.                                                          | Every requirement names a verification method and result; every release/run binds the exact baseline; waivers and missing proof stay red; validation remains distinguishable from verification. | Phase 2 verifier specification, Phase 3 model                 |
| Operations, incidents, recovery, and feedback                        | Partial                                                       | Automation + Judgment | Workflow runs and receipts exist in `packages/app-governance-db/migrations/0006_atlas_workflows.sql`; Control has governed state transitions, failure, fallback, recovery, idempotency, and receipt chains in `packages/owned-agent-runtime/migrations/0003_control_run_lifecycle.sql`; runbooks require containment and replay.                                                                                  | There is no common incident/problem/change record that links operational signals back to requirements, interfaces, baselines, decisions, policy, and applied lessons. Product-specific feedback references do not yet form a business-wide loop.                                                                                        | An incident traces to affected baseline and authority, proves containment/recovery, and creates a governed requirement, policy, interface, or Build change without losing the original event.   | Phase 2 contract, Phase 3 model                               |
| Technical data ownership, access, retirement, and legacy readability | Partial                                                       | Database              | Substrate owns structured D1 records, R2 files, relations, archive state, stable URLs, and audit logs; source imports preserve external and canonical identity in `packages/app-governance-db/migrations/0007_source_record_imports.sql`.                                                                                                                                                                         | No thread-wide data-product registry records owner, authority, classification, format/schema version, authoritative copy, access policy, retention class, preservation format, disposition, successor, and legacy-reader strategy.                                                                                                      | Replace a source system and schema, then retrieve an authorized historical artifact with preserved provenance and a documented reader or normalized form.                                       | Phase 2 contract, Phase 3 model                               |
| Retention, legal hold, privacy, and deletion                         | External-policy-dependent                                     | Database + Judgment   | Map records have `retention_expires_at` and soft deletion in `packages/agency/migrations/0035_customer_map_workspaces.sql`; Hydra recall documents a bounded 180-day default and operator-gated delete in `docs/guides/HYDRA_DB_GOVERNED_RECALL.md`; selected monitor receipts have local retention policy.                                                                                                       | There is no canonical retention-class or legal-hold contract across raw records, files, derived projections, audit evidence, and receipts. Immutable Control receipts currently cannot be deleted, which needs a deliberate reconciliation with privacy and legal obligations before client production.                                 | Fixtures distinguish retain, archive, redact, delete, tombstone, legal hold, and preserve-derived-proof; production schedules require named authority and jurisdiction.                         | Phase 2 mechanism; production policy remains an approval gate |
| Historical `as of` reconstruction                                    | Missing                                                       | Database              | Map versions, Control activation versions, run receipt chains, and audit rows preserve selected histories.                                                                                                                                                                                                                                                                                                        | Database-layer topology and generic Substrate records are current-state models with created/updated/archive timestamps. Relations and ownership do not have valid-time intervals, transaction-time revisions, supersession rules, or an `as of` query contract.                                                                         | Reconstruct multiple checkpoints using only facts valid and known at each checkpoint; future facts and later authority must not leak backward.                                                  | Phase 2 temporal semantics, Phase 3 reconstruction engine     |
| Export, clean import, and schema migration                           | Partial                                                       | Database + Automation | Atlas session export and import tools/tests exist in `packages/database-layer/scripts/export-internal-atlas-session.mjs` and `packages/app-governance-db/scripts/import-atlas-session.mjs`; package-local D1 migrations exist; Map exposes machine-readable export behavior.                                                                                                                                      | No canonical Business Digital Thread export manifest, integrity tree, schema registry, clean-import semantic comparator, adapter inventory, or guaranteed legacy migration receipt exists. Generic Substrate schema migration is best-effort and suppresses individual migration errors in `packages/substrate-mcp/src/services/d1.ts`. | Export from a populated thread, import into a clean store, compare canonical IDs/edges/temporal queries/integrity; migrate a legacy fixture with explicit loss and transformation accounting.   | Phase 2 manifest, Phase 3 migration and round-trip verifier   |
| Lessons capture, review, dissemination, and application              | Missing                                                       | Judgment + Database   | Retrospectives and postmortems exist under `docs/internal/`; delivery notes and policy updates preserve many local lessons.                                                                                                                                                                                                                                                                                       | Lessons are documents, not a governed lifecycle. There is no canonical lesson record with source event, review status, applicability, dissemination targets, application actions, effectiveness check, and links to changed policy/requirements/checklists/tests.                                                                       | A lesson moves through collect, record, review, disseminate, and apply; a later artifact change and effectiveness check trace back to it.                                                       | Phase 2 contract, Phase 3 model                               |
| API, MCP, agent, and human projection parity                         | Implemented for current topology; missing for lifetime thread | Automation            | `DatabaseLayerManagementResource` and operations define API/MCP/agent paths in `packages/database-layer/src/types.ts`; `packages/database-layer/test/management-api.test.mjs` verifies parity for topology, receipts, diagnostics, performance, and organization review; Atlas is explicitly a projection in app-governance migrations and package docs.                                                          | No lifetime resources, historical query, trace query, baseline/change-impact query, authority query, retention view, or lessons view exist.                                                                                                                                                                                             | All clients return the same canonical IDs and semantic results for current and historical queries; Atlas shows the same state and blocked conditions without owning writes.                     | Phase 4 management surface, Phase 5 Atlas                     |
| Scale, performance, and longevity verification                       | Missing                                                       | Automation            | Database Layer has an Obsidian-like performance budget and fast-path contract in `packages/database-layer/src/types.ts`; current topology tests cover hundreds of nodes.                                                                                                                                                                                                                                          | There is no deterministic ten-year history fixture, 30,000-participant relationship load, frozen budget, repeated run, large export/import, or long-schema-chain verifier.                                                                                                                                                              | Run the fixed lifetime fixture three consecutive times, publish counts and timings, enforce frozen correctness/performance budgets, and fail on nondeterminism.                                 | Phase 2 verifier freeze, Phase 3 implementation               |

## Cross-tier finding

### Database

The database layer is rich in current source records, runtime state, hashes,
receipts, and product-specific versions. Its central gap is temporal semantics:
typed identity and relationships, valid-time and transaction-time history,
baseline composition, supersession, and deterministic reconstruction.

### Automation

The automation layer already generates topology, readiness, management, Atlas,
and proof projections and has strong focused runtime verifiers. Its central gap
is a lifetime verifier that exercises cross-domain traces, change impact,
replacement, export/import, migration, retention, and large organizational
scale.

### Judgment

The judgment layer has policy artifacts, approval boundaries, runbooks, golden
tasks, and receipt conventions. Its central gap is making requirements,
interfaces, decisions, lessons, and records disposition first-class governed
artifacts rather than document conventions.

## Required v1 contract boundary

Phase 2 should define the smallest typed contract that closes the horizontal
gap without replacing domain systems. At minimum, the contract needs:

1. **Business and party identity** — stable business, organization, unit,
   person, contractor, agent, vendor, tool, and source-system references.
2. **Temporal relationship and authority** — typed edges with valid interval,
   recorded interval, scope, provenance, policy, grant, revocation, and
   succession.
3. **Intent and requirements** — stakeholder objective, requirement hierarchy,
   allocation, rationale, owner, baseline, change, verification, and
   validation.
4. **Interfaces and configurations** — versioned agreements and approved
   baseline membership with impact analysis and change authority.
5. **Decisions and execution proof** — alternatives, assumptions, authority,
   disposition, actions, results, verification, recovery, and immutable or
   disposition-aware receipts.
6. **Knowledge and records lifecycle** — data ownership, schema/format,
   retention class, legal hold, disposition, migration, legacy access, lesson,
   dissemination, application, and effectiveness.

The contract should be independent of D1 table layout, Atlas geometry, Linear
issue shape, Git history, a specific identity token, or any current vendor SDK.
Those are adapters and evidence providers.

## Recommended next frontier

Create one Prototype frontier under CRE-1399:

> Freeze the Business Digital Thread v1 contract and adversarial verifier
> specification.

Its verifier should reject three false solutions before implementation begins:

1. a present-only topology with timestamps;
2. an untyped append-only audit log; and
3. a hand-authored synthetic success graph with no authoritative CREATE
   SOMETHING projection path.

The ticket should end with a versioned contract, temporal semantics, ownership
ADR, deterministic fixture specification, and frozen pass/fail outputs. It
should not implement the runtime in the same ticket.

## Evidence commands

```bash
pnpm substrate:agent-wiki:check
node scripts/linear/remote.mjs get --issue CRE-1399
node scripts/linear/remote.mjs get --issue CRE-1400
```

The audit also inspected the authoritative source and migrations named in the
matrix. It did not query secret values, deploy code, mutate Cloudflare, start an
Atlas production write, or use client data.

## Claim boundary

This document establishes a local architecture baseline. It does not prove a
Business Digital Thread implementation, 30,000-participant runtime behavior,
five-to-ten years of observed history, commercial readiness, or production
operation. Those claims remain red until the active goal verifier and any
separately approved production promotion pass.
