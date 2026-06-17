# Understanding: @create-something/concierge-chat

> **The hosted conversation product shell for governed concierge workflows, progressive profiling, and approved in-chat widget execution.**

## Ontological Position

**Mode of Being**: UI-heavy product package

This package is the end-user conversation surface, not the control plane and not an MCP server. Its purpose is to make governed concierge interactions legible to users through routes, widgets, and product-state shells while respecting policy constraints defined elsewhere in the repo.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| SvelteKit + Canon auth loader + `.agency` entitlement snapshot | Route structure, product shell runtime, optional shared session awareness, and governed staffing gating |
| policy docs for progressive-profile governance | Define what the chat experience is allowed to ask, render, and hand off |
| widget registry and renderer | Control which in-chat UI elements are allowed to execute |
| session engine, public-apply access boundary, self-serve intake verification helper, intake-claim bridge, Indeed MCP writeback helper, matching/booking model, staffing queue, facility-response, and onboarding progression, handoff packet model, D1 persistence layer, attachment storage adapter, and non-production demo concierge data model | Current workflow state and storage contract |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| product engineers | How the concierge experience is structured as routes and widget states |
| policy work | Where governed widget behavior touches the end-user UI |
| agent systems | Which UI routes and production-facing validation paths are available today |

## Internal Structure

```text
src/
├── routes/                   → public landing, apply entry, claim continuation, candidate chat/details, internal Dify agent shell, internal handoff/settings, control-plane bridge shells, and optional shared session/entitlement-aware layout
├── routes/api/intake-verification/ → self-serve verification request/verify endpoints
├── routes/api/intake-claims/ → trusted inbound claim creation for sourced applicants
├── routes/api/threads/       → server mutation and attachment surface for the hosted prototype
├── lib/chat/prototype-session.ts → cookie-scoped server session state
├── lib/server/intake-access.ts → signed intake grant verification and secure-link enforcement for protected actions
├── lib/server/intake-verification.ts → one-time email verification challenges and grant issuance
├── lib/server/intake-claims.ts → D1-backed claim storage and secure continuation links for imported applicants
├── lib/server/indeed-mcp.ts → server-side JSON-RPC client for terminal Indeed disposition writeback
├── lib/server/public-write-limits.ts → public write-path throttling and attachment byte budgets
├── lib/server/observability.ts → structured production event logging helpers
├── lib/chat/matching-model.ts → shortlist, recruiter review, and review-completion state
├── lib/handoff/create-packet.ts → handoff packet shaping for escalations, staffing queueing, onboarding, and placement outcomes
├── lib/server/agency-access.ts → live `.agency` entitlement fetch, non-production preview override handling, and local session bridge
├── lib/server/threads/persistence.ts → D1 storage adapter and session serialization
├── lib/server/attachments/storage.ts → R2 or local attachment storage adapter
├── lib/demo/concierge.ts     → non-production seed data model and nurse staffing demo flows
├── lib/widgets/ / registry   → approved widget types and rendering
└── ...                       → UI support modules
```

## To Understand This Package, Read

1. **`README.md`** — current scope and route-level validation paths
2. **`PRODUCTION_RUNBOOK.md`** — secrets, validation, recovery, and rollback for live operations
3. **`src/routes/+layout.server.ts`** — shared `.agency` session loader, optional secure-intake resolution, and live entitlement snapshot for the Abundance shell
4. **`src/lib/server/intake-access.ts`** — signed secure-link verification and protected-action boundary
5. **`src/lib/server/intake-verification.ts`** — self-serve email verification, challenge storage, and grant issuance
6. **`src/lib/server/intake-claims.ts`** — secure continuation-link storage and claim resolution for imported applicants
7. **`src/lib/server/public-write-limits.ts`** — rate limiting and protected upload budgets
8. **`src/lib/server/observability.ts`** — structured lifecycle logging for production routes
9. **`src/lib/server/agency-access.ts`** — cross-property access lookup, non-production preview override handling, and governed-action gating boundary
10. **`src/routes/+page.svelte`** — top-level app entry
11. **`src/lib/chat/prototype-session.ts`** — server-owned session state and mutation logic
12. **`src/lib/chat/matching-model.ts`** — shortlist and recruiter review state shape
13. **`src/lib/handoff/create-packet.ts`** — escalated vs staffing-queue handoff packet shaping
14. **`src/lib/server/threads/persistence.ts`** — D1 persistence contract
15. **`src/lib/server/attachments/storage.ts`** — attachment storage boundary for R2/local preview
16. **`src/lib/demo/concierge.ts`** — non-production seed conversation/demo state model
17. **architecture and policy docs referenced in the README** — product and governance context

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/routes/+page.svelte`, `src/lib/chat/prototype-session.ts`, `src/lib/chat/matching-model.ts`, `src/lib/handoff/create-packet.ts`, `src/lib/server/intake-verification.ts`, `src/lib/server/intake-claims.ts`, `src/lib/server/threads/persistence.ts`, `src/lib/server/attachments/storage.ts`, `src/routes/api/threads/+server.ts`, `src/routes/api/intake-verification/request/+server.ts`, `src/routes/api/intake-claims/+server.ts` |
| Boot command | `pnpm --filter @create-something/concierge-chat dev` |
| Smoke command | `pnpm --filter @create-something/concierge-chat smoke` |
| Acceptance command | `pnpm --filter @create-something/concierge-chat acceptance` |
| Validation surfaces | Svelte typecheck output, production build, route rendering, widget registry compilation, control-plane redirect behavior, public-apply routing, anonymous redirects from `/chat` and `/settings`, candidate acceptance flow, internal staffing acceptance flow, inbound claim creation, `/apply/claim` continuation routing, self-serve verification request/verify flows, secure-intake gating, terminal Indeed disposition writeback, route-level UI inspection |
| UI validation path | `/`, `/apply`, `/apply/claim?token=...`, `/agents`, `/agents/[agentId]`, `/chat` (redirect), `/chat/[threadId]`, `/chat/[threadId]/profile`, `/chat/[threadId]/handoff` (staff only when available) |
| Escalation rule | Stop if a new widget requires arbitrary executable UI, or if a workflow requires real persistence/auth without an agreed data contract and governance rule. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| progressive profile | staged collection of user context inside the chat flow | governance docs and demo flow |
| widget registry | allowlisted in-chat UI surface | widget registry/renderer modules |
| handoff | transition from guided intake to an external or human-backed next step | chat handoff routes |
| governed conversation shell | UI surface constrained by policy and approved components | route and policy references |

## This Package Helps You Understand

- how governed chat UX is separated from the control plane and MCP layer
- where widget constraints and product policy touch the conversation flow
- how to validate the current concierge shell, including public nurse entry, self-serve email verification, persisted attachment flows, recruiter-review booking, staffing coordinator progression, facility-response capture, onboarding handoff progression, terminal Indeed disposition writeback, staffing-handoff packet generation, secure-intake verification, anonymous redirects away from internal routes, and `.agency` entitlement-gated progression or local preview overrides, without assuming a second auth stack inside the product

## Common Tasks

| Task | Start Here |
|------|------------|
| inspect current product scope | `README.md` |
| inspect seeded non-production chat flow state | `src/lib/demo/concierge.ts` |
| inspect route shell behavior | `src/routes/` |
| validate UI flow | listed current production routes |
| sync geo fallback secret from Infisical | `pnpm --filter @create-something/concierge-chat geo:secret:sync` |

---

*Last validated: 2026-04-07*
