<script lang="ts">
  /**
   * PageHero — Shared hero section for secondary .agency pages
   *
   * Consolidates the hero-grid background + eyebrow + title + subtitle pattern
   * duplicated across about, services, methodology, and products pages.
   *
   * Usage:
   *   <PageHero
   *     eyebrow="About"
   *     title="I build connections."
   *     subtitle="Optional subtitle text"
   *     accentEyebrow={true}
   *   />
   */
  import { BlurFade, AnimatedShinyText } from '@create-something/canon/magicui';
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow: string;
    title: string;
    subtitle?: string;
    /** When true, wraps eyebrow in AnimatedShinyText for the scarcity/accent signal */
    accentEyebrow?: boolean;
    /** Optional additional content rendered below subtitle */
    children?: Snippet;
    /** Extra CSS class on the section */
    class?: string;
  }

  let {
    eyebrow,
    title,
    subtitle,
    accentEyebrow = false,
    children,
    class: className = ''
  }: Props = $props();
</script>

<section class="hero {className}">
  <div class="hero-grid" aria-hidden="true"></div>
  <div class="hero-content">
    <BlurFade delay={0}>
      <p class="hero-eyebrow">
        {#if accentEyebrow}
          <AnimatedShinyText>{eyebrow}</AnimatedShinyText>
        {:else}
          {eyebrow}
        {/if}
      </p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">{title}</h1>
    </BlurFade>
    {#if subtitle}
      <BlurFade delay={0.2}>
        <p class="hero-subtitle">{subtitle}</p>
      </BlurFade>
    {/if}
    {#if children}
      <BlurFade delay={0.25}>
        {@render children()}
      </BlurFade>
    {/if}
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
    overflow: hidden;
  }

  /* Subtle CSS grid — static, lightweight, used on all secondary pages */
  .hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    text-align: center;
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }

  .hero-eyebrow {
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-5, 1.5rem);
    font-weight: var(--font-semibold);
  }

  /* When accentEyebrow is true the AnimatedShinyText handles colour internally,
	   but we still want the base colour to be the accent blue so the shimmer
	   sweeps over the right hue. */
  .hero-eyebrow :global(.shiny-text) {
    color: rgba(96, 165, 250, 0.9);
  }

  .hero-title {
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-5, 1.5rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
  }

  .hero-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    max-width: 42rem;
    margin: 0 auto;
    line-height: var(--leading-relaxed);
  }

  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: var(--text-h1);
    }
  }
</style>
