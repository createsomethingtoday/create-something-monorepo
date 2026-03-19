<script lang="ts">
  import { SEO } from '@create-something/canon';
  import {
    AnimatedGridPattern,
    BlurFade,
    ShimmerButton,
    BorderBeam,
    Marquee
  } from '@create-something/canon/magicui';
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';

  // Structured data for SEO/AEO
  const deliveryVector = {
    canonicalPhrase: 'Skills on MCP',
    clientFacingLabel: 'Skills + MCP',
    technicalLabel: 'MCP + Skills'
  };

  const stackItems = [
    { name: 'Model Context Protocol', type: 'Connectivity' },
    { name: 'Cloudflare Workers', type: 'Compute' },
    { name: 'Cloudflare D1', type: 'Persistence' },
    { name: 'Anthropic Claude', type: 'Intelligence' },
    { name: 'Durable Objects', type: 'State Coordination' },
    { name: 'SvelteKit', type: 'Client Runtime' },
    { name: 'TypeScript', type: 'Safety' },
    { name: 'Notion API', type: 'Operating Interface' }
  ];

  const services = [
    {
      name: 'Workflow Infrastructure',
      description:
        'A single workflow rebuilt with clear rules, clean handoffs, and production-safe behavior.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Policy OS',
      description:
        'Approvals, policy artifacts, release checks, blocked states, and incident loops for workflows already in motion.',
      type: 'Governed Execution Retainer',
      price: 'Custom',
      priceDescription: 'Monthly'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Audit-ready orchestration for regulated, high-volume, or multi-system workflows that need deterministic recovery.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation'
    }
  ];

  const faqItems = [
    {
      question: 'What is your primary service?',
      answer:
        'Workflow Infrastructure fixes the first painful workflow. Policy OS becomes the core engagement once speed needs approvals, release controls, and ongoing oversight. Enterprise Extension covers the highest-stakes environments.'
    },
    {
      question: 'Do you build full business systems and run onboarding?',
      answer:
        'When full system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen.'
    },
    {
      question: 'What does .agency own?',
      answer:
        '.agency owns the rules, approvals, handoffs, release controls, and operating artifacts around the workflow.'
    },
    {
      question: 'When should we add Policy OS?',
      answer:
        'Add it when failures become expensive or the workflow touches revenue, customer trust, compliance, or several systems that must stay in sync.'
    },
    {
      question: 'When do we need Enterprise Extension?',
      answer:
        'Use Enterprise Extension when several systems, teams, or compliance requirements must stay aligned and recover cleanly from failure.'
    },
    {
      question: 'Do you still offer MCP-only?',
      answer:
        'Yes. MCP-only still works for discovery, compliance-constrained pilots, or teams that need the connection before the operating layer.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'Yes. Clients retain ownership of code, workflows, and operating documentation. We optimize for portability and long-term control.'
    },
    {
      question: 'Why the phrase Skills + MCP?',
      answer: `Client-facing delivery is ${deliveryVector.clientFacingLabel}. MCP handles trust and connectivity. Skills carry behavior and workflow intent.`
    }
  ];
</script>

<SEO
  title="How We Work | Production-Safe Workflow Infrastructure"
  description="CREATE SOMETHING .agency starts with the workflow causing the most drag, adds approvals when failure gets expensive, and extends only when the risk profile demands it."
  keywords="workflow infrastructure, production automation, technical operators, agent reliability, enterprise automation architecture, custom mcp"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
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
      <p class="hero-eyebrow">How I Work</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Start with the workflow creating the most drag.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        Fix the first workflow. Add approvals and oversight when the risk rises. Reserve
        Enterprise Extension for auditability, recovery, and cross-system coordination.
      </p>
    </BlurFade>
  </div>
</section>

<!-- Flow Visualization -->
<section class="flow-section">
  <div class="section-container">
    <BlurFade delay={0.3}>
      <GovernedExecutionFlow
        title="Where Policy OS fits"
        description="Workflow Infrastructure gets the first handoff working. Policy OS decides what runs automatically, what needs review, and what stops."
        description="Workflow Infrastructure gets the first handoff working. Policy OS decides what runs automatically, what needs review, and what stops."
      />
    </BlurFade>
  </div>
