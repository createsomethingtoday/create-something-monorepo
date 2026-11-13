<script lang="ts">
  import type { Writable } from 'svelte/store';
  import SEO from '../../src/lib/components/SEO.svelte';
  export let values: Writable<Record<string, any>>;
</script>
<SEO title="" description="" {...$values} />
