<script lang="ts">
  import {
    Button,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    PerformanceNarrativeStage,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCondition,
    type PerformanceEvidenceItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import DelegationPracticeWorkbench from '$lib/components/DelegationPracticeWorkbench.svelte';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import ReferenceMissionProof from '$lib/components/ReferenceMissionProof.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const referenceMission = data.reference_mission;
  const referenceMissionVerified = ['proven', 'recovered'].includes(referenceMission.state);
  const referenceMissionEvidenceState: PerformanceEvidenceItem['state'] = referenceMissionVerified
    ? 'verified'
    : referenceMission.state === 'unavailable' || referenceMission.state === 'incomplete'
      ? 'draft'
      : 'review';

  const openingHandoff = {
    owner: 'Accountable operator',
    authority: 'Observe one workflow',
    proof: 'No evidence attached yet',
    state: 'draft' as const
  };

  const systemConditions: PerformanceCondition[] = [
    {
      label: 'Database',
      title: 'Is the operating truth available?',
      detail:
        'Inspect the records, state, policy versions, and proof artifacts the workflow is allowed to use.',
      tone: 'signal'
    },
    {
      label: 'Automation',
      title: 'Did the execution path succeed?',
      detail:
        'Trace the tools, stops, approvals, retries, and receipts without assigning judgment to motion alone.',
      tone: 'pressure'
    },
    {
      label: 'Judgment',
      title: 'Was the right policy applied?',
      detail:
        'Name who owns the decision, what boundary governed it, and when the system must escalate or stop.',
      tone: 'growth'
    }
  ];

  const evidenceRecords: PerformanceEvidenceItem[] = [
    {
      id: 'THESIS-01',
      kind: 'Operating claim',
      title: 'Signal → Decision → Proof',
      detail:
        'The category method stays attached to workflow ownership, policy boundaries, and inspectable evidence.',
      state: 'verified',
      date: 'Current public method',
      href: '/methodology'
    },
    {
      id: 'MAP-01',
      kind: 'Workflow model',
      title: 'Marketplace review queue',
      detail:
        'A read-only Map story shows the signal, automated preparation, human review, stop condition, and proof landing zone.',
      state: 'verified',
      date: 'Representative local map',
      href: '/map'
    },
    {
      id: 'CASE-01',
      kind: 'Prototype proof',
      title: 'Marketplace workflow compiler',
      detail:
        'The proof route keeps representative fixtures, active-development status, and the absence of production writes visible.',
      state: 'review',
      date: 'Public limits intact',
      href: '/proof/marketplace-workflow'
    },
    {
      id: referenceMission.correlation_id ?? 'DEFENSE-01',
      kind: 'Reference mission',
      title: referenceMission.title ?? 'Governed Agent Delivery',
      detail:
        referenceMission.proof_summary ??
        'No source-backed production receipt is available. This case remains a proposal.',
      state: referenceMissionEvidenceState,
      date: referenceMission.freshness.observed_at ?? 'Not yet publicly defended'
    }
  ];

  const practiceScenes: PerformanceNarrativeScene[] = [
    {
      id: 'diagnose',
      label: 'Diagnose',
      summary: 'Database → automation → judgment',
      title: 'Diagnose the system before changing the policy.',
      detail:
        'The Three-Tier Framework keeps failures local: verify the Database, then the Automation, then the Judgment governing the next move.',
      tone: 'review'
    },
    {
      id: 'map',
      label: 'Map',
      summary: 'Run, wait, or stop',
      title: 'See where work may run, wait, or stop.',
      detail:
        'The representative Marketplace review queue is a read-only teaching surface. It exposes a real operating shape without claiming production access or client proof.',
      tone: 'block',
      receipts: ['named owner', 'governed handoff', 'stop condition', 'proof landing zone']
    },
    {
      id: 'rehearse',
      label: 'Rehearse',
      summary: 'Practice before authority',
      title: 'Ten stages. Ten inspectable artifacts.',
      detail:
        'The workbench turns the thesis into an operator journey whose workflow, authority, tests, evidence, and review state can be inspected before more authority is earned.',
      tone: 'allow'
    },
    {
      id: 'evidence',
      label: 'Evidence',
      summary: 'State and limits stay attached',
      title: 'Claims stay attached to state and limits.',
      detail:
        referenceMissionVerified
          ? 'The reference mission is attached to a current governance chain. Its correlation, authority, verification, proof, recovery, and freshness remain inspectable.'
          : 'Verified, review, and draft records stay deliberately different. Governed Agent Delivery remains a proposal until a complete source-backed chain passes.',
      tone: 'neutral',
      actions: [{ label: 'Inspect the bounded proof', href: '/proof/marketplace-workflow' }]
    }
  ];
</script>

<SEO
  title="The Delegation Practice | CREATE SOMETHING"
  description="A working thesis and field school for accountable operators making delegated work trustworthy."
  keywords="AI workflow systems, accountable operators, delegated work, workflow governance, proof"
  propertyName="agency"
/>

<main class="delegation-practice-page">
  <PerformanceConversionHandoff
    eyebrow="The Delegation Practice"
    title="Make delegated work trustworthy."
    description="Map the work. Bound the authority. Test the system. Prove what happened. Earn the right to do more."
    handoff={openingHandoff}
    headingLevel="h1"
  >
    {#snippet actions()}
      <Button href="#practice-workbench">Map one workflow</Button>
      <Button href="#evidence" variant="secondary">Examine the evidence</Button>
    {/snippet}
  </PerformanceConversionHandoff>

  <PerformanceNarrativeStage
    id="delegation-practice-argument"
    eyebrow="One practice argument"
    title="Locate the failure before rehearsing the fix."
    description="The Practice is one learning spine: locate the failure, make authority visible, rehearse the operator journey, and attach every claim to a current evidence state."
    scenes={practiceScenes}
    ariaLabel="Delegation Practice argument"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'diagnose'}
        <PerformanceThesisConditions
          eyebrow="Delegated Work Control"
          title="Check the layers in order, or motion will look like progress."
          description="Check the layers in order so motion never substitutes for operating truth or policy."
          conditions={systemConditions}
          ariaLabel="Database Automation and Judgment diagnostic order"
        />
      {:else if scene.id === 'map'}
        <PublicAtlasStoryCanvas
          starterId="marketplace-review-queue"
          storyId="delegation-practice-marketplace-story"
        />
      {:else if scene.id === 'rehearse'}
        <DelegationPracticeWorkbench />
      {:else}
        <div id="evidence" class="practice-evidence">
          <PerformanceEvidenceIndex
            eyebrow="Source evidence"
            title="Verified, review, and draft are different states."
            description="Open the owning surface before deciding what the system has earned."
            items={evidenceRecords}
            ariaLabel="Delegation Practice source evidence"
          />
          <ReferenceMissionProof mission={data.reference_mission} />
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    eyebrow="School + skeptical review"
    title="Finish with a Practice Receipt, not a certificate."
    description="Practice produces an inspectable workflow map, a tested authority envelope, and a review verdict you can act on. Skeptical review may support, revise, hold, or falsify the thesis. When you can name the workflow and accountable owner, the mapping-session path is ready."
    handoff={{
      owner: 'Accountable practitioner',
      authority: 'One named workflow only',
      proof: 'Artifact bundle + review verdict',
      state: 'review'
    }}
  >
    {#snippet actions()}
      <Button href="#practice-workbench">Rehearse the operator journey</Button>
      <Button href="/proof/marketplace-workflow" variant="secondary"
        >Inspect a bounded proof route</Button
      >
      <Button
        href="/book?source=practice&intent=named-workflow&stage=convert&lane=not_sure"
        variant="secondary">Request a mapping session</Button
      >
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .delegation-practice-page {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .practice-evidence {
    display: grid;
    gap: 1rem;
  }

</style>
