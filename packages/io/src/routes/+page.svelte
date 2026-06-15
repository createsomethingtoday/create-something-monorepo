<script lang="ts">
  import type { PageData } from './$types';
  import {
    Button,
    ClearCardGrid,
    ClearPageSection,
    ClearProofStrip,
    PapersGrid,
    PropertyFunnel,
    SEO,
    type ClearCardItem
  } from '@create-something/canon';
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

  const proofMetrics = $derived.by(() => [
    { value: `${papers.length}`, label: 'published experiments + papers' },
    { value: `${categories.length || 1}`, label: 'research categories' },
    { value: `${featuredExperiments.length}`, label: 'featured artifacts to inspect first' },
    { value: '3', label: 'database / automation / judgment layers' }
  ]);

  const heroSignals: ClearCardItem[] = [
    {
      eyebrow: 'Signal',
      icon: 'search',
      title: 'Start from evidence',
      detail: 'Operator friction, runtime behavior, and implementation receipts come before the claim.'
    },
    {
      eyebrow: 'Artifact',
      icon: 'document',
      title: 'Publish what transfers',
      detail: 'Papers and field notes stay tied to the workflow, experiment, or policy they support.'
    },
    {
      eyebrow: 'Handoff',
      icon: 'arrow-right',
      title: 'Move into practice',
      detail: 'Strong patterns can graduate into .space validation or .agency delivery.'
    }
  ];

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
      href: 'https://createsomething.agency/book?source=io&intent=research-to-implementation&lane=workflow_infrastructure'
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

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="CREATE SOMETHING .io"
  title="Research for automation you can defend."
  description="CREATE SOMETHING .io turns experiments, papers, and field notes into a usable research layer for operators. The goal is evidence you can carry into the next build, review, or production decision."
>
  {#snippet actions()}
    <Button href="/papers">Read The Papers</Button>
    <Button href="/experiments" variant="secondary">Browse Experiments</Button>
  {/snippet}

  <p class="clear-note">Patterns, benchmarks, and operator notes tied back to real builds.</p>

  {#snippet aside()}
    <ClearCardGrid
      items={heroSignals}
      columns={1}
      density="compact"
      ariaLabel="Research operating signals"
    />
  {/snippet}

  {#snippet after()}
    <ClearProofStrip items={proofMetrics} ariaLabel="Research proof artifacts" />
  {/snippet}
</ClearPageSection>

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

{#if featuredExperiments.length > 0}
  <PapersGrid
    papers={featuredExperiments}
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
          Research only matters if it transfers cleanly into practice, delivery, or philosophy. That
          handoff is the point of the network.
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

<PropertyFunnel
  current="io"
  heading="Let the research tell the visitor where to go next."
  description="Use .io to understand the evidence, move to .space when the pattern needs runtime validation, and move to .agency when the workflow is ready to be scoped."
/>

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
  .track-section,
  .bridge-section,
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
  .cta-panel {
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
  .track-card p,
  .bridge-card p {
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

  .track-grid,
  .bridge-grid {
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

  .track-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .track-card {
    display: grid;
    gap: 1rem;
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
    .track-grid,
    .bridge-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .section-lead h2,
    .cta-panel h2 {
      line-height: 1.02;
    }

    .hero-actions {
      flex-direction: column;
    }
  }
</style>
