<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { createInkMotion } from '$lib/ink-motion';
  import layers from '$lib/handoff-frames.json';
  let figure: HTMLElement;
  let svg = $state<SVGSVGElement>();
  let ready = $state(false);
  let reduced = $state(true);
  let playing = $state(false);
  let played = false;
  let visible = false;
  let loading = false;
  let disposed = false;
  let motion: ReturnType<typeof createInkMotion> | undefined;
  let animations: Animation[] = [];
  function settle() {
    for (const animation of animations) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
    animations = [];
    playing = false;
  }
  function play() {
    settle();
    if (!ready || reduced || !visible || document.hidden) return;
    played = true;
    for (const layer of layers) {
      const node = svg?.querySelector(`[data-layer="${layer.id}"]`);
      if (!node) continue;
      const animation = motion?.animate(node, layer.frames, { duration: 3000, easing: 'linear' });
      if (animation) animations.push(animation);
    }
    playing = animations.length > 0;
    animations[animations.length - 1]?.addEventListener(
      'finish',
      () => {
        playing = false;
      },
      { once: true }
    );
  }
  async function prepare() {
    if (loading || ready || reduced || !visible || disposed) return;
    loading = true;
    try {
      await Promise.all(
        layers.map(
          (layer) =>
            new Promise<void>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve();
              image.onerror = reject;
              image.src = layer.src;
            })
        )
      );
      if (disposed) return;
      ready = true;
      await tick();
      if (!played) play();
    } catch {
      /* Keep the complete SSR still; a failed layer must not blank the scene. */
    }
  }
  onMount(() => {
    motion = createInkMotion();
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => {
      reduced = preference.matches;
      if (reduced) settle();
      else if (ready && !played) play();
      else {
        void prepare();
      }
    };
    changed();
    const visibility = () => {
      if (document.hidden) settle();
      else if (visible && ready && !played) play();
    };
    preference.addEventListener('change', changed);
    document.addEventListener('visibilitychange', visibility);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
              if (!visible) settle();
              else if (ready && !played) play();
              else void prepare();
            },
            { threshold: [0, 0.35] }
          );
    observer?.observe(figure);
    return () => {
      disposed = true;
      observer?.disconnect();
      preference.removeEventListener('change', changed);
      document.removeEventListener('visibilitychange', visibility);
      motion?.destroy();
    };
  });
</script>

<figure class="human-ink-handoff" bind:this={figure} data-playing={playing}>
  <div class="handoff-stage">
    {#if ready}
      <svg
        bind:this={svg}
        viewBox="0 670 960 350"
        role="img"
        aria-label="One hand passes a lesson card into another palm."
      >
        {#each layers as layer}
          <image
            data-layer={layer.id}
            href={layer.src}
            width={layer.width}
            height={layer.height}
            style={`transform-origin:0 0;transform:${layer.frames[layer.frames.length - 1].transform};opacity:${layer.frames[layer.frames.length - 1].opacity}`}
          />
        {/each}
      </svg>
    {:else}
      <img
        src="/media/human-ink/exchange.webp"
        width="1536"
        height="1024"
        loading="lazy"
        alt="One hand passes a lesson card to another."
      />
    {/if}
  </div>
  <figcaption>
    Sharing is deliberate.
    <div class="handoff-control">
      {#if ready && !reduced}<button class="text-button" onclick={play}>Replay handoff</button>{/if}
    </div>
  </figcaption>
</figure>

<style>
  .human-ink-handoff {
    margin: 40px 0 0;
    max-width: 440px;
    text-align: center;
  }
  .handoff-stage {
    aspect-ratio: 960 / 350;
    display: grid;
    align-items: center;
  }
  .handoff-stage img,
  svg {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  svg {
    overflow: visible;
  }
  figcaption {
    color: var(--muted);
    font-size: 12px;
    margin-top: 16px;
  }
  .handoff-control {
    min-height: 60px;
    padding-top: 12px;
  }
  button {
    min-height: 44px;
    padding: 10px 14px;
  }
</style>
