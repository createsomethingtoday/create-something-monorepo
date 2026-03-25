<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade, ShimmerButton } from '@create-something/canon/magicui';

  const faqItems = [
    {
      question: 'What is AI governance for automation?',
      answer:
        'AI governance for automation is the layer that decides what can run automatically, what requires human approval, what must be logged, and what should stop when risk rises.'
    },
    {
      question: 'When does a workflow need AI governance?',
      answer:
        'A workflow needs governance when it touches revenue, customer trust, compliance, regulated data, or several systems that must remain aligned during failure.'
    },
    {
      question: 'Is this the same as compliance consulting?',
      answer:
        'No. Compliance may be one constraint, but the broader job is operational governance: approvals, blocked states, escalation paths, auditability, and recovery design.'
    },
    {
      question: 'How does CREATE SOMETHING handle AI governance for automation?',
      answer:
        'Through Policy OS: explicit approval rules, policy artifacts, release checks, incident loops, and governed execution for live workflows.'
    }
  ];

  const controls = [
    'Approval boundaries for ambiguous or high-impact actions',
    'Blocked states with reason codes instead of silent failures',
    'Escalation paths for exceptions, drift, and unclear ownership',
    'Operating artifacts your team can inspect, inherit, and run'
  ];
</script>

<SEO
  title="AI Governance For Automation"
  description="AI governance for automation: approvals, escalation rules, blocked states, and Policy OS controls for teams running live AI workflows in production."
  keywords="ai governance for automation, ai governance, workflow controls, policy operations, governed execution, policy os"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'AI Governance For Automation', url: '/ai-governance-for-automation' }
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
      <p class="hero-eyebrow">AI Governance For Automation</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Governance is what keeps automation usable after launch.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        CREATE SOMETHING adds the approval rules, escalation logic, blocked states, and operating
        controls that keep AI automation from turning into silent cleanup work.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/use-cases/enterprise" class="hero-link">See enterprise use cases</a>
      </div>
    </BlurFade>
  </div>
</section>

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>What AI governance for automation includes</h2>
        <p>
          This is the operating layer around the workflow, not just the model prompt. It defines
          what can proceed automatically and what requires explicit human review.
        </p>
      </div>
    </BlurFade>
    <div class="panel">
      <ul class="list">
        {#each controls as control}
          <li>{control}</li>
        {/each}
      </ul>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Policy OS is the delivery surface</h2>
        <p>
          On this site, AI governance for automation maps directly to Policy OS: the governed
          execution layer used once a workflow is already in motion and failure gets expensive.
        </p>
      </div>
    </BlurFade>
    <div class="link-row">
      <a href="/services" class="resource-link">See the service ladder</a>
      <a href="/use-cases/enterprise" class="resource-link">See Policy OS in enterprise workflows</a>
      <a href="/automation-agency" class="resource-link">See the broader automation agency page</a>
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
    font-size: clamp(2.5rem, 4vw + 1.25rem, 4.25rem);
    line-height: 1.08;
    letter-spacing: var(--tracking-tighter, -0.025em);
    margin-bottom: var(--space-5, 1.5rem);
    color: var(--color-fg-primary);
  }

  .hero-subtitle,
  .section-header p {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    line-height: var(--leading-relaxed);
  }

  .hero-actions,
  .link-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-4, 1rem);
    flex-wrap: wrap;
  }

  .faq-stack {
    display: grid;
    gap: var(--space-5, 1.5rem);
  }

  .hero-actions {
    margin-top: var(--space-6, 2rem);
  }

  .hero-link,
  .resource-link {
    color: var(--color-fg-secondary);
    text-decoration: none;
  }

  .section {
    padding: 0 0 var(--section-padding, 6rem);
  }

  .section-header {
    max-width: 760px;
    margin-bottom: var(--space-8, 3rem);
  }

  .section-header h2 {
    font-size: clamp(1.75rem, 2vw + 1rem, 2.75rem);
    line-height: 1.15;
    margin-bottom: var(--space-4, 1rem);
    color: var(--color-fg-primary);
  }

  .panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: var(--space-6, 2rem);
  }

  .faq-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: var(--space-6, 2rem);
  }

  .list {
    display: grid;
    gap: var(--space-3, 0.75rem);
    padding-left: 1.25rem;
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
  }

  .resource-link {
    padding: 0.9rem 1.1rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
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

  @media (max-width: 640px) {
    .hero-actions,
    .link-row {
      align-items: stretch;
    }
  }
</style>
