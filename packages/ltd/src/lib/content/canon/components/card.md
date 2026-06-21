---
category: "Canon"
section: "Components"
title: "Card"
description: "Flexible containers for grouping related content with controlled emphasis."
lead: "Canon cards create separation through surface, radius, and motion. Use the lightest treatment that still makes the grouping obvious."
publishedAt: "2026-04-14"
published: true
---

## What Ships Today

- `variant`: `standard`, `elevated`, `outlined`, `glass`
- `radius`: `sm`, `md`, `lg`, `xl`
- `padding`: `none`, `sm`, `md`, `lg`, `xl`
- `hover`: opt into interactive lift when the whole card is actionable
- `href`: render the card as a link target

## Example

```svelte
<script lang="ts">
  import { Card, Button } from '@create-something/canon';
</script>

<Card variant="elevated" padding="lg">
  <h2>Deployment Ready</h2>
  <p>Record evidence, then promote with the narrowest trustworthy validation surface.</p>
  <Button variant="secondary">Review checklist</Button>
</Card>
```

## When To Reach For Each Variant

1. Use `standard` for most content groupings.
2. Use `elevated` when the card needs stronger separation from the canvas.
3. Use `outlined` when you want structure without added depth.
4. Use `glass` sparingly for automation, shell, or overlay surfaces.

## Related

- [Clear Components](/canon/components/clear)
- [Button](/canon/components/button)
- [Navigation](/canon/components/navigation)
- [Layout](/canon/foundations/layout)
