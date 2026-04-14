---
category: "Canon"
section: "Patterns"
title: "Loading"
description: "Patterns for waiting states, perceived progress, and handoff between system and user."
lead: "Loading states should confirm that work is happening without making the interface feel noisy. Canon provides both structural and lightweight feedback patterns."
publishedAt: "2026-04-14"
published: true
---

## Pattern Set

- `LoadingSkeleton`: preserve layout while content is on the way
- `LoadingOverlay`: communicate temporary lock states without replacing the entire screen
- `Spinner`, `Skeleton`, and `Progress`: lower-level feedback primitives for smaller status moments

## Import Surface

```svelte
<script lang="ts">
  import {
    LoadingSkeleton,
    LoadingOverlay,
    Spinner,
    Progress
  } from '@create-something/canon';
</script>
```

## Selection Rules

1. Use skeletons when you already know the shape of the arriving content.
2. Use overlays when the user stays on the current surface and needs continuity.
3. Use spinners and progress indicators for compact status moments, not as a substitute for structure.

## Documentation Status

Expanded examples for async tables, upload flows, and inline refresh states are still being documented. The route is now live so the docs surface matches the package surface.

## Related

- [Forms](/canon/patterns/forms)
- [Motion](/canon/foundations/motion)
- [Accessibility](/canon/guidelines/accessibility)
