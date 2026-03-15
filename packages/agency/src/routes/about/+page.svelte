<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import WorkHistoryTimeline from '$lib/components/WorkHistoryTimeline.svelte';
</script>

<SEO
  title="About | Micah Johnson — Workflow Infrastructure"
  description="I build workflow infrastructure for technical operators: cross-system logic, reliability controls, trust boundaries, and production-safe automation."
  keywords="Micah Johnson, workflow infrastructure, production automation, technical operators, cross-system architecture, automation reliability"
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
      <h1 class="hero-title">I build workflow infrastructure for technical operators.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-detail">
        I work on the part most teams under-scope: the rules, controls, and artifacts that make
        automation safe in production.
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
          Most teams do not need a giant platform project first. They need one workflow that
          works. I usually start there, then add controls only when the cost of failure justifies
          it.
        </p>
        <p>
          My methodology is the Subtractive Triad: remove duplication, excess, and disconnection
          before adding automation. Cleaner systems produce more reliable automation.
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
          Micah Johnson. System Architect on the Marketplace Team at Webflow — building internal
          tools, onboarding systems, and platform infrastructure serving millions of users. Focused
          on technical architecture for production workflows and agent systems.
        </p>
        <p>
          I have deployed production integrations connecting tools like Salesforce, HubSpot, Notion,
          Slack, Procore, and custom internal systems to AI. That building experience informs where
          to trust native tooling, where to start with MCP, and where to design custom control
          layers.
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
        <p>CREATE SOMETHING operates as a connected system — each part informs the others:</p>
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
            <strong>.agency</strong> — Workflow infrastructure, reliability controls, and enterprise extension
            <span class="muted">(you are here)</span>
          </li>
        </ul>
        <p>
          Client work informs the research. Research refines the methodology. The methodology
          improves the client work. Every part serves the whole.
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
        <h2>Also building</h2>
        <p>
          I am also building <a
            href="https://workway.co"
            class="link"
            target="_blank"
            rel="noopener noreferrer">WORKWAY</a
          >. When clients need full system development and onboarding as the primary engagement, I
          provide a direct referral path to trusted partners, including Half Dozen.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <h2 class="cta-heading">Map the workflow that cannot fail.</h2>
    </BlurFade>
    <BlurFade delay={0.2}>
      <div class="cta-actions">
        <a href="/book" class="cta-link-primary">Book Mapping Session →</a>
        <a href="/services" class="cta-link-secondary">See the engagement model →</a>
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
