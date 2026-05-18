<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const timeline = [
    {
      phase: 'n8n',
      title: 'Workflow automation phase',
      detail:
        'n8n was the right early tool when the job was wiring app triggers, API calls, notifications, and repeatable operations.'
    },
    {
      phase: 'Cloudflare',
      title: 'Runtime ownership phase',
      detail:
        'Cloudflare became necessary when workflows needed deployable endpoints, tenant boundaries, queues, D1 state, auth, and rollback paths.'
    },
    {
      phase: 'Dify',
      title: 'Client agent phase',
      detail:
        'Dify became first-class when the workflow needed a usable agent surface with chat, app publishing, MCP tools, and eval coverage.'
    }
  ];

  const layerFit = [
    {
      title: 'Use n8n when the workflow is internal.',
      detail:
        'It is still strong for deterministic automations, app-to-app movement, webhook or schedule triggers, and operator-managed workflow logic.'
    },
    {
      title: 'Use Cloudflare when the workflow becomes infrastructure.',
      detail:
        'It owns runtime behavior: routes, state, queues, permissions, observability, tenant boundaries, and durable recovery.'
    },
    {
      title: 'Use Dify when the workflow becomes an agent app.',
      detail:
        'It gives clients and operators a direct agent surface while MCP carries the tool boundary and the repo carries evidence.'
    }
  ];

  const decisionRows = [
    ['Internal app-to-app automation', 'n8n'],
    ['Scheduled syncs, routing, and notifications', 'n8n or Cloudflare'],
    ['Production auth, queues, tenant boundaries, custom endpoints', 'Cloudflare'],
    ['Client-facing chat or agent UI', 'Dify'],
    ['Agent with governed MCP tool access', 'Dify + MCP'],
    ['Portable policy, eval, and release evidence', 'Repo + Policy OS'],
    ['Public or partner-ready agent package', 'Dify + repo-backed proof']
  ];

  const comparisonRows = [
    {
      label: 'Center of gravity',
      n8n: 'Automation workflows and node orchestration.',
      dify: 'Agentic apps, chatflows, workflows, and tool-using agents.'
    },
    {
      label: 'Best user',
      n8n: 'An operator or builder maintaining internal workflows.',
      dify: 'A client, teammate, or operator using an agent-facing app.'
    },
    {
      label: 'MCP posture',
      n8n: 'Can expose enabled workflows and tools to MCP clients.',
      dify: 'Can connect MCP server cards and make tools available inside apps.'
    },
    {
      label: 'Publishing shape',
      n8n: 'Workflow runs, chat triggers, hosted or embedded chat, and MCP access.',
      dify: 'Published web app, API access, MCP server option, and DSL export.'
    },
    {
      label: 'CREATE SOMETHING fit',
      n8n: 'Useful for internal automation and quick operational glue.',
      dify: 'Default for client-facing agent access and partner-ready proof.'
    }
  ];

  const migrationSteps = [
    'Name whether the workflow is internal automation, production infrastructure, or a client agent surface.',
    'Keep n8n workflows when the value is app-to-app movement and the operator owns the runbook.',
    'Move runtime-critical paths to Cloudflare when auth, state, queues, or tenant boundaries matter.',
    'Package client-facing agents in Dify when users need chat, app publishing, MCP tools, and usable access.',
    'Keep prompts, Dify DSL snapshots, MCP inventory, eval gates, and policy artifacts in the repo.',
    'Route self-serve Dify adoption through affiliate links only after acceptance and disclosure.'
  ];

  const sourceNotes = [
    {
      label: 'n8n integrations',
      href: 'https://docs.n8n.io/integrations/'
    },
    {
      label: 'n8n MCP access',
      href: 'https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/'
    },
    {
      label: 'n8n Chat Hub',
      href: 'https://docs.n8n.io/advanced-ai/chat-hub/'
    },
    {
      label: 'Dify app concepts',
      href: 'https://docs.dify.ai/en/use-dify/getting-started/key-concepts'
    },
    {
      label: 'Dify Workflow and Chatflow',
      href: 'https://docs.dify.ai/en/use-dify/build/workflow-chatflow'
    },
    {
      label: 'Dify MCP tools',
      href: 'https://docs.dify.ai/en/use-dify/build/mcp'
    }
  ];
</script>

