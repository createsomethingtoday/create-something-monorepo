<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { page } from '$app/stores';
  import { PerformanceCampaignOpening } from '@create-something/canon';
  import { getAgencyHeroTreatment } from '$lib/data/agencyHeroTreatment';
  import { usesAgentReadinessStudyCopy } from '$lib/data/agentReadinessStudyVariants';
  import AgencyHeroFrame from './AgencyHeroFrame.svelte';
  import { agencyWelcomeScene } from '$lib/data/canonAgencyScenes';
  import { usesAgencyMeasuredPublicSurface } from '$lib/data/publicSurfacePolicy';
  import { getAgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  let props: ComponentProps<typeof PerformanceCampaignOpening> = $props();
  const treatment = $derived(getAgencyHeroTreatment($page.url.pathname) as {title?:string;lede?:string}|undefined);
  const useBaseline = $derived(!usesAgentReadinessStudyCopy($page.url.pathname,$page.url.searchParams.get('study')));
  const scene = $derived(props.background ?? (getAgencyPageFoundation($page.url.pathname) && usesAgencyMeasuredPublicSurface($page.url.pathname) && !props.artifactOwnsMedia ? agencyWelcomeScene : undefined));
</script>

{#if $page.url.searchParams.has('study')}
  <PerformanceCampaignOpening {...props} />
{:else}
<AgencyHeroFrame after={props.artifact} scene={scene} sceneInChild={true} showPlate={!props.artifactOwnsMedia}>
  <PerformanceCampaignOpening {...props} background={scene} artifact={undefined} title={useBaseline ? treatment?.title ?? props.title : props.title} lede={useBaseline ? treatment?.lede ?? props.lede : props.lede} />
</AgencyHeroFrame>
{/if}
