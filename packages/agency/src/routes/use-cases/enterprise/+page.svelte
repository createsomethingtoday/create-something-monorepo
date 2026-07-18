<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const reliabilitySummary: PerformanceCardItem[] = [
    {
      eyebrow: 'Layer',
      icon: 'settings',
      title: 'CREATE SOMETHING Control',
      detail:
        'A controlled execution layer for teams already running MCP servers, agents, or cross-system workflows.'
    },
    {
      eyebrow: 'State',
      icon: 'check',
      title: 'Allowed, approval-needed, blocked',
      detail:
        'Actions are classified before the workflow touches risk, revenue, customer records, or operations.'
    },
    {
      eyebrow: 'Receipt',
      icon: 'document',
      title: 'Evidence after every handoff',
      detail:
        'The operator can see what ran, what stopped, who approved it, and what should happen next.'
    }
  ];

  const failureModes: PerformanceCardItem[] = [
    {
      eyebrow: '01',
      icon: 'warning',
      title: 'Prompt drift',
      detail:
        'Agent performance degrades as the business changes, edge cases accumulate, and prompts go untuned.'
    },
    {
      eyebrow: '02',
      icon: 'warning',
      title: 'Policy gaps',
      detail:
        'No clear rules for escalation, ambiguity, or refusal. One bad call can collapse trust in the system.'
    },
    {
      eyebrow: '03',
      icon: 'warning',
      title: 'Orphaned connections',
      detail:
        'APIs change, tokens expire, workflows evolve, and an automation quietly stops doing the right thing.'
    }
  ];

  const controlLayer: PerformanceCardItem[] = [
    {
      eyebrow: 'Prompt',
      icon: 'edit',
      title: 'Optimization loop',
      detail:
        'Review outputs, revise prompts, and tune behavior as edge cases and business context change.'
    },
    {
      eyebrow: 'Agent',
      icon: 'refresh',
      title: 'Orchestration',
      detail:
        'Coordinate agents and systems so they do not conflict, duplicate work, or miss handoffs.'
    },
    {
      eyebrow: 'Policy',
      icon: 'check',
      title: 'Decision rules',
      detail:
        'Define what can run, what needs approval, what must stop, and when a human owns the decision.'
    },
    {
      eyebrow: 'Evidence',
      icon: 'document',
      title: 'Monitoring and receipts',
      detail: 'Track uptime, accuracy, cost, response time, alerts, releases, and recovery notes.'
    }
  ];

  const tiers: PerformanceCardItem[] = [
    {
      eyebrow: 'Database',
      icon: 'folder',
      title: 'What your systems know',
      detail: 'Data, records, content, source accounts, and the information layer.'
    },
    {
      eyebrow: 'Automation',
      icon: 'settings',
      title: 'What your workflows do',
      detail: 'Connect, execute, transform, notify, and move work across systems.'
    },
    {
      eyebrow: 'Judgment',
      icon: 'check',
      title: 'What should happen',
      detail: 'Policies, oversight, approval rules, blocked states, and operating evidence.'
    }
  ];

  const plans: PerformanceCardItem[] = [
    {
      eyebrow: '$1,500-$2,000/mo',
      icon: 'settings',
      title: 'Workflow Control Core',
      detail: 'For one or two workflows already in operation.',
      points: [
        'Operating baseline',
        'Weekly prompt and policy tuning',
        'Monthly reporting',
        'Drift correction'
      ]
    },
    {
      eyebrow: '$2,000-$3,000/mo',
      icon: 'refresh',
      title: 'Workflow Control Growth',
      detail: 'For three to five workflows that need shared orchestration.',
      points: [
        'Cross-agent handoffs',
        'Approval operations',
        'Golden-task checks',
        'Bi-weekly optimization'
      ]
    },
    {
      eyebrow: 'Custom',
      icon: 'warning',
      title: 'Regulated / Multi-team',
      detail: 'For complex environments with audit, reporting, and expansion needs.',
      points: ['Advanced controls', 'Dashboards', 'Quarterly review', 'Direct architect access']
    }
  ];

  const audienceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Systems live',
      icon: 'settings',
      title: 'Connections already run',
      detail: 'The team has one or more MCP-backed or cross-system workflows in motion.'
    },
    {
      eyebrow: 'Risk visible',
      icon: 'warning',
      title: 'Automation touches judgment',
      detail: 'The workflow can affect customers, money, operations, compliance, or trust.'
    },
    {
      eyebrow: 'Ownership needed',
      icon: 'user',
      title: 'Operators need clarity',
      detail: 'Teams need to know what ran, what stopped, and who owns the next decision.'
    }
  ];

  const enterpriseScenes: PerformanceNarrativeScene[] = [
    {
      id: 'risk',
      label: 'Risk',
      summary: 'Failure begins after launch',
      title: 'Automation breaks when judgment has no operating home.',
      detail:
        'Prompt drift, policy gaps, and orphaned connections become expensive when no owner, blocked state, evidence, or recovery path surrounds them.',
      tone: 'block',
      evidence: ['prompt drift', 'policy gaps', 'orphaned connections']
    },
    {
      id: 'control',
      label: 'Control',
      summary: 'Keep work explainable',
      title: 'The operating layer aligns capacity with authority.',
      detail:
        'Optimization, orchestration, decision rules, monitoring, and receipts keep live agent work legible after deployment.',
      tone: 'review',
      receipts: ['prompt loop', 'orchestration', 'policy rules', 'operating evidence']
    },
    {
      id: 'model',
      label: 'Model',
      summary: 'Three layers, right cadence',
      title: 'Control only what the operating workflow needs.',
      detail:
        'Database holds what exists, Automation moves work, and Judgment governs what should happen. The operating plan follows workflow count, action risk, and review rhythm.',
      tone: 'allow'
    },
    {
      id: 'fit',
      label: 'Fit',
      summary: 'Automation is infrastructure',
      title: 'This is for teams whose live workflows carry real operational consequence.',
      detail:
        'The fit is strongest when connections already run, actions touch risk or trust, and operators need a clear next decision.',
      tone: 'neutral'
    }
  ];

  const faqItems = [
    {
      question: 'When does an enterprise need CREATE SOMETHING Control?',
      answer:
        'CREATE SOMETHING Control fits teams already running automation that now need controlled execution states, approval rules, monitoring, and operating receipts.'
    },
    {
      question: 'What should be added after the first workflow pilot?',
      answer:
        'After the first pilot is live, add policy rules, evaluation gates, monitoring, incident loops, release evidence, and a review rhythm.'
    },
    {
      question: 'How does enterprise workflow reliability stay auditable?',
      answer:
        'It stays auditable by attaching evidence, runbooks, release notes, blocked-state reasons, and owner decisions to the operating path.'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Bring',
      icon: 'folder',
      title: 'One live workflow',
      detail: 'The workflow, owner, systems, and risk boundary.'
    },
    {
      label: 'Define',
      icon: 'check',
      title: 'Control states',
      detail: 'Allowed, approval-needed, blocked, and recovery paths.'
    },
    {
      label: 'Operate',
      icon: 'document',
      title: 'Receipts',
      detail: 'Evidence, runbook, release notes, and review rhythm.'
    }
  ];
