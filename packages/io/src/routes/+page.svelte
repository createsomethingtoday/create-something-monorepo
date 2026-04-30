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

  function getPaperTimestamp(paper: Partial<Paper>): number {
    return new Date(paper.published_at || paper.created_at || paper.date || 0).getTime();
  }

  function getFeaturedScore(paper: Partial<Paper>): number {
    return Number(paper.featured || 0);
  }

  function getArtifactRoute(paper: Partial<Paper> & { route?: string }): string {
    if (paper.route) return paper.route;
    if (!paper.slug) return '';
    return `/experiments/${paper.slug}`;
  }

  function isPaperArtifact(paper: Partial<Paper> & { route?: string }): boolean {
    return getArtifactRoute(paper).startsWith('/papers/');
  }

  const featuredArtifacts = $derived.by(
    () =>
      papers
        .filter((paper) => getFeaturedScore(paper) > 0)
        .sort(
          (left, right) =>
            getFeaturedScore(right) - getFeaturedScore(left) ||
            getPaperTimestamp(right) - getPaperTimestamp(left)
        )
        .slice(0, 6) as Paper[]
  );

  const latestPapers = $derived.by(
    () =>
      papers
        .filter(isPaperArtifact)
        .sort((left, right) => getPaperTimestamp(right) - getPaperTimestamp(left))
        .slice(0, 3) as Paper[]
  );

  const proofMetrics = $derived.by(() => [
    { value: `${papers.length}`, label: 'published experiments + papers' },
    { value: `${categories.length || 1}`, label: 'research categories' },
    { value: `${featuredArtifacts.length}`, label: 'featured artifacts to inspect first' },
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

<section class="hero-page">
  <div class="hero-stage">
    <HeroSignalField variant="io" focus="right" />

    <div class="shell-inner-pad hero-layout">
      <div class="hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker">CREATE SOMETHING .io</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">Research for teams building automation they can defend.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            CREATE SOMETHING .io turns experiments, papers, and field notes into a usable research
            layer for operators. The goal is not content volume. It is evidence you can carry into
            the next build, review, or production decision.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/papers">Read The Papers</Button>
            <Button href="/experiments" variant="secondary">Browse Experiments</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="hero-note">Patterns, benchmarks, and operator notes tied back to real builds.</p>
        </BlurFade>
      </div>
    </div>
  </div>

  <div class="shell-inner-pad">
    <div class="metric-grid">
      {#each proofMetrics as metric, index}
        <BlurFade delay={0.25 + index * 0.05}>
          <article class="product-surface product-surface--soft metric-card">
            <span class="metric-value">{metric.value}</span>
            <span class="metric-label">{metric.label}</span>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="research-loop-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <aside class="product-surface product-surface--soft research-panel">
        <div class="panel-stack">
          <div class="panel-block">
            <span class="product-kicker">Research operating loop</span>
            <h2>From signal to published pattern.</h2>
            <p>
              Good research does not stop at observation. It moves through experiment design,
              runtime evidence, and artifacts that can inform the next implementation cycle.
            </p>
          </div>

          <div class="panel-block">
            <span class="panel-label">Current loop</span>
            <p class="panel-command">
              Observe workflow friction -> run experiment -> capture evidence -> publish pattern
            </p>
          </div>

          <div class="panel-grid">
            <div class="panel-block">
              <span class="panel-label">Coverage</span>
              <div class="product-pills">
                {#each categories.slice(0, 6) as category}
                  <span class="product-pill">{category.name}</span>
                {/each}
              </div>
            </div>

            <div class="panel-block">
              <span class="panel-label">Recent papers</span>
              <ul class="latest-list">
                {#if latestPapers.length > 0}
                  {#each latestPapers as paper}
                    <li>
                      <a class="latest-link" href={getArtifactRoute(paper)}>
                        <span>{paper.title}</span>
                      </a>
                    </li>
                  {/each}
                {:else}
                  <li class="latest-empty">No published papers yet.</li>
                {/if}
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </BlurFade>
  </div>
</section>

<section class="track-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
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

    <div class="track-grid">
      {#each researchTracks as track, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <article class="product-surface track-card" class:trackFeatured={track.featured}>
            <span class="track-tag">{track.tag}</span>
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

{#if featuredArtifacts.length > 0}
  <PapersGrid
    papers={featuredArtifacts}
    title="Featured Work"
    subtitle="Experiments, field notes, and patterns worth inspecting first."
  />
{/if}

<section class="bridge-section">
  <div class="shell-inner-pad">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Cross-property handoff</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>.io does the reading so the rest of CREATE SOMETHING can move faster.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Research only matters if it transfers cleanly into practice, delivery, or philosophy.
          That handoff is the point of the network.
        </p>
      </BlurFade>
    </div>

    <div class="bridge-grid">
      {#each handoffCards as card, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <a
            href={card.href}
            class="product-surface product-surface--soft bridge-card"
            target="_blank"
            rel="noopener"
          >
            <span class="bridge-eyebrow">{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <span class="bridge-link">Open property</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--accent cta-panel">
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
        <div class="hero-actions hero-actions--center">
          <Button href="/methodology">See The Methodology</Button>
          <Button href="/graph" variant="secondary">Open The Research Graph</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .hero-page,
  .research-loop-section,
  .track-section,
  .bridge-section,
  .cta-section {
    padding-block: clamp(3.5rem, 8vw, 6rem);
  }

  .hero-page {
    padding-top: 0;
    padding-bottom: clamp(2rem, 5vw, 3.5rem);
  }

  .research-loop-section {
    padding-top: 0;
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
        rgba(3, 3, 4, 0.96) 0%,
        rgba(3, 3, 4, 0.62) 12%,
        rgba(3, 3, 4, 0.08) 36%,
        rgba(3, 3, 4, 0.18) 72%,
        rgba(3, 3, 4, 0.94) 100%
      ),
      linear-gradient(
        90deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.94) 36%,
        rgba(3, 3, 4, 0.62) 58%,
        rgba(3, 3, 4, 0.2) 78%,
        rgba(3, 3, 4, 0.44) 100%
      ),
      radial-gradient(circle at 74% 52%, rgba(3, 3, 4, 0) 0%, rgba(3, 3, 4, 0.48) 100%);
  }

  .hero-stage :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-layout {
    position: relative;
    z-index: 2;
    display: block;
    width: 100%;
    padding-top: clamp(1.8rem, 4vw, 2.75rem);
    padding-bottom: clamp(2.8rem, 6vw, 4rem);
  }

  .hero-copy,
  .panel-stack,
  .section-lead,
  .cta-panel {
    display: grid;
    gap: 1rem;
  }

  .hero-copy {
    max-width: 49rem;
    gap: 1.15rem;
  }

  .hero-copy .product-kicker {
    width: fit-content;
    padding: 0.38rem 0.7rem 0.4rem;
    border: 1px solid rgba(91, 125, 255, 0.16);
    border-radius: 999px;
    background: rgba(8, 10, 14, 0.62);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.02),
      0 10px 30px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(12px);
  }

  .hero-title,
  .section-lead h2,
  .cta-panel h2,
  .research-panel h2 {
    margin: 0;
    font-size: clamp(2.6rem, 5vw, 4.75rem);
    line-height: 0.96;
    letter-spacing: -0.04em;
    color: var(--color-fg-primary);
  }

  .research-panel h2 {
    font-size: clamp(1.9rem, 2.8vw, 2.7rem);
    line-height: 1.02;
  }

  .hero-detail,
  .section-lead p,
  .cta-panel p,
  .research-panel p,
  .track-card p,
  .bridge-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 1rem;
    line-height: 1.75;
  }

  .hero-detail {
    max-width: 36rem;
    text-wrap: pretty;
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

  .hero-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .research-panel {
    padding: clamp(1.25rem, 3vw, 2rem);
  }

  .research-panel > *,
  .metric-card > *,
  .track-card > *,
  .bridge-card > *,
  .cta-panel > * {
    position: relative;
    z-index: 1;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .panel-block {
    display: grid;
    gap: 0.75rem;
    padding-block: 0;
    align-content: start;
  }

  .research-panel .product-pills {
    align-items: flex-start;
  }

  .research-panel .product-pill {
    flex: 0 0 auto;
  }

  .panel-label,
  .track-tag,
  .bridge-eyebrow,
  .bridge-link {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .panel-command {
    margin: 0;
    padding: 1rem 1.05rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.9rem;
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
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.025);
    color: var(--color-fg-primary);
    font-size: 0.95rem;
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
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.05);
  }

  .latest-empty {
    color: var(--color-fg-muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .metric-grid,
  .track-grid,
  .bridge-grid {
    display: grid;
    gap: 1rem;
  }

  .metric-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 1rem;
  }

  .metric-card {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.05rem;
  }

  .metric-value {
    font-family: var(--font-mono);
    font-size: 1.45rem;
    line-height: 1;
    letter-spacing: -0.05em;
    color: var(--color-fg-primary);
  }

  .metric-label {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.09em;
    line-height: 1.45;
    text-transform: uppercase;
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

  .track-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .track-card {
    display: grid;
    gap: 1rem;
    padding: clamp(1.15rem, 2.4vw, 1.55rem);
  }

  .track-card h3,
  .bridge-card h3 {
    margin: 0;
    font-size: clamp(1.35rem, 2vw, 1.7rem);
    line-height: 1.08;
    color: var(--color-fg-primary);
  }

  .trackFeatured {
    border-color: var(--color-brand-primary-border);
    background:
      linear-gradient(180deg, rgba(49, 92, 255, 0.16), rgba(49, 92, 255, 0.06)),
      var(--color-shell-surface-secondary);
  }

  .bridge-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .bridge-card {
    display: grid;
    gap: 0.95rem;
    padding: clamp(1.1rem, 2.2vw, 1.45rem);
    text-decoration: none;
    opacity: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .bridge-card:hover {
    opacity: 1;
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.05);
  }

  .cta-panel {
    justify-items: center;
    text-align: center;
    padding: clamp(1.7rem, 4vw, 2.4rem);
  }

  @media (max-width: 1100px) {
    .metric-grid,
    .track-grid,
    .bridge-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .hero-stage {
      min-height: clamp(30rem, 112vw, 38rem);
    }

    .hero-stage :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-layout {
      padding-top: 2.25rem;
      padding-bottom: 3.25rem;
    }

    .panel-grid {
      grid-template-columns: 1fr;
    }

    .hero-title,
    .section-lead h2,
    .cta-panel h2 {
      line-height: 1.02;
    }

    .hero-actions {
      flex-direction: column;
    }
  }
</style>
