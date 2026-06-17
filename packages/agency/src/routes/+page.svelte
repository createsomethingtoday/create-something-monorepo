<script lang="ts">
  import {
    Button,
    ClearActionFooter,
    ClearContentHighlights,
    ClearLogoStrip,
    ClearMetadataRail,
    ClearPageSection,
    ClearPillarGrid,
    ClearPlatformHero,
    ClearReceiptGrid,
    ClearSecurityPanel,
    ClearStateRows,
    ClearUseCaseBand,
    SEO,
    type ClearActionFooterItem,
    type ClearContentHighlight,
    type ClearLogoStripItem,
    type ClearMetadataGroup,
    type ClearPillarItem,
    type ClearReceipt,
    type ClearSecurityItem,
    type ClearSecurityLog,
    type ClearUseCaseItem,
    type ClearWorkflowState
  } from '@create-something/canon';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Trust Map',
      description:
        'A fixed first map of the workflow, object model, action boundary, approval path, and first safe delegation point.',
      type: 'Entry wedge',
      price: 'Custom',
      priceDescription: 'Scoped diagnostic'
    },
    {
      name: 'Workflow Pilot',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Trust Layer',
      description:
        'The trust layer: scoped actions, approval states, release checks, and incident loops once the workflow touches revenue or customer trust.',
      type: 'Workflow Control Plan',
      price: 'Custom',
      priceDescription: 'Monthly trust layer'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Cross-system control for regulated, high-volume, or multi-team workflows where auditability and recovery matter.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const workflowStates: ClearWorkflowState[] = [
    {
      tone: 'run',
      state: 'Run',
      label: 'Agent can act',
      detail: 'The order is unfulfilled and the write is limited to a warehouse note.'
    },
    {
      tone: 'wait',
      state: 'Wait',
      label: 'Owner approval needed',
      detail: 'The draft is ready, but the goodwill credit touches revenue.'
    },
    {
      tone: 'stop',
      state: 'Stop',
      label: 'Blocked with a reason',
      detail: 'The refund exceeds the support lane and opens an owner handoff.'
    }
  ];

  const platformSignals: ClearLogoStripItem[] = [
    {
      label: 'Objects',
      detail: 'Customer, order, payment, case'
    },
    {
      label: 'Actions',
      detail: 'Read, draft, write, notify'
    },
    {
      label: 'States',
      detail: 'Run, wait, stop'
    },
    {
      label: 'Receipts',
      detail: 'Delivery pages and private evidence',
      href: '/delivery/abundance'
    }
  ];

  const serviceFlowPillars: ClearPillarItem[] = [
    {
      eyebrow: '01 Map',
      title: 'Bring one workflow',
      detail:
        'Start with the manual handoff, repeated rescue, or risky workflow your team already recognizes.',
      proof: 'Output: object map, owner map, action boundary, and first receipt plan.',
      links: [{ label: agencyCoreMessaging.selfMapLabel, href: agencyCoreMessaging.selfMapHref }]
    },
    {
      eyebrow: '02 Pilot',
      title: 'Build the first safe path',
      detail:
        'Turn the workflow into scoped actions, approval-needed states, blocked states, and an operator surface.',
      proof: 'Output: working path, runbook, release evidence, and client-safe delivery page.',
      links: [{ label: 'See service path', href: '/services#service-path' }]
    },
    {
      eyebrow: '03 Control',
      title: 'Add the trust layer',
      detail:
        'Wrap live automation with decision rules, receipts, recovery notes, and accountable ownership.',
      proof: 'Output: monthly control plan for work that touches revenue, customers, or production.',
      links: [{ label: 'See stack boundary', href: '/stack' }]
    },
    {
      eyebrow: '04 Operate',
      title: 'Keep the evidence visible',
      detail:
        'Use delivery records to show what changed, what stayed private, what remains blocked, and who decides next.',
      proof: 'Output: proof surface your team can inspect without exposing secrets.',
      links: [{ label: 'See proof', href: '/products' }]
    }
  ];

  const useCases: ClearUseCaseItem[] = [
    {
      title: 'Recover support cases',
      detail: 'Inspect the case, order, shipment, and payment before any customer-facing action.'
    },
    {
      title: 'Verify merged changes',
      detail: 'Run checks, gather proof, and keep deploy evidence with the issue.'
    },
    {
      title: 'Summarize CI failures',
      detail: 'Turn failing logs into a precise owner handoff or a bounded fix path.'
    },
    {
      title: 'Triage production errors',
      detail: 'Read monitoring context, classify severity, and route the next action.'
    },
    {
      title: 'Patch vulnerable dependencies',
      detail: 'Limit package changes, run the narrow gate, and leave rollback notes.'
    },
    {
      title: 'Draft release notes',
      detail: 'Translate merged work into customer-safe changes without inventing status.'
    },
    {
      title: 'Pick up backlog work',
      detail: 'Claim scoped issues only when the policy and verification path are visible.'
    },
    {
      title: 'Migrate deprecated APIs',
      detail: 'Map every call site, make the smallest safe edit, and prove the behavior.'
    }
  ];

  const workflowMetadataGroups: ClearMetadataGroup[] = [
    {
      title: 'Primitive stack',
      items: [
        { label: 'Database', value: 'Objects and source state' },
        { label: 'Automation', value: 'Tools and run paths' },
        { label: 'Judgment', value: 'Policy and approval rules' }
      ]
    },
    {
      title: 'Control points',
      items: [
        { label: 'Run', value: 'Bounded write or notification' },
        { label: 'Wait', value: 'Human approval before revenue or trust impact' },
        { label: 'Stop', value: 'Reason-coded handoff when the lane is exceeded' }
      ]
    },
    {
      title: 'Evidence',
      items: [
        { label: 'Delivery page', value: 'Client-safe status surface' },
        { label: 'Private receipt', value: 'Commands, pass/fail output, deploy IDs' }
      ]
    }
  ];

  const deliveryReceipts: ClearReceipt[] = [
    {
      number: '01',
      label: 'Workflow map',
      detail: 'Objects, owners, source systems, handoffs, and known failure points.'
    },
    {
      number: '02',
      label: 'Control boundary',
      detail: 'What can run, what needs approval, and what must stop with a reason.'
    },
    {
      number: '03',
      label: 'Delivery page',
      detail: 'A client-safe status surface for the live workflow, decisions, and next moves.'
    },
    {
      number: '04',
      label: 'Private evidence',
      detail: 'Commands, pass/fail output, endpoints, deploy IDs, and rollback notes.'
    }
  ];

  const securityItems: ClearSecurityItem[] = [
    {
      label: 'Network',
      title: 'Named systems only',
      detail:
        'The workflow lists which systems are read, which writes are allowed, and where execution stops.'
    },
    {
      label: 'Credential',
      title: 'Scoped access before speed',
      detail:
        'Agent access is treated as an operating surface: least privilege, owner review, and rollback notes.'
    },
    {
      label: 'Policy',
      title: 'Approval rules are artifacts',
      detail:
        'The rule is not hidden in a prompt. It is written down beside the workflow, state, and receipt.'
    },
    {
      label: 'Audit',
      title: 'Receipts travel with the work',
      detail:
        'Each run leaves enough evidence for a client, operator, or reviewer to understand what happened.'
    }
  ];

  const securityLogs: ClearSecurityLog[] = [
    { label: 'Lane', value: 'support-recovery.run' },
    { label: 'Allowed writes', value: 'warehouse_note, case_reply_draft' },
    { label: 'Approval rule', value: 'revenue_touch waits for owner' },
    { label: 'Stop condition', value: 'refund_threshold exceeded' },
    { label: 'Receipt', value: 'blocked-state.json' }
  ];

  const contentHighlights: ClearContentHighlight[] = [
    {
      eyebrow: 'Delivery',
      meta: 'Abundance',
      title: 'Recruiter-gated workflow pilot.',
      detail:
        'The pilot shows the business model, agent boundary, remaining owner decisions, and visible proof without exposing private secrets.',
      href: '/delivery/abundance'
    },
    {
      eyebrow: 'Delivery',
      meta: 'ShivWorks',
      title: 'Backend handoff with named access lanes.',
      detail:
        'The handoff record separates account ownership, credentials, app admin, database state, and acceptance checks.',
      href: '/delivery/shivworks'
    },
    {
      eyebrow: 'Service',
      meta: 'Funnel',
      title: 'The flow stays narrow before it expands.',
      detail:
        'Map one workflow, pilot the safe path, then add the trust layer only when live risk justifies it.',
      href: agencyCoreMessaging.selfMapHref
    }
  ];

  const actionFooterItems: ClearActionFooterItem[] = [
    { label: 'Bring', value: 'One manual workflow that keeps needing rescue' },
    { label: 'Map', value: 'Objects, actions, approvals, stops, and receipts' },
    { label: 'Leave', value: 'A first controlled run path your team can inspect' }
  ];
</script>

<SEO
  title="Workflow Control Service | CREATE SOMETHING .agency"
  description="CREATE SOMETHING maps one manual workflow, builds the first safe agent path, and leaves your team with approvals, stop states, and delivery receipts."
  keywords="workflow control service, workflow trust layer, safe AI workflow delegation, agent workflow controls, workflow pilot, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Map one workflow. Build the first safe agent path."
    description="CREATE SOMETHING turns one repeated handoff into scoped actions, approval paths, stop conditions, and receipts before anything touches the customer, revenue, or production."
    hideAsideOnMobile={true}
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
      <ClearStateRows
        eyebrow="Support recovery run"
        title="What can happen now?"
        states={workflowStates}
        receipts={['blocked-state.json', 'credit-approval-note.md', 'warehouse-note.md']}
        ariaLabel="Controlled workflow state example"
      />
    {/snippet}
  </ClearPlatformHero>

  <ClearLogoStrip
    eyebrow="Operating proof"
    items={platformSignals}
    ariaLabel="CREATE SOMETHING operating proof surfaces"
  />

  <ClearPageSection
    id="service-flow"
    variant="white"
    eyebrow="Service flow"
    title="Map one workflow, then build only the trust layer it needs."
    description="The funnel is intentionally narrow: bring one real workflow, leave with a visible operating path, and expand only when the risk justifies more control."
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href="/services" variant="secondary">See How I Work</Button>
    {/snippet}

    {#snippet after()}
      <ClearPillarGrid items={serviceFlowPillars} ariaLabel="CREATE SOMETHING service flow" />
    {/snippet}
  </ClearPageSection>

  <ClearUseCaseBand
    id="use-cases"
    eyebrow="Concrete work first"
    title="Start with tasks an operator already recognizes."
    description="The page leads with operational situations before abstract platform language, so the agent capability stays tied to business work."
    items={useCases}
    ariaLabel="Controlled workflow use cases"
  />

  <ClearPageSection
    id="workflow-pattern"
    variant="white"
    layout="split"
    eyebrow="Execution console"
    title="Show the business case before the agent demo."
    description="Here the workflow is ecommerce support recovery: inspect the case, order, shipment, and payment state, then decide whether the action can run, needs approval, or stops."
  >
    {#snippet aside()}
      <ClearMetadataRail
        eyebrow="Workflow metadata"
        title="What the agent knows"
        description="The agent only receives the objects, tools, policies, and receipts that match the lane."
        groups={workflowMetadataGroups}
        tags={['objects', 'actions', 'states', 'receipts']}
        ariaLabel="Controlled workflow metadata"
      />
    {/snippet}

    {#snippet after()}
      <ExecutionWorkbench />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="soft"
    eyebrow="Receipts"
    title="Leave with the operating path, not another abstract workflow diagram."
    description="The delivery pages set the standard for what the work becomes: a visible business model, a private evidence trail, and clear rules for what agents can do."
  >
    {#snippet after()}
      <ClearReceiptGrid receipts={deliveryReceipts} ariaLabel="Delivery receipts" />
    {/snippet}
  </ClearPageSection>

  <ClearSecurityPanel
    id="trust-layer"
    eyebrow="Runtime control layer"
    title="Control is part of the run, not a paragraph after it."
    description="The workflow names the network boundary, credential boundary, policy boundary, and audit boundary before an agent acts."
    items={securityItems}
    logs={securityLogs}
    ariaLabel="Controlled workflow trust controls"
  />

  <ClearContentHighlights
    eyebrow="Recent proof"
    title="Proof stays tied to real delivery records."
    description="Delivery records show how the service flow becomes client-safe proof, private evidence, and a clear next decision."
    items={contentHighlights}
    ariaLabel="CREATE SOMETHING proof highlights"
  />

  <ClearActionFooter
    eyebrow="Start with one workflow"
    title={agencyCoreMessaging.workflowCtaHeading}
    description={agencyCoreMessaging.workflowCtaDetail}
    items={actionFooterItems}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </ClearActionFooter>
</div>

<style>
  .home-pilot {
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }
</style>
