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

Canon also carries a performance-excellence layer influenced by Nike-level product discipline:
athletic precision, decisive contrast, measured motion, material cues from performance spaces,
and clear pressure states. Use this as a CREATE SOMETHING design principle, not as Nike branding:
tokens and classes use `performance` language so every property can inherit the discipline without
copying third-party identity.

```css
@import '@create-something/canon/styles/performance.css';
```

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
