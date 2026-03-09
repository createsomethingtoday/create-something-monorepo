<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLHeadingElement> {
    children?: Snippet;
  }

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<h3 class="card-title {className}" {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</h3>

<style>
  .card-title {
    font-family: var(--font-heading);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    letter-spacing: 0.02em;
    color: var(--color-fg-primary);
    line-height: 1.15;
    margin: 0;
  }
</style>
