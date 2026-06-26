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
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const boundarySummary: ClearCardItem[] = [
    {
      eyebrow: 'Your team keeps',
      icon: 'user',
      title: 'Accounts, context, decisions',
      detail:
        'Business ownership, approval authority, source accounts, data rights, and final operating decisions.'
    },
    {
      eyebrow: 'I deliver',
      icon: 'settings',
      title: 'Maps, rules, evidence',
      detail:
        'Workflow maps, action contracts, control rules, release evidence, runbooks, and handoff notes.'
    },
    {
      eyebrow: 'Vendors provide',
      icon: 'refresh',
      title: 'Replaceable infrastructure',
      detail: 'Hosted services, APIs, uptime, product limits, and platform-specific capabilities.'
    }
  ];

  const journey: ClearCardItem[] = [
    {
      eyebrow: '01 Map',
      icon: 'folder',
      title: 'Workflow Trust Map',
      detail:
        'Name the workflow, source accounts, approval owner, first action boundary, and evidence needed before delegation.'
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
      title: 'Trust Layer',
      detail:
        'Classify live actions as auto-allowed, approval-needed, or blocked with a reason before the workflow touches risk.'
    }
  ];

  const deliveryArtifacts: ClearCardItem[] = [
    {
      eyebrow: 'Map',
      icon: 'folder',
      title: 'Workflow Trust Map',
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
      detail: 'The visible state for Webflow, Dify, Linear, Notion, or a custom app.'
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

  const procurementTrust: ClearCardItem[] = [
    {
      eyebrow: 'Accounts',
      icon: 'user',
      title: 'Client-owned systems stay client-owned',
      detail:
        'Source accounts, business context, approval authority, and data rights stay with the team that operates the workflow.',
      points: ['No hidden platform dependency', 'No forced account transfer to start']
    },
    {
      eyebrow: 'Access',
      icon: 'check',
      title: 'Least privilege before automation',
      detail:
        'The build names which systems are read, which writes are allowed, and where execution must stop for approval.',
      points: ['Scoped app permissions', 'Revocation path documented']
    },
    {
      eyebrow: 'Secrets',
      icon: 'warning',
      title: 'Credentials stay out of prompts and docs',
      detail:
        'Secrets, tokens, and private evidence are handled as operational boundaries, not pasted into handoff notes or model context.',
      points: ['Secret manager boundary', 'Client-safe public proof split']
    },
    {
      eyebrow: 'Audit',
      icon: 'document',
      title: 'Receipts travel with the workflow',
      detail:
        'Validation output, deploy IDs, release notes, blocked-state records, and rollback notes stay close to the work.',
      points: ['Readable evidence for operators', 'Private evidence for reviewers']
    },
    {
      eyebrow: 'Vendors',
      icon: 'refresh',
      title: 'Tools can change without losing the map',
      detail:
        'The durable asset is the workflow boundary: objects, actions, states, owners, approvals, and evidence.',
      points: ['Replaceable services', 'Portable operating model']
    },
    {
      eyebrow: 'Authority',
      icon: 'settings',
      title: 'Humans keep the final risk decisions',
      detail:
        'Revenue, customer trust, compliance, and production-impacting work waits for named approval when the lane requires it.',
      points: ['Named owner', 'Run, wait, and stop states']
    }
  ];

  const stackRoles: ClearCardItem[] = [
    {
      eyebrow: 'Runtime',
      icon: 'settings',
      title: 'Cloudflare',
      detail:
        'Workers, D1, Durable Objects, queues, and edge routes keep the system deployable without a heavyweight client-owned platform team.',
      href: '/cloudflare'
    },
    {
      eyebrow: 'Connectivity',
      icon: 'plus',
      title: 'Composio',
      detail:
        'OAuth, connect links, and standard app actions stay commodity when the integration is not the strategic differentiator.'
    },
    {
      eyebrow: 'Agent surface',
      icon: 'document',
      title: 'Dify',
      detail:
        'Visible agent surfaces, repeatable server cards, and lightweight operator-facing automation when the workflow needs packaging.',
      href: '/dify'
    },
    {
      eyebrow: 'Workspace',
      icon: 'folder',
      title: 'Notion',
      detail:
        'PM visibility, client-readable evidence, template distribution, and human review around agent work.',
      href: '/notion'
    },
    {
      eyebrow: 'Reasoning',
      icon: 'info',
      title: 'OpenAI',
      detail:
        'Reasoning and agent hosting become useful when surrounded by scoped tools, approval behavior, evals, and traceable context.'
    },
    {
      eyebrow: 'Surface',
      icon: 'document',
      title: 'Webflow',
      detail:
        'Sites, templates, apps, forms, dashboards, and marketplace-facing operator experiences become controlled interfaces.'
    },
    {
      eyebrow: 'Ledger',
      icon: 'check',
      title: 'Linear',
      detail:
        'Tracked work, ownership, status, validation, release notes, and unresolved decisions become a shared evidence ledger.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'warning',
      title: 'Infisical + Clerk',
      detail:
        'Secrets and identity stay out of prompts and handoff docs, with sign-in, token issuance, entitlement checks, and revocation separated.'
    }
  ];

  const proofPaths: ClearCardItem[] = [
    {
      eyebrow: 'Entry map',
      icon: 'search',
      title: 'Outerfields',
      detail: 'A first technical layer without pretending the client is now the engineering team.'
    },
    {
      eyebrow: 'Complete system',
      icon: 'settings',
      title: 'Abundance',
      detail:
        'Database, callable actions, tool/API surface, and explainable matching show the full operating path.'
    },
    {
      eyebrow: 'Surface work',
      icon: 'document',
      title: 'Webflow systems',
      detail:
        'Templates, apps, forms, dashboards, and review tools turn the stack into something operators can use.'
    },
    {
      eyebrow: 'Expansion layer',
      icon: 'check',
      title: 'Control layer',
      detail:
        'Linear evidence, identity, entitlement, approvals, blocked states, and auditability make the system serious enough to scale.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Workflow',
      icon: 'folder',
      title: 'First workflow map',
      detail: 'Objects, source systems, owners, handoffs, and failure points.'
    },
    {
      label: 'Boundary',
      icon: 'user',
      title: 'Vendor and ownership boundary',
      detail: 'What your team owns, what I deliver, and what vendors provide.'
    },
    {
      label: 'Control',
      icon: 'check',
      title: 'Decision states',
      detail: 'Auto-allow, approval-needed, and blocked states with reasons.'
    }
  ];
</script>

<SEO
  title="Stack Boundary | CREATE SOMETHING .agency"
  description="CREATE SOMETHING separates what your team owns, what vendors provide, and what the workflow needs before delegated work becomes production work."
  keywords="delegated work control, workflow trust layer, transparent AI stack, MCP stack, vendor boundaries, Composio, Cloudflare, Dify, Notion, OpenAI, Webflow"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Stack Boundary"
  title="Know what you own before any tool acts."
  description="A buyer should be able to see who owns the accounts, where secrets live, which actions can run, which decisions need approval, what stops, and what evidence travels with the handoff."
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
      items={boundarySummary}
      columns={1}
      density="compact"
      ariaLabel="Stack boundary summary"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="How the stack becomes a service"
  title="The stack should read like a handoff, not a vendor diagram."
  description="The story stays simple for a non-technical team: map the boundary, pilot one safe workflow, then control the risky actions only when live work needs it."
>
  {#snippet after()}
    <ClearCardGrid items={journey} columns={3} ariaLabel="Stack service journey" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Boundary canvas"
  title="A stack boundary becomes useful when it shows what must stop."
  description="The story canvas turns vendor roles into an operating map: source data, allowed routing, assistive work, human judgment, hard stops, and the receipt surface."
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
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="What your team keeps"
  title="You keep the receipts, not a mystery stack."
  description="The technical stack can change. The durable asset is the workflow boundary: objects, actions, states, owners, approvals, runbooks, and evidence."
>
  {#snippet after()}
    <ClearCardGrid items={deliveryArtifacts} columns={3} ariaLabel="Stack delivery artifacts" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Procurement trust"
  title="The stack is buyable because the boundary is explicit."
  description="A serious workflow buyer needs to know who owns accounts, where secrets live, what access is granted, how revocation works, and what evidence survives after launch."
>
  {#snippet after()}
    <ClearCardGrid items={procurementTrust} columns={3} ariaLabel="Procurement trust controls" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Vendor roles"
  title="Vendor names are receipts, not the explanation."
  description="Each service earns a clear job. The connected tools are replaceable infrastructure. The operating boundary is what connects, what runs, what waits, what stops, who decides, and what the operator receives."
>
  {#snippet after()}
    <ClearCardGrid
      items={stackRoles}
      columns={4}
      ariaLabel="Vendor roles in the trust layer stack"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Proof path"
  title="The examples tell the whole story without tool sprawl."
  description="Each proof surface shows a different part of the same path: connect, verify, coordinate, control, and leave evidence behind."
>
  {#snippet after()}
    <ClearCardGrid items={proofPaths} columns={4} ariaLabel="Stack proof paths" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Start with the workflow"
  title="Bring the workflow, the accounts, and the approval owner."
  description="CREATE SOMETHING will map the stack boundary, define the first safe delegation path, identify what can be safely assigned, and show what stays visible to the operator before implementation starts."
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
