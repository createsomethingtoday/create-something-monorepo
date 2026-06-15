<script lang="ts">
  import { onMount } from 'svelte';
  import GovernedWorkflowVisual from './GovernedWorkflowVisual.svelte';

  type CheckTone = 'pass' | 'warn' | 'halt';
  type DecisionTone = 'allow' | 'review' | 'block';

  type Scenario = {
    id: string;
    label: string;
    prompt: string;
    summary: string;
    result: string;
    decision: DecisionTone;
    objects: string[];
    tools: string[];
    checks: Array<{ label: string; tone: CheckTone }>;
    receipts: string[];
  };

  type ScenarioDetail = {
    searchQuery: string;
    toolMatches: Array<{ system: string; name: string; detail: string; matched?: boolean }>;
    plan: string[];
    warnings: string[];
    connections: Array<{ name: string; scope: string; tone: DecisionTone }>;
    executeTool: string;
    executeFields: Array<{ key: string; value: string }>;
    agentConfig: Array<{ key: string; value: string }>;
    sandbox: Array<{ label: string; value: string; tone: CheckTone }>;
    response: string;
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    scenarios?: Scenario[];
  };

  const DEFAULT_SCENARIOS: Scenario[] = [
    {
      id: 'address-correction',
      label: 'Address Fix',
      prompt:
        'A customer corrects the shipping address before fulfillment cutoff. Update the order note, notify the warehouse, and send confirmation.',
      summary:
        'The workflow can run automatically because the order has not shipped and the only write is a bounded fulfillment note.',
      result: 'Auto-allow within cutoff',
      decision: 'allow',
      objects: ['Customer', 'Order', 'Shipment', 'Case'],
      tools: ['Shopify', 'Warehouse', 'Zendesk', 'Slack'],
      checks: [
        { label: 'Order is paid and still unfulfilled', tone: 'pass' },
        { label: 'Address format and service zone validated', tone: 'pass' },
        { label: 'Write scope limited to fulfillment note and customer reply', tone: 'pass' }
      ],
      receipts: ['order-change-log.json', 'warehouse-note.md', 'customer-confirmation.md']
    },
    {
      id: 'delayed-order',
      label: 'Delayed Order',
      prompt:
        'A VIP order missed the promised delivery date. Verify carrier status, draft the apology, and prepare a goodwill credit.',
      summary:
        'The workflow can verify facts and draft the response, but the credit touches revenue and waits for the account owner.',
      result: 'Needs approval for credit',
      decision: 'review',
      objects: ['Customer', 'Order', 'Shipment', 'Payment'],
      tools: ['Zendesk', 'Shopify', 'Carrier API', 'Stripe'],
      checks: [
        { label: 'Delivery miss confirmed against promised date', tone: 'pass' },
        { label: 'Draft uses approved recovery language', tone: 'pass' },
        { label: 'Goodwill credit crosses revenue threshold', tone: 'warn' }
      ],
      receipts: ['shipment-snapshot.json', 'reply-draft.md', 'credit-approval-note.md']
    },
    {
      id: 'refund-exception',
      label: 'Refund Exception',
      prompt:
        'A customer asks for a full refund after delivery while the chargeback window is still open.',
      summary:
        'The workflow stops before moving money because the request exceeds the lane boundary and needs owner judgment.',
      result: 'Blocked with reason code',
      decision: 'block',
      objects: ['Customer', 'Order', 'Payment', 'Case'],
      tools: ['Stripe', 'Zendesk', 'CRM', 'Slack'],
      checks: [
        { label: 'Refund exceeds approved support threshold', tone: 'halt' },
        { label: 'Chargeback risk requires owner review', tone: 'halt' },
        { label: 'Support handoff opened with facts attached', tone: 'warn' }
      ],
      receipts: ['blocked-state.json', 'payment-risk-note.md', 'owner-handoff.md']
    }
  ];

  const SCENARIO_DETAILS: Record<string, ScenarioDetail> = {
    'address-correction': {
      searchQuery: 'find order, validate address, notify warehouse',
      toolMatches: [
        {
          system: 'SHOPIFY',
          name: 'ORDER_UPDATE_NOTE',
          detail: 'Bounded write to fulfillment note',
          matched: true
        },
        {
          system: 'WAREHOUSE',
          name: 'FULFILLMENT_HOLD_CHECK',
          detail: 'Cutoff and service-zone verification',
          matched: true
        },
        {
          system: 'ZENDESK',
          name: 'CASE_REPLY_DRAFT',
          detail: 'Customer-safe confirmation'
        }
      ],
      plan: ['Read order and fulfillment state', 'Validate corrected address', 'Write note and notify owner'],
      warnings: ['No payment write requested', 'No shipped package mutation'],
      connections: [
        { name: 'Shopify', scope: 'read order / write note', tone: 'allow' },
        { name: 'Warehouse', scope: 'read cutoff / notify', tone: 'allow' },
        { name: 'Zendesk', scope: 'draft reply only', tone: 'allow' }
      ],
      executeTool: 'SHOPIFY_ORDER_UPDATE_NOTE',
      executeFields: [
        { key: 'order', value: '#CS-10483' },
        { key: 'write', value: 'fulfillment_note' },
        { key: 'notify', value: 'warehouse_ops' }
      ],
      agentConfig: [
        { key: 'AGENT', value: 'Support Recovery' },
        { key: 'MODEL', value: 'reviewed draft' },
        { key: 'LANE', value: 'auto-allow' }
      ],
      sandbox: [
        { label: 'objects named', value: '4', tone: 'pass' },
        { label: 'scope checked', value: '3/3', tone: 'pass' },
        { label: 'receipt files', value: '3', tone: 'pass' }
      ],
      response:
        'Address update is safe to run: order is paid, unfulfilled, and the only write is a fulfillment note plus customer confirmation.'
    },
    'delayed-order': {
      searchQuery: 'carrier miss, apology draft, goodwill credit',
      toolMatches: [
        {
          system: 'CARRIER',
          name: 'SHIPMENT_STATUS_READ',
          detail: 'Confirm promised-date miss',
          matched: true
        },
        {
          system: 'ZENDESK',
          name: 'RECOVERY_REPLY_DRAFT',
          detail: 'Approved recovery language',
          matched: true
        },
        {
          system: 'STRIPE',
          name: 'CREDIT_CREATE',
          detail: 'Revenue write requires owner approval'
        }
      ],
      plan: ['Confirm carrier status', 'Draft apology with facts', 'Route credit to account owner'],
      warnings: ['Credit exceeds support lane', 'Customer is marked VIP'],
      connections: [
        { name: 'Carrier API', scope: 'read tracking', tone: 'allow' },
        { name: 'Zendesk', scope: 'draft reply', tone: 'allow' },
        { name: 'Stripe', scope: 'credit write', tone: 'review' }
      ],
      executeTool: 'STRIPE_CREDIT_PREPARE',
      executeFields: [
        { key: 'customer', value: 'VIP account' },
        { key: 'amount', value: 'needs approval' },
        { key: 'owner', value: 'account_manager' }
      ],
      agentConfig: [
        { key: 'AGENT', value: 'Support Recovery' },
        { key: 'MODEL', value: 'reviewed draft' },
        { key: 'LANE', value: 'approval' }
      ],
      sandbox: [
        { label: 'facts verified', value: '2', tone: 'pass' },
        { label: 'approval notes', value: '1', tone: 'warn' },
        { label: 'receipt files', value: '3', tone: 'pass' }
      ],
      response:
        'Facts are ready and the apology can be drafted. The goodwill credit waits for the account owner because it touches revenue.'
    },
    'refund-exception': {
      searchQuery: 'post-delivery refund, chargeback risk, stop lane',
      toolMatches: [
        {
          system: 'STRIPE',
          name: 'REFUND_CREATE',
          detail: 'Blocked outside support threshold'
        },
        {
          system: 'CRM',
          name: 'OWNER_HANDOFF',
          detail: 'Open owner review with facts',
          matched: true
        },
        {
          system: 'ZENDESK',
          name: 'CASE_STATUS_UPDATE',
          detail: 'Pause customer-facing action',
          matched: true
        }
      ],
      plan: ['Read payment and case history', 'Stop refund write', 'Create owner handoff'],
      warnings: ['Full refund after delivery', 'Chargeback window open'],
      connections: [
        { name: 'Stripe', scope: 'refund write', tone: 'block' },
        { name: 'CRM', scope: 'owner handoff', tone: 'allow' },
        { name: 'Zendesk', scope: 'status update', tone: 'review' }
      ],
      executeTool: 'CRM_OWNER_HANDOFF_CREATE',
      executeFields: [
        { key: 'reason', value: 'refund_threshold' },
        { key: 'payment', value: 'read_only_snapshot' },
        { key: 'status', value: 'blocked' }
      ],
      agentConfig: [
        { key: 'AGENT', value: 'Support Recovery' },
        { key: 'MODEL', value: 'reviewed draft' },
        { key: 'LANE', value: 'blocked' }
      ],
      sandbox: [
        { label: 'blocked writes', value: '1', tone: 'halt' },
        { label: 'handoff opened', value: '1', tone: 'pass' },
        { label: 'receipt files', value: '3', tone: 'warn' }
      ],
      response:
        'Refund creation is blocked. The workflow records the reason, attaches the payment snapshot, and opens the owner handoff.'
    }
  };

  let {
    eyebrow = 'Customer Recovery Desk',
    title = 'Order issues become action states',
    description = 'The console tracks the customer, order, shipment, payment, and case before deciding what can run, what needs approval, and what must stop.',
    scenarios = DEFAULT_SCENARIOS
  }: Props = $props();

  let activeIndex = $state(0);
  let userSelectedScenario = $state(false);
  const activeScenario = $derived(scenarios[activeIndex] ?? scenarios[0] ?? DEFAULT_SCENARIOS[0]);
  const activeDetails = $derived(
    SCENARIO_DETAILS[activeScenario.id] ?? SCENARIO_DETAILS['address-correction']
  );

  function selectScenario(index: number) {
    userSelectedScenario = true;
    activeIndex = index;
  }

  onMount(() => {
    if (scenarios.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = window.setInterval(() => {
      if (userSelectedScenario) return;
      activeIndex = (activeIndex + 1) % scenarios.length;
    }, 4200);

    return () => window.clearInterval(interval);
  });
</script>

<div class="workbench">
  <div class="workbench__bar">
    <div class="workbench__bar-copy">
      <span class="workbench__overline">Workflow control</span>
      <strong>Support recovery run</strong>
    </div>
    <span class={`status-chip ${activeScenario.decision}`} aria-live="polite">
      {activeScenario.decision === 'allow'
        ? 'Auto-allow'
        : activeScenario.decision === 'review'
          ? 'Needs review'
          : 'Blocked'}
    </span>
  </div>

  <div class="workbench__body">
    <aside class="scenario-panel" aria-label="Workflow scenarios">
      <span class="console-label">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>

      <div class="scenario-tabs" role="tablist" aria-label="Workflow scenarios">
        {#each scenarios as scenario, index}
          <button
            type="button"
            role="tab"
            class="scenario-tab"
            class:selected={index === activeIndex}
            aria-selected={index === activeIndex}
            onclick={() => selectScenario(index)}
          >
            <span class="scenario-tab__label">{scenario.label}</span>
            <span class="scenario-tab__summary">{scenario.result}</span>
          </button>
        {/each}
      </div>
    </aside>

    <section
      class={`workflow-image workflow-image--${activeScenario.decision}`}
      aria-label="Governed workflow product view"
    >
      <div class="workflow-image__copy">
        <span class="console-label">Current request</span>
        <h4>{activeScenario.label}</h4>
        <p>{activeScenario.prompt}</p>
      </div>

      <div class="workflow-visual-frame">
        <GovernedWorkflowVisual
          decision={activeScenario.decision}
          matches={activeDetails.toolMatches.filter((tool) => tool.matched).length}
          receipts={activeScenario.receipts.length}
        />
      </div>
    </section>

    <aside class="evidence-panel" aria-label="Workflow evidence">
      <div class="evidence-block">
        <span class="console-label">Objects</span>
        <div class="chip-list">
          {#each activeScenario.objects as object}
            <span>{object}</span>
          {/each}
        </div>
      </div>

      <div class="evidence-block">
        <span class="console-label">Connected tools</span>
        <div class="connection-list">
          {#each activeDetails.connections as connection}
            <div class="connection-row">
              <span class={`connection-dot ${connection.tone}`}></span>
              <div>
                <strong>{connection.name}</strong>
                <span>{connection.scope}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="evidence-block">
        <span class="console-label">Receipt files</span>
        <div class="receipt-list">
          {#each activeScenario.receipts as receipt}
            <span>{receipt}</span>
          {/each}
        </div>
      </div>
    </aside>

    <section class="sandbox-panel" aria-label="Workflow evidence trail">
      <div class="console-row">
        <span class="console-label">workflow_trace</span>
        <span class="session-id">sandbox - receipts attached</span>
      </div>
      <div class="sandbox-grid">
        {#each activeScenario.checks as check, index}
          <div class="sandbox-cell">
            <span class={`run-dot ${check.tone}`}></span>
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <span>{check.label}</span>
          </div>
        {/each}
        {#each activeDetails.sandbox as item}
          <div class="sandbox-cell">
            <span class={`run-dot ${item.tone}`}></span>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .workbench {
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--color-clear-border-strong, #cecece);
    border-radius: 8px;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    box-shadow: var(--shadow-clear-restraint, 0 4px 20px rgba(0, 0, 0, 0.06));
  }

  .workbench__bar {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.15rem;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
  }

  .workbench__bar-copy {
    display: grid;
    gap: 0.18rem;
    min-width: 0;
  }

  .workbench__overline,
  .console-label,
  .session-id {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .workbench__bar-copy strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1rem;
    font-weight: var(--font-medium);
    line-height: 1.1;
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2rem;
    padding: 0.42rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #ffffff;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .status-chip.allow {
    background: var(--color-clear-moss, #1e3c2c);
    border-color: var(--color-clear-moss, #1e3c2c);
  }

  .status-chip.review {
    background: var(--color-clear-onyx, #0a0e19);
    border-color: var(--color-clear-onyx, #0a0e19);
  }

  .status-chip.block {
    background: var(--color-clear-stop, #c41e3a);
    border-color: var(--color-clear-stop, #c41e3a);
  }

  .workbench__body {
    display: grid;
    grid-template-areas:
      'scenario visual evidence'
      'trace trace trace';
    grid-template-columns: minmax(16rem, 0.82fr) minmax(32rem, 1.72fr) minmax(16rem, 0.82fr);
    gap: 1rem;
    padding: 1rem;
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3.5rem 3.5rem,
      var(--color-clear-porcelain, #f9f9f9);
  }

  .scenario-panel,
  .evidence-panel,
  .sandbox-panel {
    min-width: 0;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 8px;
    background: var(--color-clear-panel, #ffffff);
  }

  .scenario-panel {
    grid-area: scenario;
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr);
    align-content: start;
    gap: 0.9rem;
    padding: 1rem;
  }

  .scenario-panel h3,
  .workflow-image__copy h4 {
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-weight: var(--font-medium);
    line-height: 1.1;
  }

  .scenario-panel h3 {
    font-size: 1.35rem;
  }

  .scenario-panel p,
  .workflow-image__copy p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .scenario-tabs {
    display: grid;
    gap: 0.5rem;
    align-self: stretch;
  }

  .scenario-tab {
    position: relative;
    overflow: hidden;
    display: grid;
    gap: 0.24rem;
    min-height: 4.25rem;
    padding: 0.78rem 0.82rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    text-align: left;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .scenario-tab:hover,
  .scenario-tab:focus-visible {
    border-color: var(--color-clear-border-strong, #cecece);
  }

  .scenario-tab.selected {
    border-color: var(--color-clear-ocean, #0048ff);
    background: color-mix(in srgb, var(--color-clear-pill-active, #cad7fa) 42%, white);
  }

  .scenario-tab.selected::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 0.2rem;
    background: var(--color-clear-ocean, #0048ff);
  }

  .scenario-tab__label {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.9rem;
    font-weight: var(--font-medium);
    line-height: 1.2;
  }

  .scenario-tab__summary {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    line-height: 1.35;
    text-transform: uppercase;
  }

  .workflow-image {
    --workflow-accent: var(--color-clear-pastel-blue, #afc1fd);
    --workflow-surface: #dfe6ff;
    grid-area: visual;
    display: grid;
    grid-template-columns: minmax(13rem, 0.58fr) minmax(25rem, 1fr);
    gap: clamp(1rem, 2.2vw, 1.45rem);
    align-items: center;
    min-width: 0;
    min-height: 28.75rem;
    padding: clamp(1.25rem, 2.1vw, 1.7rem);
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--workflow-accent) 74%, var(--color-clear-onyx, #0a0e19));
    border-radius: 8px;
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.05) 1px, transparent 1px) 0 0 / 2.4rem 2.4rem,
      var(--workflow-surface);
  }

  .workflow-image--allow {
    --workflow-accent: var(--color-clear-pistachio, #dbefdb);
    --workflow-surface: var(--color-clear-frosted-mint, #d9fff7);
  }

  .workflow-image--review {
    --workflow-accent: var(--color-clear-pastel-blue, #afc1fd);
    --workflow-surface: #dfe6ff;
  }

  .workflow-image--block {
    --workflow-accent: var(--color-clear-candy-purple, #efd4ff);
    --workflow-surface: #f7e8ff;
  }

  .workflow-image__copy {
    display: grid;
    gap: 0.8rem;
    align-content: center;
    min-width: 0;
    max-width: 19rem;
  }

  .workflow-image__copy h4 {
    font-size: 2.25rem;
    letter-spacing: 0;
  }

  .workflow-image__copy p {
    font-size: 1rem;
  }

  .workflow-visual-frame {
    position: relative;
    display: grid;
    min-width: 0;
    min-height: 24.75rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--workflow-accent) 70%, white);
    border-radius: 8px;
    background: color-mix(in srgb, var(--workflow-surface) 72%, white);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  }

  .evidence-panel {
    grid-area: evidence;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 0.9rem;
    align-content: start;
    padding: 1rem;
  }

  .evidence-block {
    display: grid;
    gap: 0.55rem;
    min-width: 0;
  }

  .chip-list,
  .receipt-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .chip-list span,
  .receipt-list span {
    display: inline-flex;
    align-items: center;
    min-height: 1.75rem;
    padding: 0.3rem 0.45rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.66rem;
    line-height: 1.15;
  }

  .connection-list {
    display: grid;
    gap: 0.5rem;
  }

  .connection-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.55rem;
    align-items: center;
    min-width: 0;
    padding: 0.6rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
  }

  .connection-row strong {
    display: block;
    overflow: hidden;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.78rem;
    font-weight: var(--font-medium);
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .connection-row span:last-child {
    color: var(--color-clear-grey, #636363);
    font-size: 0.72rem;
    line-height: 1.35;
  }

  .connection-dot,
  .run-dot {
    width: 0.48rem;
    height: 0.48rem;
    border-radius: 999px;
    background: var(--color-clear-grey-quiet, #818181);
  }

  .connection-dot.allow,
  .run-dot.pass {
    background: var(--color-clear-link-green, #397554);
  }

  .connection-dot.review,
  .run-dot.warn {
    background: var(--color-clear-onyx, #0a0e19);
  }

  .connection-dot.block,
  .run-dot.halt {
    background: var(--color-clear-stop, #c41e3a);
  }

  .console-row {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    align-items: center;
  }

  .sandbox-panel {
    grid-area: trace;
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
  }

  .sandbox-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.6rem;
    min-width: 0;
  }

  .sandbox-cell {
    display: grid;
    grid-template-columns: auto minmax(0, auto) minmax(0, 1fr);
    gap: 0.42rem;
    align-items: center;
    min-height: 3.1rem;
    min-width: 0;
    padding: 0.62rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-grey, #636363);
    font-size: 0.68rem;
    line-height: 1.25;
  }

  .sandbox-cell strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: var(--font-medium);
  }

  @media (max-width: 1160px) {
    .workbench__body {
      grid-template-areas:
        'scenario evidence'
        'visual visual'
        'trace trace';
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    .workflow-image {
      min-height: 25rem;
      grid-template-columns: minmax(12rem, 0.62fr) minmax(22rem, 1fr);
    }

    .workflow-visual-frame {
      min-height: 23rem;
    }

    .sandbox-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .workbench__bar {
      align-items: center;
      flex-direction: row;
    }

    .workbench__body {
      grid-template-areas:
        'scenario'
        'visual'
        'evidence'
        'trace';
      grid-template-columns: 1fr;
      padding: 0.72rem;
    }

    .workflow-image {
      grid-template-columns: 1fr;
      min-height: 0;
      padding: 1rem;
    }

    .workflow-visual-frame {
      min-height: 20rem;
    }

    .workflow-image__copy h4 {
      font-size: 1.6rem;
    }

    .sandbox-grid {
      grid-template-columns: 1fr;
    }

    .console-row {
      align-items: center;
      flex-direction: row;
      flex-wrap: wrap;
    }
  }

  @media (max-width: 340px) {
    .workbench__bar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
