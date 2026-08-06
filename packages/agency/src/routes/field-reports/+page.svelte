<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    SEO,
    type PerformanceEvidenceItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { paperAttachedReceiptMedia } from '$lib/data/performanceMedia';

  const reports: PerformanceEvidenceItem[] = [
    {
      id: '#FR-2026-01',
      kind: 'Review operations',
      title: 'Automation prepared the evidence. Human judgment still decided.',
      detail:
        'Evidence collection completed for 49 of 50 selected cases. Automated judgment remains blocked, and reviewer time savings are not yet measured.',
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

<PerformanceCampaignOpening
  eyebrow="Performance Lab / Public evidence"
  title="Field Reports"
  lede="Each report separates what was measured, what was blocked, and what remains unknown—then names the authority the workflow did not earn."
  density="compact"
  media={paperAttachedReceiptMedia}
  mode="paper"
  proof={[
    { label: 'Measured', value: 'Sourced' },
    { label: 'Blocked', value: 'Visible' },
    { label: 'Unknown', value: 'Named' }
  ]}
>
  {#snippet actions()}
    <Button href="#reports">Read the first report</Button>
    <Button href={agencyCoreMessaging.selfMapHref} variant="secondary">
      {agencyCoreMessaging.selfMapLabel}
    </Button>
  {/snippet}
  {#snippet ornament()}
    <aside class="field-report-proof-marker" aria-label="Attached proof receipt">
      <span>Proof</span>
      <strong>Receipt attached</strong>
      <small>FR / 01</small>
    </aside>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceEvidenceIndex
  id="reports"
  eyebrow="Report index"
  title="Start with the workflow under pressure."
  description="Each report connects an operating map to measured facts, blocked judgment, unknown impact, and the decisions it was not allowed to make."
  items={reports}
  ariaLabel="CREATE SOMETHING Field Reports"
/>

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
    <Button
      href="/book?source=field-reports&intent=workflow-mapping&lane=workflow_infrastructure"
      variant="secondary"
    >
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .field-report-proof-marker {
    position: absolute;
    top: 48%;
    right: clamp(1.25rem, 9vw, 9rem);
    display: grid;
    gap: 0.32rem;
    min-width: 9.5rem;
    padding: 0.6rem 0.7rem 0.65rem;
    border: 1px solid rgba(9, 9, 9, 0.8);
    border-left: 0.45rem solid #708426;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 12px 28px rgba(9, 9, 9, 0.16);
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
  }

  .field-report-proof-marker span,
  .field-report-proof-marker small {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.62rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.03em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .field-report-proof-marker strong {
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.2;
    text-transform: uppercase;
  }

  @media (max-width: 640px) {
    .field-report-proof-marker {
      top: 47%;
      right: 0.75rem;
      min-width: 8.55rem;
      padding: 0.52rem 0.58rem 0.56rem;
    }
  }
</style>
