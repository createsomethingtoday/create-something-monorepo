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
  import { upstreamContributionFieldReport } from '$lib/data/fieldReports';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';

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
    },
    {
      id: upstreamContributionFieldReport.id,
      kind: 'Infrastructure reliability',
      title: upstreamContributionFieldReport.title,
      detail: upstreamContributionFieldReport.dek,
      state: 'verified',
      date: upstreamContributionFieldReport.verifiedPeriod,
      href: '/field-reports/upstream-contributions'
    }
  ];
</script>

<SEO
  title="AI Workflow Field Reports | CREATE SOMETHING .agency"
  description="Read our test results: what worked, what failed, what was not measured, and which decisions stayed with a person."
  keywords="AI workflow field reports, workflow evidence, agent evaluation results, human approval workflow"
  propertyName="agency"
/>

<PerformanceCampaignOpening
  eyebrow="Performance Lab / Public evidence"
  expression="editorial"
  title="Read the results, including the limits."
  lede="Each report shows a test and its evidence. Read what was measured, what failed, and what remains unknown."
  media={playbookHeroMedia.fieldReports}
  mediaMobilePlacement="background"
  density="compact"
  proof={[
    { label: 'Measured', value: 'Sourced' },
    { label: 'Blocked', value: 'Visible' },
    { label: 'Unknown', value: 'Named' }
  ]}
>
  {#snippet actions()}
    <Button href="#reports">Read the reports</Button>
    <Button href={agencyCoreMessaging.selfMapHref} variant="secondary">
      {agencyCoreMessaging.selfMapLabel}
    </Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceEvidenceIndex
  id="reports"
  eyebrow="Report index"
  title="Start with the workflow under pressure."
  description="See the workflow, measured results, limits, and decisions that stayed with a person."
  items={reports}
  ariaLabel="CREATE SOMETHING Field Reports"
/>

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="Bring the next field test"
  title="Test one task before giving AI more to do."
  description="Bring a repeated task, the person responsible, and an example of how it works today. We’ll assess whether a small test would help."
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
