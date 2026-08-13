<script lang="ts">
  import type { PageData } from './$types';
  import {
    Button,
    MeridianCardGrid,
    MeridianFeatureSplit,
    PerformanceCampaignOpening,
    PerformanceNarrativeStage,
    paperResearchTraceMedia,
    PapersGrid,
    PropertyFunnel,
    SEO,
    type MeridianCard,
    type PerformanceDecisionItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
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

  const meridianResearchCards = $derived(
    featuredExperiments.slice(0, 3).map(
      (paper): MeridianCard => ({
        eyebrow: paper.category || 'Research artifact',
        title: paper.title,
        description:
          paper.excerpt_short ||
          paper.excerpt ||
          paper.description ||
          'Open the research artifact and its supporting notes.',
        href: `/papers/${paper.slug}`,
        ctaLabel: 'Read artifact',
        meta: paper.published_at
          ? new Date(paper.published_at).getFullYear().toString()
          : undefined,
        kind: 'article',
        tone: 'court'
      })
    )
  );

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

  const ioScenes: PerformanceNarrativeScene[] = decisionStates.map((item, index) => ({
    id: ['read', 'validate', 'scope'][index],
    ...item
  }));
</script>

<SEO
  title="Research | CREATE SOMETHING .io"
  description="CREATE SOMETHING .io publishes experiments, papers, and operator notes for teams building automation they can explain, defend, and extend."
  keywords="AI-native development research, MCP patterns, workflow evidence, automation operations, technical papers, governed execution research"
  ogImage="/og-image.png"
  propertyName="io"
/>

<PerformanceCampaignOpening
  mobileSearchBoundary
  eyebrow="CREATE SOMETHING .io"
  propertyRole="Research + field evidence"
  expression="editorial"
  title="Research for automation you can defend."
  lede="CREATE SOMETHING .io turns experiments, papers, and field notes into a usable research layer for operators. The goal is evidence you can carry into the next build, review, or production decision."
  media={paperResearchTraceMedia}
  proof={proofMetrics.map((item) => ({ label: item.label, value: item.value }))}
  mode="paper"
  density="compact"
>
  {#snippet actions()}
    <Button href="/papers">Read The Papers</Button>
    <Button href="/experiments" variant="secondary">Browse Experiments</Button>
  {/snippet}
</PerformanceCampaignOpening>

<MeridianFeatureSplit
  eyebrow="Research field"
  title="A claim earns its route through evidence."
  description="The research layer collects the operator question, the working method, and the artifact trail before a pattern is allowed into delivery or policy."
  primaryLabel="Read the methodology"
  primaryHref="/methodology"
  secondaryLabel="Browse experiments"
  secondaryHref="/experiments"
  tags={['Artifact first', 'Method named', 'Handoff visible']}
  visualLabel="Research route"
/>

<PerformanceNarrativeStage
  id="research-operating-story"
  expression="editorial"
  eyebrow="Research decision path"
  title="Start from evidence. Decide whether to read, test, or scope."
  description="The research decision and its artifacts now share one surface: trace the claim, inspect the relevant work, and name the receiving lane before handoff."
  scenes={ioScenes}
  ariaLabel="Research decision path"
>
  {#snippet artifact(scene: PerformanceNarrativeScene, index: number)}
    {#if featuredExperiments.slice(index * 2, index * 2 + 2).length > 0}
      <PapersGrid
        papers={featuredExperiments.slice(index * 2, index * 2 + 2)}
        title={`${scene.label}: Featured Work`}
        subtitle="Experiments, field notes, and patterns that support this decision."
      />
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

{#if meridianResearchCards.length > 0}
  <MeridianCardGrid
    eyebrow="Research index"
    title="Recent artifacts, given a clear reading path."
    description="The editorial card treatment gives each paper its category, context, and destination without turning the archive into a generic blog."
    cards={meridianResearchCards}
    ariaLabel="Featured research artifacts"
  />
{/if}

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
