<script lang="ts">
  import TactileStudy from './TactileStudy.svelte';
  /** Static decoration at 96px only. Smaller identity uses text. */
  let { size = 96 }: { size?: 24 | 32 | 48 | 64 | 96 } = $props();
</script>
{#if size === 96}<TactileStudy size={96} revision="r42" />{:else}<span>Canon</span>{/if}
<style>span { font:inherit; }</style>
