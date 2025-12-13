# Hermeneutic Page Transitions

## Thesis

Navigation between pages, experiments, and Modes of Being should embody the hermeneutic circle—smooth enough to dwell in, distinct enough to understand where you are.

## Architecture

### Two Domains of Transition

1. **Within-Property** (same domain): Full View Transitions API support
2. **Cross-Property** (different domains): Exit/entry animations + Mode indicator

### Technical Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                    WITHIN-PROPERTY                               │
│  ┌──────────┐    View Transitions    ┌──────────┐               │
│  │  /papers │ ──────────────────────►│ /papers/ │               │
│  │          │        API             │  [slug]  │               │
│  └──────────┘                        └──────────┘               │
│                                                                  │
│  Uses: onNavigate + document.startViewTransition                │
│  Feel: Smooth morphing, content continuity                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CROSS-PROPERTY                                │
│  ┌──────────┐    Exit Animation     ┌──────────┐               │
│  │   .io    │ ─────────────────────►│   .ltd   │               │
│  │          │    Entry Animation     │          │               │
│  └──────────┘                        └──────────┘               │
│                                                                  │
│  Uses: CSS exit animation + sessionStorage + entry animation    │
│  Feel: Meaningful transition, Mode of Being shift visible       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Within-Property Transitions (packages/components)

**File: `packages/components/src/lib/transitions/ViewTransition.svelte`**

```typescript
// Shared View Transition setup for all properties
import { onNavigate } from '$app/navigation';

export function setupViewTransitions(mode: 'ltd' | 'io' | 'space' | 'agency') {
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
}
```

**CSS in each property's app.css:**

```css
/* Base view transition */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--duration-standard);
  animation-timing-function: var(--ease-standard);
}

/* Mode-specific transitions */
/* .ltd: Contemplative - slower, fade */
/* .io: Structured - slide from direction */
/* .space: Experimental - more playful */
/* .agency: Professional - crisp, efficient */
```

### Phase 2: Mode of Being Indicator

**File: `packages/components/src/lib/components/ModeIndicator.svelte`**

A subtle, persistent indicator showing:
- Current Mode of Being (.ltd, .io, .space, .agency)
- Visual position in the hermeneutic circle
- Appears during/after navigation

```
┌─────────────────────────────────────────┐
│  ○ .ltd   ● .io   ○ .space   ○ .agency │
└─────────────────────────────────────────┘
```

### Phase 3: Cross-Property Transitions

**Approach: Exit Animation + Session Marker + Entry Animation**

1. **Exit Animation** (when clicking cross-property link):
   - Intercept clicks on external CREATE Something links
   - Play brief exit animation (fade out, slight scale)
   - Set `sessionStorage.setItem('cs-transition-from', 'io')`
   - Navigate to new property

2. **Entry Animation** (on page load):
   - Check `sessionStorage.getItem('cs-transition-from')`
   - If present, play entry animation
   - Show brief "Mode shift" indicator
   - Clear storage

**File: `packages/components/src/lib/transitions/CrossPropertyLink.svelte`**

```svelte
<script lang="ts">
  import { fade } from 'svelte/transition';

  interface Props {
    href: string;
    mode: 'ltd' | 'io' | 'space' | 'agency';
  }

  let { href, mode, children } = $props();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    sessionStorage.setItem('cs-transition-from', mode);
    sessionStorage.setItem('cs-transition-to', extractMode(href));

    // Trigger exit animation on body
    document.body.classList.add('transitioning-out');

    setTimeout(() => {
      window.location.href = href;
    }, 300);
  }
</script>

<a {href} onclick={handleClick}>
  {@render children?.()}
</a>
```

### Phase 4: Hermeneutic Breadcrumb

Show the user's path through the circle:

```
.ltd → .io → [current experiment]
Canon  Learn
```

This reveals the relationship between philosophy and practice.

## Files to Create/Modify

### New Files
1. `packages/components/src/lib/transitions/index.ts` - Export all transition utilities
2. `packages/components/src/lib/transitions/ViewTransition.ts` - onNavigate setup
3. `packages/components/src/lib/transitions/CrossPropertyLink.svelte` - Enhanced link component
4. `packages/components/src/lib/components/ModeIndicator.svelte` - Position indicator
5. `packages/components/src/lib/components/HermeneuticBreadcrumb.svelte` - Path breadcrumb

### Modified Files
1. `packages/io/src/routes/+layout.svelte` - Add transition setup + indicator
2. `packages/ltd/src/routes/+layout.svelte` - Add transition setup + indicator
3. `packages/space/src/routes/+layout.svelte` - Add transition setup + indicator
4. `packages/agency/src/routes/+layout.svelte` - Add transition setup + indicator
5. `packages/components/src/lib/components/Footer.svelte` - Use CrossPropertyLink
6. Each `app.css` - Add view transition CSS

## Mode-Specific Transition Aesthetics

| Mode | Character | Transition Feel |
|------|-----------|-----------------|
| `.ltd` | Contemplative | Slow fade (500ms), minimal movement |
| `.io` | Analytical | Structured slide, crisp edges |
| `.space` | Experimental | Playful, slight overshoot |
| `.agency` | Professional | Efficient, no-nonsense (200ms) |

## Progressive Enhancement

- View Transitions API: Chrome/Edge only (as of 2024)
- Fallback: Instant navigation with Mode indicator flash
- Respects `prefers-reduced-motion`: Skip animations, show indicators

## Success Criteria

1. **Within-property**: Page changes feel like morphing, not jumping
2. **Cross-property**: User understands they're shifting Modes of Being
3. **Hermeneutic clarity**: Path through the circle is visible
4. **Performance**: No degradation, transitions are non-blocking

## Phased Rollout

1. **Phase 1**: Within-property transitions for `.io` only (test bed)
2. **Phase 2**: Mode indicator across all properties
3. **Phase 3**: Cross-property transitions
4. **Phase 4**: Hermeneutic breadcrumb

## Open Questions

1. Should Mode indicator be in nav, footer, or floating?
2. How prominent should cross-property transitions be?
3. Should breadcrumb show full path or just origin?
