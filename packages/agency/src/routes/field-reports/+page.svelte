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
  expression="editorial"
  title="Review the film. Improve the playbook."
  lede="Each Field Report replays a run against its evidence. It separates what was measured, blocked, and unknown so operators can improve the next Play."
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
    <Button href="#reports">Read the first report</Button>
    <Button href={agencyCoreMessaging.selfMapHref} variant="secondary">
      {agencyCoreMessaging.selfMapLabel}
    </Button>
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
  expression="editorial"
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
