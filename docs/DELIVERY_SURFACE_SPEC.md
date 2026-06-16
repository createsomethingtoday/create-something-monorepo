# Delivery Surface Spec — Three Implementations, One Schema

**Date**: 2026-06-12
**Status**: Working spec, derived from a three-way diff of existing implementations
**Decision**: Build the delivery surface as a standalone app (MCP Connector / Webflow Wrapped form factor) on the existing Canon Control API. Webflow Code Components remain an optional render skin, not the foundation.

## The Finding

The "delivery surface" — the client-facing operational UI for a governed workflow — has been built three times in this repo, in two stacks, without a shared schema:

| System | Location | What it is |
|--------|----------|------------|
| **A. Delivery pages** | `packages/agency/src/routes/delivery/{abundance,shivworks}` + `src/lib/delivery/*.ts` | Hand-authored public proof pages. Abundance embeds two live agents (jobs agent + delivery Q&A agent with grounding/reasoning notes). ShivWorks is a static handoff runbook. |
| **B. Canon Control API** | `packages/agency/src/routes/api/canon/*` + `src/lib/canon/workflow-context.ts` (990 lines) | D1-backed engagement state (`canon_workflow_contexts` + overlays, fallback demo data). Serves `CanonWorkflowContext`; persists approvals (`/approval`, `/operator-approval` with trusted-origin checks); generic grounded agent (`/agent`); action previews; CORS for cross-origin embedding. |
| **C. Webflow control components** | `packages/webflow-components/src/components/control/` (17 components, ~3,800 lines) | Full owner-surface component library consuming System B cross-origin: ApprovalQueue, ApprovalGate, ActionExecutionQueue, ActionPreview, EvidenceTrail, EvidenceManager, DecisionQueue, AgentDock, RuntimeStatus, SourceTruthStatus, OperatingLayerCards, ArtifactGrid, WorkflowMetricsStrip, OperatorActivityLog, BusinessContextSwitcher, CanonControlPanel. Proven live at webflow-dify-agent.webflow.io. |

**Implication**: the standalone app is not a greenfield build. System B is its backend; System C proves the component set; System A defines the public tier. The work is unification, not creation.

## The Diff

| Entity | A: Delivery pages | B: Canon API (D1) | C: Webflow components |
|--------|:-:|:-:|:-:|
| Engagement summary (client/owner/phase/recipient) | ✅ `deliverySummary` | ◐ `businessContexts` (no phase/recipient) | ✅ BusinessContextSwitcher |
| Operating layers (Triad tiers) | ✅ `DeliveryLayer` | ✅ `CanonWorkflowLayer` | ✅ OperatingLayerCards |
| Artifacts with visibility boundary | ✅ + separate `privateArtifacts` list | ✅ `visibility: public/private/internal` | ✅ ArtifactGrid |
| Evidence / receipts | ❌ described, not live | ✅ `CanonWorkflowEvidenceItem` | ✅ EvidenceTrail, EvidenceManager |
| Approvals (state + queue + persistence) | ❌ | ✅ `approval`, `approvalQueue`, D1 writes | ✅ ApprovalQueue, ApprovalGate |
| Actions + execution queue + rollback | ❌ | ✅ `actions`, `executionQueue` | ✅ ActionPreview, ActionExecutionQueue |
| Decisions | ◐ `nextReview` only | ✅ `decisions` | ✅ DecisionQueue |
| Delivery agent (grounded Q&A) | ✅ bespoke per-client endpoints | ✅ generic `/api/canon/agent` | ✅ AgentDock |
| Runtime + source-system status | ❌ | ✅ `runtime`, `sourceStatuses` | ✅ RuntimeStatus, SourceTruthStatus |
| Metrics | ❌ | ✅ `metrics` | ✅ WorkflowMetricsStrip |
| Activity log | ❌ | ✅ `activity` events | ✅ OperatorActivityLog |
| Runbook commands + access lanes (handoff) | ✅ ShivWorks only | ❌ | ❌ |
| Review cadence (`nextReview`) | ✅ | ❌ | ❌ |
| Knowledge cards / suggested prompts | ✅ Abundance | ✅ `agent.suggestedPrompts` | ✅ |
| User auth / tenancy | ❌ public + noindex | ❌ origin checks only | endpoint-configurable |

**Legend**: ✅ exists · ◐ partial · ❌ missing

## The Unified Schema

`CanonWorkflowContext` (B) is ~90% of the schema and stays canonical. Extend it with what only A has:

