<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
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
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';

  const systemConditions: PerformanceCondition[] = [
    {
      label: 'Database',
      title: 'Is the information correct?',
      detail:
        'Check the records, their dates, and the rules the task is allowed to use.',
      tone: 'signal'
    },
    {
      label: 'Automation',
      title: 'Did the task run correctly?',
      detail:
        'Check the tools, approvals, retries, and results. A completed run does not always mean the result is correct.',
      tone: 'pressure'
    },
    {
      label: 'Judgment',
      title: 'Did it follow the right rules?',
      detail:
        'Identify who decides, which rule applies, and when the agent should ask for help or stop.',
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
        'A read-only Map story shows the signal, automated preparation, human review, stop condition, and result record.',
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
      id: 'DEFENSE-01',
      kind: 'Flagship defense',
      title: 'Governed Agent Delivery',
      detail:
        'The repo-owned case follows a Linear signal through bounded implementation to production proof. It remains a proposed defense until the full evidence packet is examined.',
      state: 'draft',
      date: 'Not yet publicly defended'
    }
  ];

  const practiceScenes: PerformanceNarrativeScene[] = [
    {
      id: 'diagnose',
      label: 'Diagnose',
      summary: 'Database → automation → judgment',
      title: 'Diagnose the system before changing the policy.',
      detail:
        'Check three things in order: the information available, whether the task ran correctly, and whether it followed the right rules.',
      tone: 'review'
    },
    {
      id: 'map',
      label: 'Map',
      summary: 'Run, wait, or stop',
      title: 'See where work may run, wait, or stop.',
      detail:
        'This example shows a Marketplace review queue. It is for learning: it cannot access live systems and is not evidence of client results.',
      tone: 'block',
      receipts: ['named owner', 'governed handoff', 'stop condition', 'result record']
    },
    {
      id: 'rehearse',
      label: 'Rehearse',
      summary: 'Practice before authority',
      title: 'Work through ten steps and review each result.',
      detail:
        'Use the workbench to plan a task, set permissions, and review tests and results before considering live access.',
      tone: 'allow'
    },
    {
      id: 'evidence',
      label: 'Evidence',
      summary: 'State and limits stay attached',
      title: 'Claims stay attached to state and limits.',
      detail:
        'Verified, review, and draft records stay deliberately different. Governed Agent Delivery remains a proposed flagship defense until its artifacts, counterexamples, rollback, and independent verdict are examined.',
      tone: 'neutral',
      actions: [{ label: 'Read the test results', href: '/proof/marketplace-workflow' }]
    }
  ];
</script>

<SEO
  title="The Delegation Practice | CREATE SOMETHING"
  description="Practice planning an AI task, setting permissions, testing results, and reviewing what happened."
  keywords="AI workflow systems, accountable operators, delegated work, workflow governance, proof"
  propertyName="agency"
/>

