<script lang="ts">
 import SceneLead from "../background/SceneLead.svelte";
  import { onMount, type Snippet } from 'svelte';
  import BackgroundScene from '../background/BackgroundScene.svelte';
  import { imageAspectRatio, type CanonBackgroundScene } from '../background/scene.js';
  import PerformancePaperStudioCanvas from './PerformancePaperStudioCanvas.svelte';
  import type { PerformanceMediaVideo } from './media/types';
  import type { PerformancePaperProperty } from './media/paper-studio';

  export type PerformanceCampaignOpeningMode = 'ink' | 'paper';
  export type PerformanceCampaignOpeningDensity = 'standard' | 'compact';
  export type PerformanceCampaignOpeningExpression = 'field' | 'editorial';

  export type PerformanceCampaignVideo = PerformanceMediaVideo;

  export interface PerformanceCampaignMedia {
    src: string;
    mobileSrc?: string;
    alt: string;
    material?: 'paper' | 'water';
    width?: number;
    height?: number;
    /** Dimensions of the authored mobile image, when it differs. */
    mobileWidth?: number;
    mobileHeight?: number;
    objectPosition?: string;
    colorMode?: 'monochrome' | 'natural';
    video?: PerformanceCampaignVideo;
    studioShot?: PerformancePaperProperty;
    paperObjectVisible?: boolean;
  }

  export interface PerformanceCampaignProof {
    label: string;
    value: string;
  }

  interface Props {
    background?: CanonBackgroundScene;
    eyebrow: string;
    title: string;
    lede?: string;
    /** Optional when a semantic artifact supplies the complete visual field. */
    media?: PerformanceCampaignMedia;
    proof?: PerformanceCampaignProof[];
    mode?: PerformanceCampaignOpeningMode;
    density?: PerformanceCampaignOpeningDensity;
    expression?: PerformanceCampaignOpeningExpression;
    /** Names the distinct job of a public property within the shared editorial system. */
    propertyRole?: string;
    priority?: boolean;
    /** Marks this opening as the point before which mobile search stays out of the way. */
    mobileSearchBoundary?: boolean;
    actions?: Snippet;
    artifact?: Snippet;
    /** A small, non-interactive annotation that should not change campaign layout. */
    ornament?: Snippet;
    artifactOwnsMedia?: boolean;
    /** Places a semantic artifact between the hero action and proof rail on small screens. */
    artifactMobilePlacement?: 'overlay' | 'flow';
    /** Keeps authored portrait media behind the editorial proposition instead of flowing below it. */
    mediaMobilePlacement?: 'flow' | 'background';
  }

  let {
    background,
    eyebrow,
    title,
    lede,
    media,
    proof = [],
    mode = 'ink',
    density = 'standard',
    expression = 'field',
    propertyRole,
    priority = true,
    mobileSearchBoundary = false,
    actions,
    artifact,
    ornament,
    artifactOwnsMedia = false,
    artifactMobilePlacement = 'overlay',
    mediaMobilePlacement = 'flow'
  }: Props = $props();

  let scene = $derived(background ?? (media ? {src:media.src,mobileSrc:media.mobileSrc,description:artifactOwnsMedia ? undefined : media.alt,position:media.objectPosition,aspectRatio:imageAspectRatio(media.width,media.height),mobileAspectRatio:imageAspectRatio(media.mobileWidth,media.mobileHeight)} : undefined));
  let motionAllowed = $state(false);
  let studioReady = $state(false);
  let titleParts = $derived(
    title.split('.').map((part) => {
      const match = part.match(/^(.*?)(\S+)$/s);
      return match ? { prefix: match[1], word: match[2] } : { prefix: part, word: '' };
    })
  );

  onMount(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!reducedMotion) {
      motionAllowed = true;
      return;
    }

    const syncMotionPreference = () => {
      motionAllowed = !reducedMotion.matches;
    };

    syncMotionPreference();
    reducedMotion.addEventListener('change', syncMotionPreference);

    return () => reducedMotion.removeEventListener('change', syncMotionPreference);
  });
