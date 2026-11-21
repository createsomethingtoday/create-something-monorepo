<script lang="ts">
  import { onMount } from 'svelte';
  import ArchiveNewsletterSignup from '$lib/components/ArchiveNewsletterSignup.svelte';
  let { data } = $props();
  let container: HTMLDivElement;
  let ready = $state(false);
  onMount(() => {
    ready = true;
    if (window.parent === window) return;
    let lastHeight = 0;
    const resize = () => {
      const height = Math.ceil(container.getBoundingClientRect().height);
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: 'newsletter-signup-height', height }, window.location.origin);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="/styles/newsletters-v1.css" />
  <title>Subscribe to CREATE SOMETHING field notes</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>
<div class="newsletter-editorial" bind:this={container}>
  <fieldset disabled={!ready}>
    <ArchiveNewsletterSignup turnstileSiteKey={data.turnstileSiteKey} />
  </fieldset>
  <noscript>Enable JavaScript to verify your email and subscribe.</noscript>
</div>

<style>
  fieldset { min-width: 0; padding: 0; border: 0; margin: 0; }
  :global(html), :global(body) { margin: 0; min-height: 0; }
</style>
