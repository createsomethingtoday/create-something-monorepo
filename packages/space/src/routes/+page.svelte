<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearPageSection,
    ClearProofStrip,
    PropertyFunnel,
    SEO,
    type ClearCardItem
  } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';

  type ToolCard = {
    name: string;
    href: string;
    description: string;
    tag: string;
    icon: string;
  };

  type OperatingLoop = {
    title: string;
    summary: string;
    points: string[];
  };

  type EcosystemCard = {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
  };

  const proofMetrics = [
    { value: '5', label: 'live tools and surfaces' },
    { value: '3', label: 'runtime loops previewed in the shell' },
    { value: '100%', label: 'Cloudflare Workers-first execution' },
    { value: 'Direct', label: 'inspectable routes, outputs, and state' }
  ];

  const heroSignals: ClearCardItem[] = [
    {
      eyebrow: 'Execute',
      icon: 'settings',
      title: 'Run against the edge',
      detail: 'Use real routes and Workers-first constraints instead of static demos.'
    },
    {
      eyebrow: 'Inspect',
      icon: 'search',
      title: 'Expose the behavior',
      detail: 'Timing, state, outputs, and failure modes should stay visible.'
    },
    {
      eyebrow: 'Promote',
      icon: 'arrow-right',
      title: 'Move what survives',
      detail: 'Validated routes can graduate into .io research or .agency delivery.'
    }
  ];

  const tools: ToolCard[] = [
    {
      name: 'Code Playground',
      href: '/playground',
      description:
        'Execute JavaScript directly in the Workers runtime with console streaming, async support, and an inspectable request surface.',
      tag: 'Execution',
      icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      name: 'Praxis',
      href: '/praxis',
      description:
        'Learn integration patterns through guided challenges that turn runtime ideas into operator habits instead of abstract lessons.',
      tag: 'Guided practice',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    },
    {
      name: 'Motion Lab',
      href: '/motion',
      description:
        'Analyze animation systems from any public URL with extracted timing, easing, sequencing, and motion architecture notes.',
      tag: 'Inspection',
      icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      name: 'Data Studio',
      href: '/data/nba',
      description:
        'Work with live dashboards, historical snapshots, and derived metrics that stay useful under real refresh and caching conditions.',
      tag: 'Realtime data',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
      name: 'Discover',
      href: '/discover',
      description:
        'Map concepts across CREATE SOMETHING properties and use the network to move from idea to implementation and back again.',
      tag: 'Concept graph',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
    }
  ];

  const operatingLoops: OperatingLoop[] = [
    {
      title: 'Execute live',
      summary:
        'The tool should do real work against a real runtime. If it only exists as a screenshot, it has not earned the pattern.',
      points: [
        'Prefer edge-safe execution surfaces over mocked behavior',
        'Return enough output to make the system inspectable',
        'Keep request and response shapes visible to the user'
      ]
    },
    {
      title: 'Inspect the system',
      summary:
        'A useful workbench exposes timing, state, policy assumptions, and the limits of the runtime instead of smoothing them away.',
      points: [
        'Capture timing and state transitions as first-class output',
        'Make failure modes discoverable before they become user pain',
        'Treat observability as part of the interface'
      ]
    },
    {
      title: 'Promote what survives',
      summary:
        'The experiments that hold up here are the ones that move into research, policy artifacts, or governed delivery.',
      points: [
        'Validated ideas roll into .io as documented patterns',
        'High-stakes workflows graduate into .agency delivery',
        'The workbench stays close to the implementation edge'
      ]
    }
  ];

  const ecosystemCards: EcosystemCard[] = [
    {
      eyebrow: '.io',
      title: 'Read the pattern',
      body: 'When a tool surface reveals a repeatable pattern, the research property documents it and gives it a legible frame.',
      href: 'https://createsomething.io'
    },
    {
      eyebrow: '.agency',
      title: 'Ship the workflow',
      body: 'When the pattern matters commercially, operationally, or reputationally, it moves into governed delivery.',
      href: 'https://createsomething.agency/book?source=space&intent=runtime-validation&lane=workflow_infrastructure'
    },
    {
      eyebrow: '.ltd',
      title: 'See the thesis',
      body: 'The editorial layer explains why the workbench exists and how it fits the broader CREATE SOMETHING worldview.',
      href: 'https://createsomething.ltd'
    }
  ];
</script>

<SEO
  title="Workbench | CREATE SOMETHING .space"
  description="CREATE SOMETHING .space is the live workbench for testing tools, runtimes, and interaction patterns on Cloudflare Workers."
  keywords="developer tools, code playground, motion analysis, realtime dashboards, Cloudflare Workers, live workbench, automation practice"
  ogImage="/og-image.svg"
  propertyName="space"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="CREATE SOMETHING .space"
  title="A public workbench for testing runtime ideas."
  description="CREATE SOMETHING .space is where tools, routes, and interaction patterns get tested against real execution surfaces before they become research, policy, or production workflows."
