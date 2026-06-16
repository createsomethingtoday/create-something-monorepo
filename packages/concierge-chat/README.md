# @create-something/concierge-chat

Hosted AI-native concierge chat product for progressive profiling, dynamic in-chat widgets, and governed MCP-backed execution.

This package is the end-user conversation product. It is distinct from:

- `.agency` control-plane UX
- MCP App `ui://...` resources inside server packages
- raw Dify web-app clients or browser-side Dify API calls

## Operator Chat Direction

Use this package for the comprehensive operator chat shell around Dify-backed agents.

The internal operator UI should copy Ona's clear-communication design discipline: light operational surfaces, compact navigation, crisp borders, readable hierarchy, direct action language, and proof beside each claim. CREATE SOMETHING still owns the product identity, governance copy, evidence model, and approval surface.

The app should render three stable rails for staff/operator views:

1. **Context rail**: client, lane, agent, credential state, blockers, and current operator state.
2. **Chat rail**: Dify-backed conversation, inline widgets, and composer state.
3. **Proof and actions rail**: artifacts, tool calls, approvals, handoff packets, eval evidence, and Linear references.

Dify remains runtime plumbing. The browser must never receive a Dify API key or call the Dify Service API directly. Server orchestration resolves Dify app configuration, calls `chat-messages`, stores conversation IDs, maps stream/tool events into chat artifacts, and returns bounded widget/state payloads to the Svelte client.

## Current Scope

- hosted nurse-intake chat surface for the public landing, candidate conversation threads, candidate-safe application details, and staff-only handoff/settings routes
- public marketing landing at `/` and public nurse-start entry at `/apply`
- approved widget registry and renderer with server-routed actions
- cookie-scoped, server-owned session updates with a secure-verification boundary for protected nurse actions
- self-serve one-time email verification for protected nurse actions, backed by D1 challenge storage when `DB` is bound and a local preview fallback when it is not
- D1-backed inbound intake claim bridge for Indeed Apply or other sourced applicants, including a private claim-creation endpoint and a public `/apply/claim` continuation route
- terminal Indeed MCP disposition writeback for linked imported applicants when placement is confirmed or a staffing request is closed
- D1-backed persistence contract for threads, messages, profile snapshots, widget events, handoff events, and tool action events when `DB` is bound
- multipart attachment uploads with download routes, attachment metadata in thread artifacts, and an R2-backed storage path when `UPLOADS` is bound
- shortlist generation, recruiter review booking, recruiter review completion, staffing coordinator outreach, governed facility-submission handoff progression, facility-response capture, onboarding handoff progression, and terminal start-ready or closed-request outcomes once intake blockers clear
- route loads and `/api/threads/*` mutations for thread creation, messaging, confirmation, consent, attachment uploads, recruiter review transitions, staffing queue transitions, facility-response transitions, onboarding transitions, reconnect recovery, and reset
- local `/control-plane/*` bridge routes that redirect Abundance control-plane actions into real `.agency` dashboard, MCP access, and security surfaces
- Ona-style operator shell contract in `src/lib/operator/clear-shell.ts`, surfaced on the public orientation page and staff/operator chat routes
- root layout now reads the optional shared `.agency` browser session and live `.agency` entitlement snapshot so the Abundance shell can show whether governed staffing access is active, blocked, or unavailable
- governed recruiter, staffing, facility-response, and onboarding actions remain read-only until `.agency` reports an active entitlement decision for the current browser session
- anonymous `/chat` and `/settings` access now routes back into `/apply` so the candidate path stays conversation-first
- demo seed threads and local `.agency` access preview overrides stay available only outside production mode
- implementation-ready Indeed Apply integration guidance in `INDEED_MCP_INTEGRATION_MAP.md`
- conversation-first product shell aligned with:
  - `docs/CONCIERGE_CHAT_PRODUCT_ARCHITECTURE_2026-03-09.md`
  - `docs/policies/v1/policy.progressive-profile-governance.v1.md`

## Runtime Notes

