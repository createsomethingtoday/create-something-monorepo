<!--
  Card

  Canonical card component with Canon tokens.
  Provides consistent elevation and interaction patterns.

  @usage
  <Card>
    <h3>Card Title</h3>
    <p>Card content</p>
  </Card>

  <Card interactive href="/services">
    <h3>Clickable Card</h3>
  </Card>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    variant?: 'default' | 'elevated' | 'outlined';
    interactive?: boolean;
    href?: string;
    class?: string;
  }

  let {
    children,
    variant = 'default',
    interactive = false,
    href,
    class: className = ''
  }: Props = $props();

  const tag = href ? 'a' : 'div';
</script>

<svelte:element
  this={tag}
  {href}
  class="card card--{variant} {className}"
  class:card--interactive={interactive || href}
>
  {@render children()}
</svelte:element>

<style>
  .card {
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    transition: all var(--duration-standard) var(--ease-standard);
  }

  /* Variant: default */
  .card--default {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
  }

  /* Variant: elevated */
  .card--elevated {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    box-shadow: var(--shadow-md);
  }

  /* Variant: outlined */
  .card--outlined {
    background: transparent;
    border: 1px solid var(--color-border-emphasis);
  }

  /* Interactive states */
  .card--interactive {
    cursor: pointer;
  }

  .card--interactive:hover {
    transform: translateY(-4px);
    border-color: var(--color-border-emphasis);
    box-shadow: var(--shadow-lg);
  }

  .card--interactive:active {
    transform: translateY(-2px);
    transition-duration: var(--duration-micro);
  }

  /* Link reset */
  a.card {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .card--interactive:hover,
    .card--interactive:active {
      transform: none;
    }
  }
</style>
