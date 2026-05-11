<script lang="ts">
  import type { PageData } from './$types';
  import { Button, HeroSignalField, PapersGrid, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import type { Paper } from '@create-something/canon/types';

  type ResearchTrack = {
    title: string;
    summary: string;
    points: string[];
    tag: string;
    featured?: boolean;
  };

  type HandoffCard = {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
  };

  let { data }: { data: PageData } = $props();

  const papers = $derived(data.papers);
  const categories = $derived(data.categories ?? []);

  function isFileBasedPaper(paper: unknown): boolean {
    return (
      typeof paper === 'object' &&
      paper !== null &&
      (paper as { is_file_based?: boolean }).is_file_based === true
    );
  }

  function getPaperTimestamp(paper: Partial<Paper>): number {
    return new Date(paper.published_at || paper.created_at || paper.date || 0).getTime();
  }

  const featuredExperiments = $derived.by(
    () =>
      papers
        .filter((paper) => paper.featured || isFileBasedPaper(paper))
        .sort((left, right) => getPaperTimestamp(right) - getPaperTimestamp(left))
        .slice(0, 6) as Paper[]
  );

  const latestPapers = $derived.by(
    () =>
      papers
        .filter((paper) => !isFileBasedPaper(paper))
        .sort((left, right) => getPaperTimestamp(right) - getPaperTimestamp(left))
        .slice(0, 3) as Paper[]
  );

  const proofMetrics = $derived.by(() => [
    { value: `${papers.length}`, label: 'published experiments + papers' },
    { value: `${categories.length || 1}`, label: 'research categories' },
    { value: `${featuredExperiments.length}`, label: 'featured artifacts to inspect first' },
    { value: '3', label: 'database / automation / judgment layers' }
  ]);

  const researchTracks: ResearchTrack[] = [
    {
      tag: 'Field evidence',
      title: 'Workflow evidence before opinion',
      summary:
        'Patterns start with operator pain, implementation evidence, and runtime behavior before they become a positioning claim.',
      points: [
        'Experiments stay tied to the workflow that produced them',
        'Claims are easier to defend when the artifact trail exists',
        'Reusable patterns get published only after they survive contact'
      ],
      featured: true
    },
    {
      tag: 'Benchmarks',
      title: 'Tooling and runtime comparisons',
      summary:
        'Measure cost, speed, and maintenance drag across AI-native stacks instead of repeating the same intuition every quarter.',
      points: [
        'Cloudflare-native execution and orchestration notes',
        'Model and framework tradeoffs grounded in implementation work',
        'Comparisons optimized for operators, not abstract leaderboard chatter'
      ]
    },
    {
      tag: 'Policy artifacts',
      title: 'Judgment encoded as operating documents',
      summary:
        'The research output is not just prose. It is policy packs, release checks, contracts, and runbooks that can move into delivery.',
      points: [
        'Database / Automation / Judgment is treated as an operating frame',
        'Evidence rolls forward into specs and policy artifacts',
        'What gets published should be usable by the next build'
      ]
    },
    {
      tag: 'Operator notes',
      title: 'Field notes for people who answer for the outcome',
      summary:
        'This property is tuned for the person who has to explain why a workflow exists, where it breaks, and what should happen next.',
      points: [
        'Research is written for implementation and review, not content farming',
        'Failure modes matter as much as feature lists',
        'The goal is operational clarity, not thought-leadership theater'
      ]
    }
  ];

  const handoffCards: HandoffCard[] = [
    {
      eyebrow: '.space',
      title: 'Validate the pattern',
      body: 'Use the workbench to try the idea, inspect the runtime, and see whether the pattern survives execution.',
      href: 'https://createsomething.space'
    },
    {
      eyebrow: '.agency',
      title: 'Operationalize the pattern',
      body: 'Move from research into governed workflow delivery when the operating path becomes commercially or reputationally important.',
      href: 'https://createsomething.agency'
    },
    {
      eyebrow: '.ltd',
      title: 'Contextualize the thesis',
      body: 'See the editorial and philosophical layer that frames why creation matters more than commodity consumption.',
      href: 'https://createsomething.ltd'
    }
  ];
</script>

<SEO
  title="Research | CREATE SOMETHING .io"
  description="CREATE SOMETHING .io publishes experiments, papers, and operator notes for teams building automation they can explain, defend, and extend."
  keywords="AI-native development research, MCP patterns, workflow evidence, automation operations, technical papers, governed execution research"
  ogImage="/og-image.svg"
  propertyName="io"
/>

<section class="property-hero-page">
  <div class="property-hero-stage">
    <HeroSignalField variant="io" focus="right" />

    <div class="shell-inner-pad property-hero-layout">
      <div class="property-hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker">CREATE SOMETHING .io</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="property-hero-title">
            Research for teams building automation they can defend.
          </h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="property-hero-detail">
            CREATE SOMETHING .io turns experiments, papers, and field notes into a usable research
            layer for operators. The goal is not content volume. It is evidence you can carry into
            the next build, review, or production decision.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="property-hero-actions">
            <Button href="/papers">Read The Papers</Button>
            <Button href="/experiments" variant="secondary">Browse Experiments</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="property-hero-note">
            Patterns, benchmarks, and operator notes tied back to real builds.
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

<section class="property-section research-loop-section">
  <div class="shell-inner-pad">
    <BlurFade delay={0.05}>
      <aside class="product-surface product-surface--soft research-panel">
        <div class="panel-stack">
          <section class="panel-block">
            <span class="product-kicker">Research operating loop</span>
            <h2>From signal to published pattern.</h2>
            <p>
              Good research does not stop at observation. It moves through experiment design,
              runtime evidence, and artifacts that can inform the next implementation cycle.
            </p>
          </section>

          <section class="panel-block">
            <span class="panel-label">Current loop</span>
            <p class="panel-command">
              Observe workflow friction -> run experiment -> capture evidence -> publish pattern
            </p>
          </section>

          <div class="panel-grid">
            <section class="panel-block">
              <span class="panel-label">Coverage</span>
              <div class="product-pills">
                {#each categories.slice(0, 6) as category}
                  <span class="product-pill">{category.name}</span>
                {/each}
              </div>
            </section>

            <section class="panel-block">
              <span class="panel-label">Recent papers</span>
              <ul class="latest-list">
                {#if latestPapers.length > 0}
                  {#each latestPapers as paper}
                    <li>
                      <a class="latest-link" href={`/papers/${paper.slug}`}>
                        <span>{paper.title}</span>
                      </a>
                    </li>
                  {/each}
                {:else}
                  <li class="latest-empty">No published papers yet.</li>
                {/if}
              </ul>
            </section>
          </div>
        </div>
      </aside>
    </BlurFade>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead">
      <BlurFade>
        <span class="product-kicker">What the research is for</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The research layer should make the next operating decision easier.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          This is where CREATE SOMETHING documents what held up in practice, what failed under
          pressure, and what deserves to be carried forward into the product, policy, or delivery
          layer.
        </p>
      </BlurFade>
    </div>

    <div class="property-card-grid property-card-grid--2">
      {#each researchTracks as track, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <article
            class="product-surface property-content-card {track.featured
              ? 'property-content-card--featured'
              : ''}"
          >
            <span class="property-content-meta">{track.tag}</span>
            <h3>{track.title}</h3>
            <p>{track.summary}</p>
            <ul class="product-list">
              {#each track.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

{#if featuredExperiments.length > 0}
  <PapersGrid
    papers={featuredExperiments}
    title="Featured Work"
    subtitle="Experiments, field notes, and patterns worth inspecting first."
  />
{/if}

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead property-section-lead--center">
      <BlurFade>
        <span class="product-kicker">Cross-property handoff</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>.io does the reading so the rest of CREATE SOMETHING can move faster.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Research only matters if it transfers cleanly into practice, delivery, or philosophy. That
          handoff is the point of the network.
        </p>
      </BlurFade>
    </div>

    <div class="property-card-grid property-card-grid--3">
      {#each handoffCards as card, index}
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
        <span class="product-kicker">Research stack</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Start with the methodology, then inspect the work.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          If you want the operating frame behind the papers, start with the methodology and then
          move into the experiment and paper archive.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="property-hero-actions property-hero-actions--center">
          <Button href="/methodology">See The Methodology</Button>
          <Button href="/graph" variant="secondary">Open The Research Graph</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .panel-stack {
    display: grid;
    gap: 1rem;
  }

  .research-panel h2 {
    margin: 0;
    font-size: clamp(1.9rem, 2.8vw, 2.7rem);
    line-height: 1.02;
    color: var(--color-fg-primary);
    text-wrap: balance;
  }

  .research-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    line-height: 1.75;
  }

  .research-panel {
    height: 100%;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .panel-block {
    display: grid;
    gap: 0.75rem;
    padding: 0;
  }

  .panel-label,
  .latest-empty {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .panel-command {
    margin: 0;
    padding: 1rem 1.05rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-shell-border-subtle);
    background: var(--color-hover);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    line-height: 1.7;
  }

  .latest-list {
    display: grid;
    gap: 0.7rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .latest-link {
    display: block;
    padding: 0.95rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-shell-border-subtle);
    background: color-mix(in srgb, var(--color-shell-surface) 82%, transparent);
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    line-height: 1.45;
    text-decoration: none;
    opacity: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .latest-link:hover {
    opacity: 1;
    transform: translateY(-1px);
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
  }

  .latest-empty {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    line-height: 1.6;
  }

  @media (max-width: 720px) {
    .panel-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
