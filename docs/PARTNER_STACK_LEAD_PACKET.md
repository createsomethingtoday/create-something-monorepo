# Partner Stack Lead Packet

Status: superseded partner exploration; Dify and Notion lanes are inactive.

## Summary

The current boundary is:

- **CREATE SOMETHING owns the system. Cloudflare provides infrastructure. OpenAI provides intelligence.**
- Dify application material is historical migration and rollback evidence, not a current runtime lane.
- Notion material is retained only for client compatibility and historical delivery evidence, not as CREATE SOMETHING's operator system.

The differentiated offer is not any single vendor badge. It is **Policy OS plus governed delivery**: MCP boundaries, approval rules, runbooks, eval gates, client-safe evidence, and recurring tuning.

## Application Order

1. **Dify programs — paused**
   - Preserve prior application research as historical evidence only. Do not submit or describe Dify as an active CREATE SOMETHING runtime lane.

2. **Cloudflare PowerUP Consult**
   - Primary lane because the repo already uses Cloudflare as runtime infrastructure for Workers, Pages, D1, remote MCPs, and review surfaces.
   - Secondary lane: Self-Serve Agency when client account count, billing, or tenant administration justifies it.
   - Later lane: Technology Alliance only after a public integration, docs, demo, support path, and usage proof exist.

3. **Notion programs — paused**
   - Preserve client connector and application research as compatibility evidence only. Do not describe Notion as CREATE SOMETHING's operator workspace.

4. **OpenAI ecosystem readiness**
   - Do not lead with this as a partner or affiliate application until a concrete current program path is selected.
   - Use `/stack`, `/partners`, and `docs/OPENAI_PARTNER_READINESS_PACKET.md` to show OpenAI as a reasoning and agent-host lane governed by MCP boundaries, evals, and Policy OS.
   - Treat OpenAI for Startups, the Partner Portal, Frontier Alliance, and Pioneers as separate consideration paths with different eligibility and proof requirements.

## Lead Routing Rule

Keep compensation and ownership paths separate:

- **Affiliate/self-serve**: disclosed links only after program acceptance, payment/tax setup, declared domains, and required disclosures.
- **Partner/co-sell/reseller**: implementation, enterprise, training, support, and managed-service opportunities.
- **Marketplace/template**: reusable assets with setup instructions, privacy notes, support contact, and no hardcoded credentials.
- **Client delivery**: scoped paid work with runbooks, policy artifacts, validation evidence, and rollback notes.
- **OpenAI ecosystem**: readiness, startup/community, or sales-led conversations only; no affiliate or reseller routing unless OpenAI grants that exact program participation.

Do not route the same transaction through more than one compensation program.

## Public Claim Boundary

Allowed before acceptance:

- "Implementation lane"
- "Partner application-ready"
- "Applying for partner participation"
- "Built with Dify / Cloudflare / Notion"
- "Cloudflare-native runtime" when describing architecture truthfully
- "Notion operating systems" when describing consulting services
- "OpenAI-ready MCP and Policy OS delivery" when describing the stack boundary truthfully

Avoid before acceptance:

- "Official partner"
- "Certified partner"
- "Authorized reseller"
- "Technology alliance partner"
- "Preferred vendor-approved provider"
- "OpenAI affiliate"
- "OpenAI reseller"
- "OpenAI Frontier Alliance partner"
- Any vendor logo or commercial brand use that implies endorsement without authorization

## Proof Packet

Use sanitized evidence from:

- `docs/DIFY_PARTNER_AFFILIATE_LEAD_PACKET.md`
- `docs/CLOUDFLARE_PARTNER_LEAD_PACKET.md`
- `docs/NOTION_PARTNER_LEAD_PACKET.md`
- `docs/OPENAI_PARTNER_READINESS_PACKET.md`
- `docs/PARTNER_AFFILIATE_SURFACE_REVIEW_2026-05-17.md`
- `docs/POLICY_OS_PRODUCT_DEFINITION.md`
- `docs/guides/DIFY_FIRST_AGENT_CONTROL_PLANE.md`
- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`
- `docs/DIFY_MCP_COVERAGE.generated.md`
- `docs/PUBLIC_AGENT_MCP_TRUST_CATALOG.generated.md`
- `docs/guides/NOTION_WORKERS_AND_CLI_2026.md`
- `docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md`
- `docs/OPENAI_AGENT_SDK_HALFDOZEN_SMOKE.md`
- `docs/LANGFUSE_TRACING_QUICKSTART.md`
- `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`
- `docs/MCP_HUB_REMOTE_DEPLOY.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`

Exclude:

- raw Langfuse traces
- raw Langfuse traces
- private hub URLs
- client-private Notion records
- account IDs, zones, billing records, or emails
- secrets, token references, and Infisical paths beyond approved sanitized wording
- broad connector surfaces that imply more authorization than the workflow needs

## Public Site Shape

The public site should use:

- `/partners` as the unified partner-stack entry point.
- `/dify` only for clearly labeled historical migration or compatibility material.
- `/cloudflare` for runtime substrate and Cloudflare consult/agency readiness.
- `/notion` only for clearly labeled client compatibility and historical proof.
- `/stack` for vendor role boundaries and portability.
- No standalone `/openai` page until there is an accepted program, a live case study, or a specific OpenAI application target.

## Validation

Before sending applications or publishing new public proof:

```bash
pnpm --filter @create-something/agency check
pnpm dify:inventory:check
pnpm dify:coverage:check
pnpm trust:catalog:check
pnpm partner:policy:conformance --strict
```

For every public proof asset, confirm:

- no unsupported official-partner claims
- no secrets or raw traces
- no client-private records
- setup instructions are complete
- privacy/support notes are present where needed
- marketplace or affiliate disclosures are included where required
