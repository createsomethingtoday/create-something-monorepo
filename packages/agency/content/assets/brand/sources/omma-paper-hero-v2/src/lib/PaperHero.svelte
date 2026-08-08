<script>
  import { onMount, onDestroy } from 'svelte';
  import { createPaperScene } from './paper/scene.js';

  export let seed = 20514;
  export let spread = 1.0;
  export let parallax = true;

  let container;
  let instance = null;
  let io = null;
  let mq = null;

  onMount(() => {
    // SvelteKit-safe: everything WebGL happens after mount, never during SSR.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    instance = createPaperScene(container, {
      seed,
      spread,
      parallax,
      reducedMotion: reduced
    });

    if (!reduced) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) instance.resume();
            else instance.pause();
          }
        },
        { threshold: 0.05 }
      );
      io.observe(container);
    }

    const onVis = () => {
      if (!instance) return;
      if (document.hidden) instance.pause();
      else if (!reduced) instance.resume();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
    };
  });

  onDestroy(() => {
    if (io) io.disconnect();
    if (mq && mq.removeEventListener) mq.removeEventListener('change', () => {});
    if (instance) instance.dispose();
    instance = null;
  });
</script>

<div class="paper-hero-stage" bind:this={container} aria-hidden="true"></div>

<style>
  .paper-hero-stage {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: #0e1113;
    overflow: hidden;
  }
</style>