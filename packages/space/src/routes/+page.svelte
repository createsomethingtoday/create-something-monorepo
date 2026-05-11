<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import RuntimeWorkbench from '$lib/components/RuntimeWorkbench.svelte';

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
      href: 'https://createsomething.agency'
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

<section class="property-hero-page">
  <div class="property-hero-stage">
    <HeroSignalField variant="space" focus="right" />

    <div class="shell-inner-pad property-hero-layout">
      <div class="property-hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker">CREATE SOMETHING .space</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="property-hero-title">
            A public workbench for trying the runtime in the open.
          </h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="property-hero-detail">
            CREATE SOMETHING .space is where tools, routes, and interaction patterns get tested
            against real execution surfaces. The point is not a polished demo. It is a live place to
            run code, inspect motion, and stress ideas before they become patterns or products.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="property-hero-actions">
            <Button href="/playground">Open The Playground</Button>
            <Button href="/praxis" variant="secondary">Start Praxis</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="property-hero-note">
            Live routes. Workers-first execution. Inspectable outputs.
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

<section class="property-section workbench-section">
  <div class="shell-inner-pad">
    <BlurFade delay={0.05}>
      <RuntimeWorkbench />
    </BlurFade>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead">
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

    <div class="property-card-grid property-card-grid--3">
      {#each tools as tool, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <a
            href={tool.href}
            class="product-surface property-content-card property-content-link-card tool-card"
          >
            <div class="tool-header">
              <div class="tool-icon" aria-hidden="true">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d={tool.icon} />
                </svg>
              </div>
              <span class="property-content-meta">{tool.tag}</span>
            </div>

            <div class="tool-body">
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
            </div>

            <span class="property-content-link">Open route</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead property-section-lead--center">
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

    <div class="property-card-grid property-card-grid--3">
      {#each operatingLoops as loop, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="product-surface product-surface--soft property-content-card">
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

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead property-section-lead--center">
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

    <div class="property-card-grid property-card-grid--3">
      {#each ecosystemCards as card, index}
        <BlurFade delay={0.15 + index * 0.06}>
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

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--accent property-cta-panel">
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
        <div class="property-hero-actions property-hero-actions--center">
          <Button href="/motion">Inspect Motion</Button>
          <Button href="/data/nba" variant="secondary">Open Data Studio</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .tool-body {
    display: grid;
    gap: 0.65rem;
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
    border: 1px solid var(--color-shell-border-subtle);
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .tool-icon svg {
    width: 1.4rem;
    height: 1.4rem;
  }
</style>
