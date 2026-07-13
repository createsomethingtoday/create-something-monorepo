# @create-something/canon

**Canon Design System** - The single source of truth for CREATE SOMETHING properties.

> "Weniger, aber besser" — Dieter Rams

## Philosophy

Canon is the unified design system for all CREATE SOMETHING properties and client surfaces.
Canon owns stable primitives, tokens, templates, registry policy, and compatibility contracts.
Properties and clients extend Canon through overlays, candidate intake, and source-controlled
exemptions instead of forking primitives or inventing parallel design-system rules.

## Installation

```bash
pnpm add @create-something/canon@workspace:*
```

## Usage

### Styles

```css
/* Import the full Canon system */
@import '@create-something/canon/styles/canon.css';

/* Or import individual pieces */
@import '@create-something/canon/styles/tokens.css';
@import '@create-something/canon/styles/glass.css';
```

### Components

```typescript
// Core components
import {
  Button,
  Card,
  SEO,
  Navigation,
  Footer,
  PerformanceLabBand,
  PerformancePageSection,
  PerformanceDecisionPanel,
  PerformanceProofStrip,
  PerformanceStateRows,
  PerformanceReceiptGrid,
  PerformanceCtaBand
} from '@create-something/canon';

// Form components
import { TextField, Select, Switch } from '@create-something/canon/components/form';

// Feedback components
import { Dialog, Toast, Spinner } from '@create-something/canon/components/feedback';

// Navigation components
import { Tabs, Breadcrumbs, Drawer } from '@create-something/canon/components/navigation';
```

## First-Party Authentication

Canon is the reusable application layer for CREATE SOMETHING Identity. Server consumers use narrow subpath exports so authentication code does not import the visual component graph:

```ts
import { resolveApplicationAccess } from '@create-something/canon/auth/access';
import { createLoginHandler } from '@create-something/canon/auth/handlers';
import { clearSessionCookies } from '@create-something/canon/auth/cookies';
import { verifyIdentityToken } from '@create-something/canon/auth/server';
```

Identity Worker owns users, credentials, tokens, and signing keys. Canon owns login/session adaptation, cryptographic verification, and normalized access evaluation. Each application still owns its explicit allow policy and promotion approval. See [`docs/guides/FIRST_PARTY_AUTH_PLATFORM.md`](../../docs/guides/FIRST_PARTY_AUTH_PLATFORM.md) for the complete contract.

### Domain-Specific Components

```typescript
// .ltd domain (Philosophy/Canon)
import { MasterCard, TasteProfileCard } from '@create-something/canon/domains/ltd';

// .agency domain (Client Services)
import { BookingForm, AssessmentRuntime } from '@create-something/canon/domains/agency';

// .space domain (Experiments)
import { ExperimentRuntime, BeadsGraph } from '@create-something/canon/domains/space';

// .io domain (Research)
import { TufteDashboard, Paper } from '@create-something/canon/domains/io';
```

## Structure

```
packages/canon/
├── src/lib/
│   ├── styles/           # Design tokens and CSS
│   │   ├── tokens.css    # Core design tokens
│   │   ├── canon.css     # Full Canon system
│   │   ├── glass.css     # Glass Design System
│   │   └── prose.css     # Typography for markdown
│   │
│   ├── components/       # Shared components (2+ uses)
│   │   ├── form/         # Form inputs
│   │   ├── feedback/     # Dialogs, toasts, spinners
│   │   ├── navigation/   # Tabs, breadcrumbs, drawers
│   │   └── docs/         # Documentation components
│   │
│   ├── domains/          # Property-specific components
│   │   ├── ltd/          # createsomething.ltd
│   │   ├── agency/       # createsomething.agency
│   │   ├── space/        # createsomething.space
│   │   └── io/           # createsomething.io
│   │
│   └── experiments/      # Complete system experiments (1 of 1)
│       ├── nba-live/            # NBA analytics (14 components)
│       ├── threshold-dwelling/  # Architecture viz (11 components)
│       ├── kinetic-typography/  # Text animation (1 component)
│       ├── living-arena/        # SVG arena simulation (3 modules)
│       ├── living-arena-gpu/    # WebGPU crowd sim (6 modules + shaders)
│       ├── render-preview/      # Preview canvas (1 component)
│       └── render-studio/       # SVG workflow (2 components + 1 module)
```

