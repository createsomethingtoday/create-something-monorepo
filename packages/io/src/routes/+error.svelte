<script lang="ts">
  import { page } from '$app/stores';
  import { PerformanceErrorPage } from '@create-something/canon';
</script>

<svelte:head>
  <title>{$page.status} | CREATE SOMETHING.io</title>
</svelte:head>

<PerformanceErrorPage
  status={$page.status}
  propertyLabel=".io"
  errorMessage={$page.error?.message}
  primaryLabel="Read the papers"
  primaryHref="/papers"
  secondaryLabel="Return home"
  secondaryHref="/"
/>