</script>

<SEO
  title="CREATE SOMETHING Control for Enterprise Workflow Reliability"
  description="CREATE SOMETHING Control helps teams add controlled execution states, approval rules, monitoring, and operating receipts once the first workflow is live."
  keywords="enterprise automation reliability, workflow controls, policy operations, ai control layer, workflow reliability"
  ogImage="/og/policy-os.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="The Judgment Layer"
  title="Reliability is what turns automation into operations."
  description="For teams already running MCP-backed or cross-system workflows, CREATE SOMETHING Control adds the governed execution layer: prompt optimization, approval logic, blocked states, monitoring, and receipts after launch."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid
      items={reliabilitySummary}
      columns={1}
      density="compact"
      ariaLabel="CREATE SOMETHING Control reliability summary"
    />
  {/snippet}
</PerformancePageSection>

<PerformanceNarrativeStage
  id="enterprise-control-story"
  eyebrow="One reliability story"
  title="Risk. Control. Model. Fit."
  description="Enterprise reliability becomes one decision sequence: name the post-launch risk, inspect the control layer, choose the operating model and cadence, then confirm the workflow has earned ongoing control."
  scenes={enterpriseScenes}
  ariaLabel="Enterprise workflow reliability story"
>
  {#snippet artifact(scene: PerformanceNarrativeScene)}
    {#if scene.id === 'risk'}
      <PerformanceCardGrid
        items={failureModes}
        columns={3}
        ariaLabel="Enterprise automation failure modes"
      />
    {:else if scene.id === 'control'}
      <PerformanceCardGrid
        items={controlLayer}
        columns={4}
        ariaLabel="CREATE SOMETHING Control layer"
      />
    {:else if scene.id === 'model'}
      <div class="enterprise-model">
        <section aria-labelledby="enterprise-layers-title">
          <h4 id="enterprise-layers-title">Database, Automation, Judgment</h4>
          <PerformanceCardGrid
            items={tiers}
            columns={3}
            ariaLabel="Database automation judgment layers"
          />
        </section>
        <section aria-labelledby="enterprise-plans-title">
          <h4 id="enterprise-plans-title">Operating plans</h4>
          <PerformanceCardGrid
            items={plans}
            columns={3}
            ariaLabel="Workflow control operating plans"
          />
        </section>
      </div>
    {:else}
      <PerformanceCardGrid
        items={audienceCards}
        columns={3}
        ariaLabel="CREATE SOMETHING Control fit"
      />
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  eyebrow="Start with the workflow"
  title="Bring the workflow, owner, and first risk boundary."
  description="I will map the control states before expanding automation authority."
  steps={ctaItems}
  handoff={{
    owner: 'Decision owner',
    authority: 'Enterprise control boundary',
    proof: 'Evidence + rollback path',
    state: 'review'
  }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .enterprise-model {
    display: grid;
    gap: clamp(1.25rem, 3vw, 2.5rem);
  }

  .enterprise-model section {
    display: grid;
    gap: 0.8rem;
  }

  .enterprise-model h4 {
    margin: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
  }
</style>