## Experiments: The Graduation Pattern

Components for complete system experiments start in `experiments/`:

```typescript
// Import complete experiment systems
import { GameSelector, DateNavigation } from '@create-something/canon/experiments/nba-live';
import { FloorPlan, Elevation } from '@create-something/canon/experiments/threshold-dwelling';
import { FluidAssembly } from '@create-something/canon/experiments/kinetic-typography';
import { CrowdSimulation, initWebGPU } from '@create-something/canon/experiments/living-arena-gpu';
import { PreviewCanvas } from '@create-something/canon/experiments/render-preview';
import { PresetPicker, applySvgOperation } from '@create-something/canon/experiments/render-studio';
```

**The rule**: When a component is used in 2+ experiments, it graduates to:
- `components/` for shared UI
- `domains/{property}/` for domain-specific

This prevents premature abstraction while providing a clear maturation path.

## Design Tokens

Canon uses CSS custom properties for all design decisions:

| Category | Tokens |
|----------|--------|
| **Colors** | `--color-bg-*`, `--color-fg-*`, `--color-border-*` |
| **Typography** | `--text-*`, `--font-*`, `--leading-*` |
| **Spacing** | `--space-performance-xs` through `--space-performance-3xl` (Golden Ratio) |
| **Glass** | `--glass-blur-*`, `--glass-bg-*`, `--liquid-glass-*` |
| **Performance Lab** | `--color-performance-*`, `--radius-performance-*`, `--shadow-performance-*` |
| **Legacy compatibility** | `--color-clear-*`, `Clear*` exports, and `component.clear-*` registry IDs resolve to Performance Lab but are not used by new surfaces. |

### Typography Roles

Canon separates type by job, not only by size. Use the base families for brand
and prose, then use role tokens anywhere Atlas, Topology, Substrate, or operator
surfaces need stable scanning:

| Role | Tokens | Use |
|------|--------|-----|
| Interface prose | `--font-performance-interface`, `--font-performance-prose` | Human-readable labels, controls, public Atlas copy |
| Records | `--font-performance-record`, `--text-performance-record`, `--text-performance-record-meta` | IDs, counts, timestamps, receipts, source bindings |
| Topology labels | `--font-performance-topology-label`, `--text-performance-topology-label`, `--tracking-performance-topology-label` | Atlas graph labels, edge text, run/wait/stop badges |
| Code and payloads | `--font-performance-code` | CLI commands, JSON payloads, terminal output |

Topology and record labels use `letter-spacing: 0` and tabular numerics where
the value is machine-shaped. Do not hard-code route-local font families in
Atlas renderers; route through these tokens so public Atlas, local
Atlas Studio, and Substrate views keep the same typography contract.

## Performance Lab Surfaces

Canon uses Performance Lab as the CREATE SOMETHING design-language direction:
delegated work should feel trained, tested, governed, and proven before it
runs. The operative definition is intelligent systems trained for pressure:
engineered in the lab, tested under load, and proven in the field. The house
language is Performance Lab: plain claims, readable type,
porcelain and near-black proof surfaces, visible artifacts, compact navigation,
readiness rails, and restrained action states. The micro-interaction rule is
performance first: use motion or selection only when it clarifies state,
evidence, pressure, or the next action. `.agency` is the first verified rollout
surface; the shared primitives are the path for the rest of CREATE SOMETHING as
surfaces are migrated.

Performance Lab has two coordinated surface modes:

- **Campaign mode** uses original human/system motion, material studies,
  asymmetric editorial composition, decisive type, technical annotation, and
  integrated measurement on homepage, services, editorial, case-study, and
  social surfaces.
- **Product mode** keeps workflow-native maps, traces, policy, owners, state,
  receipts, and recovery primary on Atlas, product, proof, booking, and operator
  surfaces.

