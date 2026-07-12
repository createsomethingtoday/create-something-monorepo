# CREATE SOMETHING Agency

**createsomething.agency** — AI workflow systems for business operations

We make one business workflow safe to delegate.

---

## Positioning Hierarchy

`.agency` is the public service surface for the larger CREATE SOMETHING thesis:

| Name | Job |
|------|-----|
| **AI workflow systems** | Public category: business workflows with connected tools, scoped AI tasks, approvals, stop conditions, and audit trails. |
| **Delegated Work Control** | Internal thesis layer: what can run, what waits, what stops, who owns the decision, and what evidence proves the work. |
| **Workflow Trust Layer** | Internal service-language layer for governed execution around a workflow. |
| **Policy OS** | Canonical paid package for governed execution, approval rules, runbooks, golden tasks, and recurring tuning. |
| **MCP-only** | Constrained discovery or compliance entry path, not the default paid offer. |

The clearest public operating loop is:

> Signals come from the tools. Decisions route to the right human or agent.
> Proof records what happened.

Use this as the first explanation when describing the system. `Inbox`, `Map`,
and `Proof` are the operator surfaces: the Inbox shows work needing judgment,
the Map shows workflow context, and Proof shows the evidence and outcome.

Do not reposition `.agency` as a generic AI agency, prompt shop, model reseller,
or Webflow implementation shop. The durable claim is:

> CREATE SOMETHING makes delegated work trustworthy.

## Ona Foundation

Ona is the communication foundation for `.agency`, not the category to copy.
Use the pattern underneath Ona's public surface: one clear category claim, one
operator outcome, direct CTAs, and a concrete proof object. On `.agency`, that
proof object is the delegated-work boundary: what can run, what waits, what
stops, who owns the decision, and what evidence proves the work.

Future edits should keep public language easy to inspect before it becomes
technical. Explain the workflow first, then the stack. Do not add decorative
iconography or unverified market claims to make the page feel bigger.

### Public Copy Contract

Public `.agency` copy should read like a clear business conversation before it
reads like a strategy memo.

Use this order:

1. Name the category in plain language: `AI workflow systems`.
2. Name the business situation: one messy handoff, repeated workflow, or live
   operating risk.
3. State the operating loop: Signals, Decisions, and Proof.
4. Show the proof object: an Atlas map, decision inbox, delivery record, or
   audit trail.
5. Explain the stack only after the workflow boundary is visible.

Prefer public words like:

- signal
- decision
- proof
- workflow
- handoff
- map
- pilot
- owner
- approval
- stop point
- audit trail
- evidence
- runbook

Avoid public words and frames like:

- buyer
- wedge
- entry wedge
- productized wedge
- partner lane
- partner claim
- support lane
- out-of-lane
- GTM vector
- lead magnet
- MCP-first thesis
- delegated work control as a headline
- workflow trust layer as a first-viewport headline

Those terms can remain in internal strategy docs when they are useful for
planning, but they should not be the way a visitor learns the offer.

Validation:

- Run `pnpm copy:check` before shipping public copy. It discovers visitor-facing
  routes, shared public components, shared data copy, and the agency SEO defaults.
- Run `pnpm copy:heal` when the audit reports stale language. It applies the
  approved plain-language replacements, then reruns the audit.
- Add a rule to `scripts/check-public-copy.mjs` when a phrase becomes a private
  planning term instead of public language.

### Platform Conviction Contract