- local preview without Wrangler still falls back to in-memory session state
- local preview without an R2 binding still stores uploaded files in process memory so the widget and download route remain testable
- Cloudflare Pages / Workers runtime uses the `DB` D1 binding and optional `UPLOADS` R2 binding declared in `wrangler.toml`
- set `AGENCY_BASE_URL` if the control-plane bridge should target a non-default `.agency` origin
- when `.agency` is reachable, concierge-chat reads `/api/me/entitlement` with the shared browser session to gate governed staffing actions; when it is not reachable, those actions degrade to control-plane recovery links
- production mode keeps `/` and `/apply` public, but protected upload and staffing transitions require secure verification. Self-serve email verification is enabled when both `ABUNDANCE_INTAKE_SIGNING_SECRET` and `RESEND_API_KEY` are configured. Recruiter-issued grants remain available through `pnpm --filter @create-something/concierge-chat mint:intake-grant -- --candidate <id> --base-url <secure-intake-url>`
- set `ABUNDANCE_INTAKE_BRIDGE_SECRET` to allow trusted external systems to create candidate continuation links through `POST /api/intake-claims`
- set both `INDEED_MCP_BASE_URL` and `INDEED_MCP_API_KEY` to enable terminal `indeed_apply_record_disposition` writeback from the staffing flow
- set `ABUNDANCE_GEO_MAPBOX_ACCESS_TOKEN` to enable server-side external preferred-location recovery when the internal market catalog cannot normalize a nurse's location message confidently; this path stores normalized results in-thread, so it is intended for a Mapbox token allowed for permanent geocoding
- the canonical Infisical path for that token is `/agency/abundance/geo`; once the secret exists there, run `pnpm --filter @create-something/concierge-chat geo:secret:sync` to promote it into the Pages project
- set `ABUNDANCE_INTAKE_EMAIL_FROM` if the verification sender should differ from the runtime default
- public write paths now enforce server-side rate limits for thread creation, candidate messaging, verification request/verify, uploads, and workflow actions; blocked requests return `429` with `Retry-After`
- local non-production staff sessions can use the Settings `Preview Entitlement` controls to mint a cookie-scoped `.agency` access override for recruiter, staffing, and onboarding walkthroughs without a live `.agency` session
- production mode disables the Settings preview override route and boots nurse sessions with no seeded demo threads
- apply the schema with `pnpm --filter @create-something/concierge-chat db:migrate:local` or `pnpm --filter @create-something/concierge-chat db:migrate`
- production operations and rollback guidance now live in `PRODUCTION_RUNBOOK.md`

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/routes/+page.svelte`, `src/lib/chat/prototype-session.ts`, `src/lib/chat/matching-model.ts`, `src/lib/handoff/create-packet.ts`, `src/lib/server/intake-verification.ts`, `src/lib/server/intake-claims.ts`, `src/lib/server/threads/persistence.ts`, `src/lib/server/attachments/storage.ts`, `src/routes/api/threads/+server.ts`, `src/routes/api/intake-verification/request/+server.ts`, `src/routes/api/intake-claims/+server.ts` |
| Boot command | `pnpm --filter @create-something/concierge-chat dev` |
| Smoke command | `pnpm --filter @create-something/concierge-chat smoke` |
| Acceptance command | `pnpm --filter @create-something/concierge-chat acceptance` |
| Validation surfaces | Svelte typecheck output, production build, route rendering, widget registry compilation, public-apply routing, anonymous redirects from `/chat` and `/settings`, candidate acceptance flow, internal staffing acceptance flow, inbound claim creation, `/apply/claim` continuation routing, self-serve verification request/verify flows, secure-intake gating, terminal Indeed disposition writeback |
| UI validation path | `/`, `/apply`, `/apply/claim?token=...`, `/chat` (redirect), `/chat/[threadId]`, `/chat/[threadId]/profile`, `/chat/[threadId]/handoff` (staff only when available) |
| Escalation rule | stop if a new widget requires arbitrary executable UI or if a workflow needs real persistence/auth without an agreed data contract |