Standalone HTML products such as Workers consume the narrow
`@create-something/canon/performance/scheduler-document` export. It supplies the
versioned Performance font links, design tokens, and typography roles without
coupling application markup or behavior to Svelte. Satoshi remains hosted by
Fontshare; IBM Plex Mono is loaded from the pinned official package through
jsDelivr for standalone documents.

Transactional email uses the narrower
`@create-something/canon/performance/scheduler-email` export. It provides
literal colors, spacing, widths, and Satoshi/IBM Plex Mono system-fallback
stacks for inline styles. Email copy and document composition remain owned by
the product sending the message.

Readable Control is the proof/readability substrate inside both modes. It is not
a separate public identity.

Performance design and composition is now a single six-pattern namespace rather than a set
of route-local campaign, editorial, product, learning, and operator shells. Use the campaign opening, thesis/conditions,
field sequence, contrast chapter, evidence index, and conversion handoff as the
complete narrative vocabulary. The source-adjacent
[`components/performance/README.md`](src/lib/components/performance/README.md)
defines their contracts, property seams, composition recipe, and rollout gate.

For readiness summaries that repeat across properties, use `PerformanceLabBand`
instead of defining a route-local row of metric cards. It renders one continuous,
responsive operating rail with token-backed signal, pressure, growth, and risk states.

For simulation surfaces, system maps, operating consoles, and decision labs, use the shared
`performance-system-*` primitives instead of creating a local visual namespace. These primitives
keep interactive prototypes on the same owned system language as the properties: neutral or
near-black surfaces, compact panels, visible state, restrained motion, pressure/readiness rails,
and reusable map/report/metric structures.

```svelte
<section class="performance-system-shell">
  <div class="performance-system-hero performance-system-container">
    <div class="performance-system-copy">
      <p class="performance-system-eyebrow">Systems Lab</p>
      <h1>Run the system with visible state.</h1>
      <p class="performance-system-lede">Explain the policy, state, and receipt before action.</p>
    </div>
    <div class="performance-system-panel">...</div>
  </div>
</section>
```

The codification rule is practical: Performance Lab is the owned CREATE
SOMETHING identity system. Canon turns the discipline into primitives:

| Layer | Canon rule |
|-------|------------|
| **Claims** | State the operational promise plainly, then put proof beside it. |
| **Layout** | Prefer open page sections, compact navigation, and dense-but-readable operator surfaces. |
| **Components** | Use `Performance*` primitives before inventing local cards, shells, or proof panels. |
| **Evidence** | Show maps, contracts, receipts, gates, state, and next actions as first-class UI objects. |
| **Motion** | Use motion only to clarify status, selection, progression, or handoff. |
| **Copy** | Write in nouns and verbs from the workflow: object, action, policy, owner, receipt. |
| **Boundary** | Do not copy third-party identity, campaign language, source assets, fonts, or category framing. |

This means a CREATE SOMETHING surface should feel calm, precise, and prepared,
but it should prove a different thing: that the workflow has been mapped,
tested, governed, validated, and handed off with evidence.

### Performance And Safety Signature

The brand personality has two simultaneous axes:

- **Performance** uses decisive hierarchy, square action geometry, pressure
  rails, readiness metrics, and high-contrast black/white material surfaces.
- **Safety** makes authority visible through `controlled`, `ready`, `review`,
  and `stop` states, named owners, bounded actions, and receipt stamps.

Use `.performance-control-rail` for state-bearing panels and
`.performance-receipt-stamp` for compact proof identifiers. Color never stands
alone: pair every state with a text label, icon, or explicit decision copy.
`--color-performance-pressure` marks test intensity or decisive emphasis; it
does not mean safe, approved, or ready.

### Semantic Motion Contract

Use `@create-something/canon/motion` for renderer-independent interaction
intent. An intent names the event, user-visible stages, semantic targets,
Canon color roles, interruption policy, announcement copy, and reduced-motion
resolution. It must not contain raw color values, CSS selectors, or
runtime-specific timeline code.

Runtime adapters choose the smallest appropriate executor:

- CSS or Web Animations for local hover, focus, and isolated state changes.
- View Transitions for navigation continuity.
- GSAP for coordinated multi-stage sequences.
- Canvas or graph APIs for renderer-owned position and viewport changes.
- Immediate settled state when reduced-motion policy requires it.

GSAP is therefore a first-class orchestration adapter, not the Canon data
model. Performance Lab sequences must remain understandable through text,
icons, values, and receipts when animation is unavailable.

The same rule applies to marketing images and generated visuals. Use
Performance Lab as the direction, then translate the work into CREATE SOMETHING
artifact language: system maps, MCP boundaries, policy gates, receipts,
validation proof, owners, and handoff state.
For the repeatable image-generation contract, see
`docs/IMAGE_LANGUAGE_FOUNDATION.md` and
`docs/CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md`.

For component-level usage and compatibility rules, see
[`src/lib/components/clear/README.md`](./src/lib/components/clear/README.md).

## Canon Registry

Canon exposes a machine-readable registry at `@create-something/canon/registry`.
This is the foundation for agent discovery, content MCP resources, templates,
project overlays, and modality-specific UI guidance.

The registry classifies Canon artifacts as:

- `component`: Svelte primitives such as `Button`, `Navigation`, and `PerformanceDecisionPanel`
- `token`: CSS and design-token sources
- `template`: reusable compositions for governed workflows
- `adapter`: renderer-independent contracts such as Atlas graph artifacts
- `policy`: rules and product loops such as Signal -> Decision -> Proof

Each registry item carries source path, import path, docs path, maturity,
supported modalities (`web`, `chat`, `app`, `voice`, `glasses`), dependencies,
and contract notes for accessibility, evidence, motion, and extension.

Project and client surfaces should extend Canon through this lifecycle:

1. `project-local`: local overlay owns the need and evidence.
2. `candidate`: repeated across at least two surfaces or clients.
3. `canon-stable`: Canon owns export, docs, tests, and compatibility.
4. `deprecated`: Canon preserves migration guidance and replacement routing.

```typescript
import {
  routeCanonExtensionIntake,
  searchCanonRegistry,
  getCanonRegistryItem
} from '@create-something/canon/registry';

const glassesTemplates = searchCanonRegistry('routing evidence', {
  kind: 'template',
  modality: 'glasses'
});

const decisionPanel = getCanonRegistryItem('component.clear-decision-panel');

const routing = routeCanonExtensionIntake({
  id: 'overlay.client-proof-panel',
  title: 'Client Proof Panel',
  summary: 'A client-local proof panel that may become a shared primitive.',
  requestedKind: 'component',
  requestedModalities: ['web'],
  owner: 'client-team',
  sourcePackage: '@create-something/agency',
  sourcePath: 'packages/agency/src/lib/ClientProofPanel.svelte',
  tags: ['proof', 'client'],
  surfaces: [
    {
      surfaceId: 'agency-client-launch',
      name: 'Agency client launch',
      modality: 'web',
      proof: 'Live launch receipt or review evidence'
    }
  ]
});
```

Use `template.canon-extension-intake` when a project or client surface wants to feed a
pattern back into Canon. The packet must name the owner, source package, requested kind,
modalities, tags, evidence surfaces, dependencies, and any existing Canon item it matches or
deprecates.

`routeCanonExtensionIntake(...)` applies the shared promotion rule:

| Evidence | Routing |
|----------|---------|
| Matches a stable registry item | use the existing Canon item instead of forking |
| One distinct surface | keep project-local and collect proof |
| Two or more distinct surfaces | promote to `candidate` for Canon review |
| Deprecates an existing item | keep migration guidance and replacement routing discoverable |

Do not mark an overlay `canon-stable` until Canon owns the export path, docs, tests, and
compatibility notes.

## Stable Component Depth

Canon stable component maturity is now audited separately from broad library health.
`@create-something/canon/stable-component-depth` builds a per-component evidence ledger for
every stable registry component across seven dimensions:

- docs
- examples
- prop contracts
- accessibility evidence
- visual regression coverage
- modality-specific behavior
- CREATE SOMETHING property usage

Run the inventory without failing the package:

```bash
pnpm --filter @create-something/canon stable-component:depth
pnpm --filter @create-something/canon stable-component:depth -- --verbose
```

The hard gate is part of `pnpm --filter @create-something/canon check` and should stay green
before promoting stable component changes:

```bash
pnpm --filter @create-something/canon stable-component:depth:gate
```

When visual evidence changes, run the browser-rendered screenshot gate as the deeper proof layer:

```bash
pnpm --filter @create-something/canon visual:screenshot:check
```

The screenshot gate starts Canon locally, renders `/visual-evidence/form`,
`/visual-evidence/feedback`, `/visual-evidence/clear`, and
`/visual-evidence/navigation` at desktop and mobile viewports, then writes PNG evidence to
`output/playwright/canon-visual-evidence`. It also checks image dimensions and sampled color
variance so a blank route does not pass. Output files are named by group and viewport, for example
`form-desktop.png` and `form-mobile.png`. The command also writes
`output/playwright/canon-visual-evidence/manifest.json`, a machine-readable summary of each
capture, dimensions, sampled color variance, and horizontal overflow checks.

This report is intentionally Node-backed and exported on its own subpath. Do not add it to the
root browser-facing Canon barrel. If the report stops returning `ready`, do not claim every stable
component has equal depth across docs, examples, prop contracts, accessibility, visual regression,
modality behavior, and property usage.

### Project Overlay Instantiation

Use the Canon overlay template pack when a project or client needs local theme, token, template,
copy, surface-policy, and registry artifacts without forking Canon primitives.

Inspect the canonical starter files without writing anything:

```bash
pnpm --filter @create-something/canon overlay:template-files
pnpm --filter @create-something/canon overlay:template-files -- --path surface-policy.md
pnpm --filter @create-something/canon overlay:template-files -- --path templates/surface-brief.md --json
```

The `overlay:template-files` command is read-only. It prints the canonical file pack or one
file for review and copy planning; it does not instantiate overlays, write files, create Linear
work, mutate Canon, mutate project overlays, or approve candidate promotion.

Instantiate project-specific files only after the starter pack is reviewed:

```bash
pnpm --filter @create-something/canon overlay:instantiate -- \
  --id overlay.client-workflow \
  --name "Client Workflow Overlay" \
  --owner client-team \
  --source-package @create-something/client \
  --out ./packages/client/canon-overlay \
  --modalities web,chat \
  --dry-run
```

Remove `--dry-run` to write the files. The command skips existing files unless `--force` is
provided. The generated `manifest.ts` can be passed to `reviewCanonProjectOverlay(...)`.

### Project Overlay Intake Inventory

When multiple projects or clients have local overlays, run the Canon overlay quality gate from
the repo root:

```bash
pnpm --filter @create-something/canon overlay:check
```

The quality gate composes property-surface coverage and intake inventory. It fails when a rendered
Canon-consuming property is missing `canon-overlay/manifest.ts`, when a covered property overlay is
not visible to inventory, when any inventoried overlay is not ready, or when an overlay manifest
imports package code instead of exporting self-contained data. `pnpm --filter @create-something/canon
check` runs the same gate after package and Svelte validation.

After Canon is packaged, run the cross-property consumer gate to verify every ready overlay manifest
still satisfies Canon's public registry contract:

```bash
pnpm --filter @create-something/canon overlay:consumer-check
```

`overlay:consumer-check` generates temporary TypeScript fixtures for the inventoried overlays and
typechecks them against `@create-something/canon/registry` from the built package output. Canon
`check` runs this gate after `pnpm package`, so a property overlay cannot silently drift away from
the shared Canon foundation contract or depend on a local build-order accident.

Keep `canon-overlay/manifest.ts` files as plain data exports:

```ts
export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.client-workflow"
};
```

Do not import Canon types or other package modules from checked-in overlay manifests. Downstream
property typechecks can run before Canon `dist` exists, so manifest files must stay readable by
static inventory and safe for package-local `tsc --noEmit`.

Use `--verbose` to print the full coverage and inventory report in one command:

```bash
pnpm --filter @create-something/canon overlay:check -- --verbose
```

Use the narrower inventory command when you only need the detailed overlay review output:

```bash
pnpm --filter @create-something/canon overlay:inventory -- --root .
```

The inventory scans `apps/` and `packages/` for `CANON_PROJECT_OVERLAY_MANIFEST` exports, skips
the Canon template itself, reviews each manifest with `reviewCanonProjectOverlay(...)`, and
summarizes ready overlays, missing artifacts, project-local intakes, and candidate-promotion
intakes. MCP mirrors the same snapshot at `canon://overlays/intake` and
`canon://overlays/intake/list` so agents can inspect multi-project feedback before proposing
Canon changes.

### Repo-wide Codification Audit

Use the codification gate when the question is whether every UI file has a Canon ownership answer:

```bash
pnpm --filter @create-something/canon codification:check
```

The audit scans UI source files in `apps/` and `packages/` and assigns one primary classification:

- `canon-owned`: the file lives inside the Canon package boundary.
- `canon-importing`: the file directly imports the public Canon package.
- `overlay-governed`: the owning package has `canon-overlay/manifest.ts`.
- `product-local-exempt`: the file is covered by explicit Canon exemption policy data.
- `needs-canon-decision`: the file has no Canon import, no overlay, and no exemption.

The command fails only for `needs-canon-decision`. This keeps the operating rule precise: not every
project component must move into Canon, but every UI file needs a documented Canon relationship.
Product-local exemptions are source-controlled in `src/lib/codification/codification.ts` with a
reason and justification, so future agents can distinguish intentional local surfaces from missing
Canon work.

### Canon Library Health

Use the health report when deciding what to improve next in the Canon library:

```bash
pnpm --filter @create-something/canon library:health
pnpm --filter @create-something/canon library:health -- --verbose
pnpm --filter @create-something/canon library:health -- --json
```

The report aggregates the current registry maturity, public export classification policy, overlay
inventory, modality readiness, and repo-wide codification audit. It is intentionally exposed from
`@create-something/canon/library-health`, not the root browser-facing Canon barrel, because it
depends on Node-backed repo scanners.

Treat `candidate-review` output as the promotion backlog, not as a failing state. Public exports
remain in that backlog until Canon owns export path, docs, focused tests, compatibility notes, and
registry routing. Component registry items are a stricter foundation contract: every Canon
component must be stable and must not carry the `candidate` tag. The health command fails when the
foundation has actual blockers such as non-stable components, not-ready overlays, modality gaps, or
UI files with `needs-canon-decision`.

## Atlas Graph And Story Primitives

Canon owns the reusable Atlas graph/story contract at
`@create-something/canon/atlas/headless` and the Svelte Atlas adapters at
`@create-something/canon/atlas`. The adapters render through
`@create-something/canvas-kernel`, the same canvas foundation used by Atlas
Studio, Topology, and Substrate.

Use this package for:

- `PublicAtlasCanvas`, node, edge, readiness, graph-artifact, and story-artifact
  types
- `createPublicAtlasGraphArtifact(...)` as the source-of-truth workflow graph
  contract for humans, agents, and renderer adapters
- `createPublicAtlasStoryArtifact(...)` for deterministic static chapters,
  accessibility summaries, article visuals, and social cards
- `AtlasStoryCanvas` as the read-only Svelte adapter for the story artifact
- `AtlasFlow` as the editable Svelte adapter for the same graph contract and
  shared canvas kernel

Property packages should supply their own starter maps, booking behavior,
persistence, agent mutation path, and production integrations. Do not fork the
graph/story artifact shape or move source-of-truth state into a renderer.

## Governance Product Contract

Canon owns the shared product contract for the app-governance system at
`@create-something/canon/governance`:

- `Atlas` is the map product. It connects every governance product attachment.
- `Signal` is the inbox product. It captures change, source, owner, and affected
  system context.
- `Decision` is the judgment product. It routes run, wait, stop, and escalation
  states.
- `Proof` is the evidence product. It records the outcome, receipt, rollback
  note, and audit trail in the Proof Graph.

The default composition is `Atlas -> Signal -> Decision -> Proof -> Atlas`.
Atlas graph nodes now carry product attachments so independent Signal,
Decision, and Proof product surfaces can be composed without inventing new IDs
or a parallel map format.

