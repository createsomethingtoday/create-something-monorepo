<script lang="ts">
  import type { CanonTaskOpeningProps } from './types';
  let { art, scene, caption, children }: CanonTaskOpeningProps = $props();
</script>

<svelte:head>
  <link rel="preload" as="image" href={art.src} media="(min-width: 64.01rem)" />
  <link rel="preload" as="image" href={art.mediumSrc} media="(min-width: 48rem) and (max-width: 64rem)" />
  <link rel="preload" as="image" href={art.mobileSrc} media="(max-width: 47.99rem)" />
</svelte:head>

<div class="canon-task-opening-frame">
  <section
    class="canon-task-opening"
    data-canon-task={scene}
    style:--canon-task-image={`url('${art.src}')`}
    style:--canon-task-image-medium={`url('${art.mediumSrc}')`}
    style:--canon-task-image-mobile={`url('${art.mobileSrc}')`}
    style:--canon-task-aspect={`${art.width} / ${art.height}`}
  >
    <div class="canon-task-opening__copy">{@render children()}</div>
    <div class="canon-task-opening__reserve" aria-hidden="true"></div>
  </section>
  <p class="canon-task-opening__caption">Concept illustration · {caption}</p>
</div>

<style>
  .canon-task-opening-frame { width: min(80rem, 100%); margin: clamp(1rem, 3vw, 2.5rem) auto; }
  .canon-task-opening {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center; min-width: 0; padding: 0;
    background-color: #000; color: #fff; font-family: var(--font-performance-interface, 'Geist', sans-serif); border: 1px solid rgba(255,255,255,.22);
    background-image: var(--canon-task-image); background-repeat: no-repeat;
    background-size: 50% auto; background-position: right center;
  }
  .canon-task-opening__copy { min-width: 0; padding: 2rem; }
  .canon-task-opening__reserve { min-width: 0; width: 100%; aspect-ratio: var(--canon-task-aspect); }
  .canon-task-opening__copy :global(h1) { color: #fff; overflow-wrap: anywhere; font-size: clamp(2.25rem, 4.5vw, 4.5rem); line-height: 1.08; letter-spacing: -.045em; }
  .canon-task-opening__caption { margin: .75rem 0 0; color: var(--color-performance-fg-secondary, #bfc2ca); font: .75rem/1.6 var(--font-performance-mono, monospace); }
  @media (max-width: 64rem) {
    .canon-task-opening { grid-template-columns: minmax(0,1fr); background-image: var(--canon-task-image-medium); background-size: 100% auto; background-position: center bottom; }
  }
  @media (max-width: 47.99rem) {
    .canon-task-opening { background-image: var(--canon-task-image-mobile); }
    .canon-task-opening__copy { padding: 1rem 1rem 1.5rem; }
    .canon-task-opening-frame { margin-block: 1rem 2rem; }
    .canon-task-opening__caption { padding-inline: 1rem; }
  }
</style>
