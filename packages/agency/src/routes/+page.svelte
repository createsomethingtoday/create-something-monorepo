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
    ClearQuoteMetricPanel,
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
      name: 'Workflow System',
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

  const platformPillars: ClearPillarItem[] = [
    {
      eyebrow: 'Agents',
      title: 'Background workflow runs',
      detail:
        'Delegate bounded work after the object, action, owner, and stop condition are known.',
      proof: 'Reads, drafts, writes, and notifications stay scoped to the lane.',
      links: [{ label: 'See states', href: '#workflow-pattern' }]
    },
    {
      eyebrow: 'Automations',
      title: 'Repeatable triggers',
      detail:
        'Turn manual recovery, verification, and review loops into clear starts, waits, and exits.',
      proof: 'Every trigger is paired with approval rules and evidence output.',
      links: [{ label: 'See tasks', href: '#use-cases' }]
    },
    {
      eyebrow: 'Environments',
      title: 'Connected operating context',
      detail:
        'Run with the systems the work already depends on: CRM, ticketing, payments, delivery, code, and logs.',
      proof: 'The agent sees enough to act without receiving unchecked access.',
      links: [{ label: 'See console', href: '#workflow-pattern' }]
    },
    {
      eyebrow: 'Guardrails',
      title: 'Runtime trust controls',
      detail:
        'Name what can run, what waits for a human, and what stops before risk is hidden.',
      proof: 'Receipts turn each handoff into a reviewable artifact.',
      links: [{ label: 'See trust layer', href: '#trust-layer' }]
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
      label: 'Trust boundary',
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

  const quoteMetrics: ClearQuoteMetric[] = [
    {
      value: '3',
      label: 'Action states',
      detail: 'Every run resolves to run, wait, or stop.'
    },
    {
      value: '4',
      label: 'Operating primitives',
      detail: 'Objects, actions, states, and receipts define the surface.'
    },
    {
      value: '2',
      label: 'Proof surfaces',
      detail: 'Client-safe delivery and private command evidence stay separate.'
    },
    {
      value: '1',
      label: 'Workflow first',
      detail: 'The agent demo follows the business path, not the other way around.'
    }
  ];

  const contentHighlights: ClearContentHighlight[] = [
    {
      eyebrow: 'Delivery',
      meta: 'Client-safe',
      title: 'Delivery pages carry the operating story.',
      detail:
        'The delivery surface shows the business model, active decisions, visible proof, and next moves without exposing private secrets.',
      href: '/delivery/abundance'
    },
    {
      eyebrow: 'Evidence',
      meta: 'Private',
      title: 'Receipts keep local and production truth separate.',
      detail:
        'Command output, deploy IDs, endpoint checks, and rollback notes stay with the operator evidence trail.'
    },
    {
      eyebrow: 'Ona alignment',
      meta: 'Reusable',
      title: 'Canon now owns the platform grammar.',
      detail:
        'The clear primitives can be reused across `.agency`, delivery, and research surfaces without copying generated CSS.'
    }
  ];

  const actionFooterItems: ClearActionFooterItem[] = [
    { label: 'Bring', value: 'One manual workflow that keeps needing rescue' },
    { label: 'Map', value: 'Objects, actions, approvals, stops, and receipts' },
    { label: 'Leave', value: 'A first governed run path your team can inspect' }
  ];
</script>

<SEO
  title="Governed Agent Workflows | CREATE SOMETHING .agency"
  description="CREATE SOMETHING puts agents to work inside workflows you can govern: clear objects, scoped actions, approval paths, stop states, and receipts."
  keywords="governed agent workflows, workflow trust layer, safe AI workflow delegation, agent workflow controls, MCP wedge, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="The platform for governed agent workflows."
    description="Run operational work through agents with scoped actions, approval paths, stop conditions, and receipts before anything touches the customer, revenue, or production."
    hideAsideOnMobile={true}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
      <Button href="#workflow-pattern" variant="secondary">See the workflow</Button>
    {/snippet}

    {#snippet aside()}
      <ClearStateRows
        eyebrow="Support recovery run"
        title="What can happen now?"
        states={workflowStates}
        receipts={['blocked-state.json', 'credit-approval-note.md', 'warehouse-note.md']}
        ariaLabel="Governed workflow state example"
      />
    {/snippet}
  </ClearPlatformHero>

  <ClearLogoStrip
    eyebrow="Proof surfaces"
    items={platformSignals}
    ariaLabel="CREATE SOMETHING operating proof surfaces"
  />

  <ClearPageSection
    variant="soft"
    eyebrow="The AI operating layer"
    title="Put agents to work across the workflow. With every execution governed."
    description="The system is built from the same primitives Ona foregrounds: agents, automations, connected environments, and runtime guardrails. CREATE SOMETHING translates those into objects, actions, states, and receipts."
  >
    {#snippet after()}
      <ClearPillarGrid items={platformPillars} ariaLabel="Governed workflow platform pillars" />
    {/snippet}
  </ClearPageSection>

  <ClearUseCaseBand
    id="use-cases"
    eyebrow="Concrete work first"
    title="Start with tasks an operator already recognizes."
    description="The page leads with operational situations before abstract platform language, so the agent capability stays tied to business work."
    items={useCases}
    ariaLabel="Governed workflow use cases"
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
        ariaLabel="Governed workflow metadata"
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
    eyebrow="Runtime trust layer"
    title="Governance is part of the run, not a paragraph after it."
    description="The workflow names the network boundary, credential boundary, policy boundary, and audit boundary before an agent acts."
    items={securityItems}
    logs={securityLogs}
    ariaLabel="Governed workflow trust controls"
  />

  <ClearQuoteMetricPanel
    eyebrow="Proof model"
    quote="Agents are ready when the workflow can show what ran, what waited, and what stopped."
    source="CREATE SOMETHING workflow trust layer"
    metrics={quoteMetrics}
    ariaLabel="Governed workflow proof metrics"
  />

  <ClearContentHighlights
    eyebrow="Recent proof"
    title="The delivery surface and the evidence surface stay distinct."
    description="Ona-style clarity needs both: a simple public story for the buyer and a precise private record for operators."
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
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
      <Button href="#use-cases" variant="secondary">Review use cases</Button>
    {/snippet}
  </ClearActionFooter>
</div>

<style>
  .home-pilot {
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }
</style>
