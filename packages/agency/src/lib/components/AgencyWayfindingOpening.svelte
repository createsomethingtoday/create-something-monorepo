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
      ) {
      width: 90%;
      padding-top: 8.5rem;
    }

    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial']
          .performance-campaign-opening__content
          header
      ) {
      width: 49%;
      max-width: none;
    }

    .agency-wayfinding-opening
      :global(
        .performance-campaign-opening[data-expression='editorial']
          .performance-campaign-opening__artifact
      ) {
      inset: 8.5rem 5% auto auto;
      width: 44%;
      min-height: 0;
      height: auto;
      background: transparent;
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
      width: min(90%, 46rem);
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
      width: min(90%, 46rem);
      margin: 0 auto 1rem;
    }
  }
</style>
