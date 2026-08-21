<script lang="ts">
  import HighIntentSearchLanding from '$lib/components/HighIntentSearchLanding.svelte';
  import { getHighIntentSearchLanding } from '$lib/data/highIntentSearch';

  const landing = getHighIntentSearchLanding('workflow-control');
</script>

<!-- search-policy: noindex; HighIntentSearchLanding owns the rendered SEO metadata. -->
<HighIntentSearchLanding {landing} />
