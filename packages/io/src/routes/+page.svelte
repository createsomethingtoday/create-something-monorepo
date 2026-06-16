<script lang="ts">
  import type { PageData } from './$types';
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    PapersGrid,
    PropertyFunnel,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
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

  const researchTracks: ClearCardItem[] = [
    {
      eyebrow: 'Field evidence',
      icon: 'search',
      title: 'Workflow evidence before opinion',
      detail:
        'Patterns start with operator pain, implementation evidence, and runtime behavior before they become a positioning claim.',
      points: [
        'Experiments stay tied to the workflow that produced them',
        'Claims are easier to defend when the artifact trail exists',
        'Reusable patterns get published only after they survive contact'
      ]
    },
    {
      eyebrow: 'Benchmarks',
      icon: 'settings',
      title: 'Tooling and runtime comparisons',
      detail:
        'Measure cost, speed, and maintenance drag across AI-native stacks instead of repeating the same intuition every quarter.',
      points: [
        'Cloudflare-native execution and orchestration notes',
        'Model and framework tradeoffs grounded in implementation work',
        'Comparisons optimized for operators, not abstract leaderboard chatter'
      ]
    },
    {
      eyebrow: 'Policy artifacts',
      icon: 'document',
      title: 'Judgment encoded as operating documents',
      detail:
        'The research output is not just prose. It is policy packs, release checks, contracts, and runbooks that can move into delivery.',
      points: [
        'Database / Automation / Judgment is treated as an operating frame',
        'Evidence rolls forward into specs and policy artifacts',
        'What gets published should be usable by the next build'
      ]
    },
    {
      eyebrow: 'Operator notes',
      icon: 'users',
      title: 'Field notes for people who answer for the outcome',
      detail:
        'This property is tuned for the person who has to explain why a workflow exists, where it breaks, and what should happen next.',
      points: [
        'Research is written for implementation and review, not content farming',
        'Failure modes matter as much as feature lists',
        'The goal is operational clarity, not thought-leadership theater'
      ]
    }
  ];

  const handoffCards: ClearCardItem[] = [
    {
      eyebrow: '.space',
      icon: 'settings',
      title: 'Validate the pattern',
      detail:
        'Use the workbench to try the idea, inspect the runtime, and see whether the pattern survives execution.',
      href: 'https://createsomething.space'
    },
    {
      eyebrow: '.agency',
      icon: 'arrow-right',
      title: 'Operationalize the pattern',
      detail:
        'Move from research into governed workflow delivery when the operating path becomes commercially or reputationally important.',
      href: 'https://createsomething.agency/book?source=io&intent=research-to-implementation&lane=workflow_infrastructure'
    },
    {
      eyebrow: '.ltd',
      icon: 'document',
      title: 'Contextualize the thesis',
      detail:
        'See the editorial and philosophical layer that frames why creation matters more than commodity consumption.',
      href: 'https://createsomething.ltd'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Method',
      icon: 'document',
      title: 'Read the frame',
      detail: 'Start with the methodology behind the papers before treating an insight as reusable.'
    },
    {
      label: 'Graph',
      icon: 'search',
      title: 'Inspect the links',
      detail: 'Use the research graph to see how artifacts, claims, and implementation notes connect.'
    },
    {
      label: 'Next',
      icon: 'arrow-right',
      title: 'Promote carefully',
      detail: 'Move strong patterns into runtime practice or scoped delivery only when the evidence holds.'
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

<ClearPageSection
  variant="white"
  eyebrow="What the research is for"
  title="The research layer should make the next operating decision easier."
  description="This is where CREATE SOMETHING documents what held up in practice, what failed under pressure, and what deserves to be carried forward into the product, policy, or delivery layer."
>
  {#snippet after()}
    <ClearCardGrid items={researchTracks} columns={2} ariaLabel="Research uses" />
  {/snippet}
</ClearPageSection>

{#if featuredExperiments.length > 0}
  <PapersGrid
    papers={featuredExperiments}
    title="Featured Work"
    subtitle="Experiments, field notes, and patterns worth inspecting first."
  />
{/if}

<ClearPageSection
  variant="soft"
  eyebrow="Cross-property handoff"
  title=".io does the reading so the rest of CREATE SOMETHING can move faster."
  description="Research only matters if it transfers cleanly into practice, delivery, or philosophy. That handoff is the point of the network."
>
  {#snippet after()}
    <ClearCardGrid items={handoffCards} columns={3} ariaLabel="Research handoff destinations" />
  {/snippet}
</ClearPageSection>

<PropertyFunnel
  current="io"
  heading="Let the research tell the visitor where to go next."
  description="Use .io to understand the evidence, move to .space when the pattern needs runtime validation, and move to .agency when the workflow is ready to be scoped."
/>

<ClearCtaBand
  eyebrow="Research stack"
  title="Start with the methodology, then inspect the work."
  description="If you want the operating frame behind the papers, start with the methodology and then move into the experiment and paper archive."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href="/methodology">See The Methodology</Button>
    <Button href="/graph" variant="secondary">Open The Research Graph</Button>
  {/snippet}
</ClearCtaBand>

<style>
  .clear-note {
    margin: 0;
    max-width: 36rem;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.55;
  }
</style>
