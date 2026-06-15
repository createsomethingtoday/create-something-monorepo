<script lang="ts">
  import {
    Button,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    ClearReceiptGrid,
    ClearStateRows,
    SEO,
    type ClearProofItem,
    type ClearReceipt,
    type ClearWorkflowState
  } from '@create-something/canon';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import WorkflowSignalIcon from '$lib/components/WorkflowSignalIcon.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  type WorkflowSignalIconName = 'objects' | 'actions' | 'states' | 'receipts';
  type ProofMetric = ClearProofItem & { icon: WorkflowSignalIconName };

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

  const proofMetrics: ProofMetric[] = [
    { value: 'Objects', label: 'Customer, order, payment, case', icon: 'objects' },
    { value: 'Actions', label: 'Read, draft, write, notify', icon: 'actions' },
    { value: 'States', label: 'Run, wait, stop', icon: 'states' },
    { value: 'Receipts', label: 'Every handoff leaves evidence', icon: 'receipts' }
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

  function workflowIconName(icon: string | undefined): WorkflowSignalIconName {
    if (icon === 'actions' || icon === 'states' || icon === 'receipts') return icon;
    return 'objects';
  }
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
  <ClearPageSection
    variant="hero"
    layout="split"
    titleLevel="h1"
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Put agents to work inside workflows you can govern."
    description="CREATE SOMETHING turns one operational workflow into a controlled run path. The system knows the object, action, approval rule, stop condition, and receipt before an agent acts."
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
      <Button href="#workflow-pattern" variant="secondary">See The Workflow</Button>
    {/snippet}

    <p class="clear-note">
      For operators with manual support, finance, delivery, or review work that needs speed without
      losing control.
    </p>

    {#snippet aside()}
      <ClearStateRows
        eyebrow="Support recovery run"
        title="What can happen now?"
        states={workflowStates}
        receipts={['blocked-state.json', 'credit-approval-note.md', 'warehouse-note.md']}
        ariaLabel="Governed workflow state example"
      />
    {/snippet}

    {#snippet after()}
      <ClearProofStrip items={proofMetrics} ariaLabel="Workflow proof artifacts">
        {#snippet icon(metric)}
          <WorkflowSignalIcon name={workflowIconName(metric.icon)} />
        {/snippet}
      </ClearProofStrip>
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    id="workflow-pattern"
    variant="white"
    eyebrow="Concrete workflow first"
    title="Show the business case before the agent demo."
    description="Here the workflow is ecommerce support recovery: inspect the case, order, shipment, and payment state, then decide whether the action can run, needs approval, or stops."
  >
    {#snippet after()}
      <ExecutionWorkbench />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="soft"
    eyebrow="Proof after the call"
    title="Leave with the operating path, not another abstract workflow diagram."
    description="The delivery pages set the standard for what the work becomes: a visible business model, a private evidence trail, and clear rules for what agents can do."
  >
    {#snippet after()}
      <ClearReceiptGrid receipts={deliveryReceipts} ariaLabel="Delivery receipts" />
    {/snippet}
  </ClearPageSection>

  <ClearCtaBand
    eyebrow="Start with one workflow"
    title={agencyCoreMessaging.workflowCtaHeading}
    description={agencyCoreMessaging.workflowCtaDetail}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </ClearCtaBand>
</div>

<style>
  .home-pilot {
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .clear-note {
    margin: 0;
    max-width: 36rem;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.55;
  }
</style>
