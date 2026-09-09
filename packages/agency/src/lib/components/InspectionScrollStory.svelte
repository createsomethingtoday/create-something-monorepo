<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { inspectionState } from '$lib/visual/inspectionSceneState';
  import type { InspectionRenderer } from '$lib/visual/inspectionRenderer';

  const stages = [
    {
      title: 'Your existing system',
      short: 'Intact',
      text: 'Start with the product you already have. The neighboring parts stay in place while we focus on one agreed customer workflow.'
    },
    {
      title: 'Agree on what to check.',
      short: 'Select',
      text: 'Show us the product, the customer journey, and your concern. We agree on access, scope, deliverables, price, and timing. The fit call does not include a code audit.'
    },
    {
      title: 'Inspect and test the existing work.',
      short: 'Inspect',
      text: 'We review the relevant code and test the agreed workflow. Depending on the scope, checks may cover access to records, AI output, failed requests, or the customer requirement you need to answer.'
    },
    {
      title: 'Decide what happens next.',
      short: 'Findings',
      text: 'You receive a written findings report and a walkthrough: what to fix before the pilot, what can wait, and what to leave alone. Each finding includes the evidence, its limits, and a recommended next action.'
    }
  ];
  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let root: HTMLDivElement;
  let status: 'fallback' | 'loading' | 'ready' = 'fallback';
  let reduced = false;
  let hasRendered = false;
  let active = 0;
  let generation = 0;
  let renderer: InspectionRenderer | undefined;
  let start: (() => Promise<void>) | undefined;

  async function retry() {
    generation += 1;
    await tick();
    await start?.();
  }

  onMount(() => {
    let destroyed = false;
    let visible = false;
    let frame = 0;
    let progress = 0;
    let initializing = false;
    let removeLossListener = () => {};
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = motion.matches;

    function update() {
      frame = 0;
      if (destroyed) return;
      const steps = [...root.querySelectorAll<HTMLElement>('.inspection-step')];
      const target = window.innerHeight * (window.innerWidth < 800 ? 0.75 : 0.5);
      let value = 0;
      for (let i = 0; i < steps.length - 1; i++) {
        const here = steps[i].getBoundingClientRect().top;
        const next = steps[i + 1].getBoundingClientRect().top;
        if (target >= here)
          value = (i + Math.min(1, Math.max(0, (target - here) / Math.max(1, next - here)))) / 3;
      }
      progress = value;
      active = inspectionState(progress).stage;
      if (visible && !document.hidden) renderer?.render(reduced ? 1 : progress);
    }
    function schedule() {
      if (!frame && !destroyed) frame = requestAnimationFrame(update);
    }
    function resize() {
      const rect = host.getBoundingClientRect();
      renderer?.resize(rect.width, rect.height, window.devicePixelRatio || 1);
      schedule();
    }
    function changeMotion() {
      reduced = motion.matches;
      void tick().then(resize);
    }
    function lost(event: Event) {
      event.preventDefault();
      renderer?.dispose(false);
      renderer = undefined;
      status = 'fallback';
    }
    start = async () => {
      if (destroyed || renderer || initializing) return;
      initializing = true;
      status = 'loading';
      try {
        const { createInspectionRenderer } = await import('$lib/visual/inspectionRenderer');
        if (destroyed) return;
        removeLossListener();
        const element = canvas;
        element.addEventListener('webglcontextlost', lost);
        removeLossListener = () => element.removeEventListener('webglcontextlost', lost);
        renderer = createInspectionRenderer(element);
        const firstRender = !hasRendered;
        hasRendered = true;
        status = 'ready';
        await tick();
        if (destroyed) return;
        resize();
        if (firstRender && /^#inspection-step-[0-3]$/.test(window.location.hash)) {
          root
            .querySelector(window.location.hash)
            ?.scrollIntoView({ behavior: 'instant', block: 'start' });
          schedule();
        }
      } catch {
        renderer?.dispose();
        renderer = undefined;
        status = 'fallback';
      } finally {
        initializing = false;
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          void start?.();
          schedule();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(host);
    if (/^#inspection-step-[0-3]$/.test(window.location.hash)) void start();
    const sizing = new ResizeObserver(resize);
    sizing.observe(host);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', changeMotion);
    schedule();
    return () => {
      destroyed = true;
      start = undefined;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizing.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', schedule);
      motion.removeEventListener('change', changeMotion);
      removeLossListener();
      renderer?.dispose();
      renderer = undefined;
    };
  });
</script>

<div
  class="inspection-story"
  class:enhanced={hasRendered && !reduced}
  bind:this={root}
  data-inspection-state={status}
>
  <div class="inspection-visual">
    <figure>
      <div class="inspection-canvas" bind:this={host}>
        {#key generation}<canvas
            bind:this={canvas}
            class:ready={status === 'ready'}
            aria-hidden="true"
          ></canvas>{/key}
        {#if status !== 'ready'}
          <img
            src="/images/performance-lab/technical-review-inspection.webp"
            alt="Concept model of one part lifted for inspection while the connected system stays intact."
            width="1536"
            height="1024"
            loading="lazy"
          />
        {/if}
      </div>
      <figcaption>
        <span>Concept model · {reduced ? 'Static inspection view' : stages[active].short}</span>
        <p>
          {reduced || active >= 2
            ? 'The shell lifts to reveal the connection inside.'
            : active === 1
              ? 'The outlined boundary marks the part we agree to inspect.'
              : 'One connected system. Only the selected part will open.'} This model illustrates a scoped
          review, not a finding about your product.
        </p>
      </figcaption>
    </figure>
    <nav aria-label="Inspection stages">
      {#each stages as stage, i}
        <a href={`#inspection-step-${i}`} aria-current={active === i ? 'step' : undefined}
          >{i + 1}. {stage.short}</a
        >
      {/each}
    </nav>
    {#if status === 'fallback' && start}<button type="button" onclick={retry}
        >Try the 3D view again</button
      >{/if}
  </div>
  <ol class="inspection-steps">
    {#each stages as stage, i}
      <li class="inspection-step" id={`inspection-step-${i}`}>
        <span class="step-number">0{i + 1}</span>
        <h3>{stage.title}</h3>
        <p>{stage.text}</p>
        {#if i === 3}<p class="scope-note">
            The highlighted connection is an illustrative finding. Repairs require a separately
            agreed implementation scope.
          </p>{/if}
      </li>
    {/each}
  </ol>
</div>

<style>
  .inspection-story {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: clamp(2rem, 4vw, 4rem);
    align-items: start;
  }
  .inspection-visual {
    min-width: 0;
  }
  .enhanced .inspection-visual {
    position: sticky;
    top: 6rem;
  }
  figure {
    margin: 0;
  }
  .inspection-canvas {
    position: relative;
    width: 100%;
    height: clamp(20rem, 45vh, 32rem);
    background: var(--color-performance-ink);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    visibility: hidden;
  }
  canvas.ready {
    visibility: visible;
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  figcaption {
    font-size: var(--text-body-sm);
    line-height: 1.5;
    padding: 1rem 0;
  }
  figcaption span,
  .step-number {
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
  }
  figcaption p {
    margin: 0.5rem 0 0;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  nav a,
  button {
    padding: 0.65rem 0.7rem;
    border: 1px solid var(--color-performance-line);
    color: inherit;
    background: transparent;
    font-size: var(--text-body-sm);
    text-decoration: none;
  }
  nav a[aria-current] {
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }
  button {
    margin-top: 0.75rem;
    cursor: pointer;
  }
  .inspection-steps {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .inspection-step {
    padding: 1rem 0 2rem;
    scroll-margin-top: 50vh;
  }
  .enhanced .inspection-step {
    min-height: 65vh;
  }
  h3 {
    font-size: clamp(1.5rem, 2.5vw, 2.2rem);
    line-height: 1.2;
    margin: 1rem 0;
  }
  li p {
    font-size: var(--text-body);
    line-height: 1.65;
  }
  .scope-note {
    border-top: 1px solid var(--color-performance-line);
    padding-top: 1rem;
  }
  @media (max-width: 800px) {
    .inspection-story {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .enhanced .inspection-visual {
      top: 4rem;
      z-index: 1;
      background: var(--color-performance-paper);
      padding-bottom: 0.75rem;
    }
    .inspection-canvas {
      height: 16rem;
    }
    figcaption {
      padding: 0.65rem 0;
    }
    figcaption p {
      font-size: 0.8rem;
    }
    nav a {
      padding: 0.5rem;
      font-size: 0.75rem;
    }
    .inspection-step {
      scroll-margin-top: 75vh;
    }
    .enhanced .inspection-step {
      min-height: 65vh;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .inspection-step {
      scroll-margin-top: 5rem;
    }
  }
</style>
