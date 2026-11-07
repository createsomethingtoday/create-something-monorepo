<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { page } from '$app/stores';
  import { PerformanceCampaignOpening } from '@create-something/canon';
  import { getAgencyHeroTreatment } from '$lib/data/agencyHeroTreatment';
  import { usesAgentReadinessStudyCopy } from '$lib/data/agentReadinessStudyVariants';
  import AgencyHeroFrame from './AgencyHeroFrame.svelte';
  let props: ComponentProps<typeof PerformanceCampaignOpening> = $props();
  const treatment = $derived(getAgencyHeroTreatment($page.url.pathname) as {title?:string;lede?:string}|undefined);
  const useBaseline = $derived(!usesAgentReadinessStudyCopy($page.url.pathname,$page.url.searchParams.get('study')));
</script>

{#if $page.url.searchParams.has('study')}
  <PerformanceCampaignOpening {...props} />
{:else}
<AgencyHeroFrame after={props.artifact}>
  <PerformanceCampaignOpening {...props} artifact={undefined} title={useBaseline ? treatment?.title ?? props.title : props.title} lede={useBaseline ? treatment?.lede ?? props.lede : props.lede} />
</AgencyHeroFrame>
{/if}
