# Trace Connections

## Objective

Map how a component connects to and serves the larger system.

## Context

You're analyzing a `Navigation` component to understand its role in the system. This exercise applies Heidegger's third level: "Does this serve the whole?"

## Target Component

```svelte
<!-- Navigation.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ModeIndicator from './ModeIndicator.svelte';
  import Logo from './Logo.svelte';

  interface Props {
    logo?: string;
    logoSuffix?: string;
    links?: Array<{ label: string; href: string }>;
    showModeIndicator?: boolean;
    mode?: string;
  }

  let {
    logo = 'CREATE SOMETHING',
    logoSuffix,
    links = [],
    showModeIndicator = true,
    mode = 'create'
  }: Props = $props();

  let mobileMenuOpen = $state(false);

  const currentPath = $derived($page.url.pathname);
</script>

<nav class="navigation">
  <Logo {logo} suffix={logoSuffix} />

  <div class="nav-links">
    {#each links as link}
      <a
        href={link.href}
        class:active={currentPath === link.href}
      >
        {link.label}
      </a>
    {/each}
  </div>

  {#if showModeIndicator}
    <ModeIndicator currentMode={mode} />
  {/if}

  <button class="mobile-toggle" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
    ☰
  </button>
</nav>
```

## Task

Complete the connection analysis:

### 1. Dependencies (What This Component Needs)

List everything the Navigation component depends on:

| Dependency | Type | Source | Purpose |
|------------|------|--------|---------|
| `$page` | Store | SvelteKit | ? |
| `goto` | Function | SvelteKit | ? |
| `ModeIndicator` | Component | Internal | ? |
| `Logo` | Component | Internal | ? |

**Questions to answer:**
- What happens if `$page` is unavailable?
- Is the `goto` import used? Should it be removed?
- Are the child components tightly or loosely coupled?

### 2. Dependents (What Needs This Component)

Identify where Navigation is used:

| Consumer | Property | How It's Configured |
|----------|----------|---------------------|
| `+layout.svelte` | space | ? |
| `+layout.svelte` | io | ? |
| `+layout.svelte` | agency | ? |
| `+layout.svelte` | ltd | ? |
| `+layout.svelte` | lms | ? |

**Questions to answer:**
- Do all consumers use the same props?
- Are there any one-off configurations that suggest misuse?
- Is the component flexible enough for all contexts?

### 3. Data Flow

Trace data through the component:

```
┌─────────────────────────────────────────────────────────────┐
│                        Data Flow                            │
└─────────────────────────────────────────────────────────────┘

Props In:
  logo ─────────────→ [Navigation] ─────→ Logo
  logoSuffix ───────→ [Navigation] ─────→ Logo
  links ────────────→ [Navigation] ─────→ rendered <a> tags
  showModeIndicator → [Navigation] ─────→ conditional render
  mode ─────────────→ [Navigation] ─────→ ModeIndicator

State:
  mobileMenuOpen ───→ local toggle

Derived:
  $page.url.pathname → currentPath ───→ active link styling

Output:
  onclick handlers ──→ navigation events ──→ route changes
  mode changes ──────→ cross-property navigation
```

**Questions to answer:**
- Is all data flowing in the right direction?
- Are there any circular dependencies?
- Could any props be derived instead of passed?

### 4. System Coherence Evaluation

Rate each aspect of system integration:

| Aspect | Score (1-5) | Notes |
|--------|-------------|-------|
| **Consistency**: Does it match other component APIs? | | |
| **Reusability**: Can it be used without modification? | | |
| **Clarity**: Can a new developer understand it quickly? | | |
| **Isolation**: Does it encapsulate its concerns? | | |
| **Integration**: Does it work well with layout system? | | |

### 5. Hermeneutic Analysis

The hermeneutic circle: you can't understand the part without the whole, but you can't understand the whole without the parts.

**From Part to Whole:**
- What does Navigation reveal about the overall design system?
- What patterns does it establish that other components follow?
- How does it embody (or violate) Canon principles?

**From Whole to Part:**
- Given the multi-property architecture, is Navigation well-designed?
- Does it support the "Modes of Being" concept adequately?
- What would need to change if a new property were added?

## Deliverable

Complete the System Connection Map:

```
                    ┌─────────────────┐
                    │  Router/Layout  │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │   Logo   │     │Navigation│     │   Mode   │
     │          │◄────│          │────►│Indicator │
     └──────────┘     └────┬─────┘     └──────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  Links   │  │  Mobile  │
              │          │  │  Menu    │
              └──────────┘  └──────────┘
```

**Your annotations:**
- Circle any connections that seem fragile
- Mark with ✓ any connections that are well-designed
- Mark with ✗ any connections that violate principles

## Success Criteria

- [ ] All dependencies identified and categorized
- [ ] All dependents (consumers) mapped
- [ ] Data flow diagram completed
- [ ] System coherence rated with justification
- [ ] Hermeneutic analysis connects part to whole
- [ ] At least 2 improvement recommendations provided

## Reflection

After completing this exercise:
1. Did the component serve the whole well, or is it isolated?
2. What would break if this component changed significantly?
3. How would you refactor it to better serve the system?

**A component's value is not in isolation—it's in how it serves the whole.**
