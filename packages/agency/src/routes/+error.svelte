<script lang="ts">
  import { page } from '$app/stores';
  import { PerformanceErrorPage } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<svelte:head>
  <title>{$page.status} | CREATE SOMETHING.agency</title>
</svelte:head>

<PerformanceErrorPage
  status={$page.status}
  propertyLabel=".agency"
  errorMessage={$page.error?.message}
  primaryLabel={agencyCoreMessaging.selfMapLabel}
  primaryHref={agencyCoreMessaging.selfMapHref}
  secondaryLabel="Return home"
  secondaryHref="/"
/>
