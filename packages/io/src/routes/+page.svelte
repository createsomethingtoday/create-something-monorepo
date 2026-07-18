<script lang="ts">
  import type { PageData } from './$types';
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceDecisionPanel,
    PapersGrid,
    PropertyFunnel,
    SEO,
    type PerformanceDecisionItem
  } from '@create-something/canon';
  import { traceControlPlaneMedia } from '@create-something/canon/components/performance/media/trace-control-plane';
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
  ogImage="/og-image.svg"
  propertyName="io"
/>

<PerformanceCampaignOpening
  eyebrow="CREATE SOMETHING .io"
  title="Research for automation you can defend."
  lede="CREATE SOMETHING .io turns experiments, papers, and field notes into a usable research layer for operators. The goal is evidence you can carry into the next build, review, or production decision."
  media={traceControlPlaneMedia}
  proof={proofMetrics.map((item) => ({ label: item.label, value: item.value }))}
  density="compact"
>
  {#snippet actions()}
    <Button href="/papers">Read The Papers</Button>
    <Button href="/experiments" variant="secondary">Browse Experiments</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceDecisionPanel
  id="research-decision"
  eyebrow="Research decision path"
  title="Start from evidence. Decide whether to read, test, or scope."
  description="The research layer makes the next operating decision easier: trace the claim, test runtime-dependent behavior, and name the receiving surface before the handoff."
  items={decisionStates}
  ariaLabel="Research decision path"
  density="compact"
/>

{#if featuredExperiments.length > 0}
  <PapersGrid
    papers={featuredExperiments}
    title="Featured Work"
    subtitle="Experiments, field notes, and patterns worth inspecting first."
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
