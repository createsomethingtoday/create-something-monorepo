<!--
  Button

  Canonical button component following Canon design principles.
  Motion confirms user action (functional, not decorative).

  @usage
  <Button>Primary Action</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="ghost" href="/about">Link Button</Button>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    class?: string;
    onclick?: () => void;
  }

  let {
    children,
    variant = 'primary',
    size = 'md',
    href,
    type = 'button',
    disabled = false,
    class: className = '',
    onclick
  }: Props = $props();

  const tag = href ? 'a' : 'button';
</script>

<svelte:element
  this={tag}
  {href}
  {type}
  {disabled}
  class="btn btn--{variant} btn--{size} {className}"
  {onclick}
>
  {@render children()}
</svelte:element>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    font-weight: var(--font-semibold);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-fast) var(--ease-standard);
    text-decoration: none;
    white-space: nowrap;
  }

  /* Size variants */
  .btn--sm {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--text-body-sm);
    min-height: 36px;
  }

  .btn--md {
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-body);
    min-height: 44px;
  }

  .btn--lg {
    padding: var(--space-sm) var(--space-xl);
    font-size: var(--text-body-lg);
    min-height: 52px;
  }

  /* Variant: primary */
  .btn--primary {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
  }

  .btn--primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-glow-md);
  }

  .btn--primary:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
    transition-duration: var(--duration-instant);
  }

  /* Variant: secondary */
  .btn--secondary {
    background: transparent;
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-emphasis);
  }

  .btn--secondary:hover:not(:disabled) {
    background: var(--color-hover);
    border-color: var(--color-border-strong);
  }

  .btn--secondary:active:not(:disabled) {
    background: var(--color-active);
    transition-duration: var(--duration-instant);
  }

  /* Variant: ghost */
  .btn--ghost {
    background: transparent;
    color: var(--color-fg-secondary);
    border: none;
  }

  .btn--ghost:hover:not(:disabled) {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }

  .btn--ghost:active:not(:disabled) {
    background: var(--color-active);
    transition-duration: var(--duration-instant);
  }

  /* Disabled state */
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .btn:hover,
    .btn:active {
      transform: none;
    }
  }
</style>
