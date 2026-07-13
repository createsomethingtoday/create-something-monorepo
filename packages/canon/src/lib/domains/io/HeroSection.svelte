<script lang="ts">
  /**
   * Hero Section for createsomething.io
   *
   * Two paths to the same understanding:
   *   - Experiments: Try it yourself, see what happens
   *   - Papers: Read the analysis, understand the patterns
   *
   * The distinction is practical: some people learn by doing, others by reading.
   * Both lead to the same insights.
   *
   * VISUAL DISTINCTION:
   *   - Experiments: More interactive hover (you're going to DO something)
   *   - Papers: Subtle hover (you're going to READ something)
   */
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
</script>

<section class="hero relative overflow-hidden pt-24 pb-32 px-6">
  <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    <AnimatedGridPattern
      numSquares={25}
      maxOpacity={0.08}
      duration={4}
      repeatDelay={2}
      width={60}
      height={60}
      class="hero-animated-grid"
    />
  </div>
  <div class="hero-container relative z-10">
    <!-- Masthead -->
    <BlurFade delay={0}>
      <div class="masthead">
        <span class="masthead-text">CREATE SOMETHING</span>
      </div>
    </BlurFade>

    <!-- Main Headline -->
    <BlurFade delay={0.1}>
      <h1 class="headline">AI Development Research with Real Data</h1>
    </BlurFade>

    <!-- Subheadline -->
    <BlurFade delay={0.2}>
      <p class="subheadline">
        47 tracked experiments. 15 research papers. Every piece shows what was built, how long it
        took, what it cost, and what actually worked.
      </p>
    </BlurFade>

    <!-- The Two Paths -->
    <BlurFade delay={0.3} class="w-full">
      <div class="paths-container">
        <!-- Experiments Path -->
        <a href="/experiments" class="path-card experiments">
          <div class="path-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          </div>
          <h2 class="path-title">Experiments</h2>
          <p class="path-mode">Try it yourself</p>
          <p class="path-description">
            Interactive demonstrations you can run. Build something, see the results, learn by
            doing. Each experiment tracks time, cost, and outcomes.
          </p>
          <span class="path-cta">
            Explore Experiments
            <svg viewBox="0 0 20 20" fill="currentColor" class="cta-arrow">
              <path
                fill-rule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
        </a>

        <!-- Divider -->
        <div class="path-divider">
          <span class="divider-text">or</span>
        </div>

        <!-- Papers Path -->
        <a href="/papers" class="path-card papers">
          <div class="path-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <h2 class="path-title">Papers</h2>
          <p class="path-mode">Read the analysis</p>
          <p class="path-description">
            Research papers with methodology, data, and conclusions. Each paper documents what we
            tested, what we found, and what it means.
          </p>
          <span class="path-cta">
            Read Papers
            <svg viewBox="0 0 20 20" fill="currentColor" class="cta-arrow">
              <path
                fill-rule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
        </a>
      </div>
    </BlurFade>

    <!-- Connection Note -->
    <BlurFade delay={0.4}>
      <p class="hermeneutic-note">
        Both paths connect. Experiments test what papers theorize. Papers explain what experiments
        reveal.
      </p>
    </BlurFade>
  </div>
</section>

