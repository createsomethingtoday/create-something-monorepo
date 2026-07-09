<script lang="ts">
  import { page } from '$app/stores';
  import { PerformanceErrorPage } from '@create-something/canon';
</script>

<svelte:head>
  <title>{$page.status} | CREATE SOMETHING.space</title>
</svelte:head>

<PerformanceErrorPage
  status={$page.status}
  propertyLabel=".space"
  errorMessage={$page.error?.message}
  primaryLabel="Open the playground"
  primaryHref="/playground"
  secondaryLabel="Return home"
  secondaryHref="/"
/>
