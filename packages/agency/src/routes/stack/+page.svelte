<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceCtaBand,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const boundarySummary: PerformanceCardItem[] = [
    {
      eyebrow: 'Your team keeps',
      icon: 'user',
      title: 'Accounts, context, decisions',
      detail:
        'Business ownership, approval authority, source accounts, data rights, and final operating decisions.'
    },
    {
      eyebrow: 'Substrate records',
      icon: 'settings',
      title: 'State, review, evidence',
      detail:
        'Source records, Atlas bindings, actions, approvals, runs, receipts, and operator views stay in the owned system.'
    },
    {
      eyebrow: 'Vendors provide',
      icon: 'refresh',
      title: 'Replaceable infrastructure',
      detail: 'Hosted services, APIs, uptime, product limits, and platform-specific capabilities.'
    }
  ];

  const journey: PerformanceCardItem[] = [
    {
      eyebrow: '01 Map',
      icon: 'folder',
      title: 'Workflow Map',
      detail:
        'Name the workflow, source accounts, decision owner, first action boundary, and evidence needed before delegation.'
    },
    {
      eyebrow: '02 Pilot',
      icon: 'settings',
      title: 'Workflow Pilot',
      detail:
        'Turn one repeated handoff into scoped actions, durable state, receipts, and a runbook only after the safe path is clear.'
    },
    {
      eyebrow: '03 Control',
      icon: 'check',
      title: 'Ongoing Control',
      detail:
        'Classify live actions as auto-allowed, approval-needed, or blocked with a reason before the workflow touches risk.'
    }
  ];

  const deliveryArtifacts: PerformanceCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Workflow Map',
      detail: 'One workflow, source systems, owners, handoffs, and failure points.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'check',
      title: 'Stack boundary',
      detail: 'What your team owns, what CREATE SOMETHING owns, and what vendors provide.'
    },
    {
      eyebrow: 'Contract',
      icon: 'document',
      title: 'Tool/API contract',
      detail: 'Tools, resources, auth scopes, allowed actions, and transport limits.'
    },
    {
      eyebrow: 'Control',
      icon: 'settings',
      title: 'Policy rules',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.'
    },
    {
      eyebrow: 'Operate',
      icon: 'refresh',
      title: 'Runbook',
      detail: 'Recovery, release evidence, rollback notes, and operator handoff.'
    },
    {
      eyebrow: 'Surface',
      icon: 'document',
      title: 'Operator brief',
      detail: 'The visible state in Substrate, Dify, or a client-owned application.'
    }
  ];

  const platformConviction: PerformanceCardItem[] = [
    {
      eyebrow: 'Current instrument',
      icon: 'info',
      title: 'OpenAI Codex',
      detail:
        'The primary environment for setup, demonstration, repository work, and agent-operable delivery.'
    },
    {
      eyebrow: 'Owned system',
      icon: 'check',
      title: 'Context, policy, proof',
      detail:
        'The workflow boundary, organizational context, approval rules, evals, receipts, and recovery path stay inspectable and portable.'
    },
    {
      eyebrow: 'Exit path',
      icon: 'refresh',
      title: 'Route, compare, recover',
      detail:
        'The same contracts and golden tasks can evaluate Claude, compatible harnesses, open-weight executors, and custom models.'
    }
  ];

  const faqItems = [
    {
      question: 'What is the stack boundary?',
      answer:
        'The stack boundary separates what the client owns, what CREATE SOMETHING delivers, and what vendors provide before delegated work becomes production work.'
    },
    {
      question: 'Why does vendor ownership matter?',
      answer:
        'Vendor services are replaceable infrastructure. The durable value is the workflow map, action contract, control rules, runbook, and evidence that travel with the handoff.'
    },
    {
      question: 'What does the control layer decide?',
      answer:
        'The control layer classifies actions as auto-allowed, approval-needed, or blocked with a reason before execution touches customer, revenue, or production risk.'
    }
  ];

  const stackRoles: PerformanceCardItem[] = [
    {
      eyebrow: 'Owned substrate',
      icon: 'folder',
      title: 'Substrate',
      detail:
        'The CREATE SOMETHING database and operator layer owns source records, Atlas bindings, workflow actions, approvals, runs, receipts, and API/MCP access.',
      href: '/products'
    },
    {
      eyebrow: 'Runtime',
      icon: 'settings',
      title: 'Cloudflare',
      detail:
        'Workers, D1, Durable Objects, queues, and edge routes keep the workflow deployable while account ownership, billing, and rollback evidence stay explicit.',
      href: '/cloudflare'
    },
    {
      eyebrow: 'Agent surface',
      icon: 'document',
      title: 'Dify',
      detail:
        'Visible agent surfaces, repeatable server cards, and operator-facing automation when the workflow needs packaging with approval states attached.',
      href: '/dify'
    },
    {
      eyebrow: 'Reasoning',
      icon: 'info',
      title: 'OpenAI',
      detail:
        'The primary reasoning and agent environment stays surrounded by scoped tools, approval behavior, evals, and traceable context instead of hidden authority.'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Workflow',
      icon: 'folder',
      title: 'First workflow map',
      detail: 'Objects, source systems, owners, handoffs, and failure points.',
      state: 'ready'
    },
    {
      label: 'Boundary',
      icon: 'user',
      title: 'Vendor and ownership boundary',
      detail: 'What your team owns, what I deliver, and what vendors provide.',
      state: 'controlled'
    },
    {
      label: 'Control',
      icon: 'check',
      title: 'Decision states',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.',
      state: 'review'
    }
  ];
