<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import WorkHistoryTimeline from '$lib/components/WorkHistoryTimeline.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const operatorStates = [
    { label: 'Clear', value: 'No decisions pending', detail: 'The operator can step away.' },
    { label: 'Review', value: 'Approval needed', detail: 'Judgment is required before action.' },
    { label: 'Stop', value: 'Blocked with reason', detail: 'The system explains why it paused.' }
  ];

  const methodSteps = [
    {
      label: '01',
      title: 'Map the operating path',
      detail:
        'Find the workflow your team still completes or covers by hand and name the handoffs, owners, and failure modes.'
    },
    {
      label: '02',
      title: 'Classify the judgment states',
      detail:
        'Separate safe work from approval-needed work and actions that should be blocked with an inspectable reason.'
    },
    {
      label: '03',
      title: 'Ship the control layer',
      detail:
        'Use MCP, Skills, runbooks, release checks, and policy artifacts to make the workflow portable and governable.'
    },
    {
      label: '04',
      title: 'Brief the operator',
      detail:
        'Surface only the state that needs attention so the human returns for judgment, not constant monitoring.'
    }
  ];
</script>

<SEO
  title={`About | Micah Johnson — ${agencyCoreMessaging.categoryLabel}`}
  description="I build calm, transparent, reliable workflow systems for operator-owned outcomes: governed workflows, policy artifacts, and escalation surfaces that protect human judgment."
  keywords="Micah Johnson, governed workflow systems, production automation, systems architecture, automation reliability, workflow governance"
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
      <h1 class="hero-title">I build calm, transparent workflow systems for operator-owned outcomes.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-detail">
        The operator should not carry the gap between a demo and production. My work turns
        toolchains into clear workflow states: what agents and tools can do, what needs judgment,
        and what must stop with a reason.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="operator-brief" aria-label="Operator decision states">
        {#each operatorStates as state}
          <div class="operator-state">
            <span>{state.label}</span>
            <strong>{state.value}</strong>
            <p>{state.detail}</p>
          </div>
        {/each}
      </div>
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
          Today that shows up as calm, transparent, reliable workflow systems: fast where the
          rules are clear, visible where judgment is required, and recoverable when something goes
          wrong.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Calm Operator Method -->
<section class="about-section method-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="about-content method-intro">
        <p class="section-kicker">Calm Operator Method</p>
        <h2>Protect the operator before you scale the agents.</h2>
        <p>
          The method is simple enough to fit on an e-ink surface: map the workflow, classify the
          judgment states, ship the control layer, and brief the human only when attention changes
          the outcome.
        </p>
      </div>
    </BlurFade>
    <div class="method-grid">
      {#each methodSteps as step, index}
        <BlurFade delay={0.14 + index * 0.05}>
          <article class="method-card">
            <span>{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
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
          right wedge, and where approvals, policies, operator briefs, and recovery paths are the
          difference between a launch and a system people actually trust.
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
          The goal is not more automation. The goal is one operating path that lets the operator
          stop watching the dashboard until judgment is actually required.
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
          Visibility comes through runbooks, approval states, release evidence, operator briefs,
          and working software, not meeting theater. If what a client needs is a full internal
          delivery team, I route that work to a better-fit partner.
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
            <strong>.agency</strong> — Calm, transparent workflow systems, reliability controls,
            and enterprise extension
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
    padding: var(--agency-hero-padding-top) var(--container-padding, 1.5rem)
      var(--agency-hero-padding-bottom);
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
    max-width: 20ch;
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
    max-width: 42ch;
    margin: 0 auto;
    text-wrap: pretty;
  }

  .operator-brief {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    max-width: 58rem;
    margin: clamp(1.5rem, 4vw, 2.5rem) auto 0;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      rgba(0, 0, 0, 0.42);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  }

  .operator-state {
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 1rem;
    text-align: left;
    background: rgba(255, 255, 255, 0.025);
  }

  .operator-state span,
  .section-kicker,
  .method-card span {
    display: block;
    font-family: var(--font-mono, monospace);
    font-size: var(--text-caption);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(167, 184, 255, 0.78);
  }

  .operator-state strong {
    display: block;
    margin-top: 0.65rem;
    color: var(--color-fg-primary);
    font-size: var(--text-body);
  }

  .operator-state p {
    margin: 0.35rem 0 0;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
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

  .method-section {
    padding-top: clamp(3.5rem, 8vw, 6rem);
    padding-bottom: clamp(3.5rem, 8vw, 6rem);
  }

  .method-intro {
    margin-bottom: var(--space-5, 1.5rem);
  }

  .section-kicker {
    margin-bottom: var(--space-3, 0.75rem);
  }

  .method-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(0.85rem, 2vw, 1.25rem);
  }

  .method-card {
    min-height: 100%;
    padding: clamp(1rem, 2vw, 1.25rem);
    border: 1px solid rgba(255, 255, 255, 0.075);
    border-radius: 1rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012)),
      rgba(0, 0, 0, 0.25);
  }

  .method-card h3 {
    margin: 0.85rem 0 0.65rem;
    color: var(--color-fg-primary);
    font-size: var(--text-body-lg);
    line-height: 1.15;
  }

  .method-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
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
      padding: var(--agency-hero-padding-top-mobile) var(--container-padding, 1.5rem)
        var(--agency-hero-padding-bottom-mobile);
    }

    .hero-title {
      font-size: var(--text-h1);
    }

    .operator-brief {
      grid-template-columns: 1fr;
    }

    .method-grid {
      grid-template-columns: 1fr;
    }

    .about-section,
    .cta-section {
      padding: var(--layout-3, 4rem) 0;
    }
  }
</style>
