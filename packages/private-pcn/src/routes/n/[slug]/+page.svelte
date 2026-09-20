<script lang="ts">
  import Library from '../../library/+page.svelte';
  let { data } = $props();
</script>

<Library {data} />
