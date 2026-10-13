<script lang="ts">
  import { onMount } from 'svelte';
  import { motionEnabled } from './motion';
  let {
    kind,
    opacity = 1
  }: { kind: 'home' | 'oil' | 'mining' | 'oilHero' | 'miningHero' | 'about'; opacity?: number } =
    $props();
  let shell: HTMLDivElement;
  let video: HTMLVideoElement | undefined = $state();
  let visible = $state(false);
  let pageVisible = $state(true);
  let loaded = $state(false);
  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: '80px' }
    );
    observer.observe(shell);
    const update = () => {
      pageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  });
  $effect(() => {
    if ($motionEnabled && visible) loaded = true;
  });
  $effect(() => {
    const play = $motionEnabled && visible && pageVisible;
    if (video) {
      if (play) void video.play().catch(() => {});
      else video.pause();
    }
  });
</script>

<div class="media-shell" bind:this={shell} style:opacity>
  <img src={`/redesign/reference-${kind}.jpg`} alt="" />
  {#if loaded}<video
      bind:this={video}
      aria-hidden="true"
      tabindex="-1"
      muted
      loop
      playsinline
      preload="metadata"
      poster={`/redesign/reference-${kind}.jpg`}
      src={`/redesign/reference-${kind}.mp4`}
    ></video>{/if}
</div>

<style>
  .media-shell,
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
