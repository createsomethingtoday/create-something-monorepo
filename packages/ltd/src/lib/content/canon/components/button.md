---
category: "Canon"
section: "Components"
title: "Button"
description: "Action controls for primary, secondary, and ghost interactions."
lead: "Canon buttons cover the common action states without extra ceremony. Start with primary, fall back to secondary, and use ghost when the action should stay quiet."
publishedAt: "2026-04-14"
published: true
---

## What Ships Today

- `variant`: `primary`, `secondary`, `ghost`
- `size`: `sm`, `md`, `lg`
- `href`: render link navigation with button treatment
- `disabled`: preserve state and suppress interaction
- `fullWidth`: stretch to the container when layout needs it

## Example

```svelte
<script lang="ts">
  import { Button } from '@create-something/canon';
</script>

<Button>Save changes</Button>
<Button variant="secondary">Preview</Button>
<Button variant="ghost" href="/canon/components">Browse components</Button>
```

## Selection Rules

1. Use `primary` for the one action that moves the user forward.
2. Use `secondary` when the choice matters but should not dominate the screen.
3. Use `ghost` for supporting actions, dense toolbars, or low-emphasis UI.

## Related

- [Clear Components](/canon/components/clear)
- [Card](/canon/components/card)
- [Navigation](/canon/components/navigation)
- [Get Started](/canon/resources/get-started)
