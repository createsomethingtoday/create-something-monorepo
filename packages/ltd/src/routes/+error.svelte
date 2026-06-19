<script lang="ts">
  import { page } from '$app/stores';
  import { ClearErrorPage } from '@create-something/canon';
</script>

<svelte:head>
  <title>{$page.status} | CREATE SOMETHING.ltd</title>
</svelte:head>

<ClearErrorPage
  status={$page.status}
  propertyLabel=".ltd"
  errorMessage={$page.error?.message}
  primaryLabel="Read the canon"
  primaryHref="/canon"
  secondaryLabel="Return home"
  secondaryHref="/"
/>
