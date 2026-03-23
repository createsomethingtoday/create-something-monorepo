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
      name: 'Workflow Mapping Session',
      description:
        'The diagnostic session that maps workflow boundaries, approval rules, and the right next step before implementation.',
      type: 'Diagnostic Session',
      price: 'Scoped',
      priceDescription: 'Booked directly'
    },
    {
      name: 'Qualified MCP Hub Pilot',
      description:
        'A constrained entry wedge for one narrow workflow with clear ownership and manageable risk.',
      type: 'Qualified Pilot',
      price: 'Qualified',
      priceDescription: 'Review required'
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
        'Policy OS is the core product. Most teams start with a Workflow Mapping Session so the trust boundary is clear first. Narrow, low-risk workflows may qualify for a constrained pilot.'
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
      question: 'Do qualified pilots still exist?',
      answer:
        'Yes. Qualified pilots are still available for narrow, low-risk workflows. They are intentionally constrained and are not a substitute for Policy OS.'
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

  const offerLadder = [
    {
      step: '01',
      tag: 'Default start',
      name: 'Workflow Mapping Session',
      description:
        'Best for ambiguous, high-pressure, or multi-stakeholder workflows that need the trust boundary mapped before build approval.',
      includes: [
        'Workflow and handoff map',
        'Approval boundary recommendation',
        '30-day implementation direction'
      ]
    },
    {
      step: '02',
      tag: 'Qualified path',
      name: 'Qualified Pilot',
      description:
        'Available when the workflow is narrow, the owner is clear, and the risk can be contained responsibly.',
      includes: [
        'Single workflow wedge',
        'Scoped host and integration setup',
        'Checkpoint before expansion'
      ]
    },
    {
      step: '03',
      tag: 'Core product',
      name: 'Policy OS',
      description:
        'The governed execution layer that makes Skills + MCP safe to run faster in production.',
      includes: [
        'Approval and block boundaries',
        'Reason-coded access and blocked states',
        'Evals, release gates, and incident loops'
      ],
      featured: true
    },
    {
      step: '04',
      tag: 'High-stakes scale',
      name: 'Enterprise Extension',
      description:
        'Apply when several systems, teams, or compliance requirements have to stay aligned.',
      includes: [
        'Custom trust boundaries',
        'Cross-system orchestration',
        'Deterministic retries and auditability'
      ]
    }
  ];
</script>

<SEO
  title="How We Work | Production-Safe Workflow Infrastructure"
  description="CREATE SOMETHING .agency starts with a Workflow Mapping Session, qualifies narrow low-risk workflows for pilot access, and adds Policy OS when approvals and operational control matter."
  keywords="workflow mapping session, policy os, ops revops automation, qualified mcp pilot, governed execution, enterprise automation architecture"
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
      <p class="hero-eyebrow">How It Works</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Start with the workflow creating the most drag.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        Most teams start with a Workflow Mapping Session. Narrow, low-risk workflows may qualify
        for a constrained MCP Hub pilot. Policy OS begins when approvals, blocked states, and
        ongoing oversight matter.
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
        description="The mapping session defines the trust boundary first. If the workflow is narrow enough, a qualified pilot can prove the wedge. Policy OS decides what runs automatically, what needs review, and what stops."
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
      <div class="ladder-shell">
        <BorderBeam size={300} duration={12} delay={9} />
        <div class="ladder-copy">
          <span class="ladder-eyebrow">Offer Ladder</span>
          <h2 class="ladder-title">Start with diagnosis. Add governance when the workflow earns it.</h2>
          <p class="ladder-intro">
            Most teams should start with a mapping session. Qualified pilots stay narrow on
            purpose. Policy OS becomes the product once the workflow starts touching revenue,
            compliance, or customer trust.
          </p>
          <div class="ladder-principles">
            <div class="ladder-principle">
              <span>Fix first</span>
              <p>Map the trust boundary before deciding whether the workflow needs a pilot or governed execution.</p>
            </div>
            <div class="ladder-principle">
              <span>Keep pilots narrow</span>
              <p>Qualified pilots only make sense when the owner is clear, the risk is low, and the checkpoint is explicit.</p>
            </div>
            <div class="ladder-principle">
              <span>Govern when stakes rise</span>
              <p>Policy OS exists for approval paths, blocked states, release checks, and reliable recovery.</p>
            </div>
          </div>
        </div>
        <div class="ladder-list">
          {#each offerLadder as item}
            <article class:ladder-row={true} class:ladder-row-featured={item.featured}>
              <div class="ladder-order">{item.step}</div>
              <div class="ladder-summary">
                <div class="ladder-summary-top">
                  <span class="progression-tag">{item.tag}</span>
                  {#if item.featured}
                    <span class="ladder-featured-pill">Policy OS is the product</span>
                  {/if}
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <ul class="ladder-points" aria-label={`${item.name} includes`}>
                {#each item.includes as point}
                  <li>{point}</li>
                {/each}
              </ul>
            </article>
          {/each}
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
      <h2 class="section-heading">How the Engagement Expands</h2>
    </BlurFade>

    <div class="timeline-grid">
      <BlurFade delay={0.1}>
        <div class="timeline-card">
            <span class="timeline-label">Phase 1</span>
          <h3>Workflow Mapping Session</h3>
          <p>
            Map handoffs, approval rules, and the boundary between auto-allow, review, and block.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
          <div class="timeline-card">
            <span class="timeline-label">Phase 2</span>
          <h3>Pilot qualification</h3>
          <p>
            Decide whether the workflow is narrow and low-risk enough for a constrained pilot.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.3}>
        <div class="timeline-card">
          <span class="timeline-label">Phase 3</span>
          <h3>Policy OS</h3>
          <p>
            Add approvals, blocked states, release checks, and incident loops to the live workflow.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.4}>
        <div class="timeline-card">
          <span class="timeline-label">Phase 4</span>
          <h3>Enterprise Extension</h3>
          <p>
            Extend into custom orchestration when several systems, teams, or compliance rules need
            one operating model.
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
        implementation. If the workflow is a genuine fit for a pilot, that will be clear in the
        map.
      </p>
    </BlurFade>
    <BlurFade delay={0.2}>
      <div class="cta-buttons">
        <ShimmerButton href="/book">Book a Mapping Session</ShimmerButton>
        <a href="/contact" class="cta-secondary">See if your workflow qualifies for a pilot →</a>
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
    max-width: 14ch;
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

  /* Offer Ladder */
  .retainer-section {
    padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
  }

  .ladder-shell {
    max-width: 1120px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: start;
    padding: clamp(1.25rem, 2vw, 2rem);
    border: 1px solid rgba(96, 165, 250, 0.18);
    border-radius: 28px;
    background:
      radial-gradient(circle at top left, rgba(96, 165, 250, 0.08), transparent 42%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012)),
      rgba(4, 8, 15, 0.92);
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    position: relative;
  }

  .ladder-shell::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12%;
    right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.28), transparent);
  }

  .ladder-copy {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 1rem;
    padding: 0.5rem 0.25rem 0.5rem 0;
  }

  .ladder-eyebrow {
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(255, 255, 255, 0.52);
  }

  .ladder-title {
    font-size: clamp(2.1rem, 3vw + 1rem, 3.25rem);
    line-height: 1.03;
    letter-spacing: -0.04em;
    color: var(--color-fg-primary);
    margin: 0;
  }

  .ladder-intro {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.7;
    margin: 0;
  }

  .ladder-principles {
    display: grid;
    gap: 0.85rem;
    margin-top: 0.75rem;
  }

  .ladder-principle {
    padding: 0.95rem 1rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.025);
  }

  .ladder-principle span {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.68rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(96, 165, 250, 0.88);
  }

  .ladder-principle p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.62;
    color: rgba(255, 255, 255, 0.7);
  }

  .ladder-list {
    display: grid;
    gap: 0.95rem;
  }

  .ladder-row {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1.1fr) minmax(13rem, 0.9fr);
    gap: 1rem 1.25rem;
    align-items: start;
    padding: 1.15rem 1.2rem 1.2rem;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
      rgba(255, 255, 255, 0.02);
  }

  .ladder-row-featured {
    border-color: rgba(96, 165, 250, 0.22);
    background:
      radial-gradient(circle at top left, rgba(96, 165, 250, 0.14), transparent 50%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015)),
      rgba(4, 8, 15, 0.86);
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.08);
  }

  .ladder-order {
    padding-top: 0.25rem;
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.42);
  }

  .ladder-summary {
    min-width: 0;
  }

  .ladder-summary-top {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .ladder-featured-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.24rem 0.58rem;
    border-radius: 999px;
    border: 1px solid rgba(96, 165, 250, 0.22);
    background: rgba(96, 165, 250, 0.08);
    color: rgba(191, 219, 254, 0.92);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ladder-summary h3 {
    font-size: clamp(1.25rem, 1.1vw + 1rem, 1.7rem);
    color: var(--color-fg-primary);
    line-height: 1.15;
    margin: 0 0 0.6rem;
  }

  .ladder-summary p {
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.68;
    margin: 0;
  }

  .progression-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.24rem 0.58rem;
    margin-bottom: var(--space-4, 1rem);
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.58);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .ladder-points {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.6rem;
  }

  .ladder-points li {
    font-size: 0.92rem;
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.55;
    padding-left: 1rem;
    position: relative;
  }

  .ladder-points li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(96, 165, 250, 0.6);
  }

  /* Timeline */
  .timeline-section {
    padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
  }

  .timeline-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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
    .ladder-shell {
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

    .ladder-row {
      grid-template-columns: 1fr;
      gap: 0.9rem;
    }

    .ladder-order {
      padding-top: 0;
    }

    .ladder-points {
      padding-top: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
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