Canon also carries a performance-excellence layer for NikeLab-grade internal taste without
third-party branding: athletic precision, decisive contrast, measured motion, material cues from
performance spaces, research surfaces, and clear pressure states. Use this as a CREATE SOMETHING
design principle, not as Nike branding: tokens and classes use `performance` language so every
property can inherit the discipline without copying third-party identity.

```css
@import '@create-something/canon/styles/performance.css';
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/lib/index.ts`, `src/lib/registry/index.ts`, `src/lib/styles/tokens.css` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | `svelte-check`, `vitest`, `svelte-package`, `publint`, registry generated content in `@create-something/mcp` |
| UI validation path | Downstream .ltd Canon docs and Canon-consuming property routes |
| Escalation rule | Stop before changing Canon semantics, Performance/Atlas/governance contracts, or registry lifecycle without source-adjacent tests and public docs alignment. |

Use the performance layer for labs, systems maps, operational dashboards, simulation surfaces, and
high-stakes decision rooms where clarity needs more physical energy than a standard SaaS panel.

```svelte
<Navigation visualStyle="performance" {...navProps} />

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Governed workflows"
  title="Put agents to work inside workflows you can govern."
  description="Name the object, action, approval rule, stop condition, and receipt before an agent acts."
/>

<PerformanceDecisionPanel
  eyebrow="Decision path"
  title="Show whether to run, review, or stop."
  items={[
    {
      label: 'Run',
      summary: 'Bounded action',
      title: 'The workflow can act.',
      detail: 'The objects, tools, policy, and receipts are visible before execution.',
      tone: 'allow',
      evidence: ['Object is named', 'Write is bounded', 'Receipt is attached'],
      receipts: ['workflow-map', 'policy-rule', 'run-receipt']
    }
  ]}
/>

<Footer visualStyle="performance" {...footerProps} />
```

## Glass Design System

Glass conveys "The Automation Layer" — the transparent interface between user and outcome.

```html
<!-- Frosted glass -->
<nav class="glass-lg">Navigation</nav>

<!-- Liquid glass with tint -->
<div class="liquid-glass liquid-glass-tint-purple">Premium feature</div>

<!-- Glass card -->
<article class="glass-card">Workflow content</article>
```

## WORKWAY Alignment

Canon is shared between CREATE SOMETHING properties and [WORKWAY](https://workway.co) (the construction vertical). **WORKWAY serves as the reference implementation** with the most advanced patterns:

| Feature | Canon (SvelteKit) | WORKWAY (React) |
|---------|-------------------|-----------------|
| **Framework** | Tailwind v3 | Tailwind v4 |
| **Components** | Svelte components | shadcn/ui + MagicUI |
| **Glass System** | CSS utilities | CSS + React components |
| **Animations** | CSS keyframes | CSS + Framer Motion |

**Reference file**: `WORKWAY/workway-platform/apps/web/src/styles.css`

New Canon features are first implemented in WORKWAY, then backported to the shared Canon package. This ensures the design system evolves through production use rather than theoretical additions.

### Shared Utilities (v1.1.0+)

These utilities are now synchronized between Canon and WORKWAY:

- Infrastructure grid backgrounds (`.bg-grid`, `.bg-grid-fade`)
- Interactive state patterns (`.interactive`, `.pressable`, `.hover-lift`)
- Scroll reveal animations (`.reveal`, `.reveal-delay-*`)
- Dim siblings pattern (`.dim-siblings-on-hover`)
- Skeleton loading animations

## Accessibility

All components and styles include fallbacks for:
- `prefers-reduced-motion`
- `prefers-reduced-transparency`
- `prefers-contrast: more`

## Development

```bash
# Build the package
pnpm --filter=canon build

# Type check
pnpm --filter=canon check

# Run tests
pnpm --filter=canon test
```

## Migration from @create-something/components

```typescript
// Before
import { Button } from '@create-something/components';

// After
import { Button } from '@create-something/canon';
```

All exports are compatible—just change the package name.

## License

MIT © Create Something
