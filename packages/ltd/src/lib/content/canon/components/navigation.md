---
category: "Canon"
section: "Components"
title: "Navigation"
description: "Wayfinding surfaces for headers, breadcrumbs, and tabbed interfaces."
lead: "Navigation should orient without demanding attention. Canon keeps the structure visible while letting the destination stay primary."
publishedAt: "2026-04-14"
published: true
---

## Available Surfaces

- `Navigation`: primary site header with desktop and mobile states
- `Footer`: property directory, grouped links, newsletter, legal, and cross-property links
- `Breadcrumbs`: hierarchical wayfinding with optional home icon
- `Tabs`: WAI-ARIA tab panels with keyboard navigation and bindable active state
- `Pagination`: page-count navigation for result sets and archives
- `Tooltip`: small accessible hints for icon or dense controls
- `Popover`: contextual panels that stay attached to a trigger
- `DropdownMenu`: compact grouped commands with keyboard behavior
- `Drawer`: contained side-panel navigation for focused tasks
- `StickyHeader`: route-aware header for long property pages
- `MobileDrawer`: mobile navigation shell paired with `MenuButton`
- `MenuButton`: explicit open/close trigger for navigation drawers
- `MegaMenu`: broad grouped navigation for property and system maps
- `CommandPalette`: keyboard-first navigation and command search

## Primary Navigation Example

```svelte
<script lang="ts">
  import { Navigation } from '@create-something/canon';

  const links = [
    { label: 'Canon', href: '/canon' },
    { label: 'Principles', href: '/principles' }
  ];
</script>

<Navigation
  logo="CREATE"
  logoSuffix=".something"
  {links}
  currentPath="/canon"
  ctaLabel="Contact"
  ctaHref="/contact"
/>
```

## Performance Navigation

`Navigation` and `Footer` accept `visualStyle?: 'classic' | 'performance' | 'clear'`. Use
`performance`; `clear` remains an input alias for downstream compatibility.

Use `performance` when the page must serve a buyer or operator who needs immediate orientation before
brand atmosphere. The style follows the Performance Lab layer: a light shell,
compact readable links, crisp dividers, restrained active states, direct dark CTA, and no decorative
navigation complexity.

Performance navigation should route people into proof-bearing work, not generic brand exploration. Prefer
labels for maps, policies, systems, workflows, receipts, and contact paths. Keep the primary CTA
bounded to a concrete next action such as mapping one workflow, reviewing a handoff, or opening a
governed surface.

```svelte
<Navigation
  logo="CREATE SOMETHING"
  logoSuffix=".agency"
  links={links}
  currentPath="/"
  fixed={true}
  ctaLabel="Map one workflow"
  ctaHref="/book"
  visualStyle="performance"
/>

<Footer
  mode="agency"
  aboutText="Governed workflows with clear trust boundaries and receipt-backed delivery."
  quickLinkGroups={footerGroups}
  footerCta={{
    label: 'Map one workflow',
    href: '/book',
    description: 'Leave with the workflow, boundary, and proof path.'
  }}
  visualStyle="performance"
/>
```

## Performance Primitives

The Performance navigation and footer are designed to pair with:

- `PerformancePageSection`: claim, proof, action, and split hero sections
- `PerformanceProofStrip`: compact objects/actions/states/receipts proof
- `PerformanceStateRows`: governed run/wait/stop rows
- `PerformanceDecisionPanel`: selectable allow/review/block decision paths with evidence and receipts
- `PerformanceReceiptGrid` and `PerformanceArtifactCard`: evidence and delivery receipts
- `PerformanceCtaBand`: restrained final action band

## Breadcrumbs and Tabs

```svelte
<script lang="ts">
  import { Breadcrumbs, Tabs } from '@create-something/canon';

  const items = [
    { label: 'Canon', href: '/canon' },
    { label: 'Navigation' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'api', label: 'API' }
  ];

  let activeTab = 'overview';
</script>

<Breadcrumbs {items} showHomeIcon={true} />

<Tabs {tabs} bind:activeTab>
  {#snippet children(tabId)}
    <p>{tabId} content</p>
  {/snippet}
</Tabs>
```

## Navigation Patterns

Use `DropdownMenu`, `Popover`, and `Tooltip` only when the trigger remains visible and the
relationship between trigger and panel is obvious. Use `Drawer`, `MobileDrawer`, `MenuButton`,
and `StickyHeader` for property navigation that must remain scannable across mobile and desktop.
Use `MegaMenu` and `CommandPalette` when a property has enough routes or commands that search,
grouping, or keyboard-first navigation reduces friction.

## Design Guidance

1. Keep the primary header focused on top-level choices.
2. Use breadcrumbs when the user needs a clear sense of depth.
3. Use tabs for peer content, not for hiding unrelated workflows.
4. Use `visualStyle="performance"` for the CREATE SOMETHING communication layer: plain-language
   orientation, visible proof, and a direct next action.

## Related

- [Performance Components](/canon/components/clear)
- [Layout](/canon/foundations/layout)
- [Content](/canon/guidelines/content)
- [Responsive](/canon/guidelines/responsive)
