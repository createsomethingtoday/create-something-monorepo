<script lang="ts">
  import { onMount } from 'svelte';
  export interface Chapter { id: string; label: string; short?: string; note?: string }
  interface Props { chapters: Chapter[]; label?: string; preview?: boolean; readingOffset?: number }
  let { chapters, label = 'On this page', preview = true, readingOffset = 0.25 }: Props = $props();
  const instance = $props.id();
  let active = $state(0);
  let hovered = $state<number | null>(null);
  let focused = $state<number | null>(null);
  let ready = $state(false);
  const indicated = $derived(preview ? (hovered ?? focused ?? active) : active);
  onMount(() => {
    ready = true;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = innerHeight * Math.max(0, Math.min(1, readingOffset));
      let next = 0;
      chapters.forEach((chapter, index) => {
        const section = document.getElementById(chapter.id);
        if (section && section.getBoundingClientRect().top <= line) next = index;
      });
      active = next;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resize?.observe(document.documentElement);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  });
</script>

<nav class="ruler" aria-label={label} data-chapter-ruler data-ready={ready} onpointerleave={() => hovered = null} onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) focused = null; }} style={`--chapter-count:${Math.max(chapters.length, 1)};--chapter-position:${(indicated + .5) / Math.max(chapters.length, 1) * 100}%`}>
  <div class="scale" aria-hidden="true"><span class="needle"></span></div>
  <ol>
    {#each chapters as chapter, index (chapter.id)}
      <li><a href={`#${chapter.id}`} aria-label={chapter.label} aria-current={ready && active === index ? 'location' : undefined} aria-describedby={chapter.note ? `${instance}-note-${index}` : undefined} onpointerenter={() => hovered = index} onfocus={() => focused = index}><span class="number" aria-hidden="true">{String(index + 1).padStart(2,'0')}</span><span class="full" aria-hidden="true">{chapter.label}</span><span class="short" aria-hidden="true">{chapter.short ?? chapter.label}</span></a>{#if chapter.note}<span class="description" id={`${instance}-note-${index}`}>{chapter.note}</span>{/if}</li>
    {/each}
  </ol>
  <p class="reading" id={`${instance}-reading`}>{chapters[indicated]?.note ?? chapters[indicated]?.label ?? label}</p>
</nav>

<style>
  .ruler, .ruler * { box-sizing:border-box; }
  .ruler{font:14px/1.45 var(--font-performance-mono);color:var(--color-performance-fg-secondary);margin-block:20px 44px}
  .description{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
  .scale{height:24px;border-top:1px solid var(--color-performance-fg-secondary);position:relative;background:repeating-linear-gradient(90deg,var(--color-performance-line) 0 1px,transparent 1px 1%);background-size:100% 8px;background-repeat:no-repeat}
  .needle{position:absolute;left:var(--chapter-position);height:24px;top:0;width:1px;background:var(--color-performance-fg-primary);transition:left 200ms var(--ease-performance-standard)}
  .needle::after{content:'';position:absolute;width:5px;height:5px;background:var(--color-performance-fg-primary);bottom:0;left:-2px}
  ol{display:grid;grid-template-columns:repeat(var(--chapter-count),minmax(0,1fr));margin:0;padding:0;list-style:none;border-bottom:1px solid var(--color-performance-line)}
  li{min-width:0}a{display:flex;gap:12px;align-items:center;justify-content:center;min-height:60px;padding:12px 6px;border-inline-start:1px solid var(--color-performance-line);color:inherit;text-decoration:none}li:last-child a{border-inline-end:1px solid var(--color-performance-line)}a[aria-current],a:hover,a:focus-visible{color:var(--color-performance-fg-primary)}a:focus-visible{outline:2px solid var(--color-performance-focus);outline-offset:-3px}.number{font-size:10px}.short{display:none}.reading{margin:12px 0 0;min-height:1.45em;font-size:14px}
  @media(max-width:600px){a{flex-direction:column;gap:4px;font-size:12px;min-height:64px}.full{display:none}.short{display:inline}.number{font-size:10px}}
  @media(prefers-reduced-motion:reduce){.needle{transition:none}}
</style>
