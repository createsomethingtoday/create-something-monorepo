<script lang="ts">
  import { onMount } from 'svelte';
  import { reducedFilmMotion, toggleFilmMotion } from '$lib/motion/filmPlayback';

  const homeChapters = [
    { id: 'opening', label: 'The idea', short: 'Idea', note: 'Your tools, working together' },
    { id: 'example', label: 'The connection', short: 'Connect', note: 'Where the handoff gets better' },
    { id: 'work', label: 'The evidence', short: 'Evidence', note: 'Actual work, with its limits' },
    { id: 'together', label: 'What you keep', short: 'Keep', note: 'Code, checks and guidance' },
    { id: 'next', label: 'Start here', short: 'Start', note: 'Bring one thing to work on' }
  ];
  let { chapters = homeChapters, context = '.AGENCY', purpose = 'A little guidance. A working connection.', scope = 'home' }: {
    chapters?: Array<{id:string;label:string;short:string;note:string}>;
    context?: string; purpose?: string; scope?: 'home'|'page';
  } = $props();
  let active = $state(0);
  let pointerPreview = $state<number | null>(null);
  let focusPreview = $state<number | null>(null);
  let ready = $state(false);
  const indicated = $derived(pointerPreview ?? focusPreview ?? active);

  onMount(() => {
    ready = true;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Copy enhancement can replace a heading while preserving its id. Resolve
      // current nodes rather than tracking an earlier, now-hidden original.
      const sections = chapters.map(chapter => document.getElementById(chapter.id));
      const line = (document.querySelector('.nav-fixed')?.getBoundingClientRect().bottom ?? 72) + window.innerHeight * .25;
      let next = 0;
      sections.forEach((section, index) => { if (section && section.getBoundingClientRect().top <= line) next = index; });
      active = next;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    const home = document.querySelector(scope === 'home' ? '.agency-home' : '#main-content');
    if (home) resize.observe(home);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  });
</script>

<div class="chapter-instrument" data-chapter-dial data-dial-ready={ready}>
  <div class="instrument-register">
    <span>CREATE SOMETHING <span class="register-divider">/</span> {context}</span>
    <span class="instrument-purpose">{purpose}</span>
    {#if scope === 'home' || ready}<button type="button" onclick={toggleFilmMotion} aria-pressed={$reducedFilmMotion}>
      Motion <span aria-hidden="true">{$reducedFilmMotion ? '○' : '●'}</span> {$reducedFilmMotion ? 'off' : 'on'}
    </button>{/if}
  </div>
  <nav class="chapter-dial" aria-label="On this page" style={`--dial-position:${(indicated + .5) * 100 / chapters.length}%;--dial-count:${chapters.length}`} data-reduced={$reducedFilmMotion} onpointerleave={() => { pointerPreview = null; }} onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) focusPreview = null; }}>
    <div class="dial-scale" aria-hidden="true">
      <div class="dial-ticks"></div>
      <span class="dial-needle"></span>
    </div>
    <ol>
      {#each chapters as chapter, index}
        <li>
          <a href={`#${chapter.id}`} aria-label={`0${index + 1} / ${chapter.label}`} aria-current={active === index ? 'location' : undefined} onpointerenter={() => { pointerPreview = index; }} onfocus={() => { focusPreview = index; }}>
            <span class="dial-index">0{index + 1}</span>
            <span class="dial-label-full">{chapter.label}</span><span class="dial-label-short" aria-hidden="true">{chapter.short}</span>
            <span class="dial-link-arrow" aria-hidden="true">↘</span>
          </a>
        </li>
      {/each}
    </ol>
  </nav>
  <div class="instrument-reading" aria-hidden="true"><span>0{indicated + 1} / {chapters[indicated].note}</span><span>Small team. Thoughtful systems.</span></div>
</div>
