<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  let { foundation }: { foundation: { id: string; title: string } } = $props();
</script>

<aside class="notice">
  <p class="eyebrow">Start here / Create Something foundation</p>
  <h2>{foundation.title}</h2>
  <p>
    Start with how we work with agents, then explore the library. Included with member access at no
    extra charge.
  </p>
  <a class="button" href={`/paths/${foundation.id}`}
    >Start the foundation <Icon name="arrow-right" /></a
  >
</aside>

<style>
  aside {
    background: var(--enlightr-code);
    border: 0;
    color: #111;
    padding: clamp(24px, 4vw, 48px);
  }
  h2 {
    font-family: var(--font-serif);
    font-size: clamp(30px, 4vw, 48px);
    font-weight: 400;
  }
  aside p {
    color: #111;
    max-width: 65ch;
  }
</style>
