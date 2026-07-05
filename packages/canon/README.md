# @create-something/canon

**Canon Design System** - The single source of truth for CREATE SOMETHING properties.

> "Weniger, aber besser" — Dieter Rams

## Philosophy

Canon is the unified design system for all CREATE SOMETHING properties (.ltd, .agency, .space, .io). Every component, token, and style lives here. Properties only consume—they never define local components.

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
  ClearPageSection,
  ClearDecisionPanel,
  ClearProofStrip,
  ClearStateRows,
  ClearReceiptGrid,
  ClearCtaBand
} from '@create-something/canon';

// Form components
import { TextField, Select, Switch } from '@create-something/canon/components/form';

// Feedback components
import { Dialog, Toast, Spinner } from '@create-something/canon/components/feedback';

// Navigation components
import { Tabs, Breadcrumbs, Drawer } from '@create-something/canon/components/navigation';
```

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
| **Spacing** | `--space-xs` through `--space-3xl` (Golden Ratio) |
| **Glass** | `--glass-blur-*`, `--glass-bg-*`, `--liquid-glass-*` |
| **Clear Communication** | `--color-clear-*`, `--radius-clear-*`, `--shadow-clear-*` |
| **Performance Excellence** | `--color-performance-*`, `--radius-performance-*`, `--shadow-performance-*` |

## Ona-Derived Clear Communication

Canon uses Ona's public design/UI/UX direction as the communication reference for CREATE
SOMETHING: plain first-screen claims, readable type, porcelain surfaces, visible proof artifacts,
compact navigation, and restrained action states. The micro-interaction rule is communication
first: use motion or selection only when it clarifies state, evidence, or the next action.
`.agency` is the first verified rollout surface; the shared primitives are the path for the rest
of CREATE SOMETHING as surfaces are migrated.

For simulation surfaces, system maps, operating consoles, and decision labs, use the shared
`ona-system-*` primitives instead of creating a local visual namespace. These primitives keep
interactive prototypes on the same Ona-derived language as the properties: porcelain surfaces,
compact panels, visible state, restrained motion, and reusable map/report/metric structures.

```svelte
<section class="ona-system-shell">
  <div class="ona-system-hero ona-system-container">
    <div class="ona-system-copy">
      <p class="ona-system-eyebrow">Systems Lab</p>
      <h1>Run the system with visible state.</h1>
      <p class="ona-system-lede">Explain the policy, state, and receipt before action.</p>
    </div>
    <div class="ona-system-panel">...</div>
  </div>
</section>
```

The codification rule is practical: Ona is a reference for communication quality, not a brand
surface to copy. Canon turns that reference into owned CREATE SOMETHING primitives:

| Layer | Canon rule |
|-------|------------|
| **Claims** | State the operational promise plainly, then put proof beside it. |
| **Layout** | Prefer open page sections, compact navigation, and dense-but-readable operator surfaces. |
| **Components** | Use `Clear*` primitives before inventing local cards, shells, or proof panels. |
| **Evidence** | Show maps, contracts, receipts, gates, state, and next actions as first-class UI objects. |
| **Motion** | Use motion only to clarify status, selection, progression, or handoff. |
| **Copy** | Write in nouns and verbs from the workflow: object, action, policy, owner, receipt. |
| **Boundary** | Do not copy Ona identity, campaign language, or category framing. |

This means a CREATE SOMETHING surface should feel calm and inevitable, but it should prove a
different thing: that the workflow has been mapped, integrated, governed, validated, and handed
off with evidence.

The same rule applies to marketing images and generated visuals. Use Ona.com as the design and
communication foundation, then translate it into CREATE SOMETHING artifact language: system maps,
MCP boundaries, policy gates, receipts, validation proof, owners, and handoff state. For the
repeatable image-generation contract, see the public Canon Images guideline in
`packages/ltd/src/lib/content/canon/guidelines/images.md`.

For component-level usage rules, see
[`src/lib/components/clear/README.md`](./src/lib/components/clear/README.md).

## Canon Registry

Canon exposes a machine-readable registry at `@create-something/canon/registry`.
This is the foundation for agent discovery, content MCP resources, templates,
project overlays, and modality-specific UI guidance.

The registry classifies Canon artifacts as:

- `component`: Svelte primitives such as `Button`, `Navigation`, and `ClearDecisionPanel`
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

When multiple projects or clients have local overlays, run the Canon intake inventory from the
repo root:

```bash
pnpm --filter @create-something/canon overlay:inventory -- --root .
```

The inventory scans `apps/` and `packages/` for `CANON_PROJECT_OVERLAY_MANIFEST` exports, skips
the Canon template itself, reviews each manifest with `reviewCanonProjectOverlay(...)`, and
summarizes ready overlays, missing artifacts, project-local intakes, and candidate-promotion
intakes. MCP mirrors the same snapshot at `canon://overlays/intake` and
`canon://overlays/intake/list` so agents can inspect multi-project feedback before proposing
Canon changes.

## Atlas Graph And Story Primitives

Canon owns the reusable Atlas graph/story contract at
`@create-something/canon/atlas/headless` and the Svelte Atlas renderers at
`@create-something/canon/atlas`.

Use this package for:

- `PublicAtlasCanvas`, node, edge, readiness, graph-artifact, and story-artifact
  types
- `createPublicAtlasGraphArtifact(...)` as the source-of-truth workflow graph
  contract for humans, agents, and renderer adapters
- `createPublicAtlasStoryArtifact(...)` for deterministic static chapters,
  accessibility summaries, article visuals, and social cards
- `AtlasStoryCanvas` as the read-only Svelte renderer for the story artifact
- `AtlasFlow` as the editable Svelte workflow-map renderer for the same graph
  contract

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

Canon also carries a performance-excellence layer influenced by Nike-level product discipline:
athletic precision, decisive contrast, measured motion, material cues from performance spaces,
and clear pressure states. Use this as a CREATE SOMETHING design principle, not as Nike branding:
tokens and classes use `performance` language so every property can inherit the discipline without
copying third-party identity.

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
| Escalation rule | Stop before changing Canon semantics, Clear/Atlas/governance contracts, or registry lifecycle without source-adjacent tests and public docs alignment. |

Use the performance layer for labs, systems maps, operational dashboards, simulation surfaces, and
high-stakes decision rooms where clarity needs more physical energy than a standard SaaS panel.

```svelte
<Navigation visualStyle="clear" {...navProps} />

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Governed workflows"
  title="Put agents to work inside workflows you can govern."
  description="Name the object, action, approval rule, stop condition, and receipt before an agent acts."
/>

<ClearDecisionPanel
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

<Footer visualStyle="clear" {...footerProps} />
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