```typescript
interface DeliveryEngagement extends CanonWorkflowContext {
  // From A's deliverySummary — engagement identity beyond businessContexts
  engagement: {
    client: string;
    owner: string;
    phase: string;                       // e.g. "Pilot live", "Handoff"
    recipient?: string;                  // e.g. "PM forwards to developer"
    lane: 'trust_map' | 'workflow_pilot' | 'trust_layer' | 'enterprise_extension';
  };

  // From A (ShivWorks) — handoff shapes
  runbookCommands?: Array<{ label: string; command: string; expects?: string }>;
  accessLanes?: Array<{ system: string; method: string; owner: string; notes?: string }>;

  // From A — review cadence (currently nextReview[])
  reviews: Array<{ label: string; due: string; owner?: string; state?: 'open' | 'done' }>;

  // Net-new — tenancy (the standalone app's auth boundary)
  access: {
    publicSlug?: string;                 // renders the public proof page (System A tier)
    members: Array<{ email: string; role: 'owner' | 'approver' | 'viewer' }>;
  };
}
```

The `visibility: public | private | internal` field already on evidence/artifacts becomes the rendering rule: the public page shows `public`, the authenticated app shows `public + private`, `internal` never leaves the operator view.

## Gaps to Close (in order)

1. ✅ **Schema duplication (DRY violation).** ~~The same interfaces exist independently in `ControlComponents.tsx` and `workflow-context.ts`.~~ **Done 2026-06-12**: `packages/delivery-schema` (`@create-something/delivery-schema`, types-only, no build step) is now consumed by both. `workflow-context.ts` aliases the `Canon*` names; `ControlComponents.tsx` re-exports for the `.webflow.tsx` wrappers. Canonical optionality follows the server's strictness. Engagement extension types (step 3 shapes) are included. Verified: tsc clean in all three packages + Webflow CLI bundle succeeds.
2. ✅ **System A is not on System B.** **Done 2026-06-12**: Abundance is tenant #1. `$lib/delivery/abundance-context.ts` defines the engagement as a `CanonWorkflowContext` (contextId `abundance-npg-delivery`); migration `0025_abundance_delivery_context.sql` seeds the D1 row (generated from the TS object — no hand-sync). The page loads via `loadCanonWorkflowContext` (new optional `customFallback` param) and renders artifacts/layers/evidence/decisions/prompts from the context; its delivery agent now posts to `/api/canon/agent` with `contextId`. The bespoke `/api/delivery/abundance/ask` endpoint is deleted; a fallback registry (`$lib/delivery/contexts.ts`) keeps the three canon endpoints coherent pre-seed. **Kept**: `/api/delivery/abundance/job-agent` — it's a Dify proxy for live job discovery (read-only guardrail), unique functionality, not schema duplication. **Deploy note**: run `wrangler d1 migrations apply` for the agency DB to seed the row; until then the page serves the identical TS fallback. ShivWorks follows after `runbookCommands`/`accessLanes` land in the schema (step 3).
3. ✅ **Schema extensions.** **Done 2026-06-12**: `CanonWorkflowContext` gained optional `engagement`, `handoffPackage`, `runbookCommands`, `accessLanes`, `reviews`, `access` (types from `@create-something/delivery-schema`; `HandoffPackageItem` added for ShivWorks' delivery-package shape). The merge parses them from `workflow_json` — no D1 DDL needed; older rows stay valid. **ShivWorks is tenant #2**: `$lib/delivery/shivworks-context.ts` (contextId `shivworks-network-handoff`), migration `0026`, page renders from context, `shivworks.ts` deleted. Both seed migrations are generated by `packages/agency/scripts/generate-delivery-context-migration.mjs` so seeds and fallbacks can't drift. `access` tenancy is typed but unenforced — enforcement is step 4's auth boundary.
4. **The standalone app.** Auth + engagement switcher + the System C component set (ported or rebuilt in Svelte/Canon) over System B. Form factor: focused single-purpose app (MCP Connector / Webflow Wrapped mold), e.g. `delivery.createsomething.agency`. Origin-trust on `/operator-approval` is replaced by real user auth per `access.members`.
5. **Public tier rendered from the same row.** `/delivery/{slug}` becomes a renderer over `DeliveryEngagement` filtered to `visibility: public` — proof pages stop being hand-coded.

## Strategy Anchor

- The app **is** the Trust Layer lane made tangible: the monthly fee includes "the surface your team logs into."
- The Trust Map deliverable arrives as an engagement row in this system — the artifact is the demo.
- Webflow Code Components (System C) remain the embed skin for Webflow-hosted clients: same API, client's own domain. Not the foundation — code components are client-side React in an isolated root (styles must be inline; see 2026-06-10 incident) and cannot hold server state.
- Internal delivery IP first. SaaS/multi-tenant productization waits until 3–5 engagements run on it.

## Subtractive Triad Check

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I built this before? | Yes — three times. This spec unifies them. |
| **Rams** | Does this earn its existence? | The schema already earned it; only `engagement`, `reviews`, handoff shapes, and auth are net-new. |
| **Heidegger** | Does this serve the whole? | The delivery surface is the receipt language of the homepage made operational — marketing, delivery, and retention become one artifact. |
