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
- `Breadcrumbs`: hierarchical wayfinding with optional home icon
- `Tabs`: WAI-ARIA tab panels with keyboard navigation and bindable active state

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

## Design Guidance

1. Keep the primary header focused on top-level choices.
2. Use breadcrumbs when the user needs a clear sense of depth.
3. Use tabs for peer content, not for hiding unrelated workflows.

## Related

- [Layout](/canon/foundations/layout)
- [Content](/canon/guidelines/content)
- [Responsive](/canon/guidelines/responsive)
