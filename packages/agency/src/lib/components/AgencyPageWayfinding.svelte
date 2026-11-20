<script lang="ts">
  import AgencyChapterDial from './AgencyChapterDial.svelte';
  import type { AgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  let { foundation }: { foundation: AgencyPageFoundation } = $props();
</script>
<div class="agency-page-wayfinding" data-page-wayfinding>
  <AgencyChapterDial chapters={foundation.chapters} context={foundation.label} purpose="Find your next useful step." scope="page" />
</div>