Public platform language follows
[Conviction Without Dependence](https://createsomething.ltd/canon/concepts/conviction-without-dependence):

> Built primarily with OpenAI Codex. Designed to outlast any model.

Apply the contract in this order:

1. Explain the workflow, decision boundary, and proof before naming a vendor.
2. Name OpenAI Codex as the current primary agent environment when the stack is
   relevant to the reader.
3. Put the owned system beside the claim: data, MCP contracts, harnesses,
   skills, prompts, policy, evals, receipts, routing, fallback, and recovery.
4. Describe portability as a tested exit path to Claude, compatible harnesses,
   open-weight executors, or custom models—not as indifference to model quality.
5. Do not imply OpenAI partnership, certification, affiliation, resale,
   endorsement, or Frontier Alliance status without documentary authorization.

The technical shorthand is:

> Model-opinionated in practice. Model-portable by design.

`pnpm copy:check` guards the prohibited relationship claims and the public
surface test guards the required conviction and ownership language.

### Current System Stack Contract

The current operating boundary is:

> Substrate is the owned database and operator layer. OpenAI, Dify, and
> Cloudflare are the active external stack.

- **Substrate** owns source records, workflow state, human review, decisions,
  receipts, and API/MCP access.
- **OpenAI** is the primary reasoning and agent environment.
- **Dify** is the visible agent application surface.
- **Cloudflare** is the runtime.

Historical client integrations may remain as delivery evidence or compatibility
code, but they must not be presented as the current CREATE SOMETHING operating
architecture.

### Marketing Page Portfolio

Public SEO/AEO pages should operate as a funnel portfolio, not a pile of
articles. Each page needs a job:

1. A cluster: the route family the page belongs to.
2. A role: pillar, support, comparison, implementation, or operations.
3. A funnel stage: discover, understand, evaluate, implement, or book.
4. A route decision: index, route, or archive.
5. A strength score: whether the page is strong enough for its route decision.
6. Self-healing levers: deterministic repairs the repo can apply without
   inventing new editorial strategy.

The reusable Rdoc for this system lives at
`docs/guides/AGENCY_MARKETING_PAGE_PORTFOLIO_RDOC.md`.

The managed portfolio covers the high-intent public funnel:

| Cluster | Pillar | Support pages |
|---------|--------|---------------|
| Core services | `/services` | - |
| Stack boundary | `/stack` | - |
| Workflow tool stack | `/partners` | `/cloudflare` |
| Dify | `/dify` | `/dify/mcp-control-plane`, `/dify/agent-eval-gates`, `/dify/ship-dify-app-with-mcp-tools`, `/dify/template-marketplace-proof` |
| Products | `/products` | - |
| Business use case | `/use-cases/business` | - |
| Enterprise use case | `/use-cases/enterprise` | - |

The Dify cluster is the first multi-page content system:

| Page | Role | Funnel job |
|------|------|------------|
| `/dify` | Pillar | Explain the Dify workflow path and route readers into the cluster. |
| `/dify/mcp-control-plane` | Support | Teach the operating model: Dify surface, MCP boundary, Policy OS rule. |
| `/dify/agent-eval-gates` | Operations | Show the gates that prove a Dify workflow can operate safely. |
| `/dify/ship-dify-app-with-mcp-tools` | Implementation | Give a practical shipping checklist for Dify plus MCP systems. |
| `/dify/template-marketplace-proof` | Implementation | Package the first Dify marketplace template as public proof without leaking private delivery evidence. |

The durable SEO/AEO strategy is:

- Keep canonical pages on `createsomething.agency`; use other channels for
  distribution, not as the source of truth.
- Let pillar pages define the route, support pages explain the operating model,
  comparison pages capture demand, and implementation pages convert.
- Keep pages indexable only when they have a clear route, visible proof,
  structured metadata, direct CTA, and language that matches the public copy
  contract.
- Route or archive pages that are redundant, thin, stale, off-language, or no
  longer connected to a commercial next step.
- Treat AI-answer visibility as a byproduct of clear, expert, well-structured
  pages rather than a separate content gimmick.

Validation:

- Run `pnpm marketing:check` to score the portfolio, verify cluster routing,
  verify sitemap/indexing state, and apply the public copy guard to registered
  marketing pages.
- Run `pnpm marketing:heal` when route decisions change. It applies approved
  copy replacements and syncs deterministic `searchRoutes.json` changes from
  the portfolio registry.
- Add or update entries in `src/lib/data/marketingPages.ts` before adding a new
  SEO/AEO page to the funnel.
- `pnpm seo:check` includes the marketing portfolio check so sitemap, schema,
  copy, and route strength drift fail together.

### Performance Lab And Readable Control

The public identity is **Performance Lab**: intelligent workflows should feel
engineered for pressure, trained in the lab, tested under load, and proven in the
field.

**Readable Control** is the calm proof substrate inside Performance Lab. It keeps
maps, policy, state, owners, receipts, and recovery legible when campaign surfaces
introduce human motion, material study, kinetic composition, and decisive type.

Use the hybrid boundary:

- Homepage, services, editorial, case-study, and social surfaces may use
  original human motion, material studies, technical annotation, and temporal
  composition.
- Products, Atlas, proof, booking, and operator surfaces keep workflow evidence
  primary and use the same energy through hierarchy, state, measurement, and
  semantic motion.

Marketing development starts from the source-controlled pattern baseline in
[`docs/PERFORMANCE_LAB_FOUNDATION_AUDIT.md`](../../docs/PERFORMANCE_LAB_FOUNDATION_AUDIT.md),
not from a blank route or a copied template. The default composition grammar is:

1. a campaign opening built around an original field study;
2. one thesis paired with three inspectable conditions;
3. a sequential field-test or operating-proof chapter;
4. one high-contrast principle break;
5. an evidence index with real content and explicit empty states; and
6. a conversion handoff that preserves context, owner, authority, and proof.

Those six patterns are implemented by Canon as `PerformanceCampaignOpening`,
`PerformanceThesisConditions`, `PerformanceFieldSequence`,
`PerformanceContrastChapter`, `PerformanceEvidenceIndex`, and
`PerformanceConversionHandoff`. The homepage, services, Dify control-plane,
products, Atlas, and booking routes are the `.agency` reference set. Their
copy, media, canvases, and forms stay local; shared composition and responsive
behavior do not.

Fleet and Evermind are private pattern references only. Do not copy their marks,
copy, imagery, fonts, class names, Webflow runtime, or interaction bundles. Build
the validated pattern in Canon and keep route content property-owned.

Readable Control uses:

- white or neutral document surfaces
- near-black type
- thin rules, tables, cards, receipts, and annotated maps
- monospace labels for workflow state, files, policies, and receipts
- sparse status color for run, wait, stop, and proof
- artifact screenshots, Atlas story canvases, delivery pages, and receipt
  breakdowns as proof objects

Avoid:

- dark cyber-security surfaces
- cream or beige page washes
- AI gradient/orb/mesh decoration
- generic automation icons as the main hero proof
- broad claims about autonomy before the workflow boundary is named
- public marketing language that uses internal growth-strategy terms for offers
- visual systems that make the stack feel mysterious or unbounded

Default public-page hierarchy:

1. Name the category: `AI workflow systems`.
2. State the outcome: turn one messy business handoff into a reliable AI-assisted workflow.
3. Show the Delegation Card or Atlas map before explaining the stack.
4. Name what can run, what waits, what stops, who owns the decision, and what
   receipt proves the work.
5. Use one direct action: map one workflow.

### Delegation Card

Use the Delegation Card as the recurring brand object for home-page artifacts,
Atlas Notes, social cards, sales slides, and article diagrams.

```text
Workflow: Support recovery

READS
case · order · account · shipment

RUN
draft reply · add note · assign owner

WAIT
credit · refund · customer promise

STOP
policy conflict · missing data · threshold exceeded

OWNER
CX lead

RECEIPT
approval-note.md · blocked-state.json · customer-safe-draft.md
```

This is the Descript-like simplification for CREATE SOMETHING: delegated work
should feel like reading a clear operating record.

## The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

Neither Claude Desktop, Claude Cowork, nor Codex can create MCP servers from within the app. Templates and scaffolding tools have lowered the barrier to *starting*, but deep integration still requires:

- Domain expertise (understanding your business)
- MCP protocol knowledge (auth, transports, error handling)
- Integration experience (data mapping, security boundaries)
- Workflow control design (Skills + MCP with trust boundaries)

This is the creation expertise `.agency` turns into public AI workflow systems:
named objects, scoped actions, approval states, stop conditions, owners, and
evidence.

---

## Service Ladder

| Offer | Description | Typical Output |
|-------|-------------|----------------|
| **Workflow Map / Pilot** | Map one business handoff, then build the first controlled AI-assisted path when the boundary is clear. | Workflow map, pilot implementation, runbook |
| **Policy OS** | Add policy controls, release gates, approval rules, incident loops, and recurring governed-execution operations. | Governed runtime behavior + release evidence |
| **Enterprise Extension** | Extend for high-stakes, cross-system, and compliance-heavy workflows. | Custom governance boundaries + enterprise orchestration |
| **Workflow Mapping Session** | Paid pre-implementation mapping to scope the workflow and operating boundary. | Pilot scope, operating boundary, and 30-day plan |

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

- `@create-something/canon/atlas/headless` owns the reusable Atlas node, edge,
  canvas, readiness, graph-artifact, and story-artifact contract.
- `@create-something/canon/atlas` owns the Svelte `AtlasStoryCanvas` and
  `AtlasFlow` renderers that adapt the headless contract into read-only story
  and editable map surfaces.
- `createPublicAtlasGraphArtifact(...)` and
  `createPublicAtlasStoryArtifact(...)` are imported from Canon when `.agency`
  needs renderer-independent graph or story output.
- `src/lib/atlas/public.ts` owns `.agency` starter-map content and the
  intake-specific canvas creation path.
- `src/lib/atlas/intake-policy.ts` owns `.agency` public-intake storage keys,
  rate tiers, and map-size limits.
- `src/lib/atlas/surface-policy.ts` owns `.agency` Atlas proof-route and compact
  privacy-prompt route policy.
- `src/lib/components/PublicAtlasStoryCanvas.svelte` wraps Canon's
  `AtlasStoryCanvas` with `.agency` starter-map selection and renders the static
  story artifact without invoking the mapping agent.
- `src/lib/components/PublicSubstrateCanvas.svelte` mounts the shared
  `@create-something/canvas-kernel` renderer directly on `.agency` so the public
  proof object is a live canvas over the CREATE SOMETHING operating projection,
  not a detached illustration. Its visible language should follow the
  Ona/UNA communication foundation: one clear operating claim, Signal /
  Decision / Proof vocabulary, and implementation details hidden until they are
  useful evidence. On the homepage, keep this live operating surface in the
  `PerformanceContrastChapter` full-width artifact placement so the initial fit
  remains legible; compact proof objects may continue to use the inline default.
- `src/lib/atlas/public-substrate-canvas.ts` owns the public-safe operating
  projection for that live canvas: signal queue, Substrate graph, agent queue,
  decision gate, stop boundary, client delivery lane, receipt graph, and the
  `.agency` surface itself. It also owns the mobile projection: same nodes and
  edges, arranged as a readable phone-width operating map instead of shrinking
  the desktop map into an illegible thumbnail.
- `src/lib/components/PublicAtlasFlow.svelte` wraps Canon's `AtlasFlow` so the
  editable renderer stays reusable while `.agency` owns intake state.
- `src/lib/components/PublicAtlasCanvas.svelte` renders the selector and persists
  the chosen map into booking context; it is the `.agency` intake surface.
- `test/public-atlas-starter-maps.test.ts` verifies coverage and policy-boundary
  shape.
- `test/public-atlas-route.test.ts` verifies that `/`, `/atlas`, and
  `/services` present the story canvas before the editable public canvas where
  applicable, and that `/methodology`, `/stack`, and `/products` can use the
  same story surface without mounting the editable canvas.

Story-canvas usage contract:

- Pass an explicit `storyId` on route-level uses so SVG marker IDs and heading
  references remain stable if multiple story canvases appear on the same page.
- Pass an explicit `flowId` on route-level editable-canvas uses if more than one
  editable Atlas flow can mount on a page.
- Keep the story canvas before the editable canvas when both are present. The
  story teaches the workflow language; the editable canvas collects booking
  context.
- Keep motion semantics in markup, not visible copy. Chapter motion cues belong
  in `data-motion-cue` attributes so animations can target them without exposing
  implementation labels to readers.

Renderer rule:

- The interactive Svelte Atlas flow is the primary renderer for workflow
  education, intake, editing, accessibility, and agent-operable maps.
- The homepage proof object is the transparent operating canvas:
  `PublicSubstrateCanvas.svelte` mounts the shared `@create-something/canvas-kernel`
  renderer and shows a public projection of the real Substrate/Atlas/receipt
  operating model instead of a story-only abstraction.
- The canvas chrome should read like a CREATE SOMETHING operating record, not a
  renderer demo: expose nodes, edges, shared-kernel proof, selected state,
  receipt, and view context; do not surface raw backend names such as WebGPU as
  primary visitor copy.
- Public canvas surfaces need data-level responsive projections when the graph
  shape changes by viewport. Do not rely on CSS alone to squeeze a wide desktop
  map into a phone; keep the same operating records and relationships, then
  arrange them for the viewport.
- Static story canvases are the fallback for marketing, articles, social cards,
  and non-JS presentation.
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

**Entry point**: Workflow Map, a scoped diagnostic for one workflow, its owners, and its first controlled point
**Default build**: Workflow Pilot, one workflow rebuilt with clear rules, handoffs, runbooks, and release evidence
**Expansion**: Ongoing Workflow Control for governed execution, then Enterprise Extension based on risk and workflow complexity

---

## Positioning

**Before**: "We build websites/apps with modern templates"
**After**: "We make delegated work trustworthy"

Templates are table stakes. The moat is workflow-boundary design, creation
expertise, proof patterns, and policy artifacts applied to specific domains.

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
