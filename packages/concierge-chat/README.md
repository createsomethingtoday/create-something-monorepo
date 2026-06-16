# @create-something/concierge-chat

Hosted AI-native concierge chat product for progressive profiling, dynamic in-chat widgets, and governed MCP-backed execution.

This package is the first-party conversation product for end users and operators. It is distinct from:

- `.agency` control-plane UX
- MCP App `ui://...` resources inside server packages
- raw Dify web-app clients or browser-side Dify API calls

## Operator Chat Direction

Use this package for the comprehensive operator chat shell around Dify-backed agents.

The frontend should copy Ona's clear-communication design discipline: light operational surfaces, compact navigation, crisp borders, readable hierarchy, direct action language, and proof beside each claim. CREATE SOMETHING still owns the product identity, governance copy, evidence model, and approval surface.

The app should render three stable rails:

1. **Context rail**: client, lane, agent, credential state, blockers, and current operator state.
2. **Chat rail**: Dify-backed conversation, inline widgets, and composer state.
3. **Proof and actions rail**: artifacts, tool calls, approvals, handoff packets, eval evidence, and Linear references.

Dify remains runtime plumbing. The browser must never receive a Dify API key or call the Dify Service API directly. Server orchestration resolves Dify app configuration, calls `chat-messages`, stores conversation IDs, maps stream/tool events into chat artifacts, and returns bounded widget/state payloads to the Svelte client.

## Current Scope

- route scaffold for threads, profile audit, handoff, and settings
- approved widget registry and renderer
- demo progressive-profile data model
- Ona-style operator shell contract in `src/lib/operator/clear-shell.ts`
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
| UI validation path | `/`, `/chat`, `/chat/[threadId]`, `/chat/[threadId]/profile`, `/chat/[threadId]/handoff` |
| Escalation rule | stop if a new widget requires arbitrary executable UI or if a workflow needs real persistence/auth without an agreed data contract |
