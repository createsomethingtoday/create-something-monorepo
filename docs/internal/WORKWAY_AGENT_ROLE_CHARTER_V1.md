# WorkWay Agent Role Charter v1

**Status:** API-first local foundation. Composer is the only enabled runtime role. The remaining roles are boundaries and future contracts, not workers or permissions.

## Shared rule

WorkWay's semantic project graph and deterministic geometry/rules engine are authoritative. Every agent returns a source-free, revision-bound receipt. An agent may propose, explain, block, or escalate; it cannot directly change canonical geometry, accept evidence, make a professional determination, issue a spatial package, or authorize construction.

| Role | Database input | Automation output | Judgment boundary | Runtime status |
| --- | --- | --- | --- | --- |
| Composer | Canonical graph, active revision, codified proposal rules | Typed deterministic proposal plus validation, assumptions, review requirement | Unsupported, private, or professional-determination requests block or escalate | Enabled, proposal-only |
| Ingestion | Private vault record and approved source metadata, when separately authorized | Candidate extraction/citation work only | Cannot access browser data, accept evidence, or issue geometry; human review is required | Not enabled |
| Trade Review | Approved proposal and qualified trade inputs, when separately authorized | Trade impact questions and escalation packet | Cannot claim structural, MEP, energy, code, cost, scheduling, or permit determination | Not enabled |
| Spatial Session | Client-safe spatial package and local session state | Navigation, annotation, presence, and review-state projection | Cannot read source documents or mutate canonical project/evidence state | Not enabled |

## Composer API boundary

`workway.agent-request.v1` accepts only schema/revision identity, a declared role, and bounded intent. It denies unknown properties, so a caller cannot smuggle an operation, source document, evidence record, approval control, or construction flag into the request.

`workway.agent-receipt.v1` always includes active project/revision identity, an opaque `req_` correlation token, supported scope, assumptions, required review, outcome, and `constructionReady: false`. A proposal contains one existing deterministic operation and validation; blocked/escalated receipts contain a reason and no operation. The receipt has no prompt, document name, path, bytes, extraction, vault locator, reviewer identity, mutation handle, approval action, or construction authority.

## Handoff rules

There is no autonomous role-to-role chain. A blocked Composer result must be explicitly selected by a human as a later Ingestion, Trade Review, or qualified professional workflow. That workflow needs its own identity, authorization, data boundary, retention, audit, and immutable-revision rules before it can be enabled.

## Current evaluator expectations

The synthetic evaluator must treat a codified kitchen change and material-role alternative as `proposed`, an ambiguous or no-op request as `blocked`, a private-document request as `blocked`, and a safety/compliance request as `escalated`. No result changes the graph.
