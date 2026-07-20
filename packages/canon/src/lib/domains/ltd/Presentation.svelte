<script lang="ts">
  /**
   * Presentation Component
   *
   * A progressively enhanced slide deck. Server rendering exposes the complete
   * argument; JavaScript adds focused slide navigation and fullscreen.
   */
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    scriptUrl?: string;
    children?: import('svelte').Snippet;
  }

  let { title, subtitle, scriptUrl, children }: Props = $props();

  let currentSlide = $state(0);
  let totalSlides = $state(0);
  let slideElements: HTMLElement[] = $state([]);
  let isFullscreen = $state(false);
  let isEnhanced = $state(false);
  let containerRef: HTMLElement | null = $state(null);

  function nextSlide() {
    if (currentSlide < totalSlides - 1) currentSlide++;
  }

  function prevSlide() {
    if (currentSlide > 0) currentSlide--;
  }

  function goToSlide(index: number) {
    if (index >= 0 && index < totalSlides) currentSlide = index;
  }

  function toggleFullscreen() {
    if (!browser || !containerRef) return;

    if (!document.fullscreenElement) {
      void containerRef.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        prevSlide();
        break;
      case 'Home':
        event.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        event.preventDefault();
        goToSlide(totalSlides - 1);
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
    }
  }

  onMount(() => {
    if (containerRef) {
      slideElements = Array.from(containerRef.querySelectorAll('[data-slide]'));
      totalSlides = slideElements.length;
      slideElements.forEach((element, index) => {
        element.style.display = index === currentSlide ? 'flex' : 'none';
      });
      isEnhanced = true;
    }

    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  });

  $effect(() => {
    slideElements.forEach((element, index) => {
      element.style.display = index === currentSlide ? 'flex' : 'none';
    });
  });
</script>

<div
  class="presentation"
  class:enhanced={isEnhanced}
  class:fullscreen={isFullscreen}
  bind:this={containerRef}
