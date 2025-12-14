# Animation with Restraint

## The Principle

**Motion that reveals, not distracts.**

Animation in interfaces serves one purpose: to help users understand what's happening. When motion becomes decorative, it fails its function.

## The Heidegger Test

Heidegger distinguished between:
- **Zuhandenheit** (ready-to-hand): Tools that disappear into use
- **Vorhandenheit** (present-at-hand): Tools that demand attention

Animation passes the Heidegger test when users don't notice it. They notice the state change, the connection, the flow—not the animation itself.

**If users comment on your animations, they're too prominent.**

## Functional Animation

Animation should answer questions:

| Question | Animation |
|----------|-----------|
| "Where did that come from?" | Origin/destination motion |
| "What changed?" | Highlight transition |
| "Is this connected?" | Relationship indication |
| "Did my action work?" | Confirmation feedback |

### Origin/Destination

When elements appear, show where they came from:

```svelte
<script>
  import { fly } from 'svelte/transition';

  let showModal = $state(false);
</script>

<button onclick={() => showModal = true}>
  Open Settings
</button>

{#if showModal}
  <div
    class="modal"
    transition:fly={{ y: 20, duration: 200 }}
  >
    <!-- Modal content -->
  </div>
{/if}
```

The modal flies up from where the button is. Users understand the connection.

### State Change

When data changes, don't just swap—transition:

```svelte
<script>
  import { fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';

  let items = $state([...]);
</script>

<ul>
  {#each items as item (item.id)}
    <li
      animate:flip={{ duration: 200 }}
      transition:fade={{ duration: 150 }}
    >
      {item.name}
    </li>
  {/each}
</ul>
```

When items reorder, `flip` shows them moving. When items appear/disappear, `fade` smooths the transition.

### Action Confirmation

When users act, confirm immediately:

```svelte
<script>
  let saved = $state(false);

  async function save() {
    await saveData();
    saved = true;
    setTimeout(() => saved = false, 2000);
  }
</script>

<button onclick={save} class:saved>
  {saved ? 'Saved!' : 'Save'}
</button>

<style>
  button {
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .saved {
    background: var(--color-success);
  }
</style>
```

## Canon Animation Tokens

Use consistent timing:

```css
:root {
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --duration-micro: 200ms;    /* Hovers, small state changes */
  --duration-standard: 300ms; /* Page transitions, modals */
  --duration-complex: 500ms;  /* Multi-step animations */
}
```

### Micro (200ms)

For immediate feedback:
- Hover states
- Button presses
- Toggle switches
- Small state indicators

```svelte
<style>
  .button {
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .button:hover {
    background: var(--color-hover);
  }
</style>
```

### Standard (300ms)

For state changes:
- Modal open/close
- Drawer slide
- Page transitions
- List reordering

```svelte
<script>
  import { slide } from 'svelte/transition';
</script>

{#if expanded}
  <div transition:slide={{ duration: 300 }}>
    <!-- Expandable content -->
  </div>
{/if}
```

### Complex (500ms)

For multi-step or dramatic changes:
- Onboarding flows
- Data visualizations
- Route transitions with multiple elements

Use rarely. Most interactions should feel instant.

## View Transitions API

SvelteKit integrates with the View Transitions API for page navigation:

```svelte
<!-- +layout.svelte -->
<script>
  import { onNavigate } from '$app/navigation';

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>
```

```css
/* app.css */
:root {
  --view-transition-duration: 300ms;
}

::view-transition-old(root) {
  animation: fade-out var(--view-transition-duration) var(--ease-standard);
}

::view-transition-new(root) {
  animation: fade-in var(--view-transition-duration) var(--ease-standard);
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Page navigation becomes smooth without JavaScript overhead.**

## Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

In Svelte transitions:

```svelte
<script>
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';

  const prefersReducedMotion = browser &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 200 };
</script>

<div transition:fade={transition}>
  Content
</div>
```

**Animation is enhancement, not requirement.**

## Anti-Patterns

### Decorative Motion

```svelte
<!-- Bad: Animation for its own sake -->
<div class="card"
  in:fly={{ y: 50, duration: 600, delay: index * 100 }}
  animate:float
>
  <div class="shimmer"></div>
  <h2 class="pulse">{title}</h2>
</div>
```

Every element animating creates visual noise. The content is buried under effects.

### Slow Feedback

```svelte
<!-- Bad: Slow hover transitions -->
<style>
  .button {
    transition: all 500ms ease;
  }
</style>
```

500ms for a hover feels sluggish. Users expect immediate response.

### Motion Blocking Interaction

```svelte
<!-- Bad: Long animation delays interaction -->
<script>
  let canInteract = $state(false);

  onMount(() => {
    setTimeout(() => canInteract = true, 2000);
  });
</script>

<button disabled={!canInteract}>
  {canInteract ? 'Ready' : 'Loading...'}
</button>
```

Don't make users wait for animations to complete.

### Inconsistent Timing

```svelte
<!-- Bad: Different durations everywhere -->
<style>
  .modal { transition: all 400ms; }
  .button { transition: all 150ms; }
  .card { transition: all 300ms; }
  .nav { transition: all 250ms; }
</style>
```

Inconsistent timing feels chaotic. Use tokens.

## The Restraint Checklist

Before adding animation, ask:

1. **Does this help users understand?** If not, skip it.
2. **Is it fast enough to feel instant?** Hover = 200ms max.
3. **Does it respect reduced motion?** Test with preference on.
4. **Will users notice the animation itself?** Bad sign.
5. **Does it use Canon tokens?** Consistency matters.

## Loading States

The one place animation is expected:

```svelte
<script>
  let loading = $state(true);
</script>

{#if loading}
  <div class="skeleton" aria-busy="true">
    <div class="skeleton-line"></div>
    <div class="skeleton-line short"></div>
  </div>
{:else}
  <div in:fade={{ duration: 150 }}>
    <!-- Actual content -->
  </div>
{/if}

<style>
  .skeleton-line {
    background: linear-gradient(
      90deg,
      var(--color-bg-subtle) 0%,
      var(--color-bg-surface) 50%,
      var(--color-bg-subtle) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    height: 1rem;
    border-radius: var(--radius-sm);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
```

Skeleton loading is acceptable because it:
- Indicates something is happening
- Shows approximate content shape
- Feels faster than spinners

## Summary

Animation should be:

- **Functional** → Answers user questions
- **Fast** → 200-300ms for most transitions
- **Consistent** → Uses Canon timing tokens
- **Invisible** → Users notice the state, not the motion
- **Optional** → Works without motion for accessibility

**The best animation is the one you don't notice.**

---

## Reflection

Before the praxis:

1. Find an animation in your project. Does it help users understand, or is it decorative?
2. Time your hover transitions. Are they under 200ms?
3. Test your site with `prefers-reduced-motion: reduce`. Does it still work?

**Praxis**: You'll audit a page for animation restraint and refactor any violations.

---

## Cross-Property References

> **Canon Reference**: Motion restraint is a direct application of [Iterative Reduction](https://createsomething.ltd/patterns/iterative-reduction)—removing animation until only functional motion remains.
>
> **Practice**: Use the [Motion Analysis skill](/.claude/skills/motion-analysis.md) to extract and audit animations from any URL.
>
> **Research Depth**: Study the [Motion Ontology experiment](https://createsomething.space/experiments/motion-ontology) for a phenomenological analysis of animation types.
