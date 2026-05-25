<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const layers = [
    {
      label: 'Dify',
      title: 'Visible agent runtime',
      detail:
        'Dify carries the agent surface, workflow packaging, app templates, and operator-facing experience.'
    },
    {
      label: 'MCP',
      title: 'Tool and resource boundary',
      detail:
        'MCP server cards define what the agent can see, call, and describe without burying access in prompt text.'
    },
    {
      label: 'Policy OS',
      title: 'Approval and evidence layer',
      detail:
        'Policy OS decides what can run automatically, what needs approval, and what stops with a reason.'
    }
  ];

  const implementationSteps = [
    'Inventory the source systems, workflow owner, and approval authority.',
    'Create or confirm the MCP server card and tool scope.',
    'Package the Dify agent or workflow with a repo-owned manifest and DSL snapshot.',
    'Add smoke checks and eval gates for expected tool use, forbidden tool use, and secret refusal.',
    'Publish only sanitized trust evidence and keep raw traces private.'
  ];

  const useCases = [
    {
      title: 'Builder adoption',
      detail:
        'Use Dify to package the agent and MCP to expose the narrow tools needed for one useful workflow.'
    },
    {
      title: 'Operator governance',
      detail:
        'Use Policy OS to make approval states, blocked states, runbooks, and evidence visible before scale.'
    },
    {
      title: 'Agency packaging',
      detail:
        'Turn repeatable workflows into Dify templates or plugin candidates after sanitizing setup and proof.'
    }
  ];
</script>

<SEO
  title="Dify + MCP Control Plane | CREATE SOMETHING .agency"
  description="How CREATE SOMETHING packages Dify, MCP server cards, and Policy OS into a governed control plane for agent workflows."
  keywords="Dify MCP control plane, Dify agent governance, MCP server cards, Policy OS, Dify app templates"
  ogType="article"
  ogImage="/og-image.svg"
  articleSection="Dify Implementation"
  articleTags={['Dify', 'MCP', 'Policy OS', 'agent workflows']}
  propertyName="agency"
/>

<section class="article-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad article-shell hero-grid">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Dify + MCP Control Plane</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h1>Dify is the surface. MCP is the boundary. Policy OS is the operating rule.</h1>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            The fastest path to serious Dify adoption is not another generic chatbot. It is a
            visible Dify app with scoped MCP tools, repo-owned manifests, eval gates, and an
            approval layer the operator can inspect.
          </p>
        </BlurFade>
        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/dify" variant="secondary">Back To Dify Lane</Button>
          </div>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside
          class="brief-panel product-surface product-surface--soft"
          aria-label="Control plane summary"
        >
          <span>Implementation shape</span>
          <strong>Dify app + MCP card + Policy OS evidence</strong>
          <p>
            Current Dify links stay direct until affiliate acceptance. Partner, marketplace, and
            affiliate opportunities stay separated by lead type.
          </p>
        </aside>
      </BlurFade>
    </div>
  </div>
</section>

<section class="visual-section">
  <div class="shell-inner-pad article-shell">
    <ArticleVisualFigure
      src="/images/articles/dify-mcp-control-plane/dify-mcp-control-plane.svg"
      alt="Diagram showing Dify as the visible surface, MCP as the access boundary, and Policy OS as the operating rule."
      eyebrow="Original diagram"
      title="The control plane only works when each layer has a named job."
      caption="This owned visual makes the article's architecture explicit: Dify carries the app, MCP defines the tool boundary, and Policy OS decides allowed, ask, or blocked."
      sourceLabel="Created by CREATE SOMETHING for this article."
    />
  </div>
</section>

