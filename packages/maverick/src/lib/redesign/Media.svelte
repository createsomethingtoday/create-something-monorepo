<script lang="ts">
  import { onMount } from 'svelte';
  let { kind, opacity = 1 }: { kind: 'home' | 'oil' | 'mining' | 'oilHero' | 'miningHero' | 'about'; opacity?: number } = $props();
  // Exact supplied reference clips, retained without transcoding for preview review.
  let animate = $state(false);
  onMount(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      animate = !preference.matches;
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  });
</script>

{#if animate}
  <video
    style:opacity
    aria-hidden="true"
    tabindex="-1"
    autoplay
    muted
    loop
    playsinline
    preload="metadata"
    poster={`/redesign/reference-${kind}.jpg`}
    src={`/redesign/reference-${kind}.mp4`}
  ></video>
{:else}
  <img style:opacity src={`/redesign/reference-${kind}.jpg`} alt="" />
{/if}

<style>
  video,
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
</style>
