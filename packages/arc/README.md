# @create-something/arc

Shared presentation and operating-story UI for renderer-neutral Atlas compositions.

## Boundary

- `@create-something/atlas-composition` owns versioned Arc, Playbook, Runbook, scene, map-module, artifact, motion, and provenance data.
- Canon owns visual tokens and the accessible narrative-stage primitive.
- Arc owns the reusable renderer and, over time, its visual authoring surface.
- Host applications own access, persistence, customer policy, approvals, external writes, and deployment.

```svelte
<script lang="ts">
  import { ArcDeck } from '@create-something/arc';
  import { APP_REVIEW_GOVERNANCE_COMPOSITION } from '@create-something/atlas-composition';
</script>

<ArcDeck
  composition={APP_REVIEW_GOVERNANCE_COMPOSITION}
  routeId="app-review-governance-arc"
  enablePresentation
/>
```

The package never grants approval or performs a third-party write. An action endpoint is an explicit host adapter and must preserve the host's policy and receipt contract.
