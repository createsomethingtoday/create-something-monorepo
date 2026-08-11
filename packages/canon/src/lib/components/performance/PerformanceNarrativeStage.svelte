<script lang="ts">
  import { pushState } from '$app/navigation';
  import { onMount, type Snippet } from 'svelte';

  export type PerformanceNarrativeTone = 'allow' | 'review' | 'block' | 'neutral';
  export type PerformanceNarrativeExpression = 'field' | 'editorial';

  export interface PerformanceNarrativeAction {
    label: string;
    href: string;
  }

  export interface PerformanceNarrativeScene {
    id: string;
    label: string;
    summary: string;
    title: string;
    detail: string;
    stakeholders?: Array<{
      role: string;
      meaning: string;
    }>;
    tone?: PerformanceNarrativeTone;
    evidence?: string[];
    receipts?: string[];
    actions?: PerformanceNarrativeAction[];
  }

  interface Props {
    id?: string;
    eyebrow?: string;
    title: string;
    description?: string;
    scenes: PerformanceNarrativeScene[];
    ariaLabel?: string;
    density?: 'standard' | 'compact';
    expression?: PerformanceNarrativeExpression;
    enablePresentation?: boolean;
    preview?: Snippet;
    artifact?: Snippet<[PerformanceNarrativeScene, number]>;
  }

  let {
    id = 'performance-narrative-stage',
    eyebrow,
    title,
    description,
    scenes,
    ariaLabel = 'Narrative scenes',
    density = 'compact',
    expression = 'field',
    enablePresentation = false,
    preview,
    artifact
  }: Props = $props();

  let activeIndex = $state(0);
  let enhanced = $state(false);
  let presenting = $state(false);
  let tabElements = $state<HTMLButtonElement[]>([]);
  let stageElement = $state<HTMLElement>();
  let presentButton = $state<HTMLButtonElement>();
  let previousBodyOverflow = '';

  const interactiveSelector =
    'a[href], button, input, textarea, select, summary, [contenteditable="true"]';

  function controlState(tone: PerformanceNarrativeTone | undefined) {
    if (tone === 'allow') return 'ready';
    if (tone === 'review') return 'review';
    if (tone === 'block') return 'stop';
    return 'controlled';
  }

  function fragmentFor(scene: PerformanceNarrativeScene) {
    return `#${id}-${scene.id}`;
  }

  function indexFromFragment() {
    if (typeof window === 'undefined') return -1;
    return scenes.findIndex((scene) => window.location.hash === fragmentFor(scene));
  }

  function syncFromFragment() {
    const fragmentIndex = indexFromFragment();
    if (fragmentIndex >= 0) activeIndex = fragmentIndex;
  }

  function selectScene(index: number, pushHistory = true, moveFocus = false) {
    if (!scenes[index]) return;
    activeIndex = index;

    if (pushHistory && typeof window !== 'undefined') {
      const fragment = fragmentFor(scenes[index]);
      if (window.location.hash !== fragment) {
        try {
          pushState(fragment, {});
        } catch {
          // Component tests and non-router mounts still retain fragment addressing.
          window.location.hash = fragment;
        }
      }
    }

    if (moveFocus) tabElements[index]?.focus();
  }

  function handleTabKeydown(event: KeyboardEvent, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % scenes.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + scenes.length) % scenes.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = scenes.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectScene(nextIndex, true, true);
  }

  function handlePresentationKeydown(event: KeyboardEvent) {
    if (!presenting || event.defaultPrevented) return;

    if (event.key === 'Tab' && stageElement) {
      const focusable = [...stageElement.querySelectorAll<HTMLElement>(interactiveSelector)].filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (event.target instanceof HTMLElement && event.target.closest(interactiveSelector)) {
      return;
    }

    let nextIndex = activeIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      nextIndex = Math.min(activeIndex + 1, scenes.length - 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
      nextIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = scenes.length - 1;
    } else if (event.key === 'Escape') {
      setPresenting(false);
      return;
    } else {
      return;
    }

    event.preventDefault();
    selectScene(nextIndex, true);
  }

  function setPresenting(next: boolean) {
    if (presenting === next) return;
    presenting = next;

    if (typeof document === 'undefined') return;
    if (next) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousBodyOverflow;
      requestAnimationFrame(() => presentButton?.focus());
    }
  }

  onMount(() => {
    enhanced = true;
    syncFromFragment();
    window.addEventListener('hashchange', syncFromFragment);
    window.addEventListener('popstate', syncFromFragment);
    window.addEventListener('keydown', handlePresentationKeydown);

    return () => {
      window.removeEventListener('hashchange', syncFromFragment);
      window.removeEventListener('popstate', syncFromFragment);
      window.removeEventListener('keydown', handlePresentationKeydown);
      if (presenting) document.body.style.overflow = previousBodyOverflow;
    };
  });
