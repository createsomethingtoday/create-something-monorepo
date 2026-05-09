# CREATE SOMETHING Agency

**createsomething.agency** — AI-assisted workflows, human-approved operations

We build calm workflow systems for teams bringing AI and agents into real operations: visible handoffs, scoped tools, human approval, and recovery paths your team can inherit.

---

## The Workflow Console Moat

**AI and agents can help teams move faster. Knowing what should run, pause, or stop is the hard part.**

Templates and scaffolding tools have lowered the barrier to starting, but governed workflow infrastructure still requires:

- Domain expertise (understanding your business)
- MCP protocol knowledge (auth, transports, error handling)
- Integration experience (data mapping, security boundaries)
- Workflow governance design (approval states, blocked states, recovery paths)
- Operator-surface design (what the team sees, decides, and inherits)

This is what `.agency` delivers.

---

## Service Ladder

| Offer | Description | Typical Output |
|-------|-------------|----------------|
| **Workflow Readiness Map** | Paid diagnostic for one workflow and its safe first build wedge. | Workflow map, risk register, decision states, build/defer/stop recommendation |
| **Governed Workflow Console** | Build one Retool-powered operating surface where AI and agents prepare work and people keep approval authority. | Console, workflow implementation, runbook, handoff |
| **Agent Operator Layer** | Add bounded AI assistance for matching, intake, routing, drafting, or summarizing. | Scoped agent/tool layer routed through approval boundaries |
| **Governance Review** | Low-touch review loop for live workflow health, incidents, and edge cases. | Monthly health notes, risk review, scoped improvement queue |

---

## The Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW CONSOLE                         │
│     Status, approvals, blocked states, risks, artifacts     │
│        "Approve match" · "Request info" · "Pause job"       │
├─────────────────────────────────────────────────────────────┤
│                    TOOL / AGENT LAYER                       │
│        MCPs, workers, cron jobs, skills, and APIs           │
│     Connect business data to agents with trust boundaries   │
└─────────────────────────────────────────────────────────────┘
```

**Entry point**: a paid readiness map for one high-drag workflow
**Core build**: a governed workflow console with tool boundaries, approval states, and recovery paths
**Expansion**: agent operator layer and monthly governance review when usage creates edge cases

---

## Positioning

**Before**: "We build AI automations"
**After**: "We build AI-assisted workflows with human approval built in"

The strongest wedge is matching, intake, and routing work where demand, supply, capacity, or requests must be reconciled by humans today.

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

## Auth0 And Infisical

`.agency` now treats Auth0 as the identity source of truth. Browser login flows redirect through Auth0 Universal Login, the Auth0 callback is handled at `/auth/callback`, and server-side session validation accepts Auth0-issued tokens through the shared Canon auth layer.

Tenant export uses `a0deploy`, not `auth0`. The repo-level export wrapper is:

```bash
cp auth0/config.example.json auth0/config.json
pnpm auth0:export
```

The export wrapper expects `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` in your environment, then runs:

```bash
a0deploy export -c auth0/config.json -f yaml -o auth0/export
```

Required Pages secrets:

```bash
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_ISSUER_BASE_URL
AUTH0_JWKS_URL
```

Optional Pages secrets:

```bash
AUTH0_AUDIENCE
AUTH0_SCOPE
AUTH0_CLAIMS_NAMESPACE
AUTH0_REDIRECT_URI
```

Do not point `AUTH0_AUDIENCE` at the Auth0 Management API (`https://<tenant>/api/v2/`) for browser sign-in. `.agency` only needs the ID token for the property session; the Management API audience is a machine-to-machine setting and can break Universal Login flows.

If Auth0 login is fronted by a custom domain, preview hostname, or proxy that differs from the incoming Worker request host, set:

```bash
AUTH0_REDIRECT_URI=https://createsomething.agency/auth/callback
```

and add that exact URL to the Auth0 application's Allowed Callback URLs.

Recommended Infisical path:

```bash
/agency/auth
```

Auth0 secrets must live only under `/agency/auth`. Do not store duplicate `AUTH0_*` keys at the Infisical root path `/`; the seed/sync scripts now fail closed when root-path drift is present.

Seed Auth0 tenant values into Infisical:

```bash
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_ISSUER_BASE_URL=...
AUTH0_JWKS_URL=...
AUTH0_REDIRECT_URI=https://createsomething.agency/auth/callback
pnpm agency:auth0:seed
```

Sync Auth0 secrets from Infisical into the Cloudflare Pages project:

```bash
pnpm agency:auth0:sync
```

Useful overrides:

```bash
PROJECT_NAME=create-something-agency
INFISICAL_ENV=prod
INFISICAL_PATH=/agency/auth
INFISICAL_PROJECT_ID=<optional>
DRY_RUN=true
CLOUDFLARE_ACCOUNT_ID=<required when Wrangler has multiple accounts>
```

After syncing secrets, deploy normally:

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
