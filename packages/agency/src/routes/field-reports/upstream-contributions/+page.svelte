<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceEvidenceItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { upstreamContributionFieldReport } from '$lib/data/fieldReports';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';

  const contributionScenes: PerformanceNarrativeScene[] = [
    {
      id: 'reproduce',
      label: 'Reproduce',
      summary: 'Start with the failure',
      title: 'The work began with a narrow, reproducible boundary.',
      detail:
        'CTX failed to compile on macOS ARM64 because stat output differed by platform. Codex Security needed explicit repository scope before inventory could be trusted.',
      tone: 'review',
      evidence: ['macOS ARM64 compile failure', 'explicit repository scope'],
      receipts: ['CTX #355', 'OpenAI #71']
    },
    {
      id: 'contribute',
      label: 'Contribute',
      summary: 'Maintainers shaped the patch',
      title: 'Acceptance improved the implementation without erasing its origin.',
      detail:
        'CTX maintainers added signed device identity handling and a regression test. OpenAI maintainers narrowed the security change while preserving the contributed design and credit.',
      tone: 'neutral',
      evidence: ['maintainer hardening', 'retained co-author credit'],
      receipts: ['CTX merge commit', 'OpenAI merge commit']
    },
    {
      id: 'accept',
      label: 'Accept',
      summary: 'Merge and release are separate',
      title: 'The receipts show two different levels of acceptance.',
      detail:
        'CTX merged the reliability fix on August 9. OpenAI merged the security work on August 10 and released it in Codex Security 0.1.9 on August 11.',
      tone: 'allow',
      evidence: ['CTX merged', 'OpenAI merged', 'OpenAI released'],
      receipts: ['437c8a1', 'd7a2bfb', 'npm-v0.1.9']
    },
    {
      id: 'boundary',
      label: 'Boundary',
      summary: 'Independent contributor',
      title: 'Contributor does not mean partner.',
      detail:
        'These contributions show technical participation in public repositories. They do not establish a partnership, endorsement, customer relationship, or certification.',
      tone: 'block',
      evidence: upstreamContributionFieldReport.limits
    }
  ];

  const evidenceItems: PerformanceEvidenceItem[] = upstreamContributionFieldReport.sources;
</script>

<SEO
  title="Upstream Open-Source Contributions | CREATE SOMETHING .agency"
  description="Direct merge and release receipts for CREATE SOMETHING contributions to CTX and OpenAI Codex Security, with the relationship boundary stated clearly."
  keywords="CTX contributor, OpenAI Codex Security contributor, open source contributions, agent infrastructure, software reliability"
  propertyName="agency"
/>

<main>
  <PerformanceCampaignOpening
    eyebrow="Field report 02 / Infrastructure reliability"
    expression="editorial"
    title={upstreamContributionFieldReport.title}
    lede={upstreamContributionFieldReport.dek}
    media={playbookHeroMedia.fieldReports}
    mediaMobilePlacement="background"
    proof={[
      { label: 'CTX', value: 'Merged' },
      { label: 'OpenAI', value: 'Released' },
      { label: 'Relationship', value: 'Independent contributor' }
    ]}
  >
    {#snippet actions()}
      <Button href="#evidence">Inspect the receipts</Button>
      <Button href="/field-reports" variant="secondary">All Field Reports</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="contribution"
    eyebrow="Contribution path"
    title="Reproduce. Contribute. Accept. Bound."
    description="The public history shows what was proposed, what maintainers changed, what shipped, and what the relationship does not imply."
    scenes={contributionScenes}
    ariaLabel="Upstream contribution evidence argument"
    expression="editorial"
  />

  <PerformanceEvidenceIndex
    id="evidence"
    eyebrow="Primary-source receipts"
    title="Open the review, merge, and release records."
    description="The links lead to the maintainers' public repositories. The archived original proposal is marked as superseded; accepted and released records are verified."
    items={evidenceItems}
    ariaLabel="CTX and OpenAI Codex Security contribution receipts"
  />

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Operating implication"
    title="Bring one workflow that must hold up under review."
    description="We build against the same standard: reproduce the boundary, propose the smallest change, preserve maintainer judgment, and attach the final receipt."
    handoff={{
      owner: 'Workflow owner',
      authority: 'Human review',
      proof: 'Reproduction + patch + receipt',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href="/field-reports" variant="secondary">All Field Reports</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>
