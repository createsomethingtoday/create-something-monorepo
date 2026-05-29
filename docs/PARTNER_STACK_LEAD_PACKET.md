# Partner Stack Lead Packet

Status: application-ready positioning, not approved-partner status.

## Summary

CREATE SOMETHING should apply with one partner-stack story:

- **Dify** carries the visible agent runtime, workflow templates, marketplace assets, and self-serve adoption lane.
- **Cloudflare** carries the runtime substrate: Workers, Pages, D1, queues, remote MCP endpoints, and delivery surfaces.
- **Notion** carries the operator workspace: PM visibility, client-readable evidence, templates, and human review.
- **OpenAI** carries ecosystem readiness: reasoning and agent-host proof through scoped MCP tools, evals, ChatGPT-compatible credential delivery, and Policy OS controls.

The differentiated offer is not any single vendor badge. It is **Policy OS plus governed delivery**: MCP boundaries, approval rules, runbooks, eval gates, client-safe evidence, and recurring tuning.

## Application Order

1. **Dify Service Partner**
   - Primary lane because CREATE SOMETHING already has Dify-first delivery proof, MCP coverage, eval gates, and public agent examples.
   - Secondary Dify lanes: Marketplace Partner for reusable templates/plugins, Affiliate for disclosed self-serve acquisition after acceptance.

2. **Cloudflare PowerUP Consult**
   - Primary lane because the repo already uses Cloudflare as runtime infrastructure for Workers, Pages, D1, remote MCPs, and review surfaces.
   - Secondary lane: Self-Serve Agency when client account count, billing, or tenant administration justifies it.
   - Later lane: Technology Alliance only after a public integration, docs, demo, support path, and usage proof exist.

3. **Notion Solutions Partner**
   - Primary lane because Notion is strongest as the operator workspace and consulting implementation surface.
   - Proof lane: public templates and builder examples after sanitization.
   - Later lane: Technology Partner only after a public OAuth integration and support model exist.

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
- `docs/BRAINTRUST_TRACING_QUICKSTART.md`
- `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`
- `docs/MCP_HUB_REMOTE_DEPLOY.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`

Exclude:

- raw Braintrust traces
- raw Langfuse traces
- private hub URLs
- client-private Notion records
- account IDs, zones, billing records, or emails
- secrets, token references, and Infisical paths beyond approved sanitized wording
- broad connector surfaces that imply more authorization than the workflow needs

## Public Site Shape

The public site should use:

- `/partners` as the unified partner-stack entry point.
- `/dify` for agent-runtime, Dify Service Partner, Marketplace Partner, and affiliate funnel detail.
- `/cloudflare` for runtime substrate and Cloudflare consult/agency readiness.
- `/notion` for operator workspace, Solutions Partner, template, and builder proof.
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
