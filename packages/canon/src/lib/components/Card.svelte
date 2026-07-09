<script lang="ts">
  /**
   * Card Component
   *
   * Standardized card with variants following CREATE SOMETHING standards.
   * Uses canonical CSS custom properties for all design tokens.
   */

  type CardVariant = 'standard' | 'elevated' | 'outlined' | 'glass';
  type CardRadius = 'sm' | 'md' | 'lg' | 'xl';
  type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

  interface Props {
    variant?: CardVariant;
    radius?: CardRadius;
    padding?: CardPadding;
    hover?: boolean;
    href?: string;
    class?: string;
    children?: import('svelte').Snippet;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    variant = 'standard',
    radius = 'lg',
    padding = 'lg',
    hover = false,
    href,
    class: className = '',
    children,
    onclick
  }: Props = $props();

  // Padding map using layout utilities (acceptable per CSS Architecture standard)
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12'
  };

  const baseClasses = $derived(
    `card card-${variant} card-radius-${radius} ${hover ? 'card-hover' : ''} ${paddingMap[padding]} ${className}`
  );
</script>

{#if href}
  <a {href} class={baseClasses} {onclick}>
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else if onclick}
  <button type="button" class={baseClasses} {onclick}>
    {#if children}
      {@render children()}
    {/if}
  </button>
{:else}
  <div class={baseClasses}>
    {#if children}
      {@render children()}
    {/if}
  </div>
{/if}

<style>
  /* Base Card */
  .card {
    background: var(--color-performance-panel, #ffffff);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909);
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      background var(--duration-standard) var(--ease-standard);
  }

  /* Variants */
  .card-elevated {
    box-shadow: none;
  }

  .card-outlined {
    background: transparent;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
  }

  /* Backward-compatible alias: render old glass cards as Performance Lab clear panels. */
  .card-glass {
    background: var(--color-performance-panel, #ffffff);
    border: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .card-glass.card-hover:hover {
    background: var(--color-performance-paper, #f3f3f0);
    border-color: var(--color-performance-line-strong, #9c9c96);
  }

  /* Radius variants */
  .card-radius-sm {
    border-radius: var(--radius-sm);
  }

  .card-radius-md {
    border-radius: var(--radius-md);
  }

  .card-radius-lg {
    border-radius: var(--radius-lg);
  }

  .card-radius-xl {
    border-radius: var(--radius-xl);
  }

  /* Hover effect - Scale + Border Progression (Pattern 1) */
  .card-hover {
    cursor: pointer;
  }

  .card-hover:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .card-hover:active {
    transform: scale(0.995);
  }

  /* Focus states for accessibility */
  a.card:focus-visible,
  button.card:focus-visible,
  div.card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  /* Reset button styles when used as card */
  button {
    border: none;
    background: none;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
    width: 100%;
  }
</style>
