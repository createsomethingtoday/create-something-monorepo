<script lang="ts">
  import { page } from '$app/stores';
  import { ClearErrorPage } from '@create-something/canon';
</script>

<svelte:head>
  <title>{$page.status} | CREATE SOMETHING.io</title>
</svelte:head>

<ClearErrorPage
  status={$page.status}
  propertyLabel=".io"
  errorMessage={$page.error?.message}
  primaryLabel="Read the papers"
  primaryHref="/papers"
  secondaryLabel="Return home"
  secondaryHref="/"
/>
