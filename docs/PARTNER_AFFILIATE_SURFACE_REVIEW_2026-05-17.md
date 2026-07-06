# Partner And Affiliate Surface Review - 2026-05-17

> Owner: CREATE SOMETHING
> Status: current review
> Scope: Dify, Cloudflare, Notion, OpenAI, public partner pages, MCP/agent/policy proof, and lead-routing guardrails

## Summary

CREATE SOMETHING has enough repo-backed proof to present one partner-stack
story across Dify, Cloudflare, and Notion, with OpenAI as an ecosystem readiness
lane rather than a public affiliate or reseller lane.

The recommended order remains:

1. `Dify`: lead partner application plus affiliate conversion lane.
2. `Cloudflare`: runtime partner application.
3. `Notion`: workspace and operating-system partner application.
4. `OpenAI`: stack/readiness lane, no public affiliate motion.

The commercial throughline is `Policy OS plus governed delivery`: MCP
boundaries, approval rules, runbooks, eval gates, client-safe evidence, and
recurring tuning.

## Surface Inventory

| Surface | Role | Current state | Recommendation |
| --- | --- | --- | --- |
| `/partners` | Unified partner-stack entry point | Canon-aligned page with Dify, Cloudflare, and Notion lanes | Add OpenAI as ecosystem readiness while keeping the application queue focused on real partner motions. |
| `/dify` | Agent runtime and affiliate funnel | Application-ready for Service Partner, Marketplace Partner, and Affiliate | Keep as the primary partner/affiliate page. |
| `/dify/mcp-control-plane` | Dify plus MCP proof page | Strong architecture proof for Dify app, MCP card, and Policy OS | Use as application support and high-intent content. |
| `/cloudflare` | Runtime substrate | Application-ready for PowerUP Consult and future agency/account lane | Keep as the runtime and delivery proof page. |
| `/notion` | Operator workspace | Application-ready for Solutions Partner and template/builder proof | Keep as the workspace and consulting proof page. |
| `/stack` | Vendor boundary map | Already includes OpenAI as reasoning and agent host | Use as the public OpenAI reference instead of adding a standalone `/openai` page now. |
| `docs/PARTNER_STACK_LEAD_PACKET.md` | Unified packet | Strong Dify/Cloudflare/Notion story | Add OpenAI readiness, surface review, and updated validation. |
| `docs/DIFY_PARTNER_AFFILIATE_LEAD_PACKET.md` | Dify packet | Strong and application-ready | Keep as the lead application packet. |
| `docs/CLOUDFLARE_PARTNER_LEAD_PACKET.md` | Cloudflare packet | Strong and application-ready | Keep as runtime submission packet. |
| `docs/NOTION_PARTNER_LEAD_PACKET.md` | Notion packet | Strong and application-ready | Keep as workspace submission packet. |
| `docs/OPENAI_PARTNER_READINESS_PACKET.md` | OpenAI packet | New readiness packet | Use internally and link from docs map. |

## Program Alignment

### Dify

Lead track: `Service Partner`.

Support tracks: `Marketplace Partner` and `Affiliate`.

Why it fits:

- Dify is already treated as the preferred client-facing agent runtime.
- The repo contains Dify inventory, DSL snapshots, agent manifests, MCP server
  cards, Infisical-backed secret references, and Langfuse eval coverage.
- The public trust catalog provides sanitized proof without exposing raw traces
  or private hubs.
- The affiliate lane has a concrete conversion target after acceptance.

Primary proof:

- `docs/guides/DIFY_FIRST_AGENT_CONTROL_PLANE.md`
- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`
- `docs/DIFY_MCP_COVERAGE.generated.md`
- `docs/PUBLIC_AGENT_MCP_TRUST_CATALOG.generated.md`
- `docs/DIFY_PARTNER_AFFILIATE_LEAD_PACKET.md`
- `config/dify/inventory.json`
- `config/dify-agents/`

### Cloudflare

Lead track: `PowerUP Partner Program`, consult route.

Support tracks: `Self-Serve Agency Program` when client account volume makes
centralized billing or tenant administration useful; `Technology Alliance` only
after public productized integration proof exists.

Why it fits:

- Cloudflare is the repo's runtime substrate for Workers, Pages, D1, remote
  MCPs, and client-safe review surfaces.
- Partner auth, entitlement, delivery, and credential policies already map to
  Cloudflare-hosted MCP lanes.
- The deployed fleet registry shows tenant-specific MCP URLs and bearer-token
  governance without exposing plaintext secrets.

Primary proof:

- `docs/CLOUDFLARE_PARTNER_LEAD_PACKET.md`
- `docs/MCP_HUB_REMOTE_DEPLOY.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`
- `config/mcp-hub/fleet.json`
- `packages/agency/src/routes/cloudflare/+page.svelte`
- `packages/agency/src/lib/server/partner-auth.ts`
- `packages/agency/src/routes/api/partners/half-dozen/`

### Notion

Lead track: `Solutions Partner`, consulting path.

Support tracks: `Template Marketplace`, `Builders`, and later `Technology
Partner` after public OAuth integration, documentation, demo, support path, and
usage evidence exist.

Why it fits:

- Notion is the strongest operator workspace and PM layer for client-readable
  evidence, milestone views, risks, decisions, and human review.
- Notion Workers, Notion MCPs, and sync packages give a real automation path
  without pretending Notion is the only source of truth.
- The Notion lane complements Dify and Cloudflare rather than competing with
  them.

Primary proof:

- `docs/NOTION_PARTNER_LEAD_PACKET.md`
- `docs/guides/NOTION_WORKERS_AND_CLI_2026.md`
- `docs/guides/AGENCY_OPS_PM_AGENT_NOTION_REVIEW_2026.md`
- `packages/notion-worker-experiments`
- `packages/notion-sync-mcp`
- `packages/halfdozen-notion-mcp`
- `packages/quickbooks-notion-mcp`

### OpenAI

Lead track: none yet.

Current lane: `OpenAI ecosystem readiness`.

Why it fits:

- OpenAI is already represented in `/stack` as reasoning and agent host.
- The repo contains OpenAI Agents SDK MCP scenario smoke tests, Langfuse
  tracing, and a ChatGPT MCP OAuth managed bearer contract.
- Policy OS keeps the business value centered on scoped tools, approvals,
  evidence, and operator handoff rather than model access alone.

Why not a public affiliate page now:

- The public OpenAI docs reviewed for this packet describe campaign-specific
  promo/referral mechanics and startup/builder resources, not an open recurring
  affiliate program comparable to Dify.
- The OpenAI Partner Portal public page is a login/signup surface, not enough
  to claim an open partner category.
- Frontier Alliance currently reads like a large-enterprise transformation
  partner path.

Primary proof:

- `docs/OPENAI_PARTNER_READINESS_PACKET.md`
- `packages/agency/src/routes/stack/+page.svelte`
- `docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md`
- `docs/OPENAI_AGENT_SDK_HALFDOZEN_SMOKE.md`
- `docs/LANGFUSE_TRACING_QUICKSTART.md`
- `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`
- `packages/observability/src/openai-agents.ts`

## Business Operations Alignment

### Database

Use durable state and generated artifacts as proof:

- `config/mcp-hub/fleet.json`
- `config/dify/inventory.json`
- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`
- `docs/DIFY_MCP_COVERAGE.generated.md`
- `docs/PUBLIC_AGENT_MCP_TRUST_CATALOG.generated.md`
- D1 migrations for partner auth, access lanes, and Policy OS service tiers.
- Linear issues and evidence records when submission work needs tracked
  ownership.

### Automation

Use repo-owned automation as proof:

- Cloudflare Workers, Pages, D1, queues, and remote MCP endpoints.
- Dify agent manifests and Service API evals.
- Notion Workers and Notion MCP/sync packages.
- OpenAI Agents SDK scenario runners.
- Hub-brokered downstream tool discovery and execution.
- Partner access mint/rotate scripts and route-level delivery APIs.

### Judgment

Use policy artifacts and evals as proof:

- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.integration-selection.v1.md`
- `docs/policies/v1/policy.hub-route-authorization.v1.md`
- `docs/policies/v1/policy.tenant-tool-exposure.v1.md`
- `docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md`
- Langfuse evals and trust catalog checks.

## Lead Routing Rules

- Dify affiliate links are for approved, disclosed, self-serve Cloud/Team/
  Professional adoption only.
- Dify implementation, training, reseller, enterprise, or co-sell
  opportunities stay in the Dify partner track.
- Cloudflare and Notion opportunities are service/consulting lanes first.
- OpenAI opportunities are implementation/readiness or startup/community lanes
  until a formal program path is identified.
- No transaction should be routed through more than one compensation program.
- No public page should claim official partner, certified provider, reseller,
  affiliate, or technology alliance status before the relevant vendor approval.

## Recommended Next Moves

1. Submit Dify Service Partner, Marketplace Partner, and Affiliate applications
   after final proof review.
2. Submit Cloudflare PowerUP Consult positioning with runtime proof and partner
   auth/credential governance references.
3. Submit Notion Solutions Partner positioning with operator workspace,
   template, and Notion Worker proof.
4. Keep OpenAI as a public stack/readiness lane through `/stack` and `/partners`
   until a concrete OpenAI program path is selected.
5. Do not create a standalone `/openai` page until there is either an accepted
   program, a live customer case study, or a specific OpenAI application target.

## Validation

Run before application submission or public proof expansion:

```bash
pnpm --filter @create-something/agency check
pnpm dify:inventory:check
pnpm dify:coverage:check
pnpm trust:catalog:check
pnpm partner:policy:conformance --strict
```

Run before public OpenAI proof:

```bash
pnpm agent:halfdozen:dedup:connect
pnpm agent:halfdozen:inbox-triage:connect
pnpm agent:halfdozen:fleet-watchdog:connect
```

For every proof asset, confirm:

- no unsupported official-partner claims
- no secrets, bearer tokens, raw traces, or private client records
- no commercial logo or brand use that implies endorsement
- setup, privacy, support, and disclosure notes exist where relevant
- affiliate links appear only after acceptance and only on declared surfaces