>
  <header class="presentation-toolbar">
    <div class="presentation-context">
      <p class="presentation-label">Presentation</p>
      <p class="presentation-title">
        {title}{#if subtitle}<span> — {subtitle}</span>{/if}
      </p>
    </div>

    <div class="presentation-actions">
      <div class="context-links">
        <a href="/presentations">All presentations</a>
        {#if scriptUrl}
          <a href={scriptUrl} class="script-link">Read script</a>
        {/if}
      </div>

      {#if isEnhanced}
        <nav
          class="controls"
          aria-label="Presentation controls"
          aria-describedby="presentation-instructions"
        >
          <button
            class="control-btn"
            onclick={prevSlide}
            onkeydown={handleKeydown}
            disabled={currentSlide === 0}
            aria-label="Previous slide"
            aria-keyshortcuts="ArrowLeft Home"
          >
            ←
          </button>

          <span class="slide-counter" aria-live="polite">
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            class="control-btn"
            onclick={nextSlide}
            onkeydown={handleKeydown}
            disabled={currentSlide === totalSlides - 1}
            aria-label="Next slide"
            aria-keyshortcuts="ArrowRight End"
          >
            →
          </button>

          <button
            class="control-btn fullscreen-btn"
            onclick={toggleFullscreen}
            onkeydown={handleKeydown}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-keyshortcuts="F"
          >
            {isFullscreen ? '⊠' : '⊡'}
          </button>
        </nav>
      {/if}
    </div>

    {#if isEnhanced}
      <div
        class="progress-bar"
        style="--progress: {((currentSlide + 1) / totalSlides) * 100}%"
        role="progressbar"
        aria-label="Presentation progress"
        aria-valuenow={currentSlide + 1}
        aria-valuemin={1}
        aria-valuemax={totalSlides}
      ></div>
    {/if}
  </header>

  <p id="presentation-instructions" class="presentation-instructions">
    {#if isEnhanced}
      While a presentation control is focused, use Left, Right, Home, End, or F for fullscreen.
    {:else}
      The complete presentation follows in reading order.
    {/if}
  </p>

  <div class="slide-container">
    {@render children?.()}
  </div>
</div>

<style>
  .presentation {
    position: relative;
    width: 100%;
    min-height: 100svh;
    min-width: 0;
    overflow-x: clip;
    background: var(--color-performance-bg-pure);
    display: flex;
    flex-direction: column;
    color: var(--color-performance-fg-primary);
  }

  .presentation.fullscreen {
    position: fixed;
    inset: 0;
    z-index: var(--z-performance-modal);
    overflow-y: auto;
  }

  .presentation-toolbar {
    position: sticky;
    top: 0;
    z-index: var(--z-performance-sticky);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-md);
    min-width: 0;
    padding: var(--space-performance-sm) var(--space-performance-lg);
    background: color-mix(in srgb, var(--color-performance-bg-pure) 96%, transparent);
    border-bottom: 1px solid var(--color-performance-border-default);
    backdrop-filter: blur(12px);
  }

  .presentation-context {
    min-width: 0;
  }

  .presentation-label,
  .presentation-title {
    margin: 0;
  }

  .presentation-label {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-wide);
  }

  .presentation-title {
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .presentation-title span {
    font-weight: var(--font-performance-regular);
    color: var(--color-performance-fg-secondary);
  }

  .presentation-actions,
  .context-links,
  .controls {
    display: flex;
    align-items: center;
  }

  .presentation-actions {
    gap: var(--space-performance-md);
    flex: 0 0 auto;
  }

  .context-links,
  .controls {
    gap: var(--space-performance-xs);
  }

  .context-links a {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .context-links a:hover,
  .context-links a:focus-visible {
    color: var(--color-performance-fg-primary);
  }

  .control-btn {
    width: 2.5rem;
    height: 2.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-performance-bg-pure);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-full);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body);
    cursor: pointer;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .control-btn:hover:not(:disabled),
  .control-btn:focus-visible:not(:disabled) {
    border-color: var(--color-performance-border-emphasis);
    color: var(--color-performance-fg-primary);
  }

  .control-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .fullscreen-btn {
    margin-left: var(--space-performance-xs);
  }

  .slide-counter {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    min-width: 4rem;
    text-align: center;
  }

  .progress-bar {
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 2px;
    width: var(--progress);
    background: var(--color-performance-fg-muted);
    transition: width var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .presentation-instructions {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .slide-container {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-performance-xl);
  }

  .presentation.enhanced :global([data-slide]) {
    display: none;
    width: 100%;
    max-width: 960px;
    min-width: 0;
  }

  .presentation:not(.enhanced) .slide-container {
    display: grid;
    align-items: stretch;
    gap: var(--space-performance-3xl);
  }

  .presentation:not(.enhanced) :global([data-slide]) {
    display: flex !important;
    width: 100%;
    max-width: 960px;
    min-width: 0;
    margin-inline: auto;
    padding-block: var(--space-performance-xl);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .presentation:not(.enhanced) :global([data-slide]:first-child) {
    border-top: 0;
  }

  :global(.link) {
    color: var(--color-performance-fg-primary);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  :global(.link:hover) {
    color: var(--color-performance-fg-secondary);
  }

  :global(.slide-content code) {
    font-family: var(--font-performance-mono);
    font-size: 0.9em;
    padding: 0.1em 0.3em;
    border-radius: var(--radius-performance-scale-sm);
  }

  :global(.spaced) {
    margin-top: var(--space-performance-md);
  }

  :global(.slide-split ul) {
    font-size: var(--text-performance-body-sm);
    line-height: 1.4;
  }

  :global(.slide-split li) {
    margin-bottom: var(--space-performance-xs);
  }

  @media (max-width: 768px) {
    .presentation-toolbar {
      align-items: flex-start;
      gap: var(--space-performance-xs);
      padding: var(--space-performance-xs) var(--space-performance-sm);
    }

    .presentation-context {
      display: none;
    }

    .presentation-actions {
      width: 100%;
      justify-content: space-between;
      gap: var(--space-performance-xs);
    }

    .context-links {
      flex-wrap: wrap;
    }

    .context-links a {
      font-size: var(--text-performance-caption);
    }

    .controls {
      margin-left: auto;
    }

    .control-btn {
      width: 2.25rem;
      height: 2.25rem;
    }

    .fullscreen-btn {
      margin-left: 0;
    }

    .slide-counter {
      min-width: 3.5rem;
    }

    .slide-container {
      align-items: flex-start;
      padding: var(--space-performance-lg) var(--space-performance-md);
    }

    .presentation.enhanced :global([data-slide]) {
      min-height: calc(100svh - 11rem);
    }

    .presentation:not(.enhanced) .slide-container {
      gap: var(--space-performance-xl);
    }
  }
</style>
