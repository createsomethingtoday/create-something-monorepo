<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade, ShimmerButton } from '@create-something/canon/magicui';

  const services = [
    {
      name: 'Custom AI Workflow Design',
      description:
        'Design the workflow, trust boundary, and system handoffs before agents start making live decisions.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped around one workflow wedge'
    },
    {
      name: 'AI Governance For Automation',
      description:
        'Add approvals, blocked states, escalation rules, and operating artifacts once the workflow touches revenue, trust, or compliance.',
      type: 'Governed Execution',
      price: 'Custom',
      priceDescription: 'Layered onto live automation'
    },
    {
      name: 'Cross-System AI Automation',
      description:
        'Connect AI to HubSpot, Notion, Slack, internal tools, and MCP-backed systems without leaving the team trapped in manual cleanup.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Built around production use'
    }
  ];

  const faqItems = [
    {
      question: 'What does an AI automation agency actually do?',
      answer:
        'We design and ship AI-powered workflows that connect to the systems your team already uses, then add the rules and controls needed to run them safely in production.'
    },
    {
      question: 'How is this different from a generic AI agency?',
      answer:
        'The focus is not generic content or chatbot work. The focus is operational workflows: approvals, handoffs, retries, human review, and governed execution across real systems.'
    },
    {
      question: 'Do you build custom AI automation or use off-the-shelf tools?',
      answer:
        'Both. We use the narrowest reliable implementation surface for the workflow, including MCP, APIs, and existing automation tools when they are sufficient.'
    },
    {
      question: 'When should we add AI governance for automation?',
      answer:
        'Add governance when the workflow affects revenue, customer trust, compliance, or several systems that must stay aligned when something fails.'
    }
  ];

  const workflowExamples = [
    'Lead qualification and routing across CRM, forms, and internal review',
    'Proposal, onboarding, and client handoff workflows across docs, chat, and project systems',
    'Support or operations queues that need AI assistance with explicit approval boundaries'
  ];

  const differentiators = [
    'Start with one workflow wedge instead of a broad platform promise',
    'Translate AI behavior into explicit approvals, policies, and blocked states',
    'Keep the implementation portable so your team owns the workflow after launch'
  ];
</script>

<SEO
  title="AI Automation Agency"
  description="CREATE SOMETHING is an AI automation agency for teams that need custom AI workflows, governed execution, and production-safe operations across real systems."
  keywords="ai automation agency, custom ai automation, ai workflow automation agency, ai governance for automation, production ai workflows, automation agency"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'AI Automation Agency', url: '/ai-automation-agency' }
  ]}
/>

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
      <p class="hero-eyebrow">AI Automation Agency</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">AI automation agency for workflows that have to hold up in production.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        CREATE SOMETHING builds custom AI workflows for teams that need more than a demo. We
        connect AI to the systems you already run, define the approval boundaries, and make the
        automation survivable when exceptions show up.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/services" class="hero-link">View services</a>
      </div>
    </BlurFade>
  </div>
