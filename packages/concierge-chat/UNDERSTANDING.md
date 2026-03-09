# Understanding: @create-something/concierge-chat

> **The hosted conversation product shell for governed concierge workflows, progressive profiling, and approved in-chat widget execution.**

## Ontological Position

**Mode of Being**: UI-heavy product package

This package is the end-user conversation surface, not the control plane and not an MCP server. Its purpose is to make governed concierge interactions legible to users through routes, widgets, and product-state shells while respecting policy constraints defined elsewhere in the repo.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| SvelteKit | Route structure and product shell runtime |
| policy docs for progressive-profile governance | Define what the chat experience is allowed to ask, render, and hand off |
| widget registry and renderer | Control which in-chat UI elements are allowed to execute |
| demo concierge data model | Current stand-in for persistence and workflow state |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| product engineers | How the concierge experience is structured as routes and widget states |
| policy work | Where governed widget behavior touches the end-user UI |
| agent systems | Which UI routes and demo flows are available for validation today |

## Internal Structure

```text
src/
├── routes/                   → chat, intake, profile, handoff, and settings shells
├── lib/demo/concierge.ts     → demo data model and flow state
├── lib/widgets/ / registry   → approved widget types and rendering
└── ...                       → UI support modules
```

## To Understand This Package, Read

1. **`README.md`** — current scope and route-level validation paths
2. **`src/routes/+page.svelte`** — top-level app entry
3. **`src/lib/demo/concierge.ts`** — current conversation/demo state model
4. **architecture and policy docs referenced in the README** — product and governance context

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/routes/+page.svelte`, `src/lib/demo/concierge.ts` |
| Boot command | `pnpm --filter @create-something/concierge-chat dev` |
| Smoke command | `pnpm --filter @create-something/concierge-chat check` |
| Validation surfaces | Svelte typecheck output, route rendering, widget registry compilation, route-level UI inspection |
| UI validation path | `/`, `/chat`, `/chat/demo-intake`, `/chat/demo-intake/profile`, `/chat/demo-intake/handoff` |
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
- how to validate the current concierge shell without assuming production persistence

## Common Tasks

| Task | Start Here |
|------|------------|
| inspect current product scope | `README.md` |
| inspect chat flow state | `src/lib/demo/concierge.ts` |
| inspect route shell behavior | `src/routes/` |
| validate UI flow | listed demo-intake routes |

---

*Last validated: 2026-03-09*
