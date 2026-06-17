# CREATE SOMETHING Agency

**createsomething.agency** — production-safe workflow infrastructure for technical operators

We build the connectivity layer between your tools and AI.

---

## The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

Neither Claude Desktop, Claude Cowork, nor Codex can create MCP servers from within the app. Templates and scaffolding tools have lowered the barrier to *starting*, but deep integration still requires:

- Domain expertise (understanding your business)
- MCP protocol knowledge (auth, transports, error handling)
- Integration experience (data mapping, security boundaries)
- Workflow control design (Skills + MCP with trust boundaries)

This is what `.agency` delivers.

---

## Service Ladder

| Offer | Description | Typical Output |
|-------|-------------|----------------|
| **Workflow Infrastructure** | Build trusted workflow substrate for business-critical operations. | Workflow implementation + integration contracts |
| **Policy OS** | Add policy controls, release gates, approval rules, incident loops, and recurring governed-execution operations. | Governed runtime behavior + release evidence |
| **Enterprise Extension** | Extend for high-stakes, cross-system, and compliance-heavy workflows. | Custom governance boundaries + enterprise orchestration |
| **Workflow Mapping Session** | Paid pre-implementation mapping to scope workflow and trust boundary. | Pilot scope, trust boundary, and 30-day plan |

---

## The Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                        │
│        Skills, Agents, Automations (the margin)            │
│   "Draft this RFI" · "Summarize logs" · "Flag compliance"  │
├─────────────────────────────────────────────────────────────┤
│                    AUTOMATION LAYER                         │
│           Custom MCP Servers (the entry point)             │
│           Connect your tools to AI with trust              │
└─────────────────────────────────────────────────────────────┘
```

**Entry point**: a scoped MCP wedge that connects one important workflow with trusted action paths  
**Expansion**: Workflow Infrastructure first, Policy OS for governed execution, then Enterprise Extension based on risk and workflow complexity

---

## Positioning

**Before**: "We build websites/apps with modern templates"
**After**: "We build the connectivity layer between your tools and AI"

Templates are table stakes. The moat is creation expertise applied to specific domains.

---

## The Subtractive Triad in Client Work

| Level | Client Question | Our Response |
|-------|-----------------|--------------|
| **DRY** | "Have you built this integration before?" | Pattern recognition, reference architectures |
| **Rams** | "Do we need all these features?" | Scope discipline, ruthless prioritization |
| **Heidegger** | "Does this MCP serve the business?" | Outcome alignment, strategic coherence |

**Why this matters**: Clients often ask for integrations they don't need. The Triad provides a framework for having that conversation with rigor.

---

## Core Principles

### Zuhandenheit (Ready-to-hand)

The MCP server should recede into use. Clients shouldn't notice the infrastructure—only the capability it enables.

**Test**: "Can they use this without thinking about how it works?"

### Complementarity

We augment, never replace. Human judgment + machine execution. Client expertise + our MCP knowledge.

**Test**: "Is the client more capable after the MCP is deployed?"

### Gelassenheit (Releasement)

We know when to automate and when to preserve human judgment. Not every workflow should become an AI agent.

**Test**: "Are we solving the problem or just applying technology?"

---

## Hermeneutic Position

`.agency` applies proven patterns to client work:

```
.ltd (Philosophy) → provides principles →
.io (Research) → documents validated patterns →
.space (Practice) → experiments with approaches →
.agency (Services) → delivers to clients ← YOU ARE HERE
.ltd (Philosophy) → client outcomes inform evolution
```

**Key insight**: Client constraints test MCP patterns. What survives contact with budgets, timelines, and stakeholder complexity becomes proven methodology.

---

## Package Structure

```
packages/agency/
├── src/
│   ├── routes/              # SvelteKit routes
│   │   ├── api/             # API endpoints
│   │   └── admin/           # Internal tools
│   └── lib/                 # Shared utilities
├── content/                 # Operational content
│   ├── sales/               # workflow infrastructure buyer brief, script, and interface spec
│   └── case-studies/        # MCP project documentation
├── docs/                    # Client documentation
└── workers/                 # Cloudflare Workers
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/routes/+page.svelte`, `src/routes/services/+page.svelte`, `content/sales/README.md` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check` |
| Validation surfaces | Svelte check output, Cloudflare Pages build output, route preview, sales content review |
| UI validation path | `/`, `/services` |
| Escalation rule | stop if Auth0, D1, or client-delivery data is required and cannot be reproduced from local fixtures or Infisical-backed environment |

## Sales Assets

The active sales system is documented in:

- `content/sales/README.md`
- `content/sales/policy-os-buyer-brief-ops-revops.md`
- `content/sales/discovery-call-script.md`
- `content/sales/discovery-policy.md`
- `content/sales/discovery-runbook.md`
- `content/sales/operator-checklist.md`
- `content/sales/policy-os-interface-spec.yaml`
- `content/templates/sales/discovery-note-template.md`
- `content/templates/sales/workflow-mapping-session-agenda.md`
- `content/templates/sales/policy-os-proposal-input-template.md`
- `content/templates/sales/policy-os-follow-up-sequence.md`
- `content/templates/delivery/README.md`
- `content/templates/delivery/mcp_contract.yaml`
- `content/templates/delivery/agent_contract.yaml`
- `content/templates/delivery/outcome_contract.md`

---

## Development

```bash
# Start dev server
pnpm dev --filter=agency

# Type check
pnpm --filter=agency exec tsc --noEmit

# Deploy
pnpm --filter=agency build && wrangler pages deploy packages/agency/.svelte-kit/cloudflare --project-name=create-something-agency
```

## Clerk Sign-In And Infisical

`.agency` uses Clerk for active browser sign-in. The Clerk entrypoint is `/sign-in`;
legacy `/login` requests redirect there and preserve either `redirect_url` or `redirect`
as Clerk's `redirect_url` parameter.

`/sign-in` renders ClerkJS from the configured Clerk frontend API and accepts redirects only
to CREATE SOMETHING domains or Ona agent Pages domains. This keeps the Ona operator flow
working for URLs such as:

```text
https://createsomething.agency/sign-in?redirect_url=https%3A%2F%2F781f83fc.ona-agent-chat.pages.dev%2Fagents
```

Required Pages secrets or vars for the `.agency` sign-in page:

```bash
CLERK_PUBLISHABLE_KEY
CLERK_FRONTEND_API_URL
```

Optional Pages secrets or vars:

```bash
CLERK_SIGN_UP_URL
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

Ona operator access is enforced by `packages/ona-agents`, not this marketing site. The Ona
Pages project must still have `CLERK_ISSUER` or `CLERK_JWKS_URL` plus explicit allow rules
such as `CLERK_ALLOWED_EMAILS`, `CLERK_ALLOWED_EMAIL_DOMAINS`, or Clerk organization rules.

Recommended Infisical path:

```bash
/agency/auth
```

After syncing Clerk secrets, deploy normally:

```bash
pnpm --filter @create-something/canon package
pnpm --filter @create-something/agency build
pnpm --filter @create-something/agency deploy
```

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards and philosophy
- [WORKWAY](https://workway.co) — The vertical play (construction via Procore)
