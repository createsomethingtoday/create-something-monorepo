# @create-something/concierge-chat

Hosted AI-native concierge chat product for progressive profiling, dynamic in-chat widgets, and governed MCP-backed execution.

This package is the end-user conversation product. It is distinct from:

- `.agency` control-plane UX
- MCP App `ui://...` resources inside server packages

## Current Scope

- route scaffold for threads, profile audit, handoff, and settings
- approved widget registry and renderer
- demo progressive-profile data model
- conversation-first product shell aligned with:
  - `docs/CONCIERGE_CHAT_PRODUCT_ARCHITECTURE_2026-03-09.md`
  - `docs/policies/v1/policy.progressive-profile-governance.v1.md`

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/routes/+page.svelte`, `src/lib/demo/concierge.ts` |
| Boot command | `pnpm --filter @create-something/concierge-chat dev` |
| Smoke command | `pnpm --filter @create-something/concierge-chat check` |
| Validation surfaces | Svelte typecheck output, route rendering, widget registry compilation |
| UI validation path | `/`, `/chat`, `/chat/demo-intake`, `/chat/demo-intake/profile`, `/chat/demo-intake/handoff` |
| Escalation rule | stop if a new widget requires arbitrary executable UI or if a workflow needs real persistence/auth without an agreed data contract |
