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

  const workflowSummary: PerformanceCardItem[] = [
    {
      eyebrow: 'Start',
      icon: 'search',
      title: 'One painful workflow',
      detail: 'Name the handoff that steals the most time before adding more automation.'
    },
    {
      eyebrow: 'Build',
      icon: 'settings',
      title: 'A scoped workflow pilot',
      detail: 'Connect the source systems, write the rules, and keep authority constrained.'
    },
    {
      eyebrow: 'Keep',
      icon: 'document',
      title: 'Code, policy, and runbook',
      detail:
        'The operator keeps the map, the control boundary, and the evidence needed to trust it.'
    }
  ];

  const journey: PerformanceCardItem[] = [
    {
      eyebrow: '01',
      icon: 'folder',
      title: 'Map the manual bridge',
      detail:
        'Identify the team member, tool, record, and decision that currently hold the workflow together.'
    },
    {
      eyebrow: '02',
      icon: 'plus',
      title: 'Connect only the first handoff',
      detail: 'Use the smallest useful connection point instead of rebuilding every system at once.'
    },
    {
      eyebrow: '03',
      icon: 'check',
      title: 'Add decision states',
      detail:
        'Separate allowed actions, approval-needed actions, and blocked states before delegation.'
    },
    {
      eyebrow: '04',
      icon: 'refresh',
      title: 'Operate with receipts',
      detail:
        'Leave a runbook, recovery path, and evidence trail so the workflow can survive handoff.'
    }
  ];

  const packageCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Build',
      icon: 'settings',
      title: '2-4 week implementation',
      detail: 'A scoped first build for one high-value workflow. Typical range: $2,000-$5,000.',
      points: ['Connectivity', 'Setup', 'Policy', 'Runbook']
    },
    {
      eyebrow: 'System Map',
      icon: 'search',
      title: 'Roadmap after proof',
      detail:
        'Map tools, workflows, and data flow after the first pilot proves value. Typical range: $5,000-$10,000.',
      points: ['Duplication', 'Manual movement', 'Disconnected records', 'Priority order']
    },
    {
      eyebrow: 'Reliability',
      icon: 'check',
      title: 'Ongoing control layer',
      detail:
        'Prompt tuning, policy updates, monitoring, and edge-case handling once the workflow is in operation.',
      points: ['Drift checks', 'Approval rules', 'Performance review', 'Recovery notes']
    }
  ];

  const exampleMetrics: PerformanceCardItem[] = [
    {
      eyebrow: 'Month 1',
      icon: 'plus',
      title: 'HubSpot pipeline pilot',
      detail:
        'MCP endpoint, Codex setup, approval policy, and runbook for a professional-services workflow.',
      points: ['Saves 5 hrs/week', '$3,000 build']
    },
    {
      eyebrow: 'Month 3',
      icon: 'search',
      title: 'System audit',
      detail:
        'Found three disconnected systems and roughly twenty hours per week of manual data movement.',
      points: ['Prioritized roadmap', '$7,500 audit']
    },
    {
      eyebrow: 'Month 4',
      icon: 'refresh',
      title: 'Second connection',
      detail:
        'Connected Notion project tracking and added a shared control layer across both workflows.',
      points: ['15 hrs/week automated', '$2,500/mo operation']
    }
  ];

  const audienceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Operator gap',
      icon: 'user',
      title: 'Your team is the integration layer',
      detail: 'People move context between HubSpot, Notion, Slack, spreadsheets, and inboxes.'
    },
    {
      eyebrow: 'AI gap',
      icon: 'settings',
      title: 'AI is not near the real work',
      detail: 'The agent can draft, but it cannot safely act against the systems that matter.'
    },
    {
      eyebrow: 'Scale gap',
      icon: 'warning',
      title: 'Zapier-style glue hit the wall',
      detail:
        'The workflow now needs ownership, approval rules, and recovery paths, not another trigger.'
    }
  ];

  const businessScenes: PerformanceNarrativeScene[] = [
    {
      id: 'path',
      label: 'Path',
      summary: 'Remove one manual bridge',
      title: 'Do not re-platform. Control the first handoff.',
      detail:
        'Map the manual bridge, connect only the smallest useful point, classify decision states, and leave the operator with receipts.',
      tone: 'allow',
      receipts: ['workflow map', 'first connection', 'decision states', 'runbook']
    },
    {
      id: 'offer',
      label: 'Offer',
      summary: 'Expand after proof',
      title: 'The engagement grows only when the first pilot earns it.',
      detail:
        'A controlled workflow pilot creates the evidence for a broader system map or ongoing reliability work instead of promising to automate everything at once.',
      tone: 'review'
    },
    {
      id: 'example',
      label: 'Example',
      summary: 'Feel the difference early',
      title: 'One pipeline handoff can prove value without changing every tool.',
      detail:
        'A professional-services team can begin with HubSpot, use measured time savings to map the wider system, then add the next connection under the same control layer.',
      tone: 'allow',
      evidence: ['5 hours per week', 'three disconnected systems', '15 hours per week automated']
    },
    {
      id: 'fit',
      label: 'Fit',
      summary: 'People carry the workflow',
      title: 'This is for teams rebuilding context by hand.',
      detail:
        'The right starting team can name the repeated handoff, the person carrying it, and the business consequence when it breaks.',
      tone: 'neutral'
    }
  ];

  const faqItems = [
    {
      question: 'How should a small team start with workflow automation?',
      answer:
        'Start with one painful workflow, map the manual bridge, build the first controlled pilot, and leave the operator with code, policy, and runbook evidence.'
    },
    {
      question: 'What makes a workflow safe to delegate?',
      answer:
        'A workflow is safer to delegate when it has named owners, source systems, scoped actions, approval-needed states, blocked states, and receipts.'
    },
    {
      question: 'Does the first pilot need full platform migration?',
      answer:
        'No. The first pilot should preserve existing systems and add only the smallest reliable control path around the current handoff.'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Bring',
      icon: 'folder',
      title: 'One workflow',
      detail: 'The handoff, owner, source tools, and failure point.'
    },
    {
      label: 'Map',
      icon: 'search',
      title: 'First controlled pilot',
      detail: 'The smallest useful delegation boundary.'
    },
    {
      label: 'Leave with',
      icon: 'document',
      title: 'A control path',
      detail: 'Allowed, approval-needed, blocked, and receipt states.'
    }
  ];