<style>
  /* ==========================================================================
	   Hero Section - Canonical CSS
	   ========================================================================== */
  :global(.hero-animated-grid) {
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
  }

  .hero {
    position: relative;
    padding: var(--space-performance-xl) var(--space-performance-md);
    overflow: hidden;
  }

  .hero-container {
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
  }

  /* Masthead */
  .masthead {
    margin-bottom: var(--space-performance-md);
  }

  .masthead-text {
    font-size: var(--text-performance-body);
    font-weight: var(--font-performance-medium);
    letter-spacing: var(--tracking-performance-widest);
    color: var(--color-performance-fg-secondary);
  }

  /* Headline */
  .headline {
    font-size: var(--text-performance-display);
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
    line-height: var(--leading-performance-tight);
    margin: 0 0 var(--space-performance-sm) 0;
    text-align: center;
  }

  /* Subheadline */
  .subheadline {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-muted);
    max-width: 700px;
    margin: 0 auto var(--space-performance-lg);
    line-height: var(--leading-performance-relaxed);
  }

  /* Paths Container */
  .paths-container {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-performance-md);
    align-items: stretch;
    margin-bottom: var(--space-performance-lg);
  }

  @media (max-width: 768px) {
    .paths-container {
      grid-template-columns: 1fr;
      gap: var(--space-performance-sm);
    }
  }

  /* ==========================================================================
	   PATH CARDS: Ontological Distinction Through Interaction
	   Experiments (Zuhandenheit): Engaged, participatory, prominent lift
	   Papers (Vorhandenheit): Observational, contemplative, subtle shift
	   ========================================================================== */

  .path-card {
    display: flex;
    flex-direction: column;
    padding: var(--space-performance-md);
    /* Glass Design System - "The Automation Layer" */
    background-color: var(--glass-performance-bg-light);
    backdrop-filter: blur(var(--glass-performance-blur-md)) var(--glass-performance-saturate-md);
    border: 1px solid var(--glass-performance-border-light);
    border-radius: var(--radius-performance-scale-lg);
    text-decoration: none;
    transition: all var(--duration-performance-standard) var(--ease-performance-standard);
  }

  /* Experiments: Zuhandenheit — Engaged practice, participatory lift */
  .path-card.experiments {
    border-color: var(--glass-performance-border-light);
  }

  .path-card.experiments:hover {
    border-color: var(--glass-performance-border-medium);
    background-color: var(--glass-performance-bg-medium);
    transform: translateY(-4px); /* Prominent lift — participatory */
    box-shadow: var(--glass-performance-shadow-md);
  }

  /* Papers: Vorhandenheit — Detached analysis, contemplative stillness */
  .path-card.papers {
    border-color: var(--glass-performance-border-light);
  }

  .path-card.papers:hover {
    border-color: var(--glass-performance-border-light); /* Minimal change */
    background-color: var(--glass-performance-bg-subtle);
    transform: translateY(-1px); /* Subtle — observational */
    box-shadow: none;
  }

  .path-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--space-performance-sm);
    color: var(--color-performance-fg-muted);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .path-card:hover .path-icon {
    color: var(--color-performance-fg-secondary);
  }

  .path-title {
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-semibold);
    color: var(--color-performance-fg-primary);
    margin: 0 0 var(--space-performance-xs) 0;
  }

  .path-mode {
    font-size: var(--text-performance-caption);
    font-style: italic;
    color: var(--color-performance-fg-muted);
    margin: 0 0 var(--space-performance-sm) 0;
    letter-spacing: var(--tracking-performance-wide);
  }

  .path-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
    margin: 0;
    flex-grow: 1;
  }

  .path-cta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs);
    margin-top: var(--space-performance-md);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    color: var(--color-performance-fg-tertiary);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .path-card:hover .path-cta {
    color: var(--color-performance-fg-primary);
  }

  .cta-arrow {
    width: 16px;
    height: 16px;
    transition: transform var(--duration-performance-micro) var(--ease-performance-standard);
  }

  /* Experiments arrow: continuous motion suggestion */
  .path-card.experiments:hover .cta-arrow {
    transform: translateX(6px); /* More movement — engagement */
  }

  /* Papers arrow: measured, deliberate */
  .path-card.papers:hover .cta-arrow {
    transform: translateX(2px); /* Subtle — contemplation */
  }

  /* Divider */
  .path-divider {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .divider-text {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .path-divider {
      padding: var(--space-performance-xs) 0;
    }

    .divider-text::before,
    .divider-text::after {
      content: '—';
      margin: 0 var(--space-performance-sm);
      color: var(--color-performance-border-default);
    }
  }

  /* Hermeneutic Note */
  .hermeneutic-note {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    font-style: italic;
    max-width: 600px;
    margin: 0 auto;
    line-height: var(--leading-performance-relaxed);
  }

  /* ==========================================================================
	   STAGGERED REVEAL: Hermeneutic Scaffolding
	   Identity (who) → Offer (what) → Explanation (why) → Affordance (how)
	   This sequence respects cognitive temporality — understanding is a process.
	   ========================================================================== */
</style>
