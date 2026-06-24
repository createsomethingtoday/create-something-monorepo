<script lang="ts">
  import {
    Button,
    ClearActionFooter,
    ClearCardGrid,
    ClearContentHighlights,
    ClearMetadataRail,
    ClearPageSection,
    ClearPillarGrid,
    ClearPlatformHero,
    ClearProofStrip,
    ClearQuoteMetricPanel,
    ClearReceiptGrid,
    ClearSecurityPanel,
    ClearStateRows,
    ClearUseCaseBand,
    SEO,
    type ClearActionFooterItem,
    type ClearCardItem,
    type ClearContentHighlight,
    type ClearMetadataGroup,
    type ClearPillarItem,
    type ClearProofItem,
    type ClearQuoteMetric,
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

  const faqItems = [
    {
      question: 'What is a Workflow Trust Layer?',
      answer:
        'A Workflow Trust Layer is the operating boundary around one workflow: source systems, owners, scoped actions, approval states, stop conditions, and receipts.'
    },
    {
      question: 'Where does CREATE SOMETHING start?',
      answer:
        'The work starts with one manual workflow your team still protects by hand, then maps the first safe delegation path before expanding automation.'
    },
    {
      question: 'What do clients leave with?',
      answer:
        'Clients leave with a visible workflow map, action boundary, approval path, run/wait/stop states, and evidence that a team can inspect.'
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
      proof:
        'Output: monthly control plan for work that touches revenue, customers, or production.',
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
      title: 'Route inbound leads',
      detail: 'Classify the request, enrich the record, assign the owner, and leave the next action.'
    },
    {
      title: 'Recover support cases',
      detail: 'Inspect the case, order, shipment, and payment before any customer-facing action.'
    },
    {
      title: 'Approve credits or refunds',
      detail: 'Let safe drafts move quickly while revenue-touching decisions wait for the owner.'
    },
    {
      title: 'Verify launches',
      detail: 'Run checks, gather proof, and keep release evidence with the delivery record.'
    },
    {
      title: 'Triage production issues',
      detail: 'Read monitoring context, classify severity, and route the next action.'
    },
    {
      title: 'Reconcile system records',
      detail: 'Compare source systems, identify drift, and stop before writing uncertain data.'
    },
    {
      title: 'Prepare owner updates',
      detail: 'Turn workflow state into a concise brief with decisions, blockers, and evidence.'
    },
    {
      title: 'Move backlog work',
      detail: 'Claim scoped tasks only when the owner, policy, and verification path are visible.'
    }
  ];

  const buyerLanes: ClearCardItem[] = [
    {
      eyebrow: 'Revenue ops',
      icon: 'refresh',
      title: 'Leads or handoffs stall after intake',
      detail:
        'Map the first lane where context disappears, ownership gets fuzzy, or follow-up slows down revenue.',
      href: '/contact?source=lane&intent=workflow-teardown&lane=workflow_infrastructure',
      points: [
        'First run: classify, summarize, route, or draft',
        'Proof: source record, owner handoff, and next action receipt'
      ]
    },
    {
      eyebrow: 'Customer trust',
      icon: 'check',
      title: 'Support work needs safe recovery',
      detail:
        'Use when order, payment, case, or account context must be inspected before anything touches the customer.',
      href: '/contact?source=lane&intent=workflow-mapping&lane=reliability_and_control',
      points: [
        'First run: run, wait, or stop with a reason',
        'Proof: approval note, blocked-state record, and customer-safe draft'
      ]
    },
    {
      eyebrow: 'Delivery ops',
      icon: 'document',
      title: 'Client or production work needs receipts',
      detail:
        'Use when builds, launches, or handoffs need visible status without exposing credentials, raw logs, or private client data.',
      href: '/contact?source=lane&intent=workflow-teardown&lane=workflow_infrastructure',
      points: [
        'First run: release evidence, handoff surface, or owner queue',
        'Proof: delivery page, validation output, and rollback note'
      ]
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

  const proofStripItems: ClearProofItem[] = [
    {
      value: 'Run / wait / stop',
      label: 'Execution states are visible before an agent acts.'
    },
    {
      value: '4 receipts',
      label: 'The map, boundary, delivery page, and private evidence stay separate.'
    },
    {
      value: 'No secret spill',
      label: 'Public proof surfaces avoid credentials, raw logs, and private client data.'
    },
    {
      value: 'Owner handoff',
      label: 'Blocked work names the decision owner and the reason it stopped.'
    }
  ];

  const quoteMetrics: ClearQuoteMetric[] = [
    {
      value: '1',
      label: 'Workflow at a time',
      detail: 'The service starts with a named manual handoff instead of a broad platform pitch.'
    },
    {
      value: '3',
      label: 'Action states',
      detail: 'Run, wait, and stop turn policy into inspectable product behavior.'
    },
    {
      value: '4',
      label: 'Evidence artifacts',
      detail: 'Map, boundary, delivery page, and private receipt define the proof package.'
    },
    {
      value: '0',
      label: 'Unbounded writes',
      detail: 'The trust layer names which systems can be touched before execution.'
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
  title="Workflow Trust Layer | CREATE SOMETHING .agency"
  description="CREATE SOMETHING fixes the workflow your team still protects by hand: one map, one safe delegation path, clear approvals, stop states, and receipts."
  keywords="workflow trust layer, governed workflow infrastructure, safe AI workflow delegation, agent workflow controls, workflow pilot, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Fix the workflow your team still protects by hand."
    description="CREATE SOMETHING maps one business workflow, builds the first safe delegation path, and leaves approvals, stop states, and receipts before anything touches the customer, revenue, or production."
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.tryMapLabel}
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

  <ClearPageSection
    id="service-flow"
    variant="white"
    eyebrow="Service path"
    title="Start narrow. Expand only when the workflow earns it."
    description="Bring one real workflow, leave with a visible operating path, and add the trust layer only when live work needs more control."
  >
    {#snippet after()}
      <ClearPillarGrid items={serviceFlowPillars} ariaLabel="CREATE SOMETHING service flow" />
    {/snippet}
  </ClearPageSection>

  <ClearUseCaseBand
    id="use-cases"
    eyebrow="Concrete work first"
    title="Start with tasks an operator already recognizes."
    description="The agent capability stays tied to business work: the handoffs, approvals, launches, and recovery loops your team already manages."
    items={useCases}
    ariaLabel="Controlled workflow use cases"
  />

  <ClearPageSection
    variant="soft"
    eyebrow="Buyer lanes"
    title="Pick the business lane before picking the tool."
    description="The fastest path is not a platform demo. It is a known workflow, a named business risk, and the first controlled run that proves the service should expand."
  >
    {#snippet after()}
      <ClearCardGrid items={buyerLanes} columns={3} ariaLabel="Workflow buyer lanes" />
    {/snippet}
  </ClearPageSection>

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
      <div class="home-proof-stack">
        <ClearReceiptGrid receipts={deliveryReceipts} ariaLabel="Delivery receipts" />
        <ClearProofStrip items={proofStripItems} ariaLabel="Workflow proof artifacts" />
      </div>
    {/snippet}
  </ClearPageSection>

  <ClearQuoteMetricPanel
    eyebrow="Proof contract"
    quote="Policy is an artifact."
    source="CREATE SOMETHING operating rule"
    metrics={quoteMetrics}
    ariaLabel="Workflow control proof metrics"
  />

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

  .home-proof-stack {
    display: grid;
    gap: 0.85rem;
  }
</style>
