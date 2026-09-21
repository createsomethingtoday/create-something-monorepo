<script lang="ts">
  import { onMount } from 'svelte';
  import { createHeroPlayback, type HeroPlaybackState } from '$lib/hero-playback';

  const poster = '/media/hero/human-ink-v2.webp';
  let frame: HTMLDivElement;
  let video: HTMLVideoElement;
  let controller: ReturnType<typeof createHeroPlayback> | undefined;
  let ready = $state(false);
  let playback = $state<HeroPlaybackState>({
    playing: false,
    requested: false,
    started: false,
    ended: false,
    failed: false
  });
  const label = $derived(
    playback.requested
      ? 'Pause animation'
      : playback.ended
        ? 'Replay animation'
        : playback.started
          ? 'Resume animation'
          : 'Play animation'
  );

  onMount(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    controller = createHeroPlayback(
      video,
      '/media/hero/human-ink-v2.mp4',
      (next) => (playback = next)
    );
    const preference = () => controller?.setReducedMotion(motion.matches);
    const visibility = () => controller?.setPageVisible(!document.hidden);
    preference();
    visibility();
    motion.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(
            ([entry]) =>
              controller?.setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35),
            { threshold: [0, 0.35] }
          );
    observer?.observe(frame);
    // Without visibility observation, retain manual playback instead of guessing autoplay.
    if (!observer) {
      controller.setReducedMotion(true);
      controller.setVisible(true);
    }
    ready = true;
    return () => {
      observer?.disconnect();
      motion.removeEventListener('change', preference);
      document.removeEventListener('visibilitychange', visibility);
      controller?.destroy();
    };
  });
</script>

<figure class="human-ink-hero">
  <div class="artwork" bind:this={frame}>
    <img
      src={poster}
      width="960"
      height="1080"
      fetchpriority="high"
      alt="Hands turn working notes into lessons, collect them in a private library, and share a lesson with another person."
    />
    <!-- Silent illustrative motion duplicates the image description; no spoken content to caption. -->
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      id="human-ink-animation"
      bind:this={video}
      muted
      playsinline
      preload="none"
      {poster}
      width="960"
      height="1080"
      aria-hidden="true"
      tabindex="-1"
      class:show={playback.started && !playback.ended && !playback.failed}
    ></video>
  </div>
  <figcaption>
    <span>Your practice. Your network. Shared understanding.</span>
    {#if ready && !playback.failed}
      <button type="button" aria-controls="human-ink-animation" onclick={() => controller?.toggle()}
        >{label}</button
      >
    {/if}
  </figcaption>
</figure>

<style>
  .human-ink-hero {
    position: relative;
    margin: 0;
    min-width: 0;
  }
  .artwork {
    position: relative;
    aspect-ratio: 8 / 9;
    isolation: isolate;
    background: #090909;
  }
  img,
  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  video {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
  }
  video.show {
    opacity: 1;
  }
  figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 16px;
    min-height: 56px;
    margin-top: 12px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  button {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
    border: 1px solid var(--line);
    background: var(--color-performance-ink);
    color: var(--paper);
    font-size: 11px;
    min-height: 44px;
    padding: 10px 12px;
  }
  button:hover {
    border-color: var(--muted);
  }
</style>
