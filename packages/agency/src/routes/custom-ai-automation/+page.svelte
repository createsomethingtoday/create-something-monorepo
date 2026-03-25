<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade, ShimmerButton } from '@create-something/canon/magicui';

  const faqItems = [
    {
      question: 'What counts as custom AI automation?',
      answer:
        'Custom AI automation means the workflow is designed around your actual systems, constraints, and approval logic instead of being forced into a generic template.'
    },
    {
      question: 'When do teams need custom AI automation instead of off-the-shelf tooling?',
      answer:
        'When the workflow crosses several systems, needs stronger trust boundaries, or breaks down under edge cases that simple automation builders cannot handle cleanly.'
    },
    {
      question: 'Do you start with AI everywhere?',
      answer:
        'No. We start by clarifying the workflow. AI is added where it improves the path, not where it introduces new ambiguity.'
    },
    {
      question: 'What does CREATE SOMETHING usually deliver first?',
      answer:
        'A single workflow wedge: the first production-safe operating path, plus the runbook, rules, and control points that make it reliable.'
    }
  ];

  const examples = [
    'HubSpot, Notion, Slack, and internal review loops that need shared context',
    'Approval-heavy handoffs where AI can draft or classify but humans still decide',
    'Ops and RevOps workflows where failures create cleanup cost across several teams'
  ];
</script>

<SEO
  title="Custom AI Automation"
  description="Custom AI automation for teams that need AI workflows built around their real systems, constraints, and approval boundaries instead of brittle templates."
  keywords="custom ai automation, ai workflow automation, workflow automation agency, ai automation agency, operations automation consultant, revops automation consultant"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'Custom AI Automation', url: '/custom-ai-automation' }
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
      <p class="hero-eyebrow">Custom AI Automation</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Custom AI automation for workflows that generic tooling cannot hold.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        CREATE SOMETHING builds custom AI automation around the workflow your team actually runs:
        the systems involved, the approval boundaries, the failure modes, and the operating cost
        when something slips.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/use-cases/business" class="hero-link">See business workflow examples</a>
      </div>
    </BlurFade>
  </div>
</section>

<section class="section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Where custom AI automation usually becomes necessary</h2>
        <p>
          The need usually shows up when teams have already tried lightweight automation and still
          end up bridging context manually.
        </p>
      </div>
    </BlurFade>
    <div class="panel">
      <ul class="list">
        {#each examples as example}
          <li>{example}</li>
        {/each}
      </ul>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2>Start with the wedge, not the grand plan</h2>
        <p>
          The first deliverable is usually a single workflow wedge that proves the system can hold
          under real use. Once it does, you can add governance, expansion, or deeper AI behavior.
        </p>
      </div>
    </BlurFade>
    <div class="link-row">
      <a href="/ai-automation-agency" class="resource-link">See the AI automation agency page</a>
      <a href="/automation-agency" class="resource-link">See the automation agency page</a>
      <a href="/services" class="resource-link">See the delivery model</a>
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