</script>

<SEO
  title="Stack Boundary | CREATE SOMETHING .agency"
  description="CREATE SOMETHING separates what your team owns, what vendors provide, and what the workflow needs before delegated work becomes production work."
  keywords="delegated work control, workflow control layer, Substrate database, transparent AI stack, MCP stack, vendor boundaries, Cloudflare, Dify, OpenAI"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Stack Boundary"
  title="Know what you own before any tool acts."
  description="Your team should be able to see who owns the accounts, where secrets live, which actions can run, which decisions need approval, what stops, and what evidence travels with the handoff."
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
      items={boundarySummary}
      columns={1}
      density="compact"
      ariaLabel="Stack boundary summary"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="How the stack becomes a service"
  title="The stack should read like a handoff, not a vendor diagram."
  description="The story stays simple for a non-technical team: map the boundary, pilot one safe workflow, then control the risky actions only when live work needs it."
>
  {#snippet after()}
    <PerformanceCardGrid items={journey} columns={3} ariaLabel="Stack service journey" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Boundary canvas"
  title="A stack boundary becomes useful when it shows what must stop."
  description="The story canvas turns vendor roles into an operating map: source data, allowed routing, assistive work, human judgment, stop conditions, and the audit trail."
>
  {#snippet after()}
    <PublicAtlasStoryCanvas
      starterId="insurance-claims-intake"
      storyId="stack-insurance-claims-intake-story"
      eyebrow="Stack boundary canvas"
      title="The workflow boundary decides what tools are allowed to do."
      description="This read-only map shows the stack promise in workflow terms: tools can route and prepare, but payout, denial, fraud, and sensitive decisions stop for named authority."
      compact
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="What your team keeps"
  title="You keep the receipts, not a mystery stack."
  description="The technical stack can change. The durable asset is the workflow boundary: source accounts, scoped access, allowed actions, stop states, approval owners, runbooks, revocation paths, and evidence."
>
  {#snippet after()}
    <PerformanceCardGrid items={deliveryArtifacts} columns={3} ariaLabel="Stack delivery artifacts" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Platform conviction"
  title="Model-opinionated in practice. Model-portable by design."
  description="CREATE SOMETHING builds primarily with OpenAI Codex. The durable client asset is data, MCP contracts, harnesses, skills, prompts, policy, evals, receipts, routing, fallback, and recovery—not access to one model."
>
  {#snippet after()}
    <PerformanceCardGrid
      items={platformConviction}
      columns={3}
      ariaLabel="Current platform, owned system, and portable exit path"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Owned system and active stack"
  title="Substrate owns the system. Three external platforms earn one role each."
  description="Substrate is the owned database and operator layer. OpenAI provides the primary agent environment, Dify provides visible agent applications, and Cloudflare provides the runtime. Their contracts remain inspectable and replaceable."
>
  {#snippet after()}
    <PerformanceCardGrid
      items={stackRoles}
      columns={4}
      ariaLabel="Substrate and the active OpenAI, Dify, Cloudflare stack"
    />
  {/snippet}
</PerformancePageSection>

<PerformanceCtaBand
  eyebrow="Start with the workflow"
  title="Bring the workflow, the accounts, and the decision owner."
  description="CREATE SOMETHING will map the stack boundary, define the first controlled path, identify what can be assigned, and show what stays visible to the operator before implementation starts."
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
</PerformanceCtaBand>
