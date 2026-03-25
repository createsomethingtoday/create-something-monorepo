<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade, ShimmerButton } from '@create-something/canon/magicui';

  const services = [
    {
      name: 'Workflow Automation Design',
      description:
        'Map the operating path, remove brittle handoffs, and choose the narrowest reliable automation surface.',
      type: 'Workflow Infrastructure',
      price: 'Custom',
      priceDescription: 'Scoped around the first workflow'
    },
    {
      name: 'Approval And Control Layer',
      description:
        'Define what can run automatically, what needs review, and what should stop when trust or compliance is at stake.',
      type: 'Policy OS',
      price: 'Custom',
      priceDescription: 'Added when the workflow risk rises'
    },
    {
      name: 'Enterprise Workflow Extension',
      description:
        'Expand the workflow across teams and systems when auditability, recovery, and coordination matter.',
      type: 'Enterprise Extension',
      price: 'Custom',
      priceDescription: 'Project + managed support'
    }
  ];

  const faqItems = [
    {
      question: 'What kind of automation agency are you?',
      answer:
        'We focus on workflow automation for operations, RevOps, onboarding, approvals, and cross-system handoffs, not just simple trigger chains.'
    },
    {
      question: 'Do you replace Zapier, Make, or internal scripts?',
      answer:
        'Sometimes. If the existing tool is enough, we use it. If the workflow needs stronger control, portability, or governed execution, we build the missing layer.'
    },
    {
      question: 'What makes this different from generic automation services?',
      answer:
        'The work includes system design, policy boundaries, and operating artifacts so the automation does not quietly degrade after launch.'
    },
    {
      question: 'Can an automation agency still help before AI is involved?',
      answer:
        'Yes. Many teams need the workflow cleaned up first. Once the operating path is clear, AI can be added where it actually helps.'
    }
  ];

  const signals = [
    'The same context gets rebuilt by hand every time work moves between tools',
    'Automations exist, but no one trusts them when stakes get higher',
    'Your team is acting as the integration layer because ownership is unclear',
    'Every exception creates cleanup work instead of a stable recovery path'
  ];

  const process = [
    'Map the workflow and the failure points',
    'Scope the smallest wedge that removes real drag',
    'Ship the operating path and support artifacts',
    'Add approvals and governance only when risk justifies it'
  ];
</script>

<SEO
  title="Automation Agency"
  description="CREATE SOMETHING is an automation agency for teams that need workflow automation, approval controls, and cross-system reliability instead of brittle point solutions."
  keywords="automation agency, workflow automation agency, custom ai automation, operations automation consultant, revops automation consultant, ai workflow automation agency"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'Automation Agency', url: '/automation-agency' }
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
      <p class="hero-eyebrow">Automation Agency</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Automation agency for workflows that break between systems.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        CREATE SOMETHING helps teams turn fragile handoffs into production-safe workflow
        automation. We start with the workflow causing the most drag, then add policy and
        governance only when the business risk requires it.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/services" class="hero-link">See the service model</a>
      </div>
    </BlurFade>
  </div>
</section>

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>What this automation agency is built to solve</h2>
        <p>
          The work usually starts when automation exists in pieces but the operating system around
          it does not. The workflow moves, but trust does not.
        </p>
      </div>
    </BlurFade>
    <div class="split-grid">
      <div class="panel">
        <h3>Common signals</h3>
        <ul class="list">
          {#each signals as signal}
            <li>{signal}</li>
          {/each}
        </ul>
      </div>
      <div class="panel">
        <h3>How we fix it</h3>
        <ul class="list">
          {#each process as step}
            <li>{step}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Three ways we engage</h2>
        <p>
          The service ladder matches the risk profile of the workflow instead of pretending every
          team needs the same amount of automation.
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

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Automation first, AI where it actually helps</h2>
        <p>
          Some workflows need AI immediately. Others need cleaner structure before AI belongs in
          the loop. That is why the broader automation agency page sits alongside the more specific
          AI automation agency page.
        </p>
      </div>
    </BlurFade>
    <div class="link-row">
      <a href="/ai-automation-agency" class="resource-link">See the AI automation agency page</a>
      <a href="/methodology" class="resource-link">See the methodology</a>
      <a href="/use-cases/business" class="resource-link">See business use cases</a>
      <a href="/products" class="resource-link">See proof in production</a>
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
      <h2 class="cta-heading">Start with the workflow that keeps leaking manual cleanup.</h2>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="cta-copy">
        We will map the bottleneck, the system boundaries, and the smallest wedge that can ship
        cleanly.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions cta-actions">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/contact" class="hero-link">Send the stack details</a>
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
  .cta-heading {
    font-size: clamp(1.75rem, 2vw + 1rem, 2.75rem);
    line-height: 1.15;
    margin-bottom: var(--space-4, 1rem);
    color: var(--color-fg-primary);
  }

  .section-header p,
  .cta-copy {
    font-size: var(--text-body-lg);
    line-height: var(--leading-relaxed);
    color: var(--color-fg-secondary);
  }

  .split-grid,
  .card-grid,
  .faq-stack {
    display: grid;
    gap: var(--space-5, 1.5rem);
  }

  .split-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .panel,
  .card,
  .faq-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: var(--space-6, 2rem);
  }

  .panel h3,
  .card h3 {
    font-size: var(--text-h4);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .card-tag {
    display: inline-flex;
    margin-bottom: var(--space-3, 0.75rem);
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-fg-muted);
  }

  .card p {
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  .faq-card h3 {
    font-size: var(--text-h4);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
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
    .split-grid,
    .card-grid {
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
