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
  import IntegrationCatalog from '$lib/components/IntegrationCatalog.svelte';
  import IntegrationCompatibilityRail from '$lib/components/IntegrationCompatibilityRail.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const fitCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Owned substrate',
      icon: 'folder',
      title: 'Substrate keeps the operating record.',
      detail:
        'Use Substrate for source records, workflow state, human review, decisions, receipts, and the API/MCP boundary the system owns.',
      href: '/products',
      points: ['Operating state', 'Human review', 'Receipts']
    },
    {
      eyebrow: 'Agent environment',
      icon: 'check',
      title: 'OpenAI is the primary reasoning and agent environment.',
      detail:
        'Use OpenAI for reasoning and agent-operable delivery, with scoped tools, approval behavior, and grounded evidence. MCP contracts, policy, and evals preserve the route to Claude, open-weight and custom models.',
      href: '/stack',
      points: ['Reasoning layer', 'Agent delivery', 'Portable contracts']
    },
    {
      eyebrow: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare runs the route.',
      detail:
        'Use Cloudflare when the workflow needs owned runtime behavior, durable state, and rollback paths.',
      href: '/cloudflare',
      points: ['Workers and Pages', 'Durable state', 'Rollback path']
    }
  ];

  const deliverables: PerformanceCardItem[] = [
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

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Agent environment',
      icon: 'check',
      title: 'OpenAI',
      detail: 'Primary reasoning and agent delivery.'
    },
    {
      label: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare',
      detail: 'Owned route and state.'
    }
  ];

  const faqItems = [
    {
      question: 'What is the workflow tool stack?',
      answer:
        'CREATE SOMETHING owns the system. Cloudflare provides infrastructure. OpenAI provides intelligence. Substrate keeps workflow state, policy, review, and receipts in the owned operating layer.'
    },
    {
      question: 'Why not lead with vendor badges?',
      answer:
        'The durable value is the workflow boundary: what can run, what needs approval, what stops, who owns the account, and what evidence the operator keeps. Curated marks follow that boundary as compatibility evidence, while the full directory keeps availability distinct from a live connection.'
    },
    {
      question: 'How does this help a team choose the right path?',
      answer:
        'The page starts with the workflow, puts its operating state and review path in Substrate, then assigns a narrow job to OpenAI or Cloudflare before implementation begins.'
    }
  ];
</script>

<SEO
  title="Workflow Tool Stack | CREATE SOMETHING .agency"
  description="CREATE SOMETHING maps one controlled workflow across its owned Substrate layer, Cloudflare infrastructure, and OpenAI intelligence."
  keywords="workflow tool stack, AI workflow systems, Substrate database, OpenAI agents, Cloudflare workflow runtime, MCP tool boundary"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="stack"
  titleLevel="h1"
  eyebrow="Workflow Tool Stack"
  title="Choose the right tool path for one controlled workflow."
  description="Start with the workflow your team wants to delegate. CREATE SOMETHING maps the owned operating state in Substrate, then the agent environment, runtime, approval path, and evidence before any external tool gets more authority."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Tool fit"
  title="CREATE SOMETHING owns the record. Each external platform gets one job."
  description="CREATE SOMETHING owns the system. Cloudflare provides infrastructure. OpenAI provides intelligence. Substrate keeps workflow state, operator review, decisions, and evidence under CREATE SOMETHING control."
>
  {#snippet after()}
    <PerformanceCardGrid items={fitCards} columns={3} ariaLabel="Workflow tool fit" />
    <IntegrationCompatibilityRail surface="partners" />
    <IntegrationCatalog />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="What you keep"
  title="The useful output is a map, not a vendor diagram."
  description="The first artifact should tell an operator what happens, who owns the decision, where the system stops, and what proof remains."
>
  {#snippet after()}
    <PerformanceCardGrid items={deliverables} columns={4} ariaLabel="Workflow tool stack deliverables" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Map the workflow"
  title="Bring the workflow before choosing the stack."
  description="I’ll map the handoff, owner, connected systems, allowed actions, approval pauses, stop points, and evidence path before implementation starts."
  steps={ctaItems}
  handoff={{ owner: 'Partner operator', authority: 'Named delivery boundary', proof: 'Shared workflow receipt', state: 'review' }}
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
