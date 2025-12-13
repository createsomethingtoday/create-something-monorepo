# Complete Triad Audit

## Objective

Apply all three levels of the Subtractive Triad to audit a real component.

## Context

You're reviewing a "feature card" component used across a marketing site. Apply each level of the Subtractive Triad systematically.

## Target Code

```svelte
<script lang="ts">
  interface Props {
    title: string;
    description: string;
    icon: string;
    color: string;
    badge?: string;
    showArrow?: boolean;
    premium?: boolean;
    new?: boolean;
    popular?: boolean;
    href?: string;
    onClick?: () => void;
    animateOnHover?: boolean;
    showShadow?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'filled' | 'gradient';
  }

  let {
    title,
    description,
    icon,
    color,
    badge,
    showArrow = true,
    premium = false,
    new: isNew = false,
    popular = false,
    href,
    onClick,
    animateOnHover = true,
    showShadow = true,
    size = 'md',
    variant = 'default'
  }: Props = $props();
</script>

<div
  class="feature-card {variant} {size}"
  class:has-shadow={showShadow}
  class:animate-hover={animateOnHover}
  class:premium
  style="--accent-color: {color}"
>
  {#if isNew}
    <span class="badge new">NEW</span>
  {/if}
  {#if popular}
    <span class="badge popular">POPULAR</span>
  {/if}
  {#if premium}
    <span class="badge premium">PREMIUM</span>
  {/if}
  {#if badge}
    <span class="badge custom">{badge}</span>
  {/if}

  <div class="icon-container">
    <span class="icon">{icon}</span>
  </div>

  <h3 class="title">{title}</h3>
  <p class="description">{description}</p>

  {#if href}
    <a {href} class="link">
      Learn more
      {#if showArrow}
        <span class="arrow">→</span>
      {/if}
    </a>
  {:else if onClick}
    <button {onclick} class="button">
      Learn more
      {#if showArrow}
        <span class="arrow">→</span>
      {/if}
    </button>
  {/if}
</div>

<style>
  .feature-card {
    padding: 24px;
    border-radius: 12px;
    background: white;
    border: 1px solid #e5e7eb;
    transition: all 0.3s ease;
  }

  .feature-card.animate-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }

  .feature-card.has-shadow {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  /* ... 150 more lines of variant styles ... */
</style>
```

## Task

Apply each level of the Subtractive Triad:

### Level 1: DRY (Implementation)

**Question**: "Have I built this before?"

Analyze the component for duplication:
- Are there repeated patterns in the conditionals?
- Is there duplication in the badge rendering?
- Could any logic be extracted into utilities?

### Level 2: Rams (Artifact)

**Question**: "Does this earn its existence?"

Evaluate each prop and feature:
- `showArrow` — Is a toggle for an arrow necessary?
- `animateOnHover` — Should this be a prop or a CSS default?
- `showShadow` — Same question
- Four badge types — Are all needed?
- Four variants — Are they all used?
- Three sizes — Where are they applied?

### Level 3: Heidegger (System)

**Question**: "Does this serve the whole?"

Consider the component in context:
- How does this component relate to other cards in the system?
- Does the API align with other component APIs?
- Would a developer understand this component quickly?
- Does it create visual coherence across pages?

## Deliverable

Complete the audit form below:

### DRY Findings

1. **Duplication identified**:
   -
   -

2. **Proposed unification**:
   -

### Rams Findings

1. **Props that don't earn existence** (with reasoning):
   -
   -
   -

2. **Features to remove**:
   -

3. **Simplified API**:
   ```typescript
   interface Props {
     // Your reduced prop list
   }
   ```

### Heidegger Findings

1. **System coherence issues**:
   -

2. **Recommendations for integration**:
   -

### Final Verdict

**Keep / Refactor / Replace** (circle one)

Reasoning:


## Success Criteria

- [ ] Identified at least 2 DRY violations
- [ ] Removed at least 5 props that don't earn existence
- [ ] Provided system-level context for the component
- [ ] Produced actionable recommendations
