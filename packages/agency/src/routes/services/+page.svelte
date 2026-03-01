<script lang="ts">
  import { SEO } from '@create-something/canon';
  import {
    AnimatedGridPattern,
    BlurFade,
    ShimmerButton,
    BorderBeam,
    Marquee
  } from '@create-something/canon/magicui';
  import HubMcpFlow from '$lib/components/HubMcpFlow.svelte';

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
      name: 'Custom Workflow MCPs',
      description: 'Custom workflow MCP implementation for business-critical operations.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Autonomy Assurance',
      description: `Operational reliability layer delivered with ${deliveryVector.clientFacingLabel}: evals, policy controls, release gates, and incident loops.`,
      type: 'Add-on Retainer',
      price: 'Custom',
      priceDescription: 'Monthly'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Custom MCP and orchestration for high-stakes, cross-system, and compliance-heavy workflows.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation'
    }
  ];

  const faqItems = [
    {
      question: 'What is your primary service?',
      answer:
        'Custom Workflow MCPs for production business workflows. Assurance and Enterprise Extension are layered as complexity and risk increase.'
    },
    {
      question: 'Do you build full business systems and run onboarding?',
      answer:
        'When system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen.'
    },
    {
      question: 'What does .agency own?',
      answer:
        '.agency owns custom workflow MCP design, reliability controls, policy boundaries, and enterprise extension architecture.'
    },
    {
      question: 'When should we add Autonomy Assurance?',
      answer:
        'Add it when failures become expensive, workflows become autonomous, or multiple systems must stay in sync. Assurance is the reliability gate before scale.'
    },
    {
      question: 'When do we need Enterprise Extension?',
      answer:
        'Use Enterprise Extension for regulated, high-volume, or cross-system operations requiring deterministic retries, auditability, and custom trust boundaries.'
    },
    {
      question: 'Do you still offer MCP-only?',
      answer:
        'Yes. MCP-only remains a scoped wedge for discovery and compliance-constrained rollouts, but default delivery moves to outcomes and operational reliability.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'Yes. Clients retain ownership of code, workflows, and operating documentation. We optimize for portability and long-term control.'
    },
    {
      question: 'Why the phrase Skills + MCP?',
      answer: `Client-facing delivery is ${deliveryVector.clientFacingLabel}. Technical proof uses ${deliveryVector.technicalLabel}: MCP handles trust and connectivity while Skills carry behavior and workflow intent.`
    }
  ];
</script>

<SEO
  title="How We Work | POLICY OS for Production Autonomy"
  description="CREATE SOMETHING .agency delivers a POLICY OS for production autonomy: Custom Workflow MCPs, Autonomy Assurance, and Enterprise Extension."
  keywords="policy os, custom workflow mcp, autonomy assurance, enterprise mcp, agent reliability, ai operations architecture"
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
      <h1 class="hero-title">Three offers. One POLICY OS.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        Start with Custom Workflow MCPs. Add Autonomy Assurance when failure cost rises. Escalate to
        Enterprise Extension for cross-system, high-stakes operations.
      </p>
    </BlurFade>
  </div>
</section>