>
  {#snippet actions()}
    <Button href="/playground">Open The Playground</Button>
    <Button href="/praxis" variant="secondary">Start Praxis</Button>
  {/snippet}

  <p class="clear-note">Live routes. Workers-first execution. Inspectable outputs.</p>

  {#snippet aside()}
    <ClearCardGrid
      items={heroSignals}
      columns={1}
      density="compact"
      ariaLabel="Workbench operating signals"
    />
  {/snippet}

  {#snippet after()}
    <ClearProofStrip items={proofMetrics} ariaLabel="Workbench proof artifacts" />
  {/snippet}
</ClearPageSection>

<section class="tool-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">Live surfaces</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Pick a route and work with the system directly.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The workbench is organized around live routes that expose execution, analysis, or learning
          loops. Each surface should feel like a working tool, not a static marketing panel.
        </p>
      </BlurFade>
    </div>

    <div class="tool-grid">
      {#each tools as tool, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <a href={tool.href} class="product-surface tool-card">
            <div class="tool-header">
              <div class="tool-icon" aria-hidden="true">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d={tool.icon} />
                </svg>
              </div>
              <span class="tool-tag">{tool.tag}</span>
            </div>

            <div class="tool-body">
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
            </div>

            <span class="tool-link">Open route</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="loop-section">
  <div class="shell-inner-pad">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Operating loop</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The workbench has a job beyond showing off.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The practice layer should reveal how the system behaves, where it breaks, and which ideas
          are strong enough to carry into documentation or governed delivery.
        </p>
      </BlurFade>
    </div>

    <div class="loop-grid">
      {#each operatingLoops as loop, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="product-surface product-surface--soft loop-card">
            <h3>{loop.title}</h3>
            <p>{loop.summary}</p>
            <ul class="product-list">
              {#each loop.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="ecosystem-section">
  <div class="shell-inner-pad">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Cross-property handoff</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Practice here, then move the result into the right layer.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The best workbench patterns do not stay trapped on the playground. They transfer into the
          research, delivery, and editorial properties that complete the system.
        </p>
      </BlurFade>
    </div>

    <div class="ecosystem-grid">
      {#each ecosystemCards as card, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <a
            href={card.href}
            class="product-surface product-surface--soft ecosystem-card"
            target="_blank"
            rel="noopener"
          >
            <span class="ecosystem-eyebrow">{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <span class="ecosystem-link">Open property</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<PropertyFunnel
  current="space"
  heading="Use the workbench as the bridge into a real workflow."
  description="Try the runtime here, read the pattern when it holds up, and move to a mapping session when the workflow needs controls, owners, and a handoff."
/>

<section class="cta-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--accent cta-panel">
      <BlurFade>
        <span class="product-kicker">Pick a surface</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Start with the runtime you want to inspect.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Open the playground if you want to execute code, motion if you want to inspect interaction
          systems, or data if you want to work against a live refresh loop.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="hero-actions hero-actions--center">
          <Button href="/motion">Inspect Motion</Button>
          <Button href="/data/nba" variant="secondary">Open Data Studio</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .tool-section,
  .loop-section,
  .ecosystem-section,
  .cta-section {
    padding-block: clamp(3.5rem, 8vw, 6rem);
  }

  .clear-note {
    margin: 0;
    max-width: 36rem;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.55;
  }

  .section-lead,
  .cta-panel,
  .tool-body {
    display: grid;
    gap: 1rem;
  }

  .section-lead h2,
  .cta-panel h2 {
    margin: 0;
    font-size: clamp(2.6rem, 5vw, 4.75rem);
    line-height: 0.96;
    letter-spacing: -0.04em;
    color: var(--color-fg-primary);
  }

  .section-lead p,
  .cta-panel p,
  .tool-card p,
  .loop-card p,
  .ecosystem-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 1rem;
    line-height: 1.75;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    margin-top: 0.35rem;
  }

  .hero-actions--center {
    justify-content: center;
  }

  .tool-grid,
  .loop-grid,
  .ecosystem-grid {
    display: grid;
    gap: 1rem;
  }

  .section-lead {
    max-width: 46rem;
    margin-bottom: 1.5rem;
  }

  .section-lead--center {
    margin-inline: auto;
    text-align: center;
  }

  .section-lead h2,
  .cta-panel h2 {
    font-size: clamp(2.2rem, 4vw, 3.45rem);
    line-height: 1;
  }

  .tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .tool-card {
    display: grid;
    gap: 1.1rem;
    text-decoration: none;
    opacity: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .tool-card:hover,
  .ecosystem-card:hover {
    opacity: 1;
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.05);
  }

  .tool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .tool-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: var(--color-fg-primary);
  }

  .tool-icon svg {
    width: 1.4rem;
    height: 1.4rem;
  }

  .tool-tag,
  .tool-link,
  .ecosystem-eyebrow,
  .ecosystem-link {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .tool-card h3,
  .loop-card h3,
  .ecosystem-card h3 {
    margin: 0;
    font-size: clamp(1.35rem, 2vw, 1.7rem);
    line-height: 1.08;
    color: var(--color-fg-primary);
  }

  .loop-grid,
  .ecosystem-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .loop-card,
  .ecosystem-card {
    display: grid;
    gap: 1rem;
  }

  .ecosystem-card {
    text-decoration: none;
    opacity: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .cta-panel {
    justify-items: center;
    text-align: center;
    padding: clamp(1.7rem, 4vw, 2.4rem);
  }

  @media (max-width: 1200px) {
    .loop-grid,
    .ecosystem-grid {
      grid-template-columns: 1fr;
    }

    .tool-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .tool-grid {
      grid-template-columns: 1fr;
    }

    .section-lead h2,
    .cta-panel h2 {
      line-height: 1.02;
    }

    .hero-actions {
      flex-direction: column;
    }
  }
</style>
