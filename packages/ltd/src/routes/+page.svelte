<script lang="ts">
  import { Button, HeroSignalField, NewsletterSignup, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';

  const proofMetrics = [
    { value: '7', label: 'canon areas' },
    { value: '14', label: 'working patterns' },
    { value: '2', label: 'master lineages' },
    { value: '1', label: 'shared operating thesis' }
  ];

  const canonCards = [
    {
      eyebrow: 'Canon',
      title: 'Make the design system inspectable',
      body: 'Tokens, components, motion, and guidelines live where the other properties can actually reuse them.',
      href: '/canon'
    },
    {
      eyebrow: 'Principles',
      title: 'Keep judgment legible',
      body: 'The philosophy layer names the standards behind decisions so delivery does not depend on taste hidden in one person.',
      href: '/principles'
    },
    {
      eyebrow: 'Patterns',
      title: 'Promote what survives practice',
      body: 'Patterns earn their place when they clarify research, workbench experiments, or governed delivery.',
      href: '/patterns'
    }
  ];

  const ecosystemCards = [
    {
      eyebrow: '.agency',
      title: 'Ship the workflow',
      body: 'Governed delivery turns the canon into client-owned operating paths.',
      href: 'https://createsomething.agency'
    },
    {
      eyebrow: '.io',
      title: 'Document the evidence',
      body: 'Research records which patterns held up, failed, or need further pressure.',
      href: 'https://createsomething.io'
    },
    {
      eyebrow: '.space',
      title: 'Try the runtime',
      body: 'The workbench exposes the behavior before a pattern becomes doctrine.',
      href: 'https://createsomething.space'
    }
  ];
</script>

<SEO
  title="The Canon for Less, But Better"
  description="The philosophical foundation for Create Something. Design principles, canon patterns, and standards for making less, but better operating decisions."
  keywords="design principles, less but better, Dieter Rams, minimalism, good design, design philosophy, systems thinking"
  ogImage="/og-image.svg"
  propertyName="ltd"
/>

<section class="property-hero-page ltd-hero-page">
  <div class="property-hero-stage">
    <HeroSignalField variant="ltd" focus="right" />

    <div class="shell-inner-pad property-hero-layout">
      <div class="property-hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker">CREATE SOMETHING .ltd</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="property-hero-title">The canon for making less, but better decisions.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="property-hero-detail">
            CREATE SOMETHING .ltd is the judgment layer: principles, patterns, and standards that
            keep the ecosystem coherent as research, workbench experiments, and agency delivery
            change underneath it.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="property-hero-actions">
            <Button href="/canon">Read The Canon</Button>
            <Button href="/patterns" variant="secondary">Browse Patterns</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="property-hero-note">
            Less, but better. Policy as artifact. Creation over consumption.
          </p>
        </BlurFade>
      </div>
    </div>
  </div>

  <div class="shell-inner-pad">
    <div class="property-metric-grid">
      {#each proofMetrics as metric, index}
        <BlurFade delay={0.25 + index * 0.05}>
          <article class="product-surface product-surface--soft property-metric-card">
            <span class="property-metric-value">{metric.value}</span>
            <span class="property-metric-label">{metric.label}</span>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="property-section ltd-principle-section">
  <div class="shell-inner-pad ltd-principle-grid">
    <div class="property-section-lead ltd-principle-lead">
      <BlurFade>
        <span class="product-kicker">Weniger, aber besser</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Philosophy earns its place when it changes the next build.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Less is not decoration. It is a discipline for deciding what survives into the product,
          the policy layer, and the delivery artifact.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <div class="product-surface product-surface--soft manifesto-panel">
        <p>
          Before adding anything, ask whether it earns its place. The same question applies to every
          feature, word, workflow, policy rule, and handoff.
        </p>
        <p>
          Simple is not easy. It takes more effort to make something clear than to leave it
          complicated. That effort is the work.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead property-section-lead--center">
      <BlurFade>
        <span class="product-kicker">Canon surfaces</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The canon is a shared source of truth, not a separate aesthetic.</h2>
      </BlurFade>
    </div>

    <div class="property-card-grid property-card-grid--3">
      {#each canonCards as card, index}
        <BlurFade delay={0.12 + index * 0.06}>
          <a
            href={card.href}
            class="product-surface property-content-card property-content-link-card"
          >
            <span class="property-content-meta">{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <span class="property-content-link">Open surface</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div
      class="product-surface product-surface--accent property-content-card crystallization-panel"
    >
      <BlurFade>
        <span class="product-kicker">Featured pattern</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Crystallization turns judgment into an operating constraint.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Encode human expertise into configurable constraints that AI agents execute within. Not no
          humans in the loop, but human judgment shaping every decision without requiring constant
          presence.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="crystal-example">
          <code>harness.config.yaml</code>
          <span>Model routing, quality gates, review pipelines</span>
        </div>
      </BlurFade>
      <BlurFade delay={0.2}>
        <div class="property-hero-actions">
          <Button href="/patterns/crystallization">Explore The Pattern</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead property-section-lead--center">
      <BlurFade>
        <span class="product-kicker">Cross-property handoff</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The thesis should make every access point feel related.</h2>
      </BlurFade>
    </div>

    <div class="property-card-grid property-card-grid--3">
      {#each ecosystemCards as card, index}
        <BlurFade delay={0.12 + index * 0.06}>
          <a
            href={card.href}
            class="product-surface product-surface--soft property-content-card property-content-link-card"
            target="_blank"
            rel="noopener"
          >
            <span class="property-content-meta">{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <span class="property-content-link">Open property</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<NewsletterSignup
  headline="Canon updates and new patterns"
  description="The design philosophy newsletter."
  source="ltd-homepage"
/>

<style>
  .ltd-hero-page {
    padding-bottom: clamp(1.5rem, 3.5vw, 2.5rem);
  }

  .ltd-principle-section {
    padding-top: clamp(0.5rem, 2vw, 1.5rem);
    padding-bottom: clamp(2.75rem, 5vw, 4rem);
  }

  .ltd-principle-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(24rem, 1fr);
    gap: clamp(1.4rem, 4vw, 4rem);
    align-items: start;
  }

  .ltd-principle-lead {
    margin-bottom: 0;
    max-width: 38rem;
  }

  .manifesto-panel {
    display: grid;
    gap: clamp(1.2rem, 3vw, 1.8rem);
    max-width: none;
    margin-top: 0.4rem;
    --product-surface-padding: clamp(1.35rem, 2.5vw, 2rem);
  }

  .manifesto-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    line-height: var(--leading-relaxed);
  }

  .crystallization-panel {
    max-width: 58rem;
    margin-inline: auto;
  }

  .crystallization-panel h2 {
    margin: 0;
    color: var(--color-fg-primary);
    line-height: 1.02;
    text-wrap: balance;
  }

  .crystal-example {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    align-items: center;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
  }

  .crystal-example code {
    color: var(--color-fg-primary);
    padding: 0.36rem 0.55rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-shell-border-subtle);
    background: var(--color-hover);
  }

  @media (max-width: 980px) {
    .ltd-principle-grid {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    .manifesto-panel {
      margin-top: 0;
    }
  }
</style>
