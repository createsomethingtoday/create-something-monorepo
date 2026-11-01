<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  let { foundation }: { foundation: { id: string; title: string } } = $props();
</script>

<aside class="notice">
  <p class="eyebrow">START HERE / CREATE SOMETHING FOUNDATION</p>
  <h2>{foundation.title}</h2>
  <p>
    Start with how we work with agents, then explore the library. Included with member access at no
    extra charge.
  </p>
  <a class="button" href={`/paths/${foundation.id}`}
    >Start the foundation <Icon name="arrow-right" /></a
  >
</aside>
