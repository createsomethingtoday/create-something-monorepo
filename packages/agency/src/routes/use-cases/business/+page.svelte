<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const wedgeSummary: ClearCardItem[] = [
    {
      eyebrow: 'Start',
      icon: 'search',
      title: 'One painful workflow',
      detail: 'Name the handoff that steals the most time before adding more automation.'
    },
    {
      eyebrow: 'Build',
      icon: 'settings',
      title: 'A scoped workflow wedge',
      detail: 'Connect the source systems, write the rules, and keep authority constrained.'
    },
    {
      eyebrow: 'Keep',
      icon: 'document',
      title: 'Code, policy, and runbook',
      detail: 'The operator keeps the map, the control boundary, and the evidence needed to trust it.'
    }
  ];

  const journey: ClearCardItem[] = [
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
      title: 'Connect only the first wedge',
      detail:
        'Use the smallest useful connection point instead of rebuilding every system at once.'
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

  const packageCards: ClearCardItem[] = [
    {
      eyebrow: 'Workflow Wedge',
      icon: 'settings',
      title: '2-4 week implementation',
      detail:
        'A scoped first build for one high-value workflow. Typical range: $2,000-$5,000.',
      points: ['Connectivity', 'Setup', 'Policy', 'Runbook']
    },
    {
      eyebrow: 'System Map',
      icon: 'search',
      title: 'Roadmap after proof',
      detail:
        'Map tools, workflows, and data flow after the first wedge proves value. Typical range: $5,000-$10,000.',
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

  const exampleMetrics: ClearCardItem[] = [
    {
      eyebrow: 'Month 1',
      icon: 'plus',
      title: 'HubSpot pipeline wedge',
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

  const audienceCards: ClearCardItem[] = [
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
      detail: 'The workflow now needs ownership, approval rules, and recovery paths, not another trigger.'
    }
  ];

  const faqItems = [
    {
      question: 'How should a small team start with workflow automation?',
      answer:
        'Start with one painful workflow, map the manual bridge, build the first safe wedge, and leave the operator with code, policy, and runbook evidence.'
    },
    {
      question: 'What makes a workflow safe to delegate?',
      answer:
        'A workflow is safer to delegate when it has named owners, source systems, scoped actions, approval-needed states, blocked states, and receipts.'
    },
    {
      question: 'Does the first wedge need full platform migration?',
      answer:
        'No. The first wedge should preserve existing systems and add only the smallest reliable control path around the current handoff.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Bring',
      icon: 'folder',
      title: 'One workflow',
      detail: 'The handoff, owner, source tools, and failure point.'
    },
    {
      label: 'Map',
      icon: 'search',
      title: 'First safe wedge',
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
  title="Workflow Wedges for Small Teams | CREATE SOMETHING .agency"
  description="Turn one painful workflow into a reliable system. CREATE SOMETHING maps the manual bridge, builds the first safe wedge, and leaves the operator with code, policy, and runbook evidence."
  keywords="small business automation, workflow integration, custom MCP, HubSpot automation, Notion integration, ops automation, SMB AI"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="For teams of 5-50"
  title="Your tools do not talk to each other. Your team fills the gap."
  description="Start with the workflow that wastes the most time. CREATE SOMETHING maps the manual bridge, builds the first safe wedge, and leaves your operator with a control path they can understand."
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
    <ClearCardGrid
      items={wedgeSummary}
      columns={1}
      density="compact"
      ariaLabel="Workflow wedge summary"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Operating path"
  title="Do not re-platform. Remove one manual bridge."
  description="The buyer does not need a full-stack rebuild on the first call. They need to see which handoff can be mapped, delegated, stopped, and proven."
>
  {#snippet after()}
    <ClearCardGrid items={journey} columns={4} ariaLabel="Small-team workflow wedge journey" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Service shape"
  title="The offer expands only after the first wedge proves useful."
  description="One controlled workflow becomes the evidence for the next map, not a promise to automate everything at once."
>
  {#snippet after()}
    <ClearCardGrid items={packageCards} columns={3} ariaLabel="Workflow wedge service packages" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Example"
  title="A small team can feel the difference without changing every tool."
  description="A professional-services team can start with one pipeline handoff, then use the evidence to decide what deserves the next connection."
>
  {#snippet after()}
    <ClearCardGrid items={exampleMetrics} columns={3} ariaLabel="Small business workflow example metrics" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Fit"
  title="This is for teams carrying too much workflow in people."
  description="The right first buyer can name the repeated handoff, the person currently rebuilding context, and the business consequence when that handoff breaks."
>
  {#snippet after()}
    <ClearCardGrid items={audienceCards} columns={3} ariaLabel="Small-team workflow fit" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Start with one workflow"
  title="Bring the workflow that wastes the most time."
  description="I will help map the first safe wedge before expanding authority, scope, or spend."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</ClearCtaBand>
