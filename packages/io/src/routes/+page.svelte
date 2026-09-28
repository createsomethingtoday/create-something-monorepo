<script lang="ts">
  import type { PageData } from './$types';
  import { PropertyFunnel, SEO, type PerformanceDecisionItem } from '@create-something/canon';
  import type { Paper } from '@create-something/canon/types';

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

  const decisionStates: PerformanceDecisionItem[] = [
    {
      label: 'Read',
      summary: 'Evidence selected',
      title: 'Start from the artifact trail.',
      detail:
        'Start from operator friction, runtime behavior, and implementation receipts. Papers, experiments, and field notes stay tied to the workflow and make the claim, artifact, methodology, and next move inspectable.',
      tone: 'allow',
      evidence: [
        'Paper or experiment names the source workflow and operating question',
        'Claim is tied to methodology, implementation notes, or the research graph',
        'Operator notes explain why the workflow exists and where it breaks'
      ],
      receipts: ['paper archive', 'methodology', 'research graph'],
      actions: [
        { label: 'Read Papers', href: '/papers' },
        { label: 'See Methodology', href: '/methodology' },
        { label: 'Open Graph', href: '/graph' }
      ]
    },
    {
      label: 'Validate',
      summary: 'Runtime proof needed',
      title: 'Move the claim into a live surface.',
      detail:
        'Compare cost, speed, and maintenance drag across AI-native stacks. When the claim still depends on timing, state, or failure behavior, move it into the workbench instead of adding another paragraph.',
      tone: 'review',
      evidence: [
        'Pattern has a concrete execution question',
        'Timing, state, and failure behavior are visible',
        'Implementation tradeoffs are written for operators, not leaderboard chatter'
      ],
      receipts: ['runtime note', 'motion output', 'data trace'],
      actions: [{ label: 'Open .space', href: 'https://createsomething.space' }]
    },
    {
      label: 'Scope',
      summary: 'Delivery decision',
      title: 'Carry proven evidence into delivery.',
      detail:
        'Turn proven judgment into policy packs, release checks, contracts, and runbooks. When the risk is commercial, operational, or reputational, route the evidence to a scoped workflow with an explicit owner.',
      tone: 'neutral',
      evidence: [
        'Database / Automation / Judgment remains the operating frame',
        'Evidence points to controls, policy, and recovery',
        'Delivery handoff has an owner and a clear first lane'
      ],
      receipts: ['handoff note', 'policy cue', 'mapping session'],
      actions: [
        {
          label: 'Open The Practice',
          href: 'https://createsomething.agency/practice?source=io&intent=research-to-practice&stage=qualify&lane=workflow_infrastructure'
        }
      ]
    }
  ];
</script>

<SEO
  title="Research | CREATE SOMETHING .io"
  description="CREATE SOMETHING .io publishes experiments, papers, and operator notes for teams building automation they can explain, defend, and extend."
  keywords="AI-native development research, MCP patterns, workflow evidence, automation operations, technical papers, governed execution research"
  ogImage="/og-image.png"
  propertyName="io"
/>

<div class="io-research-home">
  <section class="research-opening" aria-labelledby="research-title">
    <p class="research-eyebrow">CREATE SOMETHING .io / Research + field evidence</p>
    <h1 id="research-title">Research for automation you can defend.</h1>
    <p class="research-lede">
      CREATE SOMETHING .io turns experiments, papers, and field notes into a usable research layer
      for operators. The goal is evidence you can carry into the next build, review, or production
      decision.
    </p>
    <div class="research-actions">
      <a class="research-action research-action-primary" href="/papers"
        >Read The Papers <span aria-hidden="true">↗</span></a
      >
      <a class="research-action" href="/experiments">Browse Experiments</a>
    </div>
    <dl class="research-metrics">
      {#each proofMetrics as metric}
        <div>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="research-collection" aria-labelledby="featured-title">
    <div class="research-section-heading">
      <div>
        <p class="research-eyebrow">Research index</p>
        <h2 id="featured-title">Featured artifacts</h2>
      </div>
      <a href="/papers">All papers <span aria-hidden="true">→</span></a>
    </div>
    <p>Experiments, field notes, and patterns to inspect first.</p>
    <div class="research-artifacts">
      {#each featuredExperiments as paper}
        <a
          class="research-artifact"
          href={(paper as Paper & { route?: string }).route || `/experiments/${paper.slug}`}
        >
          <span class="research-eyebrow">{paper.category || 'Research artifact'}</span>
          <h3>{paper.title}</h3>
          <p>
            {paper.excerpt_short ||
              paper.excerpt ||
              paper.description ||
              'Open the research artifact and its supporting notes.'}
          </p>
          <span class="research-artifact-link">Read artifact <span aria-hidden="true">→</span></span
          >
        </a>
      {:else}
        <p class="research-empty">
          Explore the <a href="/papers">paper archive</a> or
          <a href="/experiments">experiment catalog</a>.
        </p>
      {/each}
    </div>
  </section>

  <section class="research-method" aria-labelledby="method-title">
    <div class="research-section-heading">
      <div>
        <p class="research-eyebrow">Research decision path</p>
        <h2 id="method-title">A claim earns its route through evidence.</h2>
      </div>
      <a href="/methodology">Read the methodology <span aria-hidden="true">→</span></a>
    </div>
    <p>
      The research layer collects the operator question, the working method, and the artifact trail
      before a pattern is allowed into delivery or policy.
    </p>
    <div class="research-decisions">
      {#each decisionStates as decision, index}
        <article>
          <p class="research-eyebrow">0{index + 1} / {decision.label} · {decision.summary}</p>
          <h3>{decision.title}</h3>
          <p>{decision.detail}</p>
          <ul>
            {#each decision.evidence ?? [] as item}<li>{item}</li>{/each}
          </ul>
          <p class="research-receipts">{decision.receipts?.join(' / ')}</p>
          <div class="research-actions">
            {#each decision.actions ?? [] as action}<a href={action.href}
                >{action.label} <span aria-hidden="true">→</span></a
              >{/each}
          </div>
        </article>
      {/each}
    </div>
  </section>

  <PropertyFunnel
    current="io"
    heading="Move the evidence into its next operating surface."
    description=".io does the reading so the rest of CREATE SOMETHING can move faster. Start with the methodology, inspect the papers and graph, use .space for runtime validation, .learn for guided practice, .ltd for the thesis, and .agency when a named workflow is ready to map."
    density="compact"
    handoff={{
      owner: 'Research operator',
      authority: 'Evidence before promotion',
      proof: 'Paper + graph + method',
      state: 'ready'
    }}
  />
</div>
