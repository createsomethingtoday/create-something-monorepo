---
category: "Canon"
section: "Components"
title: "Card"
description: "Flexible containers for grouping related content with controlled emphasis."
lead: "Canon cards create separation through solid surface, border, and spacing. Use the lightest treatment that still makes the grouping obvious."
publishedAt: "2026-04-14"
published: true
---

## What Ships Today

- `variant`: `standard`, `elevated`, `outlined`, `glass`
- `radius`: `sm`, `md`, `lg`, `xl`
- `padding`: `none`, `sm`, `md`, `lg`, `xl`
- `hover`: opt into visible hover feedback when the whole card is actionable
- `href`: render the card as a link target

## Example

```svelte
<script lang="ts">
  import { Card, Button } from '@create-something/canon';
</script>

<Card variant="standard" padding="lg">
  <h2>Deployment Ready</h2>
  <p>Record evidence, then promote with the narrowest trustworthy validation surface.</p>
  <Button variant="secondary">Review checklist</Button>
</Card>
```

## When To Reach For Each Variant

1. Use `standard` for most content groupings.
2. `elevated` is a compatibility name with the same solid treatment as `standard`; it does not add a shadow.
3. Use `outlined` for a transparent surface with a stronger border.
4. `glass` is a compatibility name that currently renders a solid panel; it is not the default material direction.

Cards use soft-square geometry. Artwork frames stay square. `href` renders a native link; `onclick` without `href` renders a button; otherwise the card is a static container. Do not nest interactive controls inside an actionable card. Keep approval and execution claims tied to actual evidence.

## Related

- [Clear Components](/canon/components/clear)
- [Button](/canon/components/button)
- [Navigation](/canon/components/navigation)
- [Layout](/canon/foundations/layout)
