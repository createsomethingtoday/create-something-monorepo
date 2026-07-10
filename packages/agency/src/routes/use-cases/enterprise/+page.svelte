<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const reliabilitySummary: PerformanceCardItem[] = [
    {
      eyebrow: 'Layer',
      icon: 'settings',
      title: 'Policy OS',
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
      detail:
        'Track uptime, accuracy, cost, response time, alerts, releases, and recovery notes.'
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
      points: ['Operating baseline', 'Weekly prompt and policy tuning', 'Monthly reporting', 'Drift correction']
    },
    {
      eyebrow: '$2,000-$3,000/mo',
      icon: 'refresh',
      title: 'Workflow Control Growth',
      detail: 'For three to five workflows that need shared orchestration.',
      points: ['Cross-agent handoffs', 'Approval operations', 'Golden-task checks', 'Bi-weekly optimization']
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

  const faqItems = [
    {
      question: 'When does an enterprise need Policy OS?',
      answer:
        'Policy OS fits teams already running automation that now need controlled execution states, approval rules, monitoring, and operating receipts.'
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
  title="Policy OS for Enterprise Workflow Reliability | CREATE SOMETHING .agency"
  description="Policy OS for teams already running automation. Add controlled execution states, approval rules, monitoring, and operating receipts once the first workflow pilot is live."
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
  description="For teams already running MCP-backed or cross-system workflows, Policy OS adds the controlled execution layer: prompt optimization, approval logic, blocked states, monitoring, and receipts after launch."
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
      ariaLabel="Policy OS reliability summary"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Why automation breaks"
  title="Most AI automation fails after deployment, not during it."
  description="The failure is rarely the connection itself. The failure is missing judgment: no policy, no owner, no blocked state, no evidence, and no recovery path."
>
  {#snippet after()}
    <PerformanceCardGrid items={failureModes} columns={3} ariaLabel="Enterprise automation failure modes" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Control layer"
  title="Policy OS keeps the workflow explainable after launch."
  description="The work is not another trigger. It is the operating layer that keeps agent capacity aligned with ownership, approval, recovery, and evidence."
>
  {#snippet after()}
    <PerformanceCardGrid items={controlLayer} columns={4} ariaLabel="Policy OS control layer" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Three-tier framework"
  title="Every operating workflow has three layers."
  description="Database tells the system what exists. Automation moves the work. Judgment decides what should happen when risk, ambiguity, or approval enters the path."
>
  {#snippet after()}
    <PerformanceCardGrid items={tiers} columns={3} ariaLabel="Database automation judgment layers" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Operating plans"
  title="Start with the amount of control the workflow actually needs."
  description="Pricing is shaped by the number of workflows in operation, the risk of each action, and the review rhythm needed to keep the system trusted."
>
  {#snippet after()}
    <PerformanceCardGrid items={plans} columns={3} ariaLabel="Workflow control operating plans" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Fit"
  title="This is for teams whose automations are now operational infrastructure."
  description="The work fits when a workflow is already valuable enough that drift, unclear approvals, or invisible failures would create real operational cost."
>
  {#snippet after()}
    <PerformanceCardGrid items={audienceCards} columns={3} ariaLabel="Policy OS fit" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Start with the workflow"
  title="Bring the workflow, owner, and first risk boundary."
  description="I will map the control states before expanding automation authority."
  steps={ctaItems}
  handoff={{ owner: 'Decision owner', authority: 'Enterprise control boundary', proof: 'Evidence + rollback path', state: 'review' }}
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
