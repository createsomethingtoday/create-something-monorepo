<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="agency-wayfinding-opening">
  {@render children()}
</div>

<style>
  .agency-wayfinding-opening
    :global(.performance-campaign-opening[data-expression='editorial']::before) {
    background: none;
  }

  @media (min-width: 64rem) {
    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial']
          .performance-campaign-opening__content
          header
      ) {
      width: min(42%, 37rem);
      max-width: 37rem;
    }
  }

  @media (max-width: 63.99rem) {
    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial'][data-artifact-mobile-placement='flow']
      ) {
      display: grid;
      grid-template-rows: auto auto auto;
      min-height: 0;
    }

    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial'][data-artifact-mobile-placement='flow']
          .performance-campaign-opening__content
      ) {
      display: contents;
    }

    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial'][data-artifact-mobile-placement='flow']
          .performance-campaign-opening__content
          header
      ) {
      position: relative;
      z-index: 2;
      grid-row: 1;
      width: min(calc(100% - 1.5rem), 46rem);
      max-width: 46rem;
      margin-inline: auto;
      padding-block: 6.5rem 2rem;
    }

    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial'][data-artifact-mobile-placement='flow']
          .performance-campaign-opening__artifact
      ) {
      position: relative;
      inset: auto;
      grid-row: 2;
      width: 100%;
      min-height: 0;
    }

    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial'][data-artifact-mobile-placement='flow']
          .performance-campaign-opening__proof
      ) {
      position: relative;
      z-index: 2;
      grid-row: 3;
      width: min(calc(100% - 1.5rem), 46rem);
      margin: 0 auto 1rem;
    }
  }
</style>
