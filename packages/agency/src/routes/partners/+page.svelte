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
        'Substrate is our database and work view. It keeps records, tasks, approvals, and results together.',
      href: '/products',
      points: ['Operating state', 'Human review', 'Receipts']
    },
    {
      eyebrow: 'Agent environment',
      icon: 'check',
      title: 'OpenAI provides the AI models and coding tools we use.',
      detail:
        'We use OpenAI with agreed permissions and tests. The same tool definitions and checks help us evaluate Claude, open-weight and custom models when needed.',
      href: '/stack',
      points: ['Reasoning layer', 'Agent delivery', 'Portable contracts']
    },
    {
      eyebrow: 'Runtime',
      icon: 'folder',
      title: 'Cloudflare runs the route.',
      detail:
        'Cloudflare provides hosting, storage, and background tasks. We document ownership and recovery for the services we use.',
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
        'CREATE SOMETHING maintains the system layer for agreed support. Cloudflare provides infrastructure and OpenAI provides intelligence. Substrate keeps workflow records, approvals, and results together. Ownership follows the agreed service scope.'
    },
    {
      question: 'Why not lead with vendor badges?',
      answer:
        'Start with the task and the tools it needs. The directory lists available connections. A listing does not mean an account is connected or that access has been approved.'
    },
    {
      question: 'How does this help a team choose the right path?',
      answer:
        'We agree on the task first. Then we choose the tools, data storage, and hosting it needs, with permissions for each.'
    }
  ];
</script>

<SEO
  title="Connected Tools | CREATE SOMETHING .agency"
  description="AI-native technical support for the tools your team uses. See available connections and how we support AI, hosting, and work records."
  keywords="workflow tool stack, AI workflow systems, Substrate database, OpenAI agents, Cloudflare workflow runtime, MCP tool boundary"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="stack"
  titleLevel="h1"
  expression="editorial"
  eyebrow="Tools we support"
  title="Connect the tools your task needs."
  description="Bring the task and the tools your team uses. We diagnose the problem, check available connections, and agree on access before making changes."
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
  title="What each part of the system does."
  description="CREATE SOMETHING maintains the system layer for agreed support. Cloudflare provides infrastructure and OpenAI provides intelligence. Your materials and agreed deliverables remain distinct from our reusable tools."
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
  title="See how the tools work together."
  description="The plan shows each step, who approves it, when the system stops, and what record is kept."
>
  {#snippet after()}
    <PerformanceCardGrid
      items={deliverables}
      columns={4}
      ariaLabel="Workflow tool stack deliverables"
    />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="Map the workflow"
  title="Choose the task before choosing the tools."
  description="Diagnose the task with the person responsible. Agree on the improvement, then build and test it. If you deliver client work, read the service-provider guide."
  steps={ctaItems}
  handoff={{
    owner: 'Workflow owner',
    authority: 'Named tool boundary',
    proof: 'Shared workflow receipt',
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
    <Button href="/for-service-providers" variant="secondary">Use it with clients</Button>
  {/snippet}
</PerformanceConversionHandoff>
