<script lang="ts">
  import { onMount } from 'svelte';
  import MembershipWorkpiece from './MembershipWorkpiece.svelte';

  let root: HTMLElement;
  let active = $state(0);
  let ready = $state(false);
  const chapters = [
    { id: 'membership-agree', label: 'Agree', title: 'Agree one useful change.', copy: 'We map one intake handoff and agree the result, access and human approval boundary before work starts.', result: 'A clear task and a person responsible.' },
    { id: 'membership-work', label: 'Work', title: 'Build within the boundary.', copy: 'In this example, a request becomes a draft for review. We build within the agreed scope and show what changed. Sending waits for a person’s approval.', result: 'One handoff that the team can inspect.' },
    { id: 'membership-handoff', label: 'Handoff', title: 'Keep using the result.', copy: 'We check the result against the agreement and explain how to use it. You keep the work, the check results, open questions and a guide to continue.', result: 'A checked improvement and a clear next step.' }
  ];

  function readChapter(index: number) {
    const target = root.querySelector<HTMLElement>(`[data-chapter="${index}"]`);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  onMount(() => {
    ready = true;
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = innerHeight * .4;
      const elements = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
      active = Math.max(0, elements.findLastIndex(chapter => chapter.getBoundingClientRect().top <= readingLine));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  });
</script>

<section class="plan-journey" class:story-ready={ready} aria-labelledby="plan-journey-title" bind:this={root}>
  <header class="journey-heading">
    <p class="eyebrow">From agreement to handoff</p>
    <h3 id="plan-journey-title">One task.<br />From agreement to handoff.</h3>
    <p>Follow one illustrated intake handoff. Both membership plans use the same process.</p>
  </header>
  <div class="journey-layout">
    <div class="plan-diagram desktop-story-visual">
      <MembershipWorkpiece stage={active} />
      <nav class="story-navigation" aria-label="Follow the membership story">
        {#each chapters as chapter, index}
          <button type="button" aria-controls={chapter.id} aria-current={active === index ? 'step' : undefined} onclick={() => readChapter(index)}><span>0{index + 1}</span>{chapter.label}</button>
        {/each}
      </nav>
      <p class="diagram-note">Scroll to follow the example. No tools are connected.</p>
    </div>
    <div class="journey-chapters">
      {#each chapters as chapter, index}
        <section id={chapter.id} class="chapter" data-chapter={index} aria-labelledby={`${chapter.id}-title`} tabindex="-1">
          <div class="inline-story-visual"><MembershipWorkpiece stage={index} /></div>
          <p class="eyebrow">0{index + 1} / {chapter.label}</p>
          <h4 id={`${chapter.id}-title`}>{chapter.title}</h4>
          <p>{chapter.copy}</p>
          <p class="chapter-result">{chapter.result}</p>
        </section>
      {/each}
    </div>
  </div>
</section>

<style>
  .plan-journey { padding: 0 var(--membership-gutter, max(1.25rem, calc((100% - 80rem) / 2))) var(--space-performance-xl); color: var(--color-performance-ink); }
  .journey-heading { border-top: 1px solid var(--color-performance-line-strong); padding-top: 2rem; }
  .eyebrow { font: .7rem/1.6 var(--font-performance-mono); text-transform: uppercase; letter-spacing: .04em; }
  .journey-heading h3 { font: 400 clamp(1.7rem, 3vw, 2.5rem)/1.15 var(--font-performance-editorial); margin: .75rem 0 1rem; }
  p { font-size: .9375rem; line-height: 1.7; max-width: 48ch; }
  .journey-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2rem; margin-top: 2rem; align-items: start; }
  .desktop-story-visual { display: none; }
  .plan-diagram, .inline-story-visual { background: var(--color-performance-bg-pure); color: var(--color-performance-fg-primary); border: 1px solid var(--color-performance-shell-border-strong); padding: clamp(1rem, 2vw, 1.5rem); }
  .inline-story-visual { margin-bottom: 2rem; max-width: 36rem; }
  .story-navigation { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; margin-top: 1.25rem; }
  .story-navigation button { min-height: 44px; display: flex; align-items: center; gap: .45rem; padding: 0; background: none; color: var(--color-performance-fg-secondary); border: 0; border-bottom: 1px solid var(--color-performance-shell-border-strong); font: inherit; font-size: .8125rem; text-align: left; cursor: pointer; }
  .story-navigation button[aria-current='step'] { color: var(--color-performance-fg-primary); border-bottom: 2px solid currentColor; }
  .story-navigation button:focus-visible, .chapter:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .story-navigation span { font: .65rem/1 var(--font-performance-mono); }
  .diagram-note { margin: .85rem 0 0; color: var(--color-performance-fg-secondary); font-size: .65rem; }
  .chapter { padding-bottom: 2rem; margin-bottom: 2rem; border-bottom: 1px solid var(--color-performance-line); scroll-margin-top: 9rem; }
  .chapter:last-child { margin-bottom: 0; border: 0; }
  .chapter .eyebrow { margin: 0; }
  .chapter h4 { font-size: clamp(1.4rem, 2.4vw, 2rem); line-height: 1.15; margin: .75rem 0 1rem; font-weight: 400; letter-spacing: -.03em; }
  .chapter-result { margin-top: 1.5rem; border-left: 1px solid var(--color-performance-line-strong); padding-left: 1rem; font-size: .8125rem; color: var(--color-performance-ink-soft); }
  @media (min-width: 1000px) and (min-height: 600px) {
    .story-ready .journey-layout { grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: clamp(2rem, 5vw, 5rem); }
    .story-ready .desktop-story-visual { display: block; position: sticky; top: 8rem; }
    .story-ready .desktop-story-visual :global(.workflow-bench) { max-height: max(10rem, calc(100svh - 24rem)); }
    .story-ready .inline-story-visual { display: none; }
    .story-ready .chapter { min-height: min(58vh, 28rem); box-sizing: border-box; padding: 2rem 0; margin: 0; }
    .story-ready .chapter:last-child { min-height: max(58vh, 38rem); }
  }
  @media (prefers-reduced-motion: reduce) {
    .story-ready .journey-layout { grid-template-columns: minmax(0, 1fr); }
    .story-ready .desktop-story-visual { display: none; }
    .story-ready .inline-story-visual { display: block; }
    .story-ready .chapter, .story-ready .chapter:last-child { min-height: 0; padding: 0 0 2rem; margin-bottom: 2rem; }
  }
  @media print { .desktop-story-visual { display: none!important; } .inline-story-visual { display: block!important; } .journey-layout { display: block!important; } .chapter { min-height: 0!important; break-inside: avoid; } }
</style>
