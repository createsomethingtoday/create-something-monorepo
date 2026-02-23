<script lang="ts">
  /**
   * PageCTA — Shared CTA section for all .agency pages
   *
   * Consolidates the closing CTA pattern duplicated 5× across pages.
   * Uses ShimmerButton for primary action. Optional AnimatedBeam via showBeam prop.
   *
   * Usage:
   *   <PageCTA
   *     heading="Limited roster. Let's talk."
   *     subtext="Book a call..."
   *     primaryHref="/book"
   *     primaryLabel="Book a Call"
   *     secondaryHref="/products"
   *     secondaryLabel="See what I've built →"
   *   />
   */
  import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';

  interface Props {
    heading: string;
    subtext?: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
  }

  let { heading, subtext, primaryHref, primaryLabel, secondaryHref, secondaryLabel }: Props =
    $props();
</script>

<section class="cta-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="cta-heading">{heading}</h2>
    </BlurFade>
    {#if subtext}
      <BlurFade delay={0.1}>
        <p class="cta-subtext">{subtext}</p>
      </BlurFade>
    {/if}
    <BlurFade delay={0.2}>
      <div class="cta-buttons">
        <ShimmerButton href={primaryHref}>{primaryLabel}</ShimmerButton>
        {#if secondaryHref && secondaryLabel}
          <a href={secondaryHref} class="cta-secondary">{secondaryLabel}</a>
        {/if}
      </div>
    </BlurFade>
  </div>
</section>

<style>
  .cta-section {
    padding: var(--section-padding, 6rem) 0;
    border-top: 1px solid var(--color-border-default);
    text-align: center;
  }

  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  .cta-heading {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
    letter-spacing: var(--tracking-tight, -0.015em);
  }

  .cta-subtext {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-6, 2rem);
    max-width: var(--content-width-sm);
    margin-left: auto;
    margin-right: auto;
    line-height: var(--leading-relaxed);
  }

  .cta-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4, 1rem);
  }

  .cta-secondary {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    text-decoration: none;
    transition: color var(--duration-standard) var(--ease-standard);
  }

  .cta-secondary:hover {
    color: var(--color-fg-secondary);
  }

  @media (max-width: 768px) {
    .cta-section {
      padding: var(--layout-3, 4rem) 0;
    }
  }
</style>