</script>

<SEO
  title="Automate One Workflow for a Small Team | CREATE SOMETHING Build"
  description="Turn one painful workflow into a reliable system. CREATE SOMETHING maps the manual bridge and builds the first controlled pilot. You keep the code, the policy, and the runbook."
  keywords="small business automation, workflow integration, custom MCP, HubSpot automation, Notion integration, ops automation, SMB AI"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="For teams of 5-50"
  title="Your tools do not talk to each other. Your team fills the gap."
  description="Start with the workflow that wastes the most time. CREATE SOMETHING maps the manual bridge, builds the first controlled pilot, and leaves your operator with a control path they can understand."
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
      items={workflowSummary}
      columns={1}
      density="compact"
      ariaLabel="Workflow pilot summary"
    />
  {/snippet}
</PerformancePageSection>

<PerformanceNarrativeStage
  id="business-pilot-story"
  eyebrow="One pilot story"
  title="One manual bridge deserves the first pilot. Pick it deliberately."
  description="A small team needs one legible decision: which manual bridge deserves the first controlled pilot, what that pilot costs, what useful proof looks like, and whether the operating conditions fit."
  scenes={businessScenes}
  ariaLabel="Small-team workflow pilot story"
>
  {#snippet artifact(scene: PerformanceNarrativeScene)}
    {#if scene.id === 'path'}
      <PerformanceCardGrid
        items={journey}
        columns={4}
        ariaLabel="Small-team workflow pilot journey"
      />
    {:else if scene.id === 'offer'}
      <PerformanceCardGrid
        items={packageCards}
        columns={3}
        ariaLabel="Workflow pilot service packages"
      />
    {:else if scene.id === 'example'}
      <PerformanceCardGrid
        items={exampleMetrics}
        columns={3}
        ariaLabel="Small business workflow example metrics"
      />
    {:else}
      <PerformanceCardGrid items={audienceCards} columns={3} ariaLabel="Small-team workflow fit" />
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  eyebrow="Start with one workflow"
  title="Bring the workflow that wastes the most time."
  description="I will help map the first controlled pilot before expanding authority, scope, or spend."
  steps={ctaItems}
  handoff={{
    owner: 'Business operator',
    authority: 'First controlled pilot',
    proof: 'Runbook + control states',
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