</script>

<svelte:head>
 {#if priority && scene && !artifactOwnsMedia}
  <link rel="preload" as="image" href={scene.src} media={scene.mobileSrc?'(min-width: 48rem)':undefined}/>
  {#if scene.mobileSrc}<link rel="preload" as="image" href={scene.mobileSrc} media="(max-width: 47.99rem)"/>{/if}
 {/if}
</svelte:head>

<section
  class="performance-campaign-opening"
  class:performance-campaign-opening--paper-studio={mode === 'paper' && Boolean(media?.studioShot)}
  data-background={scene && !artifactOwnsMedia ? "scene" : undefined}
  data-mode={mode}
  data-density={density}
  data-expression={expression}
  data-has-artifact={artifact ? 'true' : 'false'}
  data-artifact-owns-media={artifactOwnsMedia ? 'true' : undefined}
  data-artifact-mobile-placement={artifact ? artifactMobilePlacement : undefined}
  data-media-mobile-placement={scene ? "background" : media ? mediaMobilePlacement : undefined}
  data-mobile-search-boundary={mobileSearchBoundary ? 'true' : undefined}
  aria-label={eyebrow}
>
 {#if scene && !artifactOwnsMedia}
 <SceneLead {scene} colorMode={media?.colorMode ?? (background ? "natural" : "monochrome")}>
      <header>
      <div class="performance-campaign-opening__identity">
        <span class="performance-campaign-opening__eyebrow">{eyebrow}</span>
        {#if propertyRole}
          <span class="performance-campaign-opening__property-role">{propertyRole}</span>
        {/if}
      </div>
      <h1>
        {#each titleParts as part, index}{part.prefix}{#if part.word}<span
              class="performance-campaign-opening__punctuated-word"
              >{part.word}{#if index < titleParts.length - 1}<span
                  class="performance-campaign-opening__period">.</span
                >{/if}</span
            >{:else if index < titleParts.length - 1}<span
              class="performance-campaign-opening__period">.</span
            >{/if}{/each}
      </h1>
      {#if lede}
        <p class="performance-campaign-opening__lede">{lede}</p>
      {/if}
      {#if actions}
        <div class="performance-campaign-opening__actions">
          {@render actions()}
        </div>
      {/if}
    </header>
  {#snippet enhancement()}      {#if media?.studioShot && !artifact}
        <PerformancePaperStudioCanvas
          shot={media?.studioShot}
          onStateChange={(state) => (studioReady = state === 'ready')}
        />
      {/if}
      {#if media?.video && motionAllowed}
        <video
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          poster={media.video.poster ?? media.src}
          aria-hidden="true"
          style:object-position={media.objectPosition ?? 'center'}
        >
          {#if media.video.webm}
            <source src={media.video.webm} type="video/webm" />
          {/if}
          <source src={media.video.mp4} type="video/mp4" />
        </video>
      {/if}
{/snippet}
 </SceneLead>
 {#if proof.length || artifact || ornament}<div class="canon-scene-details">
     {#if proof.length > 0}
      <ul class="performance-campaign-opening__proof" aria-label="Campaign proof">
        {#each proof as item}
          <li>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        {/each}
      </ul>
    {/if}
 {#if artifact}<div class="performance-campaign-opening__scene-artifact">{@render artifact()}</div>{/if}
 {#if ornament}<div class="performance-campaign-opening__scene-ornament">{@render ornament()}</div>{/if}
 </div>{/if}
 {:else}
  {#if media || scene}
    <figure
      class="performance-campaign-opening__media"
      class:performance-campaign-opening__media--studio-ready={studioReady}
      class:performance-campaign-opening__media--paper-object-visible={studioReady ||
        artifactOwnsMedia ||
        media?.paperObjectVisible}
      data-scene={scene ? 'true' : undefined}
      data-color-mode={media?.colorMode ?? (background ? 'natural' : 'monochrome')}
      data-material={media?.material ?? 'unspecified'}
    >
      {#if scene && !artifactOwnsMedia}<BackgroundScene {scene}/>{/if}
      {#if media?.studioShot && !artifact}
        <PerformancePaperStudioCanvas
          shot={media?.studioShot}
          onStateChange={(state) => (studioReady = state === 'ready')}
        />
      {/if}
      {#if media?.video && motionAllowed}
        <video
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          poster={media.video.poster ?? media.src}
          aria-hidden="true"
          style:object-position={media.objectPosition ?? 'center'}
        >
          {#if media.video.webm}
            <source src={media.video.webm} type="video/webm" />
          {/if}
          <source src={media.video.mp4} type="video/mp4" />
        </video>
      {/if}
      <div class="performance-campaign-opening__grid" aria-hidden="true"></div>
    </figure>
  {/if}

  <div class="performance-campaign-opening__content">
    <header>
      <div class="performance-campaign-opening__identity">
        <span class="performance-campaign-opening__eyebrow">{eyebrow}</span>
        {#if propertyRole}
          <span class="performance-campaign-opening__property-role">{propertyRole}</span>
        {/if}
      </div>
      <h1>
        {#each titleParts as part, index}{part.prefix}{#if part.word}<span
              class="performance-campaign-opening__punctuated-word"
              >{part.word}{#if index < titleParts.length - 1}<span
                  class="performance-campaign-opening__period">.</span
                >{/if}</span
            >{:else if index < titleParts.length - 1}<span
              class="performance-campaign-opening__period">.</span
            >{/if}{/each}
      </h1>
      {#if lede}
        <p class="performance-campaign-opening__lede">{lede}</p>
      {/if}
      {#if actions}
        <div class="performance-campaign-opening__actions">
          {@render actions()}
        </div>
      {/if}
    </header>

    {#if proof.length > 0}
      <ul class="performance-campaign-opening__proof" aria-label="Campaign proof">
        {#each proof as item}
          <li>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if artifact}
    <div class="performance-campaign-opening__artifact">
      {@render artifact()}
    </div>
  {/if}

  {#if ornament}
    <div class="performance-campaign-opening__ornament">
      {@render ornament()}
    </div>
  {/if}
{/if}
</section>

<style>
  .performance-campaign-opening {
    --performance-campaign-scrim-copy: color-mix(in srgb, var(--color-performance-paper) 94%, transparent);
    --performance-campaign-scrim-mid: color-mix(in srgb, var(--color-performance-paper) 24%, transparent);
    --performance-campaign-scrim-edge: color-mix(in srgb, var(--color-performance-paper) 0%, transparent);
    --performance-campaign-scrim-bottom: color-mix(in srgb, var(--color-performance-paper) 48%, transparent);
    position: relative;
    display: grid;
    min-height: clamp(38rem, 82svh, 58rem);
    padding: 0;
    overflow: hidden;
    background: var(--color-performance-paper, #000);
    color: var(--color-performance-ink, #f2f2f2);
    isolation: isolate;
  }

  .performance-campaign-opening[data-mode='paper'] {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .performance-campaign-opening[data-density='compact'] {
    min-height: clamp(34rem, 72svh, 48rem);
  }

  .performance-campaign-opening__media,
  .performance-campaign-opening__media video {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  .performance-campaign-opening__media video {
    object-fit: cover;
  }

  .performance-campaign-opening__media :global(.canon-background-scene) {
    z-index: 0;
    opacity: 1;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .performance-campaign-opening__media--studio-ready :global(.canon-background-scene) {
    opacity: 0;
  }



  .performance-campaign-opening__media[data-color-mode='monochrome'] :global(.canon-background-scene),
  .performance-campaign-opening__media[data-color-mode='monochrome'] video {
    filter: grayscale(1) contrast(1.08);
  }

  .performance-campaign-opening__media[data-color-mode='natural'] :global(.canon-background-scene),
  .performance-campaign-opening__media[data-color-mode='natural'] video {
    filter: contrast(1.08);
  }

  .performance-campaign-opening__media::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-performance-paper) 99%, transparent) 0%,
        var(--performance-campaign-scrim-copy) 36%,
        var(--performance-campaign-scrim-mid) 58%,
        color-mix(in srgb, var(--color-performance-paper) 4%, transparent) 76%,
        var(--performance-campaign-scrim-edge) 100%
      ),
      linear-gradient(
        0deg,
        var(--performance-campaign-scrim-bottom) 0%,
        color-mix(in srgb, var(--color-performance-paper) 8%, transparent) 48%,
        color-mix(in srgb, var(--color-performance-paper) 0%, transparent) 100%
      );
    z-index: 1;
  }

  .performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media {
    opacity: 1;
  }

  .performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media::after {
    background:
      linear-gradient(
        90deg,
        var(--color-performance-paper, #f3f3f0) 0%,
        color-mix(in srgb, var(--color-performance-paper) 98%, transparent) 38%,
        color-mix(in srgb, var(--color-performance-paper) 72%, transparent) 53%,
        color-mix(in srgb, var(--color-performance-paper) 14%, transparent) 72%,
        color-mix(in srgb, var(--color-performance-paper) 0%, transparent) 100%
      ),
      linear-gradient(0deg, color-mix(in srgb, var(--color-performance-paper) 82%, transparent) 0%, color-mix(in srgb, var(--color-performance-paper) 0%, transparent) 32%);
  }

  .performance-campaign-opening[data-mode='paper']
    .performance-campaign-opening__media--paper-object-visible::after {
    background:
      linear-gradient(
        90deg,
        var(--color-performance-paper, #f3f3f0) 0%,
        color-mix(in srgb, var(--color-performance-paper) 98%, transparent) 34%,
        color-mix(in srgb, var(--color-performance-paper) 38%, transparent) 46%,
        color-mix(in srgb, var(--color-performance-paper) 4%, transparent) 58%,
        color-mix(in srgb, var(--color-performance-paper) 0%, transparent) 68%
      ),
      linear-gradient(0deg, color-mix(in srgb, var(--color-performance-paper) 34%, transparent) 0%, color-mix(in srgb, var(--color-performance-paper) 0%, transparent) 30%);
  }

  .performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__grid {
    background:
      linear-gradient(
          90deg,
          var(--color-performance-grid, color-mix(in srgb, var(--color-performance-paper) 4.5%, transparent)) 1px,
          transparent 1px
        )
        0 0 / 25% 100%,
      linear-gradient(var(--color-performance-grid, color-mix(in srgb, var(--color-performance-paper) 4.5%, transparent)) 1px, transparent 1px) 0
        0 / 100% 25%;
  }

  .performance-campaign-opening__grid {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px) 0 0 / 25% 100%,
      linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px) 0 0 / 100% 25%;
    pointer-events: none;
  }

  .performance-campaign-opening__content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-rows: 1fr auto;
    gap: clamp(3rem, 8vw, 8rem);
    width: min(
      var(--content-width-performance, 85rem),
      calc(
        100% - var(--space-performance-page-gutter, 1.25rem) -
          var(--space-performance-page-gutter, 1.25rem)
      )
    );
    margin-inline: auto;
    padding-block: clamp(8rem, 17vh, 12rem) 1.25rem;
  }

  .performance-campaign-opening__artifact,
  .performance-campaign-opening__ornament {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
  }

  .performance-campaign-opening[data-density='compact'] .performance-campaign-opening__content {
    gap: clamp(2rem, 5vw, 4rem);
    padding-block: clamp(2.5rem, 6vh, 4rem) 1rem;
  }

  .performance-campaign-opening[data-density='compact'] h1 {
    max-width: 15ch;
    font-size: clamp(3rem, 5.4vw, 5.5rem);
  }

  .performance-campaign-opening__content header {
    display: grid;
    align-content: center;
    justify-items: start;
    gap: 1rem;
    max-width: 52rem;
  }

  .performance-campaign-opening__identity {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: center;
  }

  @media (min-width: 48rem) {
    .performance-campaign-opening[data-has-artifact='true']
      .performance-campaign-opening__content
      header {
      width: min(44%, 37rem);
    }
  }

  .performance-campaign-opening__eyebrow,
  .performance-campaign-opening__property-role,
  .performance-campaign-opening__proof span {
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 600);
    line-height: 1.25;
    text-transform: uppercase;
  }

  .performance-campaign-opening__eyebrow {
    padding: 0.42rem 0.62rem;
    border: 1px solid currentColor;
  }

  .performance-campaign-opening__property-role {
    opacity: 0.72;
  }

  .performance-campaign-opening h1 {
    max-width: 13ch;
    margin: 0;
    font-family: var(
      --font-performance-display,
      var(--font-performance-display, var(--font-performance-sans))
    );
    font-size: clamp(3.25rem, 8vw, 7.5rem);
    font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500));
    font-kerning: normal;
    font-feature-settings:
      'kern' 1,
      'liga' 1;
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
    text-wrap: balance;
  }

  .performance-campaign-opening__period {
    display: inline;
    margin-inline-start: 0.055em;
    letter-spacing: normal;
  }

  .performance-campaign-opening__punctuated-word {
    white-space: nowrap;
  }

  .performance-campaign-opening__lede {
    max-width: 40rem;
    margin: 0;
    color: var(--color-performance-fg-secondary);
    font-size: clamp(1rem, 1.7vw, 1.3rem);
    line-height: 1.45;
  }

  .performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__lede {
    color: var(--color-performance-muted, #5e6268);
  }

  .performance-campaign-opening__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .performance-campaign-opening .performance-campaign-opening__actions :global(.btn-primary) {
    border-color: var(--color-performance-brand-primary);
    background: var(--color-performance-brand-primary);
    color: var(--color-performance-panel);
  }
  .performance-campaign-opening .performance-campaign-opening__actions :global(.btn-primary:hover) {
    filter: brightness(.94);
  }
  .performance-campaign-opening .performance-campaign-opening__actions :global(.btn-secondary) {
    border-color: var(--color-performance-border-emphasis);
    background: var(--color-performance-panel);
    color: var(--color-performance-ink);
    backdrop-filter: none;
  }
  .performance-campaign-opening .performance-campaign-opening__actions :global(.btn-secondary:hover) {
    background: var(--color-performance-bg-surface-hover);
  }
  .performance-campaign-opening__actions :global(.btn:focus-visible) {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 3px;
  }

  .performance-campaign-opening__proof {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    margin: 0;
    padding: 0;
    border-top: 1px solid currentColor;
    list-style: none;
  }

  .performance-campaign-opening__proof li {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    border-right: 1px solid currentColor;
  }

  .performance-campaign-opening__proof span {
    opacity: 0.74;
  }

  .performance-campaign-opening__proof strong {
    font-size: 0.95rem;
    font-weight: var(--font-performance-medium, 500);
  }

  @media (max-width: 47.99rem) {
    .performance-campaign-opening {
      --performance-campaign-scrim-copy: color-mix(in srgb, var(--color-performance-paper) 97%, transparent);
      --performance-campaign-scrim-mid: color-mix(in srgb, var(--color-performance-paper) 88%, transparent);
      --performance-campaign-scrim-edge: color-mix(in srgb, var(--color-performance-paper) 32%, transparent);
      min-height: 44rem;
    }

    .performance-campaign-opening__media::after {
      background:
        linear-gradient(
          0deg,
          var(--performance-campaign-scrim-copy) 0%,
          var(--performance-campaign-scrim-mid) 62%,
          var(--performance-campaign-scrim-edge) 86%,
          color-mix(in srgb, var(--color-performance-paper) 14%, transparent) 100%
        ),
        linear-gradient(90deg, color-mix(in srgb, var(--color-performance-paper) 72%, transparent), color-mix(in srgb, var(--color-performance-paper) 28%, transparent));
    }

    .performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media::after {
      background:
        linear-gradient(
          180deg,
          var(--color-performance-paper, #f3f3f0) 0%,
          color-mix(in srgb, var(--color-performance-paper) 98%, transparent) 48%,
          color-mix(in srgb, var(--color-performance-paper) 56%, transparent) 68%,
          color-mix(in srgb, var(--color-performance-paper) 76%, transparent) 100%
        ),
        linear-gradient(90deg, color-mix(in srgb, var(--color-performance-paper) 90%, transparent), color-mix(in srgb, var(--color-performance-paper) 28%, transparent));
    }

    .performance-campaign-opening[data-mode='paper']
      .performance-campaign-opening__media--paper-object-visible::after {
      background:
        linear-gradient(
          180deg,
          var(--color-performance-paper, #f3f3f0) 0%,
          color-mix(in srgb, var(--color-performance-paper) 98%, transparent) 46%,
          color-mix(in srgb, var(--color-performance-paper) 72%, transparent) 53%,
          color-mix(in srgb, var(--color-performance-paper) 14%, transparent) 62%,
          color-mix(in srgb, var(--color-performance-paper) 0%, transparent) 72%
        ),
        linear-gradient(90deg, color-mix(in srgb, var(--color-performance-paper) 36%, transparent), color-mix(in srgb, var(--color-performance-paper) 0%, transparent));
    }

    .performance-campaign-opening__content {
      width: min(
        calc(
          100% - var(--space-performance-page-gutter, 0.75rem) -
            var(--space-performance-page-gutter, 0.75rem)
        ),
        var(--content-width-performance, 85rem)
      );
      padding-block: 7rem 0.75rem;
    }

    .performance-campaign-opening[data-density='compact'] {
      min-height: 42rem;
    }

    .performance-campaign-opening[data-has-artifact='true'][data-density='compact'] {
      min-height: 64rem;
    }

    .performance-campaign-opening--paper-studio:not([data-has-artifact='true']) {
      min-height: 60rem;
    }

    .performance-campaign-opening[data-density='compact'] .performance-campaign-opening__content {
      padding-block: 5.5rem 0.75rem;
    }

    .performance-campaign-opening[data-has-artifact='true'] .performance-campaign-opening__content {
      grid-template-rows: auto auto;
      align-content: space-between;
    }

    .performance-campaign-opening--paper-studio .performance-campaign-opening__content header {
      align-content: start;
      align-self: start;
      padding-top: 1.5rem;
    }

    .performance-campaign-opening__proof {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .performance-campaign-opening[data-artifact-mobile-placement='flow'] {
      grid-template-rows: auto auto auto;
      min-height: 0;
    }

    .performance-campaign-opening[data-artifact-mobile-placement='flow'][data-density='compact'] {
      min-height: 0;
    }

    .performance-campaign-opening[data-artifact-mobile-placement='flow']
      .performance-campaign-opening__content {
      display: contents;
    }

    .performance-campaign-opening[data-artifact-mobile-placement='flow']
      .performance-campaign-opening__content
      header {
      position: relative;
      z-index: 2;
      grid-row: 1;
      width: min(
        calc(
          100% - var(--space-performance-page-gutter, 0.75rem) -
            var(--space-performance-page-gutter, 0.75rem)
        ),
        var(--content-width-performance, 85rem)
      );
      margin-inline: auto;
      padding-block: 5.5rem 2rem;
    }

    .performance-campaign-opening[data-artifact-mobile-placement='flow']
      .performance-campaign-opening__artifact {
      position: relative;
      inset: auto;
      z-index: 3;
      grid-row: 2;
      width: min(
        calc(
          100% - var(--space-performance-page-gutter, 0.75rem) -
            var(--space-performance-page-gutter, 0.75rem)
        ),
        var(--content-width-performance, 85rem)
      );
      margin-inline: auto;
      padding-bottom: 0.75rem;
    }

    .performance-campaign-opening[data-artifact-mobile-placement='flow']
      .performance-campaign-opening__proof {
      position: relative;
      z-index: 2;
      grid-row: 3;
      width: min(
        calc(
          100% - var(--space-performance-page-gutter, 0.75rem) -
            var(--space-performance-page-gutter, 0.75rem)
        ),
        var(--content-width-performance, 85rem)
      );
      margin-inline: auto;
      margin-bottom: 0.75rem;
    }
  }

  .performance-campaign-opening[data-expression='editorial'] {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(max(44rem, 82svh), max-content);
    box-sizing: border-box;
    width: 100%;
    min-height: 44rem;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: var(--color-performance-paper, #181312);
    color: var(--color-performance-fg-primary, #f3ebe4);
  }

  .performance-campaign-opening[data-expression='editorial']::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-performance-paper) 99%, transparent) 0%,
        color-mix(in srgb, var(--color-performance-paper) 90%, transparent) 43%,
        color-mix(in srgb, var(--color-performance-paper) 24%, transparent) 74%,
        color-mix(in srgb, var(--color-performance-paper) 8%, transparent) 100%
      ),
      linear-gradient(0deg, color-mix(in srgb, var(--color-performance-paper) 74%, transparent), transparent 46%);
    pointer-events: none;
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__content {
    z-index: 3;
    grid-column: 1;
    grid-row: 1;
    grid-template-rows: 1fr auto;
    box-sizing: border-box;
    width: min(var(--content-width-performance-editorial, 90rem), calc(100% - 2rem));
    min-width: 0;
    margin: 0 auto;
    padding: clamp(7rem, 14vh, 10rem) 0 clamp(1.25rem, 3vw, 2rem);
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-performance-fg-primary, #f3ebe4);
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__content
    header {
    width: min(48%, 42rem);
    max-width: 42rem;
  }

  .performance-campaign-opening[data-expression='editorial'] h1,
  .performance-campaign-opening[data-expression='editorial'][data-density='compact'] h1 {
    max-width: 11ch;
    font-family: var(--font-performance-editorial);
    font-size: clamp(4rem, 7vw, 7.4rem);
    font-weight: var(--font-performance-editorial-weight, 400);
    letter-spacing: -0.045em;
    line-height: var(--leading-performance-editorial, 1.1);
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__identity {
    width: auto;
    justify-content: flex-start;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__eyebrow {
    padding: 0.42rem 0.62rem;
    border: 1px solid currentColor;
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__property-role {
    text-align: right;
  }

  .performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__lede {
    max-width: 38rem;
    color: var(--color-performance-fg-secondary);
    font-size: clamp(1rem, 1.35vw, 1.2rem);
  }

  .performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__proof {
    border-color: color-mix(in srgb, var(--color-performance-fg-primary) 46%, transparent);
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__proof
    li {
    border-color: color-mix(in srgb, var(--color-performance-fg-primary) 34%, transparent);
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__actions
    :global(.btn-primary) {
    border-color: var(--color-performance-brand-primary, #fcaa2d);
    background: var(--color-performance-brand-primary, #fcaa2d);
    color: var(--color-performance-paper, #181312);
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__actions
    :global(.btn-secondary) {
    border-color: color-mix(in srgb, var(--color-performance-fg-primary) 66%, transparent);
    background: var(--color-performance-panel);
    color: var(--color-performance-fg-primary, #f3ebe4);
    backdrop-filter: none;
  }

  .performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__media,
  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__artifact {
    position: absolute;
    inset: 0 0 0 auto;
    z-index: 1;
    grid-column: 1;
    grid-row: 1;
    box-sizing: border-box;
    width: min(66%, 72rem);
    min-width: 0;
    min-height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: var(--color-performance-paper, #181312);
  }

  .performance-campaign-opening[data-expression='editorial']
    .performance-campaign-opening__media::after {
    background: linear-gradient(180deg, transparent 58%, color-mix(in srgb, var(--color-performance-paper) 32%, transparent));
  }

  .performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__grid {
    opacity: 0.42;
  }

  @media (max-width: 63.99rem) {
    .performance-campaign-opening[data-expression='editorial'] {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
      width: 100%;
      min-height: 0;
      padding: 0;
    }

    .performance-campaign-opening[data-expression='editorial']::before {
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-performance-paper) 94%, transparent) 0%,
        color-mix(in srgb, var(--color-performance-paper) 82%, transparent) 48%,
        color-mix(in srgb, var(--color-performance-paper) 22%, transparent) 72%,
        color-mix(in srgb, var(--color-performance-paper) 72%, transparent) 100%
      );
    }

    .performance-campaign-opening[data-expression='editorial']
      .performance-campaign-opening__content {
      display: grid;
      grid-column: 1;
      grid-row: 1;
      gap: 2rem;
      width: min(100% - 1.5rem, 46rem);
      min-height: 42rem;
      padding: 6.5rem 0 1rem;
    }

    .performance-campaign-opening[data-expression='editorial']
      .performance-campaign-opening__content
      header {
      width: 100%;
      max-width: 38rem;
    }

    .performance-campaign-opening[data-expression='editorial'] h1,
    .performance-campaign-opening[data-expression='editorial'][data-density='compact'] h1 {
      font-size: clamp(3.25rem, 15vw, 5.25rem);
    }

    .performance-campaign-opening[data-expression='editorial']
      .performance-campaign-opening__property-role {
      max-width: 12rem;
    }

    .performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__media,
    .performance-campaign-opening[data-expression='editorial']
      .performance-campaign-opening__artifact {
      position: relative;
      inset: auto;
      z-index: 1;
      grid-column: 1;
      grid-row: 2;
      width: 100%;
      min-height: clamp(24rem, 90vw, 34rem);
    }

    .performance-campaign-opening[data-expression='editorial']
      .performance-campaign-opening__proof {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
      margin: 0;
    }

    .performance-campaign-opening[data-expression='editorial'][data-media-mobile-placement='background'] {
      grid-template-rows: auto;
    }

    .performance-campaign-opening[data-expression='editorial'][data-media-mobile-placement='background']
      .performance-campaign-opening__media {
      position: absolute;
      inset: 0;
      grid-column: 1;
      grid-row: 1;
      width: 100%;
      min-height: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-campaign-opening__media :global(.canon-background-scene) {
      transition: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-campaign-opening *,
    .performance-campaign-opening *::before,
    .performance-campaign-opening *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
    }
  }

  /* Only semantic artifacts may flow; scenes stay behind HTML at every width. */
  .performance-campaign-opening .performance-campaign-opening__media{position:absolute;inset:0;width:100%;height:100%;min-height:100%;}
  .performance-campaign-opening__media :global(.canon-background-scene){z-index:0;}
  .performance-campaign-opening__content header{background:color-mix(in srgb,var(--color-performance-paper) 96%,transparent);padding:1rem;border-radius:var(--radius-performance-lg);box-sizing:border-box;}
  @media(max-width:47.99rem){.performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__content{padding-top:15rem;}}
  .performance-campaign-opening__media[data-scene='true']::after{background:none;}
  .performance-campaign-opening[data-background='scene']::before{background:none;}

 /* Authored scene lead and dense records are separate layout regions. */
 .performance-campaign-opening[data-background="scene"]{display:block;grid-template-columns:none;grid-template-rows:none;min-height:0;width:100%;padding:0;background:var(--color-performance-paper);}
 .canon-scene-details{position:relative;display:grid;gap:1.5rem;padding:clamp(1.25rem,4vw,3rem);background:var(--color-performance-paper);color:var(--color-performance-ink);border-top:1px solid var(--color-performance-line);}
</style>
