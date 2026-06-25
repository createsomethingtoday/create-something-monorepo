# CREATE SOMETHING Agency

**createsomething.agency** — the Workflow Trust Layer for technical operators

We make one business workflow safe to delegate.

---

## The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

Neither Claude Desktop, Claude Cowork, nor Codex can create MCP servers from within the app. Templates and scaffolding tools have lowered the barrier to *starting*, but deep integration still requires:

- Domain expertise (understanding your business)
- MCP protocol knowledge (auth, transports, error handling)
- Integration experience (data mapping, security boundaries)
- Workflow control design (Skills + MCP with trust boundaries)

This is the creation expertise `.agency` turns into a governed operating path:
named objects, scoped actions, approval states, stop conditions, and evidence.

---

## Service Ladder

| Offer | Description | Typical Output |
|-------|-------------|----------------|
| **Workflow Infrastructure** | Build trusted workflow substrate for business-critical operations. | Workflow implementation + integration contracts |
| **Policy OS** | Add policy controls, release gates, approval rules, incident loops, and recurring governed-execution operations. | Governed runtime behavior + release evidence |
| **Enterprise Extension** | Extend for high-stakes, cross-system, and compliance-heavy workflows. | Custom governance boundaries + enterprise orchestration |
| **Workflow Mapping Session** | Paid pre-implementation mapping to scope workflow and trust boundary. | Pilot scope, trust boundary, and 30-day plan |

---

## Public Atlas Starter Maps

The public Atlas canvas is the give-first surface for prospects. It lets a visitor
start from a concrete industry workflow, edit the owner/systems/approval boundary,
and carry the summary into booking without exposing production systems.

The broader visual standard lives in
`docs/guides/AGENCY_ARTICLE_IMAGE_WORKFLOW.md`: workflow, governance, and
agent-behavior visuals should default to Atlas-style canvases before one-off
graphics.

Current starter maps:

| Starter | Industry | Boundary to preserve |
|---------|----------|----------------------|
| RevOps lead handoff | RevOps / B2B SaaS | Stop on consent, duplicate, or territory uncertainty |
| Prior authorization prep | Healthcare operations | Stop before medical-necessity or final submission decisions |
| RFI/submittal control | Construction / project controls | Stop before scope, cost, schedule, or contract commitments |
| Marketplace review queue | Marketplace operations | Stop before ungrounded approval, rejection, or security claims |
| Insurance claims intake | Insurance operations | Stop before payout, denial, fraud escalation, or sensitive decisioning |

Each starter map must include all public Atlas dimensions: `Actor`, `Human task`,
`AI task`, `System operation`, `Data artifact`, `Constraint`, and `Touchpoint`.
Each map must also expose at least one `run`, one `wait`, and one `stop` node so
the prospect sees the action boundary before the sales conversation.

Implementation surface:

- `src/lib/atlas/public.ts` owns starter-map data and normalization.
- `createPublicAtlasGraphArtifact(...)` exports the renderer-independent Atlas
  graph contract for humans and agents: semantic node roles, relationship labels,
  readiness, and renderer guidance.
- `createPublicAtlasStoryArtifact(...)` turns the same graph into deterministic
  story chapters for static canvases, scrollytelling, article visuals, social
  cards, and accessibility summaries.
- `src/lib/components/PublicAtlasStoryCanvas.svelte` renders the static story
  artifact as a node-map presentation surface without invoking the mapping agent.
- `src/lib/components/PublicAtlasCanvas.svelte` renders the selector and persists
  the chosen map into booking context.
- `test/public-atlas-starter-maps.test.ts` verifies coverage and policy-boundary
  shape.
- `test/public-atlas-route.test.ts` verifies that `/atlas` and `/services`
  present the story canvas before the editable public canvas, and that
  `/methodology`, `/stack`, and `/products` can use the same story surface
  without mounting the editable canvas.

Story-canvas usage contract:

- Pass an explicit `storyId` on route-level uses so heading and instruction
  references remain stable if multiple story canvases appear on the same page.
- Keep the story canvas before the editable canvas when both are present. The
  story teaches the workflow language; the editable canvas collects booking
  context.
- Keep motion semantics in markup, not visible copy. Chapter motion cues belong
  in `data-motion-cue` attributes so animations can target them without exposing
  implementation labels to readers.

Renderer rule:

- Svelte Flow is the primary renderer for workflow education, intake, editing,
  accessibility, story maps, and agent-operable maps in this Svelte frontend.
- Canvas copy should follow the Ona.com communication pattern: short declarative
  claims, "set the direction" framing, governed execution language, and concrete
  nouns like workflow, owner, decision, evidence, tools, and boundaries.
- Do not expose renderer names such as Svelte Flow, Sigma, or Cosmograph in
  user-facing canvas copy. The product language is Atlas canvas and Atlas graph.
- Static story exports are the fallback for articles, social cards, and non-JS
  presentation, not the base in-app canvas implementation.
- Sigma/Cosmograph are reserved for large read-only network exploration. Do not
  move the canonical workflow contract into those renderers; adapt them from the
  Atlas graph artifact when graph scale requires WebGL.
- Story canvases should animate only chapter focus, handoff traces, stop
  boundaries, and proof reveals. The `accessibilitySummary` must remain complete
  when motion is disabled.
- `/atlas` presents the read-only story canvas before the editable public Atlas
  canvas so visitors can understand the workflow language before using the agent.
- `/methodology` uses a read-only story canvas to explain the method without
  collecting booking context.
- `/stack` uses a read-only story canvas to explain the ownership and vendor
  boundary without collecting booking context.
- `/products` uses a read-only story canvas to explain how proof becomes a
  governed workflow boundary without collecting booking context.

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

**Entry point**: Trust Map, a scoped diagnostic for one workflow, its owners, and its first safe delegation point
**Default build**: Workflow Pilot, one workflow rebuilt with clear rules, handoffs, runbooks, and release evidence
**Expansion**: Trust Layer for governed execution, then Enterprise Extension based on risk and workflow complexity

---

## Positioning

**Before**: "We build websites/apps with modern templates"
**After**: "We make one workflow safe to delegate"

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

## Capture Review Admin API

Operator-only lead and signup review lives at `/api/admin/capture`.

- `GET /api/admin/capture?limit=100` returns newsletter, contact, lead, and public Atlas capture rows with computed classification and recommended action.
- `GET /api/admin/capture?include=all&limit=100` includes operational account, billing, legacy contact, and MCP entitlement context.
- Add `surface`, `classification`, `action`, `reviewed`, and `q` query params to narrow either the JSON response or `/admin/capture` operator view.
- GET responses include `decision_storage.available`; the UI disables decision writes until migration 0029 is applied.
- `POST /api/admin/capture` stores an operator decision in `capture_review_decisions` without mutating the original capture rows.
- `DELETE /api/admin/capture` with `surface` and `source_id` clears a stored operator decision so the row returns to computed classification.
- Apply `migrations/0029_capture_review_decisions.sql` before using durable decisions in production.

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