</section>

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>What this AI automation agency actually builds</h2>
        <p>
          The work is not abstract AI strategy. It is workflow design, connection logic, approval
          rules, and recovery behavior across the systems your team already uses.
        </p>
      </div>
    </BlurFade>
    <div class="card-grid">
      {#each services as service, index}
        <BlurFade delay={0.15 + index * 0.08}>
          <article class="card">
            <span class="card-tag">{service.type}</span>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="split-grid">
        <div class="panel">
          <h2>Where teams usually call us in</h2>
          <ul class="list">
            {#each workflowExamples as example}
              <li>{example}</li>
            {/each}
          </ul>
        </div>
        <div class="panel">
          <h2>Why this approach ranks closer to operations than hype</h2>
          <ul class="list">
            {#each differentiators as differentiator}
              <li>{differentiator}</li>
            {/each}
          </ul>
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Start with one workflow wedge</h2>
        <p>
          Most teams do not need a broad AI transformation project first. They need one workflow
          that stops leaking time, context, or trust. We scope that wedge first, then add governed
          execution only when the operating risk justifies it.
        </p>
      </div>
    </BlurFade>
    <div class="link-row">
      <a href="/automation-agency" class="resource-link">See the automation agency page</a>
      <a href="/use-cases/business" class="resource-link">See business workflow examples</a>
      <a href="/use-cases/enterprise" class="resource-link">See governed enterprise workflows</a>
      <a href="/about" class="resource-link">See background and systems experience</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Frequently asked questions</h2>
      </div>
    </BlurFade>
    <div class="faq-stack">
      {#each faqItems as item, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="faq-card">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <h2 class="cta-heading">Bring the workflow your team still protects by hand.</h2>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="cta-copy">
        We will map the handoffs, constraints, and approval boundaries before deciding what should
        be automated.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions cta-actions">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/contact" class="hero-link">Send the workflow details</a>
      </div>
    </BlurFade>
  </div>
</section>

<style>
  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  .hero {
    position: relative;
    padding: 5rem var(--container-padding, 1.5rem) 3rem;
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(650px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(650px circle at 50% 35%, white, transparent);
  }

  .hero-content {
    position: relative;
    max-width: 860px;
    margin: 0 auto;
    text-align: center;
  }

  .hero-eyebrow {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .hero-title {
    font-size: clamp(2.5rem, 4vw + 1.25rem, 4.5rem);
    line-height: 1.08;
    letter-spacing: var(--tracking-tighter, -0.025em);
    margin-bottom: var(--space-5, 1.5rem);
    color: var(--color-fg-primary);
  }

  .hero-subtitle {
    max-width: 720px;
    margin: 0 auto;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    line-height: var(--leading-relaxed);
  }

  .hero-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-4, 1rem);
    margin-top: var(--space-6, 2rem);
    flex-wrap: wrap;
  }

  .hero-link {
    color: var(--color-fg-secondary);
    text-decoration: none;
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .hero-link:hover,
  .resource-link:hover {
    color: var(--color-fg-primary);
  }

  .section {
    padding: 0 0 var(--section-padding, 6rem);
  }

  .section-alt {
    padding-top: var(--space-4, 1rem);
  }

  .section-header {
    max-width: 760px;
    margin-bottom: var(--space-8, 3rem);
  }

  .section-header h2,
  .panel h2,
  .cta-heading {
    font-size: clamp(1.75rem, 2vw + 1rem, 2.75rem);
    line-height: 1.15;
    margin-bottom: var(--space-4, 1rem);
    color: var(--color-fg-primary);
  }

  .section-header p,
  .panel p,
  .cta-copy {
    font-size: var(--text-body-lg);
    line-height: var(--leading-relaxed);
    color: var(--color-fg-secondary);
  }

  .card-grid,
  .split-grid,
  .faq-stack {
    display: grid;
    gap: var(--space-5, 1.5rem);
  }

  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .split-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card,
  .panel,
  .faq-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: var(--space-6, 2rem);
  }

  .card-tag {
    display: inline-flex;
    margin-bottom: var(--space-3, 0.75rem);
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-fg-muted);
  }

  .card h3 {
    font-size: var(--text-h4);
    margin-bottom: var(--space-3, 0.75rem);
    color: var(--color-fg-primary);
  }

  .card p {
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  .faq-card h3 {
    font-size: var(--text-h4);
    margin-bottom: var(--space-3, 0.75rem);
    color: var(--color-fg-primary);
  }

  .faq-card p {
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  .list {
    display: grid;
    gap: var(--space-3, 0.75rem);
    padding-left: 1.25rem;
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  .link-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4, 1rem);
  }

  .resource-link {
    color: var(--color-fg-secondary);
    text-decoration: none;
    padding: 0.9rem 1.1rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    transition:
      color var(--duration-micro, 200ms) var(--ease-standard),
      border-color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .resource-link:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .cta-section {
    padding: 0 0 var(--section-padding-lg, 8rem);
  }

  .cta-actions {
    justify-content: flex-start;
  }

  @media (max-width: 900px) {
    .card-grid,
    .split-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 4.5rem;
    }

    .hero-actions {
      align-items: stretch;
    }

    .cta-actions {
      justify-content: center;
    }
  }
</style>