</script>

<section
  bind:this={stageElement}
  {id}
  class="performance-narrative-stage"
  data-density={density}
  data-expression={expression}
  data-enhanced={enhanced}
  data-presentation-enabled={enablePresentation}
  data-presenting={presenting}
  role={presenting ? 'dialog' : undefined}
  aria-modal={presenting ? 'true' : undefined}
  aria-label={presenting ? `${ariaLabel} presentation` : ariaLabel}
>
  <div class="performance-narrative-stage__inner">
    <header class="performance-narrative-stage__header">
      <div>
        {#if eyebrow}<span>{eyebrow}</span>{/if}
        <h2>{title}</h2>
      </div>
      {#if description}<p>{description}</p>{/if}
      {#if enablePresentation}
        <button
          bind:this={presentButton}
          type="button"
          class="performance-narrative-stage__present"
          aria-pressed={presenting}
          onclick={() => setPresenting(!presenting)}
        >
          {presenting ? 'Exit presentation' : 'Present deck'}
        </button>
      {/if}
    </header>

    {#if preview}
      <div class="performance-narrative-stage__preview">
        {@render preview()}
      </div>
    {/if}

    <div class="performance-narrative-stage__composition">
      <div
        class="performance-narrative-stage__index"
        role="tablist"
        aria-label={ariaLabel}
        style:--scene-count={scenes.length}
      >
        {#each scenes as scene, index}
          <button
            bind:this={tabElements[index]}
            type="button"
            role="tab"
            id={`${id}-tab-${scene.id}`}
            aria-selected={index === activeIndex}
            aria-controls={`${id}-panel-${scene.id}`}
            tabindex={index === activeIndex ? 0 : -1}
            data-control-state={controlState(scene.tone)}
            onclick={() => selectScene(index)}
            onkeydown={(event) => handleTabKeydown(event, index)}
          >
            <span class="performance-narrative-stage__index-number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span class="performance-narrative-stage__index-copy">
              <strong>{scene.label}</strong>
              <small>{scene.summary}</small>
              {#if scene.actions?.[0]}<em>{scene.actions[0].label}</em>{/if}
            </span>
          </button>
        {/each}
      </div>

      <div class="performance-narrative-stage__panels">
        {#each scenes as scene, index}
          <div
            id={`${id}-panel-${scene.id}`}
            class="performance-narrative-stage__panel"
            role="tabpanel"
            aria-labelledby={`${id}-tab-${scene.id}`}
            data-state={controlState(scene.tone)}
            hidden={enhanced && index !== activeIndex}
          >
            <div class="performance-narrative-stage__scene-head">
              <div>
                <span
                  >{String(index + 1).padStart(2, '0')} / {String(scenes.length).padStart(
                    2,
                    '0'
                  )}</span
                >
                <strong>{scene.summary}</strong>
              </div>
              <h3>{scene.title}</h3>
              <p>{scene.detail}</p>
              {#if scene.stakeholders?.length}
                <div
                  class="performance-narrative-stage__stakeholders"
                  aria-label="What this means for you"
                >
                  {#each scene.stakeholders as stakeholder}
                    <p><strong>{stakeholder.role}</strong><span>{stakeholder.meaning}</span></p>
                  {/each}
                </div>
              {/if}
            </div>

            {#if artifact}
              <div class="performance-narrative-stage__artifact">
                {@render artifact(scene, index)}
              </div>
            {/if}

            {#if scene.evidence?.length || scene.receipts?.length}
              <div class="performance-narrative-stage__proof">
                {#if scene.evidence?.length}
                  <div>
                    <span>Evidence</span>
                    <ul>
                      {#each scene.evidence as evidence}<li>{evidence}</li>{/each}
                    </ul>
                  </div>
                {/if}
                {#if scene.receipts?.length}
                  <div>
                    <span>Receipts</span>
                    <div class="performance-narrative-stage__receipts">
                      {#each scene.receipts as receipt}<strong>{receipt}</strong>{/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            {#if scene.actions?.length}
              <div
                class="performance-narrative-stage__actions"
                aria-label={`${scene.label} actions`}
              >
                {#each scene.actions as action}<a href={action.href}>{action.label}</a>{/each}
              </div>
            {/if}

            {#if enhanced && index === activeIndex && scenes.length > 1}
              <div class="performance-narrative-stage__controls" aria-label="Scene controls">
                <button
                  type="button"
                  disabled={index === 0}
                  onclick={() => selectScene(index - 1, true, true)}
                >
                  {presenting ? 'Previous slide' : 'Previous'}
                </button>
                <span aria-live="polite">Slide {index + 1} of {scenes.length} · {scene.label}</span>
                <button
                  type="button"
                  disabled={index === scenes.length - 1}
                  onclick={() => selectScene(index + 1, true, true)}
                >
                  {presenting ? 'Next slide' : 'Next'}
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .performance-narrative-stage {
    scroll-margin-top: var(
      --distance-performance-stage-anchor-offset,
      calc(var(--height-performance-header, 72px) + 1rem)
    );
    padding-block: var(--space-performance-stage-block, 3.5rem);
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    background:
      linear-gradient(90deg, var(--color-performance-grid, rgb(9 9 9 / 0.055)) 1px, transparent 1px)
        0 0 / 3.75rem 3.75rem,
      var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .performance-narrative-stage[data-density='compact'] {
    padding-block: var(--space-performance-stage-block-compact, 2.75rem);
  }

  .performance-narrative-stage__inner {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.75rem);
    width: min(
      var(--content-width-performance, 85rem),
      calc(
        100% - var(--space-performance-page-gutter, 1.25rem) -
          var(--space-performance-page-gutter, 1.25rem)
      )
    );
    margin-inline: auto;
  }

  .performance-narrative-stage__header {
    display: grid;
    grid-template-columns: minmax(18rem, 0.9fr) minmax(18rem, 0.7fr);
    gap: clamp(1.5rem, 4vw, 4rem);
    align-items: end;
  }

  .performance-narrative-stage__present {
    justify-self: end;
    min-height: var(--height-performance-control-min, 2.75rem);
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #fff);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
    cursor: pointer;
  }

  .performance-narrative-stage__present:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: 2px;
  }

  .performance-narrative-stage__header > div,
  .performance-narrative-stage__scene-head {
    display: grid;
    gap: 0.7rem;
  }

  .performance-narrative-stage__header span,
  .performance-narrative-stage__scene-head span,
  .performance-narrative-stage__proof span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.2;
    text-transform: uppercase;
  }

  .performance-narrative-stage h2,
  .performance-narrative-stage h3,
  .performance-narrative-stage p {
    margin: 0;
  }

  .performance-narrative-stage h2,
  .performance-narrative-stage h3 {
    font-family: var(--font-performance-display);
    font-kerning: normal;
    font-feature-settings:
      'kern' 1,
      'liga' 1;
    font-weight: var(--font-performance-display-weight);
    letter-spacing: var(--tracking-performance-display);
  }

  .performance-narrative-stage h2 {
    font-size: clamp(2.15rem, 4vw, 3.45rem);
    line-height: 1.02;
    text-wrap: balance;
  }

  .performance-narrative-stage__header > p,
  .performance-narrative-stage__scene-head > p {
    color: var(--color-performance-muted, #5e6268);
    font-size: 1rem;
    line-height: 1.52;
    text-wrap: pretty;
  }

  .performance-narrative-stage__composition {
    display: grid;
    grid-template-columns: minmax(14rem, var(--width-performance-stage-index, 18rem)) minmax(0, 1fr);
    min-height: var(--height-performance-stage, 34rem);
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-panel, #ffffff);
  }

  .performance-narrative-stage__preview {
    min-width: 0;
  }

  .performance-narrative-stage__index {
    display: grid;
    align-content: start;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-court, #e6e6e0);
  }

  .performance-narrative-stage__index button {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: 0.75rem;
    min-height: var(--height-performance-control-min, 2.75rem);
    padding: 1.15rem 1rem;
    border: 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: transparent;
    color: var(--color-performance-ink, #090909);
    font: inherit;
    text-align: left;
    cursor: pointer;
    opacity: var(--opacity-performance-stage-inactive, 0.66);
  }

  .performance-narrative-stage__index button[aria-selected='true'] {
    background: var(--color-performance-panel, #ffffff);
    opacity: 1;
  }

  .performance-narrative-stage__index
    button[aria-selected='true'][data-control-state='controlled'] {
    box-shadow: inset 3px 0 0 var(--color-performance-controlled, #0057b8);
  }

  .performance-narrative-stage__index button[aria-selected='true'][data-control-state='ready'] {
    box-shadow: inset 3px 0 0 var(--color-performance-ready, #007a4d);
  }

  .performance-narrative-stage__index button[aria-selected='true'][data-control-state='review'] {
    box-shadow: inset 3px 0 0 var(--color-performance-review, #8b6b00);
  }

  .performance-narrative-stage__index button[aria-selected='true'][data-control-state='stop'] {
    box-shadow: inset 3px 0 0 var(--color-performance-stop, #c62026);
  }

  .performance-narrative-stage__index button:focus-visible,
  .performance-narrative-stage__controls button:focus-visible,
  .performance-narrative-stage__actions a:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: -3px;
  }

  .performance-narrative-stage__index-number {
    padding-top: 0.12rem;
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
  }

  .performance-narrative-stage__index-copy {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
  }

  .performance-narrative-stage__index-copy strong {
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
  }

  .performance-narrative-stage__index-copy small,
  .performance-narrative-stage__index-copy em {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.79rem;
    font-style: normal;
    line-height: 1.35;
  }

  .performance-narrative-stage__index-copy em {
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
  }

  .performance-narrative-stage__panels {
    min-width: 0;
  }

  .performance-narrative-stage__panel {
    display: grid;
    gap: 1.35rem;
    min-height: 100%;
    padding: clamp(1.35rem, 3vw, 2.5rem);
  }

  .performance-narrative-stage__panel[hidden] {
    display: none;
  }

  .performance-narrative-stage__scene-head > div:first-child {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
  }

  .performance-narrative-stage__scene-head > div:first-child > strong {
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  .performance-narrative-stage__scene-head h3 {
    max-width: 46rem;
    font-size: clamp(1.8rem, 3vw, 2.75rem);
    line-height: 1.04;
    text-wrap: balance;
  }

  .performance-narrative-stage__scene-head > p {
    max-width: 48rem;
  }

  .performance-narrative-stage__stakeholders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
  }

  .performance-narrative-stage__stakeholders p {
    display: grid;
    gap: 0.3rem;
    padding: 0.65rem 0.75rem;
    background: var(--color-performance-panel, #fff);
  }

  .performance-narrative-stage__stakeholders p strong {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
  }

  .performance-narrative-stage__stakeholders p span {
    color: var(--color-performance-muted, #5e6268);
    font-family: inherit;
    font-size: 0.76rem;
    font-weight: 400;
    line-height: 1.35;
    text-transform: none;
  }

  .performance-narrative-stage__artifact {
    min-width: 0;
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    padding-block: 1.1rem;
  }

  .performance-narrative-stage__proof {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
  }

  .performance-narrative-stage__proof > div {
    display: grid;
    gap: 0.65rem;
  }

  .performance-narrative-stage__proof ul {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-left: 1.1rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.86rem;
    line-height: 1.4;
  }

  .performance-narrative-stage__receipts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .performance-narrative-stage__receipts strong {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-medium);
  }

  .performance-narrative-stage__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .performance-narrative-stage__actions a,
  .performance-narrative-stage__controls button {
    display: inline-flex;
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: center;
    justify-content: center;
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    text-decoration: none;
    text-transform: uppercase;
  }

  .performance-narrative-stage__controls {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.75rem;
    align-items: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .performance-narrative-stage__controls span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-align: center;
    text-transform: uppercase;
  }

  .performance-narrative-stage__controls button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .performance-narrative-stage[data-expression='editorial'] {
    padding-block: clamp(4rem, 7vw, 7rem);
    border-block: 0;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .performance-narrative-stage[data-expression='editorial'] .performance-narrative-stage__inner {
    width: min(
      var(--content-width-performance-editorial, 90rem),
      calc(100% - clamp(1rem, 3vw, 4rem))
    );
    gap: clamp(2rem, 5vw, 4.5rem);
  }

  .performance-narrative-stage[data-expression='editorial'] .performance-narrative-stage__header {
    grid-template-columns: minmax(20rem, 1.05fr) minmax(18rem, 0.65fr);
    padding-inline: clamp(0.75rem, 2vw, 2rem);
  }

  .performance-narrative-stage[data-expression='editorial'] h2,
  .performance-narrative-stage[data-expression='editorial'] h3 {
    font-family: var(--font-performance-editorial);
    font-weight: 400;
    letter-spacing: -0.035em;
  }

  .performance-narrative-stage[data-expression='editorial'] h2 {
    max-width: 14ch;
    font-size: clamp(3.25rem, 6vw, 6rem);
    line-height: var(--leading-performance-editorial, 1.1);
  }

  .performance-narrative-stage[data-expression='editorial']
    .performance-narrative-stage__composition {
    grid-template-columns: minmax(15rem, 0.3fr) minmax(0, 1fr);
    overflow: hidden;
    border-color: var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-panel, #fff);
  }

  .performance-narrative-stage[data-expression='editorial'] .performance-narrative-stage__index {
    background: color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 82%, white);
  }

  .performance-narrative-stage[data-expression='editorial']
    .performance-narrative-stage__index
    button[aria-selected='true'] {
    background: var(--color-performance-panel, #fff);
  }

  .performance-narrative-stage[data-expression='editorial'] .performance-narrative-stage__panel {
    align-content: start;
    gap: clamp(1.25rem, 3vw, 2.5rem);
    min-height: 0;
    padding: clamp(1.25rem, 4vw, 4rem);
  }

  .performance-narrative-stage[data-expression='editorial']
    .performance-narrative-stage__scene-head
    h3 {
    max-width: 20ch;
    font-size: clamp(2.5rem, 4.4vw, 4.75rem);
    line-height: var(--leading-performance-editorial, 1.1);
  }

  .performance-narrative-stage[data-expression='editorial']
    .performance-narrative-stage__receipts
    strong {
    display: inline-flex;
    min-height: 2rem;
    align-items: center;
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-paper, #f3f3f0);
    box-shadow: inset 3px 0 0 var(--color-performance-controlled, #0057b8);
  }

  @media (max-width: 63.99rem) {
    .performance-narrative-stage[data-expression='editorial'] .performance-narrative-stage__header,
    .performance-narrative-stage[data-expression='editorial']
      .performance-narrative-stage__composition {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 64rem) {
    .performance-narrative-stage__index {
      position: sticky;
      top: var(
        --distance-performance-stage-sticky-offset,
        calc(var(--height-performance-header, 72px) + 1rem)
      );
      align-self: start;
    }
  }

  @media (max-width: 63.99rem) {
    .performance-narrative-stage__header,
    .performance-narrative-stage__composition {
      grid-template-columns: 1fr;
    }

    .performance-narrative-stage__header {
      align-items: start;
    }

    .performance-narrative-stage__present {
      justify-self: start;
    }

    .performance-narrative-stage__header > p {
      max-width: 42rem;
    }

    .performance-narrative-stage__composition {
      min-height: 0;
    }

    .performance-narrative-stage__panel {
      align-content: start;
      min-height: auto;
    }

    .performance-narrative-stage__index {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: minmax(9.5rem, 40vw);
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scroll-snap-type: inline mandatory;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .performance-narrative-stage__index button {
      grid-template-columns: 1.35rem minmax(0, 1fr);
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
      scroll-snap-align: start;
    }

    .performance-narrative-stage__index-copy em {
      display: none;
    }
  }

  @media (max-width: 47.99rem) {
    .performance-narrative-stage {
      padding-block: 2.35rem;
    }

    .performance-narrative-stage[data-density='compact'] {
      padding-block: 1.5rem;
    }

    .performance-narrative-stage__inner {
      width: min(
        calc(
          100% - var(--space-performance-page-gutter, 0.75rem) -
            var(--space-performance-page-gutter, 0.75rem)
        ),
        var(--content-width-performance, 85rem)
      );
      gap: 1rem;
    }

    .performance-narrative-stage__index {
      grid-template-columns: none;
      grid-auto-columns: minmax(8.3rem, 58vw);
    }

    .performance-narrative-stage__index button {
      grid-template-columns: 1.2rem minmax(0, 1fr);
      min-height: var(--height-performance-control-min, 2.75rem);
      padding: 0.65rem;
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .performance-narrative-stage__index-number {
      display: block;
    }

    .performance-narrative-stage__panel {
      gap: 0.9rem;
      padding: 0.85rem;
    }

    .performance-narrative-stage__header > div,
    .performance-narrative-stage__scene-head {
      gap: 0.55rem;
    }

    .performance-narrative-stage__artifact {
      padding-block: 0.7rem;
    }

    .performance-narrative-stage__controls {
      gap: 0.5rem;
      padding-top: 0.7rem;
    }

    .performance-narrative-stage__proof {
      grid-template-columns: 1fr;
    }

    .performance-narrative-stage__controls {
      grid-template-columns: 1fr 1fr;
    }

    .performance-narrative-stage__controls span {
      grid-column: 1 / -1;
      grid-row: 1;
    }
  }

  @media (max-width: 22.5rem) {
    .performance-narrative-stage__index {
      grid-template-columns: none;
      grid-auto-columns: minmax(7.75rem, 74vw);
    }

    .performance-narrative-stage__index button:nth-child(2n) {
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .performance-narrative-stage__index button:nth-last-child(-n + 2) {
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }
  }

  .performance-narrative-stage[data-presenting='true'] {
    position: fixed;
    z-index: 90;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
    padding: 0;
    border: 0;
    scroll-margin-top: 0;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__inner {
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__header {
    z-index: 2;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    min-height: 3.5rem;
    padding: 0.5rem clamp(0.75rem, 2vw, 1.5rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__header
    > div {
    display: flex;
    min-width: 0;
    gap: 0.75rem;
    align-items: baseline;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__header h2 {
    max-width: none;
    overflow: hidden;
    font-family: var(--font-performance-display);
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.1;
    text-overflow: ellipsis;
    text-wrap: nowrap;
    white-space: nowrap;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__header > p,
  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__preview {
    display: none;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__present {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    min-height: 2.4rem;
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__composition {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    height: 100%;
    overflow: hidden;
    border: 0;
    border-radius: 0;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__index {
    position: static;
    display: grid;
    grid-template-columns: repeat(var(--scene-count, 1), minmax(7rem, 1fr));
    grid-auto-flow: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-court, #e6e6e0);
    scrollbar-width: thin;
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__index
    button {
    grid-template-columns: 1.2rem minmax(0, 1fr);
    min-height: 3rem;
    padding: 0.55rem 0.65rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 0;
    scroll-snap-align: none;
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__index-copy
    small,
  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__index-copy
    em {
    display: none;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__panels {
    min-height: 0;
    overflow: hidden;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__panel,
  .performance-narrative-stage[data-presenting='true'][data-expression='editorial']
    .performance-narrative-stage__panel {
    grid-template-rows: auto minmax(0, 1fr) auto;
    align-content: stretch;
    gap: clamp(0.65rem, 1.5vw, 1rem);
    min-height: 0;
    height: 100%;
    overflow: hidden;
    padding: clamp(0.75rem, 2vw, 1.5rem);
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__scene-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.55fr);
    gap: 0.45rem clamp(1rem, 3vw, 3rem);
    align-items: end;
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__scene-head
    > div:first-child {
    grid-column: 1 / -1;
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__stakeholders {
    grid-column: 1 / -1;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__scene-head
    h3,
  .performance-narrative-stage[data-presenting='true'][data-expression='editorial']
    .performance-narrative-stage__scene-head
    h3 {
    max-width: 18ch;
    font-size: clamp(2rem, 4.6vw, 4.75rem);
    line-height: var(--leading-performance-editorial, 1.02);
  }

  .performance-narrative-stage[data-presenting='true']
    .performance-narrative-stage__scene-head
    > p {
    max-width: 38rem;
    padding-bottom: 0.15rem;
    font-size: clamp(0.86rem, 1.35vw, 1rem);
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__artifact {
    min-height: 0;
    overflow: auto;
    padding-block: 0.5rem;
    overscroll-behavior: contain;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__proof,
  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__actions {
    display: none;
  }

  .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__controls {
    z-index: 2;
    margin: 0;
    padding-top: 0.55rem;
    background: var(--color-performance-panel, #fff);
  }

  @media (max-width: 47.99rem) {
    .performance-narrative-stage[data-presenting='true'] .performance-narrative-stage__header {
      min-height: 3.25rem;
      padding: 0.4rem 0.55rem;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__header
      span {
      display: none;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__header
      h2 {
      font-size: 0.85rem;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__composition {
      grid-template-rows: auto minmax(0, 1fr);
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__index {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: minmax(7.75rem, 36vw);
      scroll-snap-type: inline mandatory;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__index
      button {
      scroll-snap-align: start;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__panel,
    .performance-narrative-stage[data-presenting='true'][data-expression='editorial']
      .performance-narrative-stage__panel {
      gap: 0.65rem;
      padding: 0.7rem;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__scene-head {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__scene-head
      h3,
    .performance-narrative-stage[data-presenting='true'][data-expression='editorial']
      .performance-narrative-stage__scene-head
      h3 {
      font-size: clamp(1.65rem, 9vw, 2.7rem);
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__scene-head
      > p {
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__stakeholders {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x proximity;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__stakeholders
      p {
      min-width: min(15rem, 72vw);
      scroll-snap-align: start;
    }

    .performance-narrative-stage[data-presenting='true']
      .performance-narrative-stage__controls {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-narrative-stage *,
    .performance-narrative-stage *::before,
    .performance-narrative-stage *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
</style>
