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
      title: 'Map',
      detail:
        'Name the workflow, source accounts, decision owner, first action boundary, and evidence needed before delegation.'
    },
    {
      eyebrow: '02 Build',
      icon: 'settings',
      title: 'Build',
      detail:
        'Turn one repeated handoff into scoped actions, durable state, receipts, and a runbook only after the safe path is clear.'
    },
    {
      eyebrow: '03 Control',
      icon: 'check',
      title: 'Control',
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
      detail: 'The visible state in Substrate or a client-owned application.'
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
      eyebrow: 'Reasoning',
      icon: 'info',
      title: 'OpenAI',
      detail:
        'The primary reasoning and agent environment stays surrounded by scoped tools, approval behavior, evals, and traceable context instead of hidden authority.'
    }
  ];

  const stackScenes: PerformanceNarrativeScene[] = [
    {
      id: 'path',
      label: 'Path',
      summary: 'Map → pilot → control',
      title: 'The stack should read like a handoff, not a vendor diagram.',
      detail:
        'A non-technical team can follow one service path: map the boundary, pilot one safe workflow, then control risky actions only when live work needs it.',
      tone: 'allow',
      receipts: ['workflow map', 'controlled pilot', 'operating control']
    },
    {
      id: 'boundary',
      label: 'Boundary',
      summary: 'Show what must stop',
      title: 'The workflow boundary decides what tools are allowed to do.',
      detail:
        'Source data, assistive work, human judgment, stop conditions, and the audit trail belong on one operating map.',
      tone: 'block',
      evidence: ['allowed routing', 'named authority', 'stop conditions', 'audit trail']
    },
    {
      id: 'ownership',
      label: 'Ownership',
      summary: 'Keep the durable assets',
      title: 'You keep the receipts, not a mystery stack.',
      detail:
        'The technical stack can change. The durable asset is the workflow boundary: source accounts, scoped access, allowed actions, stop states, approval owners, runbooks, revocation paths, and evidence.',
      tone: 'review',
      receipts: ['workflow map', 'tool contract', 'policy rules', 'runbook', 'operator brief']
    },
    {
      id: 'portability',
      label: 'Portability',
      summary: 'Conviction without dependence',
      title: 'Model-opinionated in practice. Model-portable by design.',
      detail:
        'CREATE SOMETHING builds primarily with OpenAI Codex. The durable client asset is data, MCP contracts, harnesses, skills, prompts, policy, evals, receipts, routing, fallback, and recovery—not access to one model. CREATE SOMETHING owns the system. Cloudflare provides infrastructure. OpenAI provides intelligence. Substrate is the owned database and operator layer; it keeps workflow state, policy, and receipts under CREATE SOMETHING control.',
      tone: 'neutral',
      actions: [
        { label: 'Inspect Substrate products', href: '/products' },
        { label: 'See the Cloudflare runtime', href: '/cloudflare' }
      ]
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
  title="What You Keep | CREATE SOMETHING .agency"
  description="CREATE SOMETHING separates what your team owns, what vendors provide, and what the workflow needs before delegated work becomes production work."
  keywords="delegated work control, workflow control layer, Substrate database, transparent AI stack, MCP stack, vendor boundaries, Cloudflare, OpenAI"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  expression="editorial"
  eyebrow="What You Keep"
  title="Know what you own before any tool acts."
  description="You keep the accounts, data, approval rights, and operating history. Vendors provide replaceable infrastructure, and the workflow makes every boundary visible."
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

<PerformanceNarrativeStage
  id="stack-ownership-story"
  eyebrow="One ownership story"
  title="You should be able to leave with everything that matters."
  description="The stack becomes useful when you can trace the service path and see where work stops. It shows what you keep and what each external platform provides."
  scenes={stackScenes}
  ariaLabel="Stack ownership story"
>
  {#snippet artifact(scene: PerformanceNarrativeScene)}
    {#if scene.id === 'path'}
      <PerformanceCardGrid items={journey} columns={3} ariaLabel="Stack service journey" />
    {:else if scene.id === 'boundary'}
      <PublicAtlasStoryCanvas
        starterId="insurance-claims-intake"
        storyId="stack-insurance-claims-intake-story"
        eyebrow="Stack boundary canvas"
        title="The workflow boundary decides what tools are allowed to do."
        description="This read-only map shows the stack promise in workflow terms. Tools can route and prepare, but anything consequential stops for named authority."
        compact
      />
    {:else if scene.id === 'ownership'}
      <PerformanceCardGrid
        items={deliveryArtifacts}
        columns={3}
        ariaLabel="Stack delivery artifacts"
      />
    {:else}
      <div class="stack-proof-pair">
        <section aria-labelledby="platform-conviction-title">
          <h4 id="platform-conviction-title">Current instrument and portable exit</h4>
          <PerformanceCardGrid
            items={platformConviction}
            columns={3}
            ariaLabel="Current platform, owned system, and portable exit path"
          />
        </section>
        <section aria-labelledby="stack-roles-title">
          <h4 id="stack-roles-title">Owned system and platform roles</h4>
          <PerformanceCardGrid
            items={stackRoles}
            columns={3}
            ariaLabel="Owned Substrate with Cloudflare infrastructure and OpenAI intelligence"
          />
        </section>
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="Start with the workflow"
  title="Bring the workflow, the accounts, and the decision owner."
  description="CREATE SOMETHING maps the stack boundary and defines the first controlled path. Before implementation starts, you can see what tools may do and what stays visible."
  steps={ctaItems}
  handoff={{
    owner: 'Workflow owner',
    authority: 'Owned stack boundary',
    proof: 'Controlled path + decision states',
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
  .stack-proof-pair {
    display: grid;
    gap: clamp(1.25rem, 3vw, 2.5rem);
  }

  .stack-proof-pair section {
    display: grid;
    gap: 0.8rem;
  }

  .stack-proof-pair h4 {
    margin: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
  }
</style>