<main class="delegation-practice-page">
  <PerformanceCampaignOpening
    eyebrow="The Delegation Practice"
    title="Try an AI workflow before connecting your tools."
    lede="Use a practice workflow to decide what AI can do, when it needs approval, and how to check its work."
    media={playbookHeroMedia.practice}
    mediaMobilePlacement="background"
    density="compact"
    expression="editorial"
    proof={[
      { label: 'Owner', value: 'Accountable operator' },
      { label: 'Authority', value: 'Observe one workflow' },
      { label: 'Evidence', value: 'Draft' }
    ]}
  >
    {#snippet actions()}
      <Button href="#practice-workbench">Map one workflow</Button>
      <Button href="#evidence" variant="secondary">Examine the evidence</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="delegation-practice-argument"
    eyebrow="Practice steps"
    title="Find the problem, then practice the fix."
    description="Start by checking the information and rules. Then walk through a sample task and review the result."
    scenes={practiceScenes}
    ariaLabel="Delegation Practice argument"
    expression="editorial"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'diagnose'}
        <PerformanceThesisConditions
          eyebrow="Delegated Work Control"
          title="Check the information, the task, and the rules."
          description="This order helps you find the cause before changing the system."
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
            description="Read the source record and its limits before relying on a result."
            items={evidenceRecords}
            ariaLabel="Delegation Practice source evidence"
          />
          <article class="flagship-defense">
            <span>Flagship defense · unresolved boundary</span>
            <h3>Governed Agent Delivery: from Linear signal to production proof.</h3>
            <p>
              This case follows work from a Linear issue to production. At every step, it must keep
              the owner, allowed actions, required checks, approval points, and rollback evidence
              visible.
            </p>
            <strong>A proposed case is not a passed defense.</strong>
            <p>
              Passing still requires artifact inspection, counterexample review, a rollback check,
              and an independent verdict with real consequences.
            </p>
          </article>
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Review your practice"
    title="Leave with a plan and a record of your checks."
    description="The practice result includes a workflow plan, tested permissions, and review notes. The review may call for changes or show that the approach does not work. When the task and person responsible are clear, bring the plan to a mapping session."
    handoff={{
      owner: 'Accountable practitioner',
      authority: 'One named workflow only',
      proof: 'Artifact bundle + review verdict',
      state: 'review'
    }}
  >
    {#snippet actions()}
      <div class="practice-handoff-actions" aria-label="Practice handoff actions">
        <Button
          href="/book?source=practice&intent=named-workflow&stage=convert&lane=not_sure"
          variant="secondary"
          fullWidth>Request a mapping session</Button
        >
        <a class="practice-handoff-proof" href="/proof/marketplace-workflow">
          Read the test results <span aria-hidden="true">→</span>
        </a>
        <a class="practice-handoff-audience" href="/for-service-providers">
          <span>For service providers</span>
          <strong>Use the Practice with clients <span aria-hidden="true">→</span></strong>
        </a>
      </div>
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

  .flagship-defense {
    display: grid;
    gap: 0.8rem;
    padding: clamp(1.25rem, 4vw, 3rem);
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #fff);
  }

  .flagship-defense span {
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .flagship-defense h3,
  .flagship-defense p {
    margin: 0;
  }

  .flagship-defense h3 {
    max-width: 22ch;
    font-size: clamp(1.8rem, 4vw, 3.5rem);
    line-height: 1;
  }

  .flagship-defense p {
    max-width: 52rem;
    color: rgb(255 255 255 / 0.72);
    line-height: 1.55;
  }

  .practice-handoff-actions {
    display: grid;
    width: min(100%, 32rem);
    gap: var(--space-performance-sm, 0.75rem);
  }

  .practice-handoff-proof,
  .practice-handoff-audience {
    min-height: var(--height-performance-control-min, 2.75rem);
    color: var(--color-performance-panel, #fff);
    text-decoration: none;
  }

  .practice-handoff-proof {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-sm, 0.75rem);
    padding: var(--space-performance-sm, 0.75rem) var(--space-performance-md, 1.25rem);
    border: 1px solid color-mix(in srgb, var(--color-performance-panel, #fff) 44%, transparent);
    border-radius: var(--radius-performance-sm, 0);
    font-weight: var(--font-performance-semibold, 600);
  }

  .practice-handoff-audience {
    display: grid;
    align-content: center;
    gap: var(--space-performance-2xs, 0.25rem);
    padding-block: var(--space-performance-sm, 0.75rem);
    border-top: 1px solid color-mix(in srgb, var(--color-performance-panel, #fff) 28%, transparent);
  }

  .practice-handoff-audience > span {
    color: color-mix(in srgb, var(--color-performance-panel, #fff) 58%, transparent);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-label, 0.72rem);
    font-weight: var(--font-performance-semibold, 600);
    text-transform: uppercase;
  }

  .practice-handoff-audience strong {
    font-size: var(--text-performance-body, 1rem);
  }

  .practice-handoff-proof:hover,
  .practice-handoff-audience:hover strong {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .practice-handoff-proof:focus-visible,
  .practice-handoff-audience:focus-visible {
    outline: 2px solid var(--color-performance-signal, #1769ff);
    outline-offset: 2px;
  }
</style>