</section>

<!-- Operating Stack -->
<section class="stack-section">
  <div class="section-container">
    <BlurFade delay={0.4}>
      <h2 class="section-heading-sm">The Reliability Stack</h2>
    </BlurFade>
  </div>

  <BlurFade delay={0.5}>
    <div class="marquee-wrapper">
      <div class="marquee-fade-left"></div>
      <div class="marquee-fade-right"></div>
      <Marquee pauseOnHover={true} duration={40} gap={24} repeat={2} class="stack-marquee">
        {#each stackItems as item}
          <div class="stack-card">
            <span class="stack-type">{item.type}</span>
            <div class="stack-name-group">
              <BrandLogo name={item.name} size={18} className="text-white/70" />
              <span class="stack-name">{item.name}</span>
            </div>
          </div>
        {/each}
      </Marquee>
    </div>
  </BlurFade>
</section>

<!-- The Retainer -->
<section class="retainer-section">
  <div class="section-container">
    <BlurFade>
      <div class="retainer-card">
        <BorderBeam size={300} duration={12} delay={9} />
        <div class="retainer-header">
          <div class="retainer-pricing offer-bridge">
            <div class="retainer-price">Offer Ladder</div>
            <div class="retainer-period">From wedge to governed execution</div>
          </div>
          <p class="retainer-note">
            Start with the wedge that proves value. Add governed execution when the workflow starts
            touching revenue, compliance, or customer trust.
          </p>
        </div>
        <div class="retainer-body">
          <div class="progression-grid">
            <article class="progression-card wedge-card">
              <span class="progression-tag">Entry wedge</span>
              <h3>MCP-only</h3>
              <p>Use this when you need the connection first or your team will operate the workflow directly.</p>
              <ul class="retainer-list">
                <li>Connectivity validation</li>
                <li>Scoped host setup</li>
                <li>Read-only or constrained rollout</li>
              </ul>
            </article>
            <article class="progression-card highlighted-card">
              <span class="progression-tag">Canonical package</span>
              <h3>Policy OS</h3>
              <p>The governed execution layer that makes <strong>{deliveryVector.clientFacingLabel}</strong> safe to run faster in production.</p>
              <ul class="retainer-list">
                <li>Approval and block boundaries</li>
                <li>Reason-coded access and blocked states</li>
                <li>Evals, release gates, and incident loops</li>
              </ul>
            </article>
            <article class="progression-card">
              <span class="progression-tag">High-stakes scale</span>
              <h3>Enterprise Extension</h3>
              <p>Apply when several systems, teams, or compliance requirements have to stay aligned.</p>
              <ul class="retainer-list">
                <li>Custom trust boundaries</li>
                <li>Cross-system orchestration</li>
                <li>Deterministic retries and auditability</li>
              </ul>
            </article>
          </div>
          <div class="retainer-callout">
            <p>
              MCP-only gets you connected. Policy OS turns execution into a managed product as
              speed and volume increase.
            </p>
          </div>
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Trust Artifacts -->
<section class="retainer-section">
  <div class="section-container">
    <BlurFade>
      <ArtifactSystemStrip
        title="What ships with every governed engagement"
        description="Every governed engagement ships as artifacts your team can inspect, run, inherit, and operate."
      />
    </BlurFade>
  </div>
</section>

<!-- What a Month Looks Like -->
<section class="timeline-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">What a Month Looks Like</h2>
    </BlurFade>

    <div class="timeline-grid">
      <BlurFade delay={0.1}>
        <div class="timeline-card">
            <span class="timeline-label">Phase 1</span>
          <h3>Workflow Infrastructure</h3>
          <p>
            Get the first high-value workflow working with clear rules, owners, and handoffs.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
          <div class="timeline-card">
            <span class="timeline-label">Phase 2</span>
          <h3>Policy OS</h3>
          <p>
            Add evals, approvals, release checks, and incident loops as the workflow touches real risk.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <div class="timeline-card">
          <span class="timeline-label">Phase 3</span>
          <h3>Extension</h3>
          <p>
            Extend into custom orchestration when several systems or teams need one operating
            model.
          </p>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">Questions</h2>
    </BlurFade>

    <div class="faq-grid">
      {#each faqItems as faq, i}
        <BlurFade delay={0.1 + i * 0.05}>
          <div class="faq-item">
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="cta-heading">Map the workflow that's creating the most drag.</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="cta-subtext">
        We’ll define the handoffs, approvals, failure modes, and escalation path before
        implementation.
      </p>
    </BlurFade>
    <BlurFade delay={0.2}>
      <div class="cta-buttons">
        <ShimmerButton href="/book">Book a Mapping Session</ShimmerButton>
        <a href="/products" class="cta-secondary">See what I've built →</a>
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

  .section-heading {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    text-align: center;
    margin-bottom: var(--space-8, 3rem);
    letter-spacing: var(--tracking-tight, -0.015em);
  }

  /* Hero */
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
    max-width: 11ch;
    margin-bottom: var(--space-5, 1.5rem);
    margin-left: auto;
    margin-right: auto;
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
  }

  .hero-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: var(--leading-relaxed);
  }

  /* Flow Section */
  .flow-section {
    padding: 0 var(--container-padding, 1.5rem) var(--section-padding, 6rem);
  }

  /* Stack Marquee */
  .stack-section {
    padding: var(--space-8, 3rem) 0 var(--section-padding, 6rem);
    overflow: hidden;
  }

  .section-heading-sm {
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    color: var(--color-fg-muted);
    text-align: center;
    margin-bottom: var(--space-6, 2rem);
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .marquee-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    isolation: isolate;
  }

  .marquee-fade-left,
  .marquee-fade-right {
    position: absolute;
    top: 0;
    bottom: 0;
    width: clamp(2.5rem, 10vw, 9rem);
    z-index: 2;
    pointer-events: none;
  }

  .marquee-fade-left {
    left: 0;
    background: linear-gradient(to right, var(--color-bg-pure, #000000), transparent);
  }

  .marquee-fade-right {
    right: 0;
    background: linear-gradient(to left, var(--color-bg-pure, #000000), transparent);
  }

  .stack-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--space-4, 1rem) var(--space-6, 2rem);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-lg, 12px);
    background: rgba(255, 255, 255, 0.02);
    box-shadow: var(--glass-shine-soft);
    min-width: clamp(210px, 30vw, 280px);
    height: 80px;
    transition: border-color var(--duration-standard) var(--ease-standard);
  }

  .stack-card:hover {
    border-color: rgba(96, 165, 250, 0.4);
    background: rgba(96, 165, 250, 0.04);
  }

  .stack-type {
    font-size: 0.65rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(96, 165, 250, 0.8);
    margin-bottom: 0.25rem;
  }

  .stack-name-group {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
  }

  .stack-name {
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
  }

  /* Retainer Card */
  .retainer-section {
    padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
  }

  .retainer-card {
    max-width: 1080px;
    margin: 0 auto;
    border: 1px solid rgba(96, 165, 250, 0.3);
    border-radius: var(--radius-xl, 16px);
    background: linear-gradient(180deg, rgba(96, 165, 250, 0.04) 0%, var(--color-bg-pure) 100%);
    box-shadow:
      var(--glass-shine-standard),
      0 0 0 1px rgba(96, 165, 250, 0.08);
    overflow: visible;
    position: relative;
  }

  .retainer-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.4), transparent);
  }

  .retainer-header {
    padding: var(--space-8, 3rem) var(--space-5, 1.5rem);
    text-align: center;
  }

  .retainer-pricing {
    margin-bottom: var(--space-3, 0.75rem);
  }

  .retainer-price {
    font-size: var(--text-display);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    letter-spacing: var(--tracking-tighter, -0.025em);
    line-height: 1;
  }

  .retainer-period {
    font-size: var(--text-body-lg);
    color: var(--color-fg-tertiary);
    margin-top: var(--space-2, 0.5rem);
  }

  .retainer-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    max-width: 480px;
    margin: 0 auto;
    line-height: var(--leading-relaxed);
  }

  .retainer-body {
    padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
  }

  .progression-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-6, 2rem);
  }

  .progression-card {
    padding: 1.25rem;
    border-radius: var(--radius-lg, 12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
      rgba(255, 255, 255, 0.02);
  }

  .highlighted-card {
    border-color: rgba(45, 212, 191, 0.2);
    background:
      radial-gradient(circle at top left, rgba(45, 212, 191, 0.14), transparent 50%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015)),
      rgba(4, 8, 15, 0.86);
    box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.08);
  }

  .wedge-card {
    border-style: dashed;
  }

  .progression-card h3 {
    font-size: var(--text-h4);
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-3, 0.75rem);
  }

  .progression-card p {
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin: 0 0 var(--space-4, 1rem);
  }

  .progression-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.24rem 0.58rem;
    margin-bottom: var(--space-4, 1rem);
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-fg-muted);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .retainer-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
  }

  .retainer-list li {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    padding-left: 1.25rem;
    position: relative;
  }

  .retainer-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(96, 165, 250, 0.6);
  }

  .retainer-callout {
    margin-top: var(--space-6, 2rem);
    padding: var(--space-4, 1rem) var(--space-5, 1.5rem);
    border: 1px solid rgba(96, 165, 250, 0.1);
    background: rgba(96, 165, 250, 0.03);
    border-radius: var(--radius-md, 8px);
    text-align: center;
  }

  .retainer-callout p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    max-width: 600px;
    margin: 0 auto;
  }

  /* Timeline */
  .timeline-section {
    padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
  }

  .timeline-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6, 2rem);
    max-width: 900px;
    margin: 0 auto;
  }

  .timeline-grid > :global(*) {
    display: flex;
    flex-direction: column;
  }

  .timeline-card {
    padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
    border-radius: var(--radius-lg, 12px);
    background: var(--color-bg-pure);
    box-shadow: var(--glass-shine-soft);
    flex: 1;
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      box-shadow var(--duration-standard) var(--ease-standard),
      transform var(--duration-bounce) var(--ease-bounce);
  }

  .timeline-card:hover {
    border-color: var(--color-border-emphasis);
    box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
    transform: translateY(-2px);
  }

  .timeline-label {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(96, 165, 250, 0.9);
    font-weight: var(--font-semibold);
    display: block;
    margin-bottom: var(--space-2, 0.5rem);
  }

  .timeline-card h3 {
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .timeline-card p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  /* FAQ */
  .faq-section {
    padding: var(--section-padding, 6rem) 0;
  }

  .faq-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4, 1rem);
  }

  .faq-grid > :global(*) {
    display: flex;
    flex-direction: column;
  }

  .faq-item {
    padding: var(--space-5, 1.5rem);
    border-radius: var(--radius-lg, 12px);
    background: var(--color-bg-pure);
    box-shadow: var(--glass-shine-soft);
    flex: 1;
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      box-shadow var(--duration-standard) var(--ease-standard),
      transform var(--duration-bounce) var(--ease-bounce);
  }

  .faq-item:hover {
    border-color: var(--color-border-emphasis);
    box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
    transform: translateY(-2px);
  }

  .faq-item h3 {
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .faq-item p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
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

  /* Responsive */
  @media (max-width: 1024px) {
    .progression-grid {
      grid-template-columns: 1fr;
    }

  }

  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: var(--text-h1);
    }

    .timeline-grid {
      grid-template-columns: 1fr;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
      gap: var(--space-5, 1.5rem);
    }

    .faq-grid {
      grid-template-columns: 1fr;
    }

    .retainer-section,
    .timeline-section,
    .faq-section,
    .cta-section {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .retainer-price {
      font-size: var(--text-h1);
    }

    .marquee-fade-left,
    .marquee-fade-right {
      width: 2.5rem;
    }

    .stack-card {
      min-width: 220px;
      min-height: 76px;
      height: auto;
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    }

    .stack-name {
      font-size: var(--text-body-sm);
    }
  }
</style>
