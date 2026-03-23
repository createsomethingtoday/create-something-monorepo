<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import WorkHistoryTimeline from '$lib/components/WorkHistoryTimeline.svelte';
</script>

<SEO
  title="About | Micah Johnson — Workflow Infrastructure"
  description="I help Ops, RevOps, and systems-minded teams map risky workflows, tighten approval boundaries, and add the operating controls that usually break after launch."
  keywords="Micah Johnson, workflow mapping, policy os, ops revops automation, workflow infrastructure, cross-system architecture"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
  <div class="hero-grid-container">
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
  <div class="hero-content">
    <BlurFade delay={0}>
      <p class="hero-eyebrow">About</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">I help Ops and RevOps teams fix the part of automation that breaks after launch.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-detail">
        The rules, approvals, handoffs, and recovery paths that decide whether automation becomes
        leverage or cleanup.
      </p>
    </BlurFade>
  </div>
</section>

<!-- The Approach -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>The approach</h2>
        <p>
          Most teams do not need a giant platform initiative first. They need one workflow that
          stops creating manual cleanup. I start there with a workflow map, then add controls only
          when the cost of failure justifies the extra layer.
        </p>
        <p>
          In practice, that means three routes: a Workflow Mapping Session for ambiguous or
          high-pressure work, a constrained pilot for qualified low-risk workflows, and Policy OS
          when live automation needs approvals, blocked states, and oversight.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Background -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>Background</h2>
        <p>
          Micah Johnson. I work as a System Architect on the Marketplace Team at Webflow, where I
          build internal tooling, onboarding systems, and platform infrastructure serving millions
          of users. The problems are familiar: brittle handoffs, unclear ownership, and systems
          that look automated until exceptions show up.
        </p>
        <p>
          I have shipped integrations across Salesforce, HubSpot, Notion, Slack, Procore, and
          internal systems. That work informs where native tooling is enough, where MCP is the
          right wedge, and where approvals, policies, and recovery paths are the difference
          between launch and reliability.
        </p>
        <p>Based in Texas. Working with businesses across the US.</p>
        <p>
          <a
            href="https://www.linkedin.com/in/micahryanjohnson/"
            class="link"
            target="_blank"
            rel="noopener noreferrer">LinkedIn</a
          >
          · <a href="mailto:micah@createsomething.agency" class="link">Email</a>
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Timeline -->
<section class="about-section" id="timeline">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>Timeline</h2>
        <p>
          The through-line: using tools to abstract complexity while still understanding the
          complexity underneath. That pattern shows up in science, creative work, client services,
          marketplace systems, and now AI integrations.
        </p>
      </div>
    </BlurFade>
    <WorkHistoryTimeline />
  </div>
</section>

<!-- The System -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>The system behind the work</h2>
        <p>CREATE SOMETHING operates as a connected system. Each property has a distinct job, and each one sharpens the rest:</p>
        <ul class="circle-list">
          <li>
            <a
              href="https://createsomething.ltd"
              class="link"
              target="_blank"
              rel="noopener noreferrer"><strong>.ltd</strong></a
            > — Philosophy and principles
          </li>
          <li>
            <a
              href="https://createsomething.io"
              class="link"
              target="_blank"
              rel="noopener noreferrer"><strong>.io</strong></a
            > — Research and validated patterns
          </li>
          <li>
            <a
              href="https://createsomething.space"
              class="link"
              target="_blank"
              rel="noopener noreferrer"><strong>.space</strong></a
            > — Tools and experiments
          </li>
          <li>
            <strong>.agency</strong> — Workflow mapping, governed execution, and enterprise extension
            <span class="muted">(you are here)</span>
          </li>
        </ul>
        <p>
          Client work informs the research. Research sharpens the methodology. The methodology
          raises the bar on client work. Every part serves the whole.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Also Building -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>Partner path</h2>
        <p>
          When clients primarily need full system development and onboarding, I provide a direct
          referral path to trusted partners, including Half Dozen.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <h2 class="cta-heading">Map the workflow your team is still babysitting.</h2>
    </BlurFade>
    <BlurFade delay={0.2}>
      <div class="cta-actions">
        <a href="/book" class="cta-link-primary">Book Mapping Session →</a>
        <a href="/contact" class="cta-link-secondary">See if a workflow qualifies for a pilot →</a>
      </div>
    </BlurFade>
  </div>
</section>

<style>
  /* Section containers */
  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  /* Hero with grid background */
  .hero {
    position: relative;
    padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
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
  }

  .hero-title {
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-5, 1.5rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
  }

  .hero-detail {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    max-width: 38em;
    margin: 0 auto;
  }

  /* About Sections */
  .about-section {
    padding: var(--section-padding, 6rem) 0;
  }

  .about-content h2 {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-4, 1rem);
  }

  .about-content p {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-4, 1rem);
  }

  .about-content p:last-child {
    margin-bottom: 0;
  }

  /* Hermeneutic circle list */
  .circle-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-4, 1rem) 0;
  }

  .circle-list li {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    padding: var(--space-2, 0.5rem) 0;
  }

  .circle-list li strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .muted {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .link {
    color: var(--color-fg-primary);
    transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
  }

  .link:hover {
    opacity: 0.7;
  }

  /* CTA */
  .cta-section {
    padding: var(--section-padding, 6rem) 0;
    text-align: center;
  }

  .cta-heading {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .cta-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4, 1rem);
  }

  .cta-link-primary {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
  }

  .cta-link-primary:hover {
    opacity: 0.7;
  }

  .cta-link-secondary {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .cta-link-secondary:hover {
    color: var(--color-fg-primary);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: var(--text-h1);
    }

    .about-section,
    .cta-section {
      padding: var(--layout-3, 4rem) 0;
    }
  }
</style>
