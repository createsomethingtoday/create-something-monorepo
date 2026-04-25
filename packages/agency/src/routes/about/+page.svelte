<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import WorkHistoryTimeline from '$lib/components/WorkHistoryTimeline.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const operatingPrinciples = [
    {
      tag: 'Power needs control',
      title: 'Performance only matters when the handoff still makes sense.',
      body:
        'I grew up between two reference points: a Porsche 930 Turbo and emergency medicine. One taught me that speed matters. The other taught me that pressure exposes every weak protocol.'
    },
    {
      tag: 'Real-world protocols',
      title: 'Exceptions are the work, not the edge case.',
      body:
        'Equine veterinary work, support, and operations taught me that logs, checklists, and ownership are what keep real systems safe when conditions stop being ideal.'
    },
    {
      tag: 'Build for inheritance',
      title: 'The output has to survive the kickoff call.',
      body:
        'Clients do not need hidden cleverness. They need one operating path their team can understand, approve, and keep running after the initial build ships.'
    }
  ];

  const practiceCards = [
    {
      eyebrow: 'What I do now',
      title: 'Systems architecture with actual operating constraints.',
      body:
        'I am a Senior Systems Architect on the Marketplace Team at Webflow, where I build internal tooling, onboarding systems, and platform infrastructure serving millions of users. The problems are familiar: brittle handoffs, unclear ownership, and systems that look automated until the exceptions show up.',
      bodySecondary:
        'I have shipped integrations across Salesforce, HubSpot, Notion, Slack, Procore, and internal systems. That work informs where native tooling is enough, where MCP is the right wedge, and where approvals, policies, and recovery paths are the difference between a launch and a system people actually trust.'
    },
    {
      eyebrow: 'Client experience',
      title: 'Clients hire a control layer, not another person to manage.',
      body:
        'Most teams do not need a giant AI initiative first. They need one workflow that stops creating manual cleanup. I start there, then add controls only when the cost of failure justifies the extra layer.',
      points: [
        'You bring the workflow, the operating constraints, and the approval owner.',
        'I bring the diagnosis, the control layer, and the artifacts your team needs to run and inherit the system.',
        'If what the client needs is a fuller internal delivery team, I route that work to a better-fit partner.'
      ]
    }
  ];

  const connectedProperties = [
    {
      name: '.ltd',
      description: 'Philosophy and principles',
      href: 'https://createsomething.ltd'
    },
    {
      name: '.io',
      description: 'Research and validated patterns',
      href: 'https://createsomething.io'
    },
    {
      name: '.space',
      description: 'Tools and experiments',
      href: 'https://createsomething.space'
    },
    {
      name: '.agency',
      description: 'Governed workflow infrastructure and reliability controls',
      current: true
    }
  ];
</script>

<SEO
  title={`About | Micah Johnson — ${agencyCoreMessaging.categoryLabel}`}
  description="I design workflows people can trust under pressure, with the controls, visibility, and recovery paths real teams need."
  keywords="Micah Johnson, governed workflow infrastructure, production automation, systems architecture, automation reliability, workflow governance"
  ogImage="/og-image.svg"
  propertyName="agency"
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

  <div class="section-container hero-content">
    <BlurFade delay={0}>
      <p class="hero-eyebrow">About</p>
    </BlurFade>
    <BlurFade delay={0.05}>
      <h1 class="hero-title">I design workflows people can trust under pressure.</h1>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="hero-detail">
        My work sits between high-performance systems and clinical discipline: make things faster,
        but never at the expense of clarity, control, or recovery.
      </p>
    </BlurFade>
  </div>
</section>

<section class="frame-section">
  <div class="section-container">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Operating frame</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Why the work reads like operations, not hype.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The through-line is not AI. It is learning how to turn messy systems into operating paths
          people can trust when the easy assumptions stop holding.
        </p>
      </BlurFade>
    </div>

    <div class="principles-grid">
      {#each operatingPrinciples as principle, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="product-surface principle-card">
            <span class="principle-tag">{principle.tag}</span>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="practice-section">
  <div class="section-container practice-grid">
    <BlurFade delay={0.05}>
      <article class="product-surface practice-card">
        <span class="product-kicker">{practiceCards[0].eyebrow}</span>
        <h2>{practiceCards[0].title}</h2>
        <p>{practiceCards[0].body}</p>
        <p>{practiceCards[0].bodySecondary}</p>
        <p class="practice-links">
          Based in Texas. <a href="https://www.linkedin.com/in/micahryanjohnson/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          · <a href="mailto:micah@createsomething.agency">Email</a>
        </p>
      </article>
    </BlurFade>

    <BlurFade delay={0.12}>
      <article class="product-surface product-surface--soft practice-card">
        <span class="product-kicker">{practiceCards[1].eyebrow}</span>
        <h2>{practiceCards[1].title}</h2>
        <p>{practiceCards[1].body}</p>
        <ul class="product-list">
          {#each practiceCards[1].points ?? [] as point}
            <li>{point}</li>
          {/each}
        </ul>
      </article>
    </BlurFade>
  </div>
</section>

<section class="timeline-section" id="timeline">
  <div class="section-container">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">Timeline</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>How the discipline was built.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The pattern shows up in science, creative work, client services, marketplaces, and now
          automation: reduce ambiguity, make the control layer legible, and leave the next person a
          path they can actually run.
        </p>
      </BlurFade>
    </div>

    <WorkHistoryTimeline />
  </div>
</section>

<section class="system-section">
  <div class="section-container system-grid">
    <BlurFade delay={0.05}>
      <article class="product-surface product-surface--soft system-card">
        <span class="product-kicker">Connected system</span>
        <h2>The rest of CREATE SOMETHING sharpens the agency work.</h2>
        <p>
          Client work informs the research. Research sharpens the methodology. The methodology
          raises the bar on client work.
        </p>

        <div class="property-grid">
          {#each connectedProperties as property}
            {#if property.href}
              <a
                href={property.href}
                target="_blank"
                rel="noopener noreferrer"
                class="property-card"
              >
                <strong>{property.name}</strong>
                <span>{property.description}</span>
              </a>
            {:else}
              <div class="property-card property-card--current">
                <strong>{property.name}</strong>
                <span>{property.description}</span>
                <em>You are here</em>
              </div>
            {/if}
          {/each}
        </div>
      </article>
    </BlurFade>

    <BlurFade delay={0.12}>
      <article class="product-surface system-card">
        <span class="product-kicker">Also building</span>
        <h2>WORKWAY and the direct referral path.</h2>
        <p>
          I am also building <a href="https://workway.co" target="_blank" rel="noopener noreferrer">WORKWAY</a>. When
          clients need fuller system development and onboarding than .agency is meant to carry, I
          provide a direct referral path to trusted partners, including Half Dozen.
        </p>
      </article>
    </BlurFade>
  </div>
</section>

<section class="cta-section">
  <div class="section-container">
    <div class="product-surface product-surface--accent cta-panel">
      <BlurFade>
        <span class="product-kicker">Start with one workflow</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>{agencyCoreMessaging.workflowCtaHeading}</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>{agencyCoreMessaging.workflowCtaDetail}</p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="cta-actions">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/services" variant="ghost">{agencyCoreMessaging.engagementModelLabel}</Button>
        </div>
      </BlurFade>
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
    padding: clamp(4.5rem, 8vw, 6.5rem) 0 clamp(3rem, 5vw, 4rem);
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
    max-width: 58rem;
  }

  .hero-eyebrow {
    margin: 0 0 0.85rem;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--color-fg-muted);
  }

  .hero-title {
    margin: 0 auto 1rem;
    max-width: 12ch;
    font-size: clamp(3.25rem, 6vw, 6rem);
    line-height: 0.94;
    letter-spacing: -0.05em;
    text-wrap: balance;
  }

  .hero-detail {
    margin: 0 auto;
    max-width: 34rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.05rem, 1vw + 0.9rem, 1.18rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .frame-section,
  .practice-section,
  .timeline-section,
  .system-section,
  .cta-section {
    padding: clamp(2.5rem, 5vw, 4.5rem) 0;
  }

  .section-lead {
    display: grid;
    gap: 0.75rem;
    max-width: 42rem;
    margin-bottom: 1.5rem;
  }

  .section-lead--center {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  .section-lead h2,
  .practice-card h2,
  .system-card h2,
  .cta-panel h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .section-lead p,
  .principle-card p,
  .practice-card p,
  .system-card p,
  .cta-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .principles-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .principle-card,
  .practice-card,
  .system-card {
    display: grid;
    gap: 0.9rem;
    padding: 1.25rem;
  }

  .principle-tag {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .principle-card h3 {
    margin: 0;
    font-size: 1.3rem;
    line-height: 1.12;
  }

  .practice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .practice-card h2,
  .system-card h2 {
    font-size: clamp(1.55rem, 2vw, 2.15rem);
  }

  .practice-links {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .practice-links a,
  .system-card a {
    color: var(--color-fg-primary);
  }

  .system-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 1rem;
    align-items: start;
  }

  .property-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .property-card {
    display: grid;
    gap: 0.22rem;
    padding: 0.95rem 1rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    color: inherit;
    text-decoration: none;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .property-card strong {
    color: var(--color-fg-primary);
    font-size: 1rem;
  }

  .property-card span {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.55;
  }

  .property-card em {
    color: var(--color-brand-ink);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-style: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .property-card:hover {
    transform: translateY(-1px);
    border-color: rgba(96, 165, 250, 0.22);
    background: rgba(255, 255, 255, 0.05);
  }

  .property-card--current {
    border-color: rgba(96, 165, 250, 0.22);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 0 0 1px rgba(49, 92, 255, 0.08);
  }

  .cta-panel {
    display: grid;
    gap: 0.95rem;
    padding: clamp(1.5rem, 3vw, 2rem);
    text-align: center;
  }

  .cta-panel p {
    max-width: 38rem;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.85rem;
  }

  .cta-panel .product-kicker {
    justify-self: center;
  }

  @media (max-width: 960px) {
    .principles-grid,
    .practice-grid,
    .system-grid,
    .property-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .section-container {
      padding: 0 1rem;
    }

    .hero {
      padding-top: 4rem;
      padding-bottom: 2.75rem;
    }

    .hero-title {
      max-width: 9ch;
      font-size: clamp(2.6rem, 11vw, 4.4rem);
    }

    .principle-card,
    .practice-card,
    .system-card,
    .cta-panel {
      padding: 1rem;
    }
  }
</style>
