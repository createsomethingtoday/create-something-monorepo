<script lang="ts">
  import { PerformanceNarrativeStage } from '@create-something/canon';
  import OrientationOpening from '$lib/components/orientation/OrientationOpening.svelte';

  const scenes = [
    {
      id: 'work',
      label: 'Work',
      summary: 'Systems in production',
      title: 'The work moves from support problems to operating systems.',
      detail:
        'Webflow, WORKWAY, and Half Dozen are different contexts for the same practice: make complex work legible, durable, and easier to operate.',
      tone: 'neutral' as const,
      evidence: [
        '10 years building systems',
        'Webflow Marketplace systems',
        'WORKWAY automation',
        'Half Dozen operations'
      ]
    },
    {
      id: 'research',
      label: 'Research',
      summary: 'Claims need receipts',
      title: 'AI-native development is treated as a measurable practice.',
      detail:
        'CREATE SOMETHING tracks time, costs, errors, interventions, and architecture so an implementation can be inspected instead of merely celebrated.',
      tone: 'review' as const,
      evidence: [
        '47 tracked experiments',
        '155 scripts reduced to 13',
        '6-hour builds vs 20-hour estimates',
        '$18.50 API feature costs'
      ]
    },
    {
      id: 'areas',
      label: 'Areas',
      summary: 'Four connected questions',
      title: 'Choose the research area closest to the current problem.',
      detail:
        'Automation, AI-native development, architecture, and methodology form one research loop rather than four disconnected topics.',
      tone: 'allow' as const,
      actions: [{ label: 'Browse tracked experiments', href: '/experiments' }]
    }
  ];

  const topics = [
    {
      title: 'Automation Infrastructure',
      description:
        'Building the layer between intention and execution, including what makes automation recede into transparent use.'
    },
    {
      title: 'AI-Native Development',
      description:
        'Building with Claude Code, Cursor, and agentic workflows while measuring what changes development speed and quality.'
    },
    {
      title: 'System Architecture',
      description:
        'Cloudflare Workers, edge computing, and multi-tenant platforms behind WORKWAY and .agency.'
    },
    {
      title: 'Methodology',
      description:
        'How experiments are tracked, papers are written, and claims are tested before publication.'
    }
  ];
</script>

<svelte:head>
  <title>About | CREATE SOMETHING</title>
  <meta
    name="description"
    content="CREATE SOMETHING documents systems thinking and AI-native development through tracked production experiments."
  />
  <meta
    name="keywords"
    content="systems thinking, system architecture, mental models, automation, AI-native development, Micah Johnson"
  />
  <meta property="og:title" content="About CREATE SOMETHING | Systems Thinking" />
  <meta
    property="og:description"
    content="Production systems, tracked AI-native experiments, and the methodology behind their claims."
  />
  <meta property="og:url" content="https://createsomething.io/about" />
  <meta name="twitter:title" content="About CREATE SOMETHING" />
  <meta
    name="twitter:description"
    content="Production systems and tracked AI-native development research."
  />
  <link rel="canonical" href="https://createsomething.io/about" />
</svelte:head>

<OrientationOpening
  active="about"
  eyebrow="Operator and research practice"
  title="Hi, I'm Micah Johnson"
  description="I build operating systems for complex work, then document the evidence required to know whether the system actually works."
  summary={[
    { label: 'Practice', value: '10 years' },
    { label: 'Experiments', value: '47 tracked' },
    { label: 'Base', value: 'Kennedale, Texas' }
  ]}
/>

<div class="orientation-stage">
  <PerformanceNarrativeStage
    id="about-practice"
    eyebrow="One practice"
    title="Production work, research, and method reinforce each other."
    description="Move through the operating work, the research standard, and the four questions the publication follows."
    {scenes}
    ariaLabel="About CREATE SOMETHING"
  >
    {#snippet artifact(_scene, index)}
      {#if index === 0}
        <div class="story-copy">
          <p>
            By day, I architect systems on the <a href="https://webflow.com">Webflow</a>
            Marketplace team, building developer experiences that serve thousands of creators. By night,
            I build <a href="https://workway.co">WORKWAY</a>, an automation marketplace for
            TypeScript workflows on Cloudflare's edge.
          </p>
          <p>
            I am also co-founder of <a href="https://halfdozen.co">Half Dozen</a>, where we build
            operating systems for venues, promoters, and agencies in the live events industry.
          </p>
          <p>
            The path started at Texas A&amp;M and Boulder Digital Arts, then moved through Webflow
            support, an internal LMS, team management, Marketplace tooling, Webflow University 2.0,
            contracting, and system architecture. The repeated move is simple: build the system that
            makes the work easier to understand and run.
          </p>
        </div>
      {:else if index === 1}
        <div class="research-proof">
          <strong>What I am testing</strong>
          <p>
            Can production automation infrastructure be built with AI as a development partner? The
            research feeds directly into WORKWAY and
            <a href="https://createsomething.agency">.agency</a>, where the theory becomes an
            operating layer.
          </p>
          <p>
            Experiments remain replicable; papers retain methodology and data; every material claim
            should expose what was built, how long it took, what it cost, and whether it worked.
          </p>
        </div>
      {:else}
        <div class="topic-grid">
          {#each topics as topic}
            <article>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </article>
          {/each}
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>
</div>

<section class="orientation-handoff" aria-labelledby="about-handoff-title">
  <div>
    <p>Continue with evidence</p>
    <h2 id="about-handoff-title">Start with the experiment, or start a conversation.</h2>
    <div class="handoff-actions">
      <a class="primary" href="/experiments">Browse experiments</a>
      <a
        href="https://www.linkedin.com/in/micahryanjohnson/"
        target="_blank"
        rel="noopener noreferrer">Connect on LinkedIn</a
      >
    </div>
  </div>
</section>

<style>
  .story-copy,
  .research-proof {
    display: grid;
    gap: var(--space-performance-md);
  }

  .story-copy p,
  .research-proof p {
    margin: 0;
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .story-copy a,
  .research-proof a {
    color: var(--color-performance-fg-primary);
    text-decoration: underline;
  }

  .research-proof strong {
    font-size: var(--text-performance-h3);
  }

  .topic-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .topic-grid article {
    padding: var(--space-performance-md);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .topic-grid h3,
  .topic-grid p {
    margin: 0;
  }

  .topic-grid h3 {
    margin-bottom: var(--space-performance-xs);
    font-size: var(--text-performance-body-lg);
  }

  .topic-grid p {
    color: var(--color-performance-fg-secondary);
  }

  .orientation-handoff {
    padding: clamp(3rem, 7vw, 5rem) 1.5rem;
  }

  .orientation-handoff > div {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-md);
  }

  .orientation-handoff p,
  .orientation-handoff h2 {
    margin: 0;
  }

  .orientation-handoff p {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .orientation-handoff h2 {
    max-width: 24ch;
    font-size: var(--text-performance-h2);
  }

  .handoff-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
  }

  .handoff-actions a {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-performance-border-strong);
    border-radius: var(--radius-performance-scale-sm);
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  .handoff-actions a.primary {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
  }

  @media (max-width: 640px) {
    .topic-grid {
      grid-template-columns: 1fr;
    }

    .orientation-handoff {
      padding-inline: 1.25rem;
    }
  }
</style>
