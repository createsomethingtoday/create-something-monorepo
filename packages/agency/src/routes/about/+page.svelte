<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import WorkHistoryTimeline from '$lib/components/WorkHistoryTimeline.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<SEO
  title={`About | Micah Johnson — ${agencyCoreMessaging.categoryLabel}`}
  description="I design workflows people can trust under pressure, with the controls, visibility, and recovery paths real teams need."
  keywords="Micah Johnson, governed workflow infrastructure, production automation, systems architecture, automation reliability, workflow governance"
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
      <h1 class="hero-title">I design workflows people can trust under pressure.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-detail">
        My work sits between high-performance systems and clinical discipline: make things faster,
        but never at the expense of clarity, control, or recovery.
      </p>
    </BlurFade>
  </div>
</section>

<!-- Why This Work -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>Why I work this way</h2>
        <p>
          I grew up between two reference points: a Porsche 930 Turbo and emergency medicine. One
          taught me that power needs control. The other taught me that when pressure rises, clear
          protocols matter more than improvisation.
        </p>
        <p>
          Later, as an equine veterinary technician, I learned what continuity of care, logging,
          and operating discipline actually feel like in the real world. That stays with me in
          systems work now.
        </p>
        <p>
          Today that shows up in the kind of workflows I build: fast when they should be, visible
          when they need review, and recoverable when something goes wrong.
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
        <h2>What I do now</h2>
        <p>
          Micah Johnson. I am a Senior Systems Architect on the Marketplace Team at Webflow, where
          I build internal tooling, onboarding systems, and platform infrastructure serving
          millions of users. The problems are familiar: brittle handoffs, unclear ownership, and
          systems that look automated until the exceptions show up.
        </p>
        <p>
          I have shipped integrations across Salesforce, HubSpot, Notion, Slack, Procore, and
          internal systems. That work informs where native tooling is enough, where MCP is the
          right wedge, and where approvals, policies, and recovery paths are the difference
          between a launch and a system people actually trust.
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

<!-- The Approach -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>How I approach the work</h2>
        <p>
          Most teams do not need a giant AI initiative first. They need one workflow that stops
          creating manual cleanup. I start there, then add controls only when the cost of failure
          justifies the extra layer.
        </p>
        <p>
          My methodology is the Subtractive Triad: remove duplication, excess, and disconnection
          before adding automation. Cleaner systems reduce handoff risk. Better constraints make
          automation more reliable.
        </p>
        <p>
          The goal is not more automation. The goal is one operating path your team can trust.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Engagement Model -->
<section class="about-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content">
        <h2>How clients experience the work</h2>
        <p>
          Clients do not hire me to become another internal admin. They bring the workflow, the
          operating constraints, and the approval owner. I bring the diagnosis, the control layer,
          and the artifacts your team needs to run and inherit the system.
        </p>
        <p>
          Visibility comes through runbooks, approval states, release evidence, and working
          software, not meeting theater. If what a client needs is a full internal delivery team,
          I route that work to a better-fit partner.
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
          The through-line is not AI. It is learning how to turn messy systems into operating paths
          people can trust. That pattern shows up in science, creative work, client services,
          marketplaces, and now automation.
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
        <h2>The rest of CREATE SOMETHING</h2>
        <p>
          CREATE SOMETHING operates as a connected system. Each property has a distinct job, and
          each one sharpens the others:
        </p>
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
            <strong>.agency</strong> — Governed workflow infrastructure, reliability controls, and
            enterprise extension
            <span class="muted">(you are here)</span>
          </li>
        </ul>
        <p>
          Client work informs the research. Research sharpens the methodology. The methodology
          raises the bar on client work.
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
          >. When clients need fuller system development and onboarding than .agency is meant to
          carry, I provide a direct referral path to trusted partners, including Half Dozen.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <h2 class="cta-heading">{agencyCoreMessaging.workflowCtaHeading}</h2>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="cta-detail">{agencyCoreMessaging.workflowCtaDetail}</p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="cta-actions">
        <a href="/book" class="cta-link-primary">{agencyCoreMessaging.bookMappingSessionLabel} →</a>
        <a href="/services" class="cta-link-secondary">{agencyCoreMessaging.engagementModelLabel}</a>
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
    max-width: 14ch;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: var(--space-5, 1.5rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
    text-wrap: balance;
  }

  .hero-detail {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    max-width: 34ch;
    margin: 0 auto;
    text-wrap: pretty;
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
    margin-bottom: var(--space-3, 0.75rem);
  }

  .cta-detail {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    max-width: 32ch;
    margin: 0 auto;
  }

  .cta-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4, 1rem);
    margin-top: var(--space-5, 1.5rem);
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