<SEO
  title="Dify vs n8n | Workflow Automation vs Agent Apps"
  description="A practical comparison of n8n, Cloudflare, and Dify: when to use workflow automation, when to own runtime infrastructure, and when to publish client-facing agent apps."
  keywords="Dify vs n8n, n8n vs Dify, workflow automation vs agent apps, Dify MCP, n8n MCP, AI workflow automation"
  canonical="https://createsomething.agency/dify/n8n-vs-dify"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="compare-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad compare-shell hero-grid">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Dify vs n8n</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h1>
            The question is not which tool wins. The question is what layer the workflow has become.
          </h1>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            n8n was useful when the work was internal automation. Cloudflare became necessary when
            workflows needed production runtime ownership. Dify became first-class when clients
            needed a clean agent interface with governed MCP access.
          </p>
        </BlurFade>
        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/dify/content-engine" variant="secondary">Back To Content Engine</Button>
          </div>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside
          class="brief-panel product-surface product-surface--soft"
          aria-label="Comparison summary"
        >
          <span>Short answer</span>
          <strong>n8n for internal automation. Dify for agent apps. Cloudflare for runtime.</strong>
          <p>
            The durable CREATE SOMETHING stack is Dify for the surface, MCP for tools, Cloudflare
            for infrastructure, and Policy OS for governance.
          </p>
        </aside>
      </BlurFade>
    </div>
  </div>
</section>

