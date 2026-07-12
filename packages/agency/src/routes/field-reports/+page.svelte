<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCondition,
    type PerformanceEvidenceItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const reportConditions: PerformanceCondition[] = [
    {
      label: 'Measured',
      title: 'Name what the run proved.',
      detail: 'Counts, rates, receipts, and reproducible artifacts stay attached to the claim.',
      tone: 'growth'
    },
    {
      label: 'Blocked',
      title: 'Show what did not pass.',
      detail: 'A failed gate narrows the authority of the system instead of disappearing from the story.',
      tone: 'pressure'
    },
    {
      label: 'Unknown',
      title: 'Keep hypotheses labeled.',
      detail: 'Unmeasured savings and adoption questions become the next instrumentation plan.',
      tone: 'signal'
    }
  ];

  const reports: PerformanceEvidenceItem[] = [
    {
      id: '#FR-2026-01',
      kind: 'Review operations',
      title: 'Prepare the evidence. Keep the judgment human.',
      detail: '49 of 50 usable evidence packets, 98 screenshots, zero external writes, and one promotion gate that held.',
      state: 'verified',
      date: 'May–June 2026',
      href: '/field-reports/template-review'
    }
  ];
</script>

<SEO
  title="AI Workflow Field Reports | CREATE SOMETHING .agency"
  description="Inspectable CREATE SOMETHING field reports: what the workflow was meant to change, what the evidence proved, what failed, and what remains human-owned."
  keywords="AI workflow field reports, workflow evidence, agent evaluation results, human approval workflow"
  propertyName="agency"
/>

<main class="field-reports">
  <PerformanceCampaignOpening
    eyebrow="Performance Lab / Public evidence"
    title="Field Reports"
    lede="The work should survive inspection: the pressure, map, operating boundary, measured result, failed gate, and next question in one public record."
    media={{
      src: '/images/performance-lab/controlled-flow-natural.webp',
      mobileSrc: '/images/performance-lab/controlled-flow-natural-mobile.webp',
      alt: 'Black-and-white view of water moving through an engineered channel'
    }}
    proof={[
      { label: 'Claims', value: 'Sourced' },
      { label: 'Limits', value: 'Visible' },
      { label: 'Authority', value: 'Named' }
    ]}
  >
    {#snippet actions()}
      <Button href="#reports">Read the first report</Button>
      <Button href={agencyCoreMessaging.selfMapHref} variant="secondary">
        {agencyCoreMessaging.selfMapLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceThesisConditions
    eyebrow="Proof standard"
    title="A result is more persuasive when its limits remain visible."
    description="Field Reports separate measured facts, derived calculations, and untested hypotheses so evidence can deepen trust without becoming a performance claim."
    conditions={reportConditions}
    ariaLabel="Field Report proof standard"
  />

  <div id="reports">
    <PerformanceEvidenceIndex
      eyebrow="Report index"
      title="Start with the workflow under pressure."
      description="Each report connects an operating map to the evidence it produced and the decisions it was not allowed to make."
      items={reports}
      ariaLabel="CREATE SOMETHING Field Reports"
    />
  </div>

  <PerformanceConversionHandoff
    eyebrow="Bring the next field test"
    title="Measure one workflow before expanding authority."
    description="Name the repeated handoff, decision owner, objective work, and current baseline. The first map will show whether a controlled pilot is worth running."
    handoff={{
      owner: 'Workflow owner',
      authority: 'Human decision',
      proof: 'Baseline + map + test plan',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href="/book?source=field-reports&intent=workflow-mapping&lane=workflow_infrastructure" variant="secondary">
        Talk through one workflow
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .field-reports {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }
</style>
