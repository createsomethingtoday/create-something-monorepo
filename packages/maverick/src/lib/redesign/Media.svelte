<script lang="ts">
  import { onMount } from 'svelte';
  let { kind, opacity = 1 }: { kind: 'home' | 'oil' | 'mining'; opacity?: number } = $props();
  // Reuse media already serving the production site, never the watermarked prototype clips.
  const sources = {
    home: '089014528-smokestack-and-american-flag-o.mp4',
    oil: '082466515-oil-rig-pumpjack-working-natur.mp4',
    mining: '168384056-deep-open-pit-mine-copper-ore-.mp4'
  };
  const posters = {
    home: '/redesign/hero-home.jpg',
    oil: '/redesign/hero-oil.jpg',
    mining: '/redesign/hero-mining.jpg'
  };
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
    poster={posters[kind]}
    src={`https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/${sources[kind]}`}
  ></video>
{:else}
  <img style:opacity src={posters[kind]} alt="" />
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