<!-- Flow Visualization -->
<section class="flow-section">
  <div class="section-container">
    <BlurFade delay={0.3}>
      <div class="mcp-flow-wrapper">
        <HubMcpFlow />
      </div>
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
            <span class="stack-name">{item.name}</span>
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
          <div class="retainer-pricing">
            <div class="retainer-price">POLICY OS</div>
            <div class="retainer-period">The Operation Model</div>
          </div>
          <p class="retainer-note">
            A framework for graduating from brittle scripts to resilient systems.<br />
            Built to manage the expanding risk of autonomous operations.
          </p>
        </div>
        <div class="retainer-body">
          <div class="retainer-columns">
            <div class="retainer-detail">
              <h3>Operating Principles</h3>
              <ul class="retainer-list">
                <li><strong>Delivery Vector:</strong> {deliveryVector.clientFacingLabel}</li>
                <li>
                  <strong>Focus:</strong> We build reliability and boundaries; basic setup is assumed.
                </li>
                <li><strong>Discovery:</strong> MCP-only available as an isolated entry wedge.</li>
                <li>
                  <strong>Referrals:</strong> System-development-first engagements routed to partners.
                </li>
                <li>
                  <strong>Ownership:</strong> Client owns all code, workflows, and operating artifacts.
                </li>
              </ul>
            </div>
            <div class="retainer-detail">
              <h3>When to Escalate</h3>
              <ul class="retainer-list">
                <li>Repeated automation failures or high incident cost</li>
                <li>Cross-system workflow coupling and data drift risk</li>
                <li>Regulated or high-stakes operations requiring auditability</li>
                <li>Need for deterministic retries/idempotency</li>
                <li>Enterprise security or trust-boundary requirements</li>
              </ul>
            </div>
          </div>
          <div class="retainer-callout">
            <p>
              Notion setup and training are necessary but not sufficient for high-autonomy systems.
              The durable value is reliability engineering, policy governance, and extension
              architecture.
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
      <h2 class="section-heading">What Ships Every Engagement</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <div class="artifact-grid">
        <div class="artifact-doc-card">
          <div class="artifact-doc-header">
            <span class="artifact-doc-dot"></span>
            <span class="artifact-doc-name">mcp_contract.yaml</span>
          </div>
          <p class="artifact-doc-desc">Tools, resources, auth scopes, and error model</p>
        </div>
        <div class="artifact-doc-card">
          <div class="artifact-doc-header">
            <span class="artifact-doc-dot"></span>
            <span class="artifact-doc-name">agent_contract.yaml</span>
          </div>
          <p class="artifact-doc-desc">Allowed actions, approvals, and escalation rules</p>
        </div>
        <div class="artifact-doc-card">
          <div class="artifact-doc-header">
            <span class="artifact-doc-dot"></span>
            <span class="artifact-doc-name">outcome_contract.md</span>
          </div>
          <p class="artifact-doc-desc">Workflow targets, success criteria, and fallback path</p>
        </div>
        <div class="artifact-doc-card">
          <div class="artifact-doc-header">
            <span class="artifact-doc-dot"></span>
            <span class="artifact-doc-name">golden_tasks.yaml</span>
          </div>
          <p class="artifact-doc-desc">Release gate checks and latest pass/fail status</p>
        </div>
        <div class="artifact-doc-card">
          <div class="artifact-doc-header">
            <span class="artifact-doc-dot"></span>
            <span class="artifact-doc-name">runbook.md</span>
          </div>
          <p class="artifact-doc-desc">Incident response, rollback, and ownership boundaries</p>
        </div>
      </div>
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
          <h3>Workflow Build</h3>
          <p>
            Implement the highest-value custom workflow MCPs with clear trust boundaries and
            production behavior.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div class="timeline-card">
          <span class="timeline-label">Phase 2</span>
          <h3>Assurance</h3>
          <p>
            .agency adds eval coverage, release checks, policy envelopes, and incident loops as
            automation scope and risk increase.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <div class="timeline-card">
          <span class="timeline-label">Phase 3</span>
          <h3>Extension</h3>
          <p>
            For enterprise constraints, we extend beyond Notion-native automations with custom
            MCP/orchestration and governance controls.
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
      <h2 class="cta-heading">Map your constraint surface.</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="cta-subtext">
        We’ll define your operating boundaries, failure modes, and escalation path before
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
    margin-bottom: var(--space-5, 1.5rem);
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

  .mcp-flow-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
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
    max-width: 800px;
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

  .retainer-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6, 2rem);
  }

  .retainer-detail h3 {
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3, 0.75rem);
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

  /* Trust Artifacts Grid */
  .artifact-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-4, 1rem);
    max-width: 900px;
    margin: 0 auto;
  }

  .artifact-doc-card {
    display: flex;
    flex-direction: column;
    flex: 1 1 280px;
    max-width: calc(33.333% - 0.67rem);
    padding: var(--space-4, 1rem) var(--space-5, 1.5rem);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-md, 8px);
    background: rgba(255, 255, 255, 0.02);
    box-shadow: var(--glass-shine-soft);
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      transform var(--duration-standard) var(--ease-standard),
      background var(--duration-standard) var(--ease-standard);
  }

  .artifact-doc-card:hover {
    border-color: rgba(96, 165, 250, 0.4);
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-2px);
  }

  .artifact-doc-header {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .artifact-doc-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(96, 165, 250, 0.8);
    box-shadow: 0 0 6px rgba(96, 165, 250, 0.4);
    flex-shrink: 0;
  }

  .artifact-doc-name {
    font-size: var(--text-caption);
    font-family: var(
      --font-mono,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      'Liberation Mono',
      'Courier New',
      monospace
    );
    color: var(--color-fg-primary);
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .artifact-doc-desc {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
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
    .retainer-columns {
      grid-template-columns: 1fr;
    }

    .artifact-doc-card {
      max-width: calc(50% - 0.5rem);
    }
  }

  @media (max-width: 768px) {
    .artifact-doc-card {
      max-width: 100%;
    }
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
