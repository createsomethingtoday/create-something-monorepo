<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    fallback: string;
  }

  let { children, fallback }: Props = $props();
  let enhanced = $state(false);

  onMount(() => {
    enhanced = true;
  });
</script>

{#if enhanced}
  {@render children()}
{:else}
  <section class="fallback" aria-label="Interactive experiment unavailable">
    <p><strong>This demonstration needs JavaScript.</strong></p>
    <p>{fallback}</p>
  </section>
{/if}

<style>
  .fallback {
    max-width: 52rem;
    margin: 2rem auto;
    padding: 1.25rem;
    border: 1px solid var(--color-performance-border-subtle, currentColor);
  }
  .fallback p {
    margin: 0;
    line-height: 1.55;
  }
  .fallback p + p {
    margin-top: 0.5rem;
    opacity: 0.75;
  }
</style>
