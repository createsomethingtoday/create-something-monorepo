<script lang="ts">
  import Library from '../../library/+page.svelte';
  let { data } = $props();
</script>

{#if data.network?.kind !== 'support'}<div class="network-subnav">
    <a href={`/n/${data.network?.slug}/assets`}>Composable assets</a><a
      href={`/n/${data.network?.slug}/field-notes`}>Field notes</a
    >
  </div>{/if}
<Library {data} />
