<script lang="ts">
  import { onMount } from 'svelte';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
  export let pose: 'idle' | 'review' = 'idle';
  export let action: 'jumping' | 'waving' = 'waving';
  export let trigger = 0;
  export let size: 'small' | 'large' = 'small';
  const counts = { jumping: 5, waving: 4 };
  let image: HTMLImageElement;
  let src = '/canon/idle/00.png';
  let mounted = false, visible = false, osReduced = true, lastTrigger = trigger;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let pendingAction = false;
  function settle() { generation++; clearTimeout(timer); src = `/canon/${pose}/00.png`; }
  async function play() {
    settle();
    if (!mounted || !visible || osReduced || $reducedFilmMotion || document.hidden) return;
    pendingAction = false;
    const current = generation;
    const frames = Array.from({ length: counts[action] }, (_, i) => `/canon/${action}/${String(i).padStart(2, '0')}.png`);
    try {
      await Promise.all(frames.map(async url => { const frame = new Image(); frame.src = url; await frame.decode(); }));
    } catch { return; }
    if (current !== generation || !visible || osReduced || $reducedFilmMotion || document.hidden) return;
    let index = 0;
    const advance = () => { if (index >= frames.length) { settle(); return; } src = frames[index++]; timer = setTimeout(advance, 125); };
    advance();
  }
  $: if (pose) { pendingAction = false; settle(); }
  $: if (mounted && trigger !== lastTrigger) { lastTrigger = trigger; pendingAction = !osReduced && !$reducedFilmMotion && !document.hidden; void play(); }
  $: if ($reducedFilmMotion || osReduced) { pendingAction = false; settle(); }
  onMount(() => {
    mounted = true;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { osReduced = preference.matches; if (osReduced) settle(); };
    change(); preference.addEventListener('change', change);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) settle(); else if (pendingAction) void play(); });
    observer.observe(image);
    const visibility = () => { if (document.hidden) { pendingAction = false; settle(); } };
    document.addEventListener('visibilitychange', visibility);
    return () => { mounted = false; settle(); observer.disconnect(); preference.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); };
  });
</script>
<span class="canon" class:large={size === 'large'} aria-hidden="true"><img bind:this={image} {src} alt="" width="192" height="208" loading="lazy" decoding="async" /></span>
<style>
  .canon { display: inline-block; width: 96px; flex: 0 0 auto; position: relative; vertical-align: bottom; }
  .canon::after { content: ''; position: absolute; bottom: 7%; left: 24%; right: 16%; height: 4px; background: rgba(0,0,0,.45); filter: blur(4px); }
  img { display: block; position: relative; z-index: 1; width: 100%; height: auto; filter: drop-shadow(0 0 1px rgba(210,208,199,.45)); }
  .large { width: 152px; }
  @media (max-width: 640px) { .canon { width: 72px; } .large { width: 96px; } }
</style>