<section class="layer-section">
  <div class="shell-inner-pad article-shell">
    <div class="section-heading">
      <span class="product-kicker">Layer Map</span>
      <h2>Each layer has a job.</h2>
    </div>

    <div class="layer-grid" role="list">
      {#each layers as layer}
        <article class="layer-card product-surface" role="listitem">
          <span>{layer.label}</span>
          <h3>{layer.title}</h3>
          <p>{layer.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="visual-section">
  <div class="shell-inner-pad article-shell">
    <ArticleVisualFigure
      src="/images/articles/dify-mcp-control-plane/dify-mcp-tools-docs-20260525.png"
      alt="Screenshot of Dify documentation for using MCP tools."
      eyebrow="Collected screenshot"
      title="Dify's MCP docs make the tool-boundary question concrete."
      caption="Collected from Dify's official documentation on 2026-05-25. The screenshot supports the article's focus on MCP server cards, HTTP transport, and app-level tool access."
      sourceLabel="Source: Dify Use MCP Tools docs"
      sourceHref="https://docs.dify.ai/en/use-dify/build/mcp"
    />
  </div>
</section>

<section class="build-section" id="evals">
  <div class="shell-inner-pad article-shell build-grid">
    <div class="section-heading">
      <span class="product-kicker">Build Order</span>
      <h2>Make the control plane inspectable before it becomes powerful.</h2>
      <p>
        A Dify app becomes production-worthy when the workflow, tool boundary, approval behavior,
        and evidence model are explicit enough for another operator to review.
      </p>
    </div>

    <ol class="step-list">
      {#each implementationSteps as step}
        <li>{step}</li>
      {/each}
    </ol>
  </div>
</section>

<section class="use-section" id="adoption">
  <div class="shell-inner-pad article-shell">
    <div class="section-heading">
      <span class="product-kicker">Who It Serves</span>
      <h2>The same architecture supports three routes to Dify adoption.</h2>
    </div>

    <div class="use-grid" role="list">
      {#each useCases as item}
        <article class="use-card product-surface" role="listitem">
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad article-shell">
    <div class="product-surface product-surface--accent cta-grid">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Map one Dify workflow with the boundary attached.</h2>
        <p>
          Bring the workflow, systems, and approval owner. The first output is the Dify surface, MCP
          scope, eval gate, and policy state map.
        </p>
      </div>
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    </div>
  </div>
</section>

<style>
  .article-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .article-hero {
    padding-top: clamp(5.5rem, 9vw, 7.5rem);
    padding-bottom: clamp(2.5rem, 6vw, 4rem);
  }

  .hero-stage {
    position: relative;
    min-height: clamp(31rem, 54vw, 40rem);
    overflow: clip;
    isolation: isolate;
  }

  .hero-stage::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.86) 8%,
        rgba(3, 3, 4, 0.28) 20%,
        rgba(3, 3, 4, 0) 34%,
        rgba(3, 3, 4, 0) 66%,
        rgba(3, 3, 4, 0.32) 80%,
        rgba(3, 3, 4, 0.82) 92%,
        rgba(3, 3, 4, 1) 100%
      ),
      linear-gradient(
        90deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.965) 28%,
        rgba(3, 3, 4, 0.68) 52%,
        rgba(3, 3, 4, 0.18) 72%,
        rgba(3, 3, 4, 0.34) 88%,
        rgba(3, 3, 4, 0.52) 100%
      );
  }

  .article-hero :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-grid,
  .build-grid,
  .cta-grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(18rem, 0.72fr);
    gap: clamp(2rem, 5vw, 4.5rem);
    align-items: center;
  }

  .hero-grid {
    padding-top: clamp(2rem, 4vw, 3rem);
    padding-bottom: clamp(3rem, 6vw, 4.5rem);
  }

  .hero-copy,
  .section-heading,
  .cta-grid div {
    display: grid;
    gap: 0.9rem;
  }

  .hero-copy {
    max-width: 45rem;
  }

  .brief-panel span,
  .layer-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hero-copy h1,
  .section-heading h2,
  .cta-grid h2 {
    margin: 0;
    color: var(--color-fg-primary);
    letter-spacing: 0;
    line-height: 1.04;
    text-wrap: balance;
  }

  .hero-copy h1 {
    font-size: clamp(2.75rem, 4.8vw, 4.6rem);
    line-height: 1;
  }

  .section-heading h2,
  .cta-grid h2 {
    font-size: clamp(1.65rem, 3vw, 2.75rem);
  }

  .hero-copy p,
  .brief-panel p,
  .section-heading p,
  .layer-card p,
  .use-card p,
  .cta-grid p,
  .step-list li {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  .brief-panel {
    display: grid;
    gap: 0.75rem;
    padding: clamp(1.2rem, 3vw, 1.6rem);
  }

  .brief-panel strong {
    color: var(--color-fg-primary);
    font-size: 1.25rem;
    line-height: 1.25;
  }

  .layer-section,
  .visual-section,
  .build-section,
  .use-section,
  .cta-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .layer-grid,
  .use-grid {
    display: grid;
    gap: 1rem;
    margin-top: 1.4rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .layer-card,
  .use-card {
    min-height: 13rem;
    display: grid;
    align-content: start;
    gap: 0.7rem;
    padding: 1.15rem;
  }

  .layer-card h3,
  .use-card h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.08rem, 1.5vw, 1.35rem);
    line-height: 1.14;
    letter-spacing: 0;
  }

  .step-list {
    display: grid;
    gap: 0.8rem;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: steps;
  }

  .step-list li {
    counter-increment: steps;
    position: relative;
    padding: 1rem 1rem 1rem 3.25rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)),
      color-mix(in srgb, var(--color-shell-surface-secondary) 80%, transparent);
  }

  .step-list li::before {
    content: counter(steps);
    position: absolute;
    left: 1rem;
    top: 1rem;
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--color-brand-primary);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }

  .cta-grid {
    align-items: center;
    padding: clamp(1.35rem, 3vw, 2rem);
  }

  @media (max-width: 900px) {
    .hero-grid,
    .build-grid,
    .cta-grid,
    .layer-grid,
    .use-grid {
      grid-template-columns: 1fr;
    }

    .cta-grid {
      justify-items: start;
    }
  }

  @media (max-width: 680px) {
    .article-hero {
      padding-top: clamp(2.25rem, 9vw, 3.25rem);
      padding-bottom: clamp(1.75rem, 8vw, 3rem);
    }

    .hero-stage {
      min-height: clamp(27rem, 100vw, 35rem);
    }

    .article-hero :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-grid {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .hero-copy h1 {
      font-size: clamp(2.2rem, 10vw, 2.85rem);
      line-height: 1.03;
    }

    .hero-copy p {
      font-size: 0.94rem;
      line-height: 1.58;
    }

    .brief-panel {
      display: none;
    }

    .layer-grid,
    .use-grid {
      grid-template-columns: 1fr;
    }

    .layer-card,
    .use-card {
      min-height: auto;
    }
  }
</style>
