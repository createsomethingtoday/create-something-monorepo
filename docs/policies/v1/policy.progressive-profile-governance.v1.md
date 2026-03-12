# policy.progressive-profile-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING product + judgment + identity`
- Effective date: `TBD`

## Purpose

Define how CREATE SOMETHING systems may infer, store, confirm, reject, and act on profile data gathered progressively from conversation and dynamic in-chat widgets.

## Scope

- hosted concierge chat products
- progressive profiling from messages and artifacts
- workflow-scoped recruitment and intake flows where open demand may already exist upstream
- field confidence and confirmation rules
- in-chat widget rendering for profile completion
- handoff rules when confidence or policy requirements are not met

## Policy Statements

1. Profile data derived from conversation MUST be stored with provenance, confidence, and lifecycle status.
2. Every profile field event MUST be classified as one of:
   - `candidate`
   - `inferred`
   - `confirmed`
   - `rejected`
3. Inferred data MAY shape conversational flow and widget choice, but MUST NOT be treated as confirmed user truth without meeting the required confirmation rule for that field class.
4. Identity-critical, consent, billing, credential, regulated, and external-write fields MUST require explicit confirmation before they are used to trigger external writes or irreversible actions.
5. Higher-confidence inferred values MAY prefill approved widgets or reduce redundant questioning, but the user MUST retain the ability to confirm, correct, or reject them.
6. The assistant MUST NOT silently overwrite a previously confirmed field with a new inferred value. Conflicts require user confirmation or human review.
7. Dynamic widgets used for profile completion MUST come from an approved widget registry. Raw model-generated executable UI is prohibited.
8. When conversational collection becomes inefficient or confidence remains low, the system SHOULD switch from freeform chat to a structured widget for the missing information.
9. Human handoff MUST be available and SHOULD be triggered when:
   - the user requests a person
   - conflicting evidence persists
   - confidence remains below required threshold after repeated attempts
   - policy requires review for the intended action
   - the workflow reaches a regulated, destructive, or exception path
10. Audit records MUST distinguish inferred profile updates from user-confirmed profile updates.
11. Only fields relevant to the active workflow SHOULD be collected or persisted; unnecessary profile accumulation is prohibited.
12. When counterparty demand, role context, or job-order context already exists upstream, the system MAY reference that upstream context for matching, but MUST NOT expand collection into the counterparty workflow unless a separate explicit workflow requires it.
13. In candidate-acquisition deployments, the system SHOULD prioritize nurse-side availability, specialty, credential state, location or radius, pay expectations, consent, and required proof artifacts over generalized marketplace-field accumulation.
14. Candidate-side proof artifacts, including resume receipt, consent records, license evidence, and compliance uploads, MUST remain visibly incomplete until received and MUST block shortlist delivery or external writes when required by workflow rules.
15. User-facing summaries MUST clearly indicate what the system inferred versus what the user explicitly confirmed.

## Default Thresholds

Unless a stricter domain policy overrides them:

1. `< 0.70` confidence MUST remain `candidate`
2. `0.70 - 0.89` confidence MAY become `inferred`
3. `>= 0.90` confidence MAY prefill approved UI, but sensitive field classes still require explicit confirmation

## Sensitive Field Classes

The following classes require explicit confirmation before external use:

- identity
- contact
- consent
- billing
- credential
- regulated
- external_write_key

## Enforcement Surfaces

- hosted chat product package (for example `packages/concierge-chat`)
  - `src/lib/server/profile/*`
  - `src/lib/server/widgets/*`
  - `src/lib/server/orchestration/*`
  - `src/lib/widgets/*`
- MCP and hub controls
  - `packages/cs-mcp-hub-remote/index.ts`
  - `packages/mcp-authz/src/hub.ts`
- policy runtime
  - `packages/policy-os-engine/*`

## Evidence

- profile field event logs with status, confidence, and provenance
- user confirmation and rejection audit events
- widget selection logs by thread and turn
- handoff event records with reason codes
- blocked progression records showing shortlist or write actions halted for missing nurse-side proof
- blocked external writes caused by missing confirmation
- UI evidence that inferred versus confirmed values are visibly distinct

## Source Anchors

- `docs/CONCIERGE_CHAT_PRODUCT_ARCHITECTURE_2026-03-09.md`
- `docs/guides/MCP_DUI_ORGANIZATION.md`
- `docs/policies/v1/policy.client-hub-user-experience.v1.md`
- `docs/policies/v1/policy.hub-route-authorization.v1.md`
- `docs/policies/v1/policy.tenant-tool-exposure.v1.md`
