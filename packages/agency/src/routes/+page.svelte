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
    ClearUseCaseBand,
    SEO,
    type ClearActionFooterItem,
    type ClearCardItem,
    type ClearContentHighlight,
    type ClearMetadataGroup,
    type ClearPillarItem,
    type ClearPlatformHeroProof,
    type ClearProofItem,
    type ClearQuoteMetric,
    type ClearReceipt,
    type ClearSecurityItem,
    type ClearSecurityLog,
    type ClearUseCaseItem
  } from '@create-something/canon';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import HeroTrustArtifact from '$lib/components/HeroTrustArtifact.svelte';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Trust Map',
      description:
        'A fixed first map of the workflow, object model, action boundary, approval path, and first safe delegation point.',
      type: 'Entry wedge',
      price: 'Fixed scope',
      priceDescription: 'Map before any build decision'
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
        'The Workflow Trust Layer: scoped actions, approval states, release checks, and incident loops once delegated work touches revenue or customer trust.',
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
      question: 'What is Delegated Work Control?',
      answer:
        'Delegated Work Control is the operating boundary around delegated work: source systems, owners, scoped actions, approval states, stop conditions, and receipts.'
    },
    {
      question: 'What is a Workflow Trust Layer?',
      answer:
        'A Workflow Trust Layer is the current service path for one workflow: map the work, build the first safe delegation path, and keep evidence visible.'
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

  const heroProofItems: ClearPlatformHeroProof[] = [
    {
      value: 'Run',
      label: 'Safe actions move\ninside the lane.'
    },
    {
      value: 'Wait',
      label: 'Judgment calls pause\nfor the owner.'
    },
    {
      value: 'Stop',
      label: 'Outside work stops\nwith a reason.'
    },
    {
      value: 'Prove',
      label: 'Receipts name the\nowner and outcome.'
    }
  ];

  const painCards: ClearCardItem[] = [
    {
      eyebrow: 'Trust gap',
      icon: 'warning',
      title: 'Your tools can act before the workflow is safe',
      detail:
        'AI tools, automations, and connectors can move work. The risk is unclear owners, unsafe writes, missing approvals, hidden credentials, and no receipt when the work moves.'
    },
    {
      eyebrow: 'Buyer pain',
      icon: 'user',
      title: 'Someone still has to babysit the edge cases',
      detail:
        'The workflow touches customers, revenue, production, credentials, or approvals, so the team keeps watching instead of safely delegating.'
    },
    {
      eyebrow: 'First answer',
      icon: 'check',
      title: 'Make one risky workflow inspectable',
      detail:
        'Start by defining what can run, what waits, what stops, who decides, and what proof survives the handoff.'
    }
  ];

  const founderCredibility: ClearCardItem[] = [
    {
      eyebrow: 'Built by',
      icon: 'user',
      title: 'Micah Johnson, Senior Systems Architect at Webflow',
      detail:
        'Experience across marketplace systems, internal tooling, onboarding systems, Salesforce, HubSpot, Notion, Slack, Procore, and production handoffs.',
      href: '/about',
      points: ['Founder-led service', 'Risk reduction through real systems work']
    }
  ];

  const serviceFlowPillars: ClearPillarItem[] = [
    {
      eyebrow: '01 Map',
      title: 'Bring one workflow',
      detail:
        'Start with the support recovery, customer-trust, revenue, or production handoff your team already protects by hand.',
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
        'Wrap delegated work with decision rules, receipts, recovery notes, and accountable ownership.',
      proof:
        'Output: monthly control plan for work that touches revenue, customers, or production.',
      links: [{ label: 'See stack boundary', href: '/stack' }]
    }
  ];

  const useCases: ClearUseCaseItem[] = [
    {
      title: 'Address fix: run',
      detail:
        'The order is unfulfilled, the address validates, and the only write is a fulfillment note plus customer-safe confirmation.'
    },
    {
      title: 'Delayed order credit: wait',
      detail:
        'The agent verifies carrier status and drafts the recovery note, but the credit touches revenue and waits for the owner.'
    },
    {
      title: 'Refund exception: stop',
      detail:
        'The refund exceeds the support lane, so the workflow blocks the money movement and opens an owner handoff with facts attached.'
    },
    {
      title: 'Account change: wait',
      detail:
        'The workflow can collect account context and draft the change note, but permissions or commercial impact require named approval.'
    },
    {
      title: 'Shipment issue: run',
      detail:
        'Carrier status, warehouse cutoff, and case state can be inspected before the customer receives a verified update.'
    },
    {
      title: 'Sensitive claim: stop',
      detail:
        'If the evidence is incomplete, the workflow stops before making a client-facing promise the team cannot defend.'
    }
  ];

  const buyerLanes: ClearCardItem[] = [
    {
      eyebrow: 'Customer trust',
      icon: 'check',
      title: 'Support work needs safe recovery',
      detail:
        'The default wedge: order, payment, case, shipment, or account context must be inspected before anything touches the customer.',
      href: '/contact?source=lane&intent=workflow-mapping&lane=reliability_and_control',
      points: [
        'First run: run, wait, or stop with a reason',
        'Proof: approval note, blocked-state record, and customer-safe draft'
      ]
    },
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

  const clientKeeps: ClearCardItem[] = [
    {
      eyebrow: 'Accounts',
      icon: 'user',
      title: 'Source systems stay client-owned',
      detail:
        'Accounts, business context, data rights, approval authority, and final operating decisions stay with the team that owns the work.'
    },
    {
      eyebrow: 'Access',
      icon: 'check',
      title: 'Least privilege before speed',
      detail:
        'The map names which systems are read, which writes are allowed, and where execution must stop for approval.'
    },
    {
      eyebrow: 'Evidence',
      icon: 'document',
      title: 'Receipts travel with the workflow',
      detail:
        'Validation output, blocked-state records, release notes, and rollback notes stay close to the operating path.'
    }
  ];

  const commitmentCards: ClearCardItem[] = [
    {
      eyebrow: 'First offer',
      icon: 'search',
      title: 'Workflow Trust Map',
      detail:
        'Most first engagements begin with a fixed-scope map before any build decision.',
      points: [
        'You leave with the workflow map, owner map, action boundary, and first receipt plan',
        'If the map does not show a safe delegation path, the work stops there'
      ],
      href: agencyCoreMessaging.selfMapHref
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
  title="Delegated Work Control | CREATE SOMETHING .agency"
  description="CREATE SOMETHING makes delegated work trustworthy: one workflow map, one safe delegation path, clear approvals, stop states, decision owners, and receipts."
  keywords="delegated work control, workflow trust layer, governed workflow infrastructure, safe AI workflow delegation, agent workflow controls, workflow pilot, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Make one risky workflow safe to delegate."
    description="CREATE SOMETHING maps what can run, what waits for approval, what must stop, and what evidence proves the work before agents or automations touch customers, revenue, production, or credentials."
    proofItems={heroProofItems}
    hideAsideOnMobile={true}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        Map one workflow
      </Button>
      <Button href="/products" variant="secondary">
        See proof
      </Button>
    {/snippet}

    {#snippet aside()}
      <HeroTrustArtifact />
    {/snippet}
  </ClearPlatformHero>

  <ClearPageSection
    variant="white"
    eyebrow="The pain"
    title="The problem is not capability. The problem is trust."
    description="Your team already has AI tools, automations, and connectors. The missing layer is the operating boundary around delegated work."
  >
    {#snippet after()}
      <ClearCardGrid items={painCards} columns={3} ariaLabel="Delegated work buyer pain" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection variant="soft" eyebrow="Credibility" title="Founder-led systems work.">
    {#snippet after()}
      <ClearCardGrid items={founderCredibility} columns={1} ariaLabel="Founder credibility" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    id="workflow-pattern"
    variant="white"
    layout="split"
    eyebrow="Default wedge"
    title="Start with support recovery and customer-trust work."
    description="Support recovery is easy to understand and hard to fake: cases, orders, payments, shipments, accounts, customer promises, revenue decisions, and visible receipts."
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

  <ClearUseCaseBand
    id="use-cases"
    eyebrow="Run / wait / stop"
    title="Support recovery makes the boundary obvious."
    description="The same workflow can contain safe actions, approval-needed actions, and hard stops. The control layer makes those states visible before anything touches the customer."
    items={useCases}
    ariaLabel="Controlled workflow use cases"
  />

  <ClearPageSection
    id="service-flow"
    variant="white"
    eyebrow="Service path"
    title="Map one workflow. Pilot the safe path. Control live risk."
    description="The process stays narrow until the first safe delegation point is visible, proven, and owned."
  >
    {#snippet after()}
      <ClearPillarGrid items={serviceFlowPillars} ariaLabel="CREATE SOMETHING service flow" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="soft"
    eyebrow="What the client keeps"
    title="You keep control. The workflow gets clearer."
    description="Accounts, access, secrets, approvals, and evidence stay explicit so the delegated workflow does not become another mystery stack."
  >
    {#snippet after()}
      <ClearCardGrid items={clientKeeps} columns={3} ariaLabel="Client-owned workflow boundary" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="white"
    eyebrow="Atlas entry point"
    title="The map is the productized wedge."
    description="Atlas turns the workflow into an inspectable artifact: human tasks, AI tasks, system operations, source data, constraints, touchpoints, owners, stop conditions, and receipts."
  >
    {#snippet after()}
      <PublicAtlasStoryCanvas
        starterId="marketplace-review-queue"
        storyId="home-support-recovery-atlas-story"
        eyebrow="Workflow Trust Map"
        title="A buyer should see the boundary before the build."
        description="This read-only Atlas canvas shows how a workflow becomes safe to discuss: source state, allowed action, approval owner, hard stop, and receipt surface."
        compact
      />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="soft"
    eyebrow="Buyer lanes"
    title="Choose the workflow before choosing the tools."
    description="The fastest path is a known workflow, a named business risk, and one controlled delegation that proves whether the service should expand."
  >
    {#snippet after()}
      <ClearCardGrid items={buyerLanes} columns={3} ariaLabel="Workflow buyer lanes" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="soft"
    eyebrow="Receipts"
    title="Visitors should see the operating path."
    description="Every delivery page separates the public story, private evidence, and clear rules for what delegated work is allowed to do."
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
    title="Control belongs in the workflow, not in fine print."
    description="The workflow names the network boundary, credential boundary, policy boundary, and audit boundary before delegated work acts."
    items={securityItems}
    logs={securityLogs}
    ariaLabel="Controlled workflow trust controls"
  />

  <ClearContentHighlights
    eyebrow="Delivery proof"
    title="Proof starts with delivery records."
    description="Client-safe records show what changed, what stayed private, what the client kept, and which decision still belongs to the owner."
    items={contentHighlights}
    ariaLabel="CREATE SOMETHING proof highlights"
  />

  <ClearPageSection
    variant="soft"
    eyebrow="Commitment boundary"
    title="The first engagement should be easy to understand."
    description="The first paid step is not an open-ended automation project. It is a fixed-scope Workflow Trust Map that decides whether the workflow has a safe delegation path."
  >
    {#snippet after()}
      <ClearCardGrid items={commitmentCards} columns={1} ariaLabel="Workflow Trust Map commitment" />
    {/snippet}
  </ClearPageSection>

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

  .home-pilot :global(.clear-platform-hero__proof span) {
    white-space: pre-line;
  }
</style>
