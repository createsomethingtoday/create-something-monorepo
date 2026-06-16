<script lang="ts">
  import { page } from '$app/stores';
  import { ClearErrorPage } from '@create-something/canon';
</script>

<svelte:head>
  <title>{$page.status} | CREATE SOMETHING.agency</title>
</svelte:head>

<ClearErrorPage
  status={$page.status}
  propertyLabel=".agency"
  errorMessage={$page.error?.message}
  primaryLabel="Map Your Workflow"
  primaryHref="/book"
  secondaryLabel="Return home"
  secondaryHref="/"
/>
