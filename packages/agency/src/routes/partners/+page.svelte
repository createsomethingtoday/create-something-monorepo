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

  const fitCards: ClearCardItem[] = [
    {
      eyebrow: 'Agent surface',
      icon: 'settings',
      title: 'Dify shows the work.',
      detail:
        'Use Dify when people need a visible agent app with a clear task, tool boundary, and eval gates.',
      href: '/dify',
      points: ['Visible task', 'MCP boundary', 'Eval gates']
    },
    {
      eyebrow: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare runs the route.',
      detail:
        'Use Cloudflare when the workflow needs owned runtime behavior, durable state, and rollback paths.',
      href: '/cloudflare',
      points: ['Workers and Pages', 'Durable state', 'Rollback path']
    },
    {
      eyebrow: 'Workspace',
      icon: 'document',
      title: 'Notion keeps it reviewable.',
      detail:
        'Use Notion when operators need timelines, decisions, evidence, and human review around the workflow.',
      href: '/notion',
      points: ['Operator view', 'Decision log', 'Evidence surface']
    },
    {
      eyebrow: 'Reasoning',
      icon: 'check',
      title: 'OpenAI helps decide.',
      detail:
        'Use OpenAI where reasoning is useful, with scoped tools, approval behavior, and grounded evidence around it.',
      href: '/stack',
      points: ['Reasoning layer', 'Approval behavior', 'Grounded context']
    }
  ];

  const deliverables: ClearCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'document',
      title: 'Workflow map',
      detail: 'The handoff, owner, source systems, allowed actions, and risk boundary.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'settings',
      title: 'Tool boundary',
      detail: 'Which tool reads, writes, routes, waits, stops, or asks for approval.'
    },
    {
      eyebrow: 'Control',
      icon: 'check',
      title: 'Approval path',
      detail: 'What can run automatically, what needs a person, and what must stop.'
    },
    {
      eyebrow: 'Proof',
      icon: 'arrow-right',
      title: 'Evidence trail',
      detail: 'Runbook, receipt, rollback note, or review surface the operator can keep.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Agent surface',
      icon: 'settings',
      title: 'Dify',
      detail: 'Visible workflow app.'
    },
    {
      label: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare',
      detail: 'Owned route and state.'
    },
    {
      label: 'Workspace',
      icon: 'document',
      title: 'Notion',
      detail: 'Review and evidence.'
    }
  ];

  const faqItems = [
    {
      question: 'What is the workflow tool stack?',
      answer:
        'It is the practical tool map for one controlled workflow: visible app surface, runtime, workspace, reasoning layer, approval path, and evidence.'
    },
    {
      question: 'Why not lead with vendor badges?',
      answer:
        'The durable value is the workflow boundary: what can run, what needs approval, what stops, who owns the account, and what evidence the operator keeps.'
    },
    {
      question: 'How does this help a team choose the right path?',
      answer:
        'The page starts with the workflow and then routes it toward the visible agent surface, runtime substrate, operator workspace, or broader stack boundary before implementation begins.'
    }
  ];
</script>

<SEO
  title="Workflow Tool Stack | CREATE SOMETHING .agency"
  description="CREATE SOMETHING maps one controlled workflow across the visible app surface, runtime, workspace, reasoning layer, approval path, and evidence trail."
  keywords="workflow tool stack, AI workflow systems, Dify workflow systems, Cloudflare workflow runtime, Notion operating system, MCP tool boundary"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="stack"
  titleLevel="h1"
  eyebrow="Workflow Tool Stack"
  title="Choose the right tool path for one controlled workflow."
  description="Start with the workflow your team wants to delegate. CREATE SOMETHING maps the visible app surface, runtime, workspace, reasoning layer, approval path, and evidence before any tool gets more authority."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Tool fit"
  title="The workflow decides which tool gets a job."
  description="Dify, Cloudflare, Notion, and OpenAI are useful when each one has a clear role, scoped authority, and evidence path."
>
  {#snippet after()}
    <ClearCardGrid items={fitCards} columns={4} ariaLabel="Workflow tool fit" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="What you keep"
  title="The useful output is a map, not a vendor diagram."
  description="The first artifact should tell an operator what happens, who owns the decision, where the system stops, and what proof remains."
>
  {#snippet after()}
    <ClearCardGrid items={deliverables} columns={4} ariaLabel="Workflow tool stack deliverables" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the workflow"
  title="Bring the workflow before choosing the stack."
  description="I’ll map the handoff, owner, connected systems, allowed actions, approval pauses, stop points, and evidence path before implementation starts."
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