<section class="timeline-section">
  <div class="shell-inner-pad compare-shell">
    <div class="section-heading wide">
      <span class="product-kicker">The Pivot</span>
      <h2>The stack changed because the job changed.</h2>
      <p>
        The history matters. A workflow that starts as an internal automation can become a
        production route, then a client-facing agent product. Each shift changes the best tool.
      </p>
    </div>

    <div class="timeline-grid" role="list">
      {#each timeline as item}
        <article class="timeline-card product-surface" role="listitem">
          <span>{item.phase}</span>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="fit-section">
  <div class="shell-inner-pad compare-shell layer-grid">
    <div class="section-heading">
      <span class="product-kicker">Layer Fit</span>
      <h2>Do not force one product to be the whole architecture.</h2>
      <p>
        n8n has AI, MCP, and chat surfaces now. Dify has workflow and trigger concepts too. The
        difference is the center of gravity and the surface a client should operate.
      </p>
    </div>

    <div class="fit-list">
      {#each layerFit as item}
        <article class="fit-card product-surface product-surface--soft">
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="matrix-section">
  <div class="shell-inner-pad compare-shell matrix-grid">
    <div class="section-heading">
      <span class="product-kicker">Decision Table</span>
      <h2>Pick the layer before picking the tool.</h2>
    </div>

    <div class="decision-table product-surface" aria-label="Dify n8n Cloudflare decision table">
      {#each decisionRows as row}
        <div class="decision-row">
          <span>{row[0]}</span>
          <strong>{row[1]}</strong>
        </div>
      {/each}
    </div>
  </div>
</section>

<section class="comparison-section">
  <div class="shell-inner-pad compare-shell">
    <div class="section-heading wide">
      <span class="product-kicker">Fair Comparison</span>
      <h2>n8n is not the past. It is a different layer.</h2>
      <p>
        The useful comparison gives each product a real job. That makes the recommendation more
        credible and keeps the public Dify lane grounded.
      </p>
    </div>

    <div class="comparison-list">
      {#each comparisonRows as row}
        <article class="comparison-row product-surface">
          <span>{row.label}</span>
          <div>
            <h3>n8n</h3>
            <p>{row.n8n}</p>
          </div>
          <div>
            <h3>Dify</h3>
            <p>{row.dify}</p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="migration-section">
  <div class="shell-inner-pad compare-shell migration-grid">
    <div class="section-heading">
      <span class="product-kicker">Migration Checklist</span>
      <h2>Move the workflow only when the operating surface needs it.</h2>
      <p>
        The goal is not migration for its own sake. Keep the working automation where it belongs,
        then promote only the parts that need stronger runtime or better agent access.
      </p>
    </div>

    <ol class="migration-list">
      {#each migrationSteps as step}
        <li>{step}</li>
      {/each}
    </ol>
  </div>
</section>

<section class="source-section">
  <div class="shell-inner-pad compare-shell source-layout">
    <div class="section-heading">
      <span class="product-kicker">Source Notes</span>
      <h2>This comparison is based on current product docs and repo posture.</h2>
      <p>
        The working model should be rechecked as n8n and Dify both keep expanding their AI and MCP
        surfaces.
      </p>
    </div>

    <div class="source-list">
      {#each sourceNotes as item}
        <a class="source-link product-surface product-surface--soft" href={item.href}>
          {item.label}
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad compare-shell">
    <div class="product-surface product-surface--accent cta-grid">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Map the workflow to the right layer.</h2>
        <p>
          Bring the workflow and the user who needs to operate it. The first decision is whether it
          belongs in n8n, Cloudflare, Dify, or a split across all three.
        </p>
      </div>
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    </div>
  </div>
</section>

<style>
  .compare-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .compare-hero {
    padding-top: clamp(5.5rem, 9vw, 7.5rem);
    padding-bottom: clamp(2.5rem, 6vw, 4rem);
  }

  .hero-stage {
    position: relative;
    min-height: clamp(32rem, 56vw, 41rem);
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

  .compare-hero :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-grid,
  .layer-grid,
  .matrix-grid,
  .migration-grid,
  .source-layout,
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
    max-width: 46rem;
  }

  .brief-panel span,
  .timeline-card span,
  .comparison-row > span,
  .source-link {
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
    font-size: clamp(2.75rem, 4.8vw, 4.65rem);
    line-height: 1;
  }

  .section-heading h2,
  .cta-grid h2 {
    font-size: clamp(1.65rem, 3vw, 2.75rem);
  }

  .hero-copy p,
  .brief-panel p,
  .section-heading p,
  .timeline-card p,
  .fit-card p,
  .comparison-row p,
  .cta-grid p,
  .migration-list li {
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
    font-size: 1.22rem;
    line-height: 1.25;
  }

  .timeline-section,
  .fit-section,
  .matrix-section,
  .comparison-section,
  .migration-section,
  .source-section,
  .cta-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .section-heading.wide {
    max-width: 58rem;
    margin-bottom: 1.4rem;
  }

  .timeline-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .timeline-card,
  .fit-card {
    min-height: 13rem;
    display: grid;
    align-content: start;
    gap: 0.7rem;
    padding: 1.15rem;
  }

  .timeline-card h3,
  .fit-card h3,
  .comparison-row h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.08rem, 1.5vw, 1.35rem);
    line-height: 1.14;
    letter-spacing: 0;
  }

  .fit-list,
  .comparison-list,
  .source-list {
    display: grid;
    gap: 0.85rem;
  }

  .decision-table {
    display: grid;
    padding: 0.45rem;
  }

  .decision-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(10rem, 0.42fr);
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border-bottom: 1px solid var(--color-shell-border-default);
  }

  .decision-row:last-child {
    border-bottom: 0;
  }

  .decision-row span {
    color: var(--color-fg-secondary);
    line-height: 1.45;
  }

  .decision-row strong {
    color: var(--color-fg-primary);
    line-height: 1.35;
  }

  .comparison-row {
    display: grid;
    grid-template-columns: minmax(7rem, 0.34fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
    padding: 1rem;
  }

  .comparison-row div {
    display: grid;
    gap: 0.45rem;
  }

  .migration-list {
    display: grid;
    gap: 0.8rem;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: steps;
  }

  .migration-list li {
    counter-increment: steps;
    position: relative;
    padding: 1rem 1rem 1rem 3.25rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)),
      color-mix(in srgb, var(--color-shell-surface-secondary) 80%, transparent);
  }

  .migration-list li::before {
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

  .source-link {
    display: block;
    padding: 1rem;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .source-link:hover {
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
    transform: translateY(-1px);
  }

  .cta-grid {
    align-items: center;
    padding: clamp(1.35rem, 3vw, 2rem);
  }

  @media (max-width: 980px) {
    .hero-grid,
    .layer-grid,
    .matrix-grid,
    .migration-grid,
    .source-layout,
    .cta-grid,
    .timeline-grid {
      grid-template-columns: 1fr;
    }

    .timeline-card,
    .fit-card {
      min-height: auto;
    }

    .comparison-row {
      grid-template-columns: 1fr;
    }

    .cta-grid {
      justify-items: start;
    }
  }

  @media (max-width: 680px) {
    .compare-hero {
      padding-top: clamp(2.25rem, 9vw, 3.25rem);
      padding-bottom: clamp(1.75rem, 8vw, 3rem);
    }

    .hero-stage {
      min-height: clamp(30rem, 112vw, 39rem);
    }

    .compare-hero :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-grid {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .hero-copy h1 {
      font-size: clamp(2.25rem, 10.5vw, 3.1rem);
      line-height: 1.03;
    }

    .hero-copy p {
      font-size: 0.94rem;
      line-height: 1.58;
    }

    .brief-panel {
      display: none;
    }

    .decision-row {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }
  }
</style>
