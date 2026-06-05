<script lang="ts">
  import { onMount } from 'svelte';

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
  const activeScenario = $derived(scenarios[activeIndex] ?? scenarios[0] ?? DEFAULT_SCENARIOS[0]);
  const activeDetails = $derived(
    SCENARIO_DETAILS[activeScenario.id] ?? SCENARIO_DETAILS['address-correction']
  );

  function selectScenario(index: number) {
    activeIndex = index;
  }

  onMount(() => {
    if (scenarios.length <= 1) return;

    const interval = window.setInterval(() => {
      activeIndex = (activeIndex + 1) % scenarios.length;
    }, 4200);

    return () => window.clearInterval(interval);
  });
</script>

<div class="terminal-surface workbench">
  <div class="terminal-surface__bar">
    <div class="terminal-surface__dots" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span class="terminal-surface__title">workflow control room</span>
    <span class={`status-chip ${activeScenario.decision}`}>
      {activeScenario.decision === 'allow'
        ? 'Auto-allow'
        : activeScenario.decision === 'review'
          ? 'Needs review'
          : 'Blocked'}
    </span>
  </div>

  <div class="workbench__body">
    <div class="workbench__main">
      <aside class="workbench__column workbench__column--left">
        <section class="console-panel scenario-panel">
          <span class="console-label">{eyebrow}</span>
          <h3>{title}</h3>
          <p>{description}</p>

          <div class="scenario-tabs" role="tablist" aria-label="Workflow scenarios">
            {#each scenarios as scenario, index}
              <button
                type="button"
                class="scenario-tab"
                class:selected={index === activeIndex}
                aria-pressed={index === activeIndex}
                onclick={() => selectScenario(index)}
              >
                <span class="scenario-tab__label">{scenario.label}</span>
                <span class="scenario-tab__summary">{scenario.result}</span>
              </button>
            {/each}
          </div>
        </section>

        <section class="console-panel search-panel">
          <span class="console-label">cs_search_tools</span>
          <div class="search-line">
            <span aria-hidden="true">/</span>
            <span>{activeDetails.searchQuery}</span>
          </div>

          <div class="tool-list">
            {#each activeDetails.toolMatches as tool}
              <div class="tool-row" class:matched={tool.matched}>
                <span class="tool-logo">{tool.system.slice(0, 2)}</span>
                <div>
                  <strong>{tool.name}</strong>
                  <span>{tool.detail}</span>
                </div>
                {#if tool.matched}
                  <span class="match-chip">match</span>
                {/if}
              </div>
            {/each}
          </div>

          <div class="mini-grid">
            <div>
              <span class="mini-label">Plan</span>
              <ol>
                {#each activeDetails.plan as step}
                  <li>{step}</li>
                {/each}
              </ol>
            </div>
            <div>
              <span class="mini-label">Warnings</span>
              <ul>
                {#each activeDetails.warnings as warning}
                  <li>{warning}</li>
                {/each}
              </ul>
            </div>
          </div>
        </section>
      </aside>

      <section class="agent-card" aria-label="Workflow agent transcript">
        <div class="agent-card__head">
          <span class="agent-mark">CS</span>
          <strong>{activeDetails.agentConfig[0]?.value ?? 'Workflow Agent'}</strong>
        </div>

        <div class="agent-card__scroll">
          <div class="agent-prompt">{activeScenario.prompt}</div>

          <div class="agent-steps">
            <div class="agent-step">
              <span>SEARCH TOOLS</span>
              <strong>{activeDetails.toolMatches.filter((tool) => tool.matched).length} matches found</strong>
            </div>
            <div class="agent-step">
              <span>CHECK SCOPE</span>
              <strong>
                {activeScenario.decision === 'allow'
                  ? 'all checks clean'
                  : activeScenario.decision === 'review'
                    ? 'approval route found'
                    : 'blocked route found'}
              </strong>
            </div>
            <div class="agent-step">
              <span>PREPARE RECEIPTS</span>
              <strong>{activeScenario.receipts.length} files attached</strong>
            </div>
          </div>

          <p class="agent-response">{activeDetails.response}</p>
        </div>

      </section>

      <aside class="workbench__column workbench__column--right">
        <section class="console-panel">
          <span class="console-label">cs_manage_connections</span>
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
        </section>

        <section class="console-panel execute-panel">
          <div class="console-row">
            <span class="console-label">cs_execute_tool</span>
            <span class="session-id">session live</span>
          </div>
          <strong class="execute-name">{activeDetails.executeTool}</strong>
          <dl class="field-list">
            {#each activeDetails.executeFields as field}
              <div>
                <dt>{field.key}</dt>
                <dd>{field.value}</dd>
              </div>
            {/each}
          </dl>
          <div class={`result-line ${activeScenario.decision}`}>
            {activeScenario.decision === 'allow'
              ? '200 OK - safe action prepared'
              : activeScenario.decision === 'review'
                ? '202 HOLD - owner approval needed'
                : '409 STOP - reason code recorded'}
          </div>
        </section>

        <section class="console-panel">
          <span class="console-label">agent_config</span>
          <dl class="field-list">
            {#each activeDetails.agentConfig as row}
              <div>
                <dt>{row.key}</dt>
                <dd>{row.value}</dd>
              </div>
            {/each}
          </dl>
        </section>
      </aside>
    </div>

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
    --workbench-height: clamp(47rem, 56vw, 50rem);
    height: var(--workbench-height);
    overflow: hidden;
  }

  .workbench__body {
    display: grid;
    grid-template-rows: minmax(0, 1fr) 8.5rem;
    gap: 1rem;
    height: calc(var(--workbench-height) - 3.45rem);
    padding: 1rem;
  }

  .workbench__main {
    display: grid;
    grid-template-columns: minmax(12.5rem, 0.84fr) minmax(21rem, 1.08fr) minmax(12.5rem, 0.84fr);
    gap: 1rem;
    min-height: 0;
  }

  .workbench__column {
    display: grid;
    gap: 0.8rem;
    min-height: 0;
  }

  .workbench__column--left {
    grid-template-rows: minmax(14.6rem, auto) minmax(0, 1fr);
  }

  .workbench__column--right {
    grid-template-rows: minmax(8.8rem, auto) minmax(12.4rem, auto) minmax(0, 1fr);
  }

  .console-panel,
  .agent-card,
  .sandbox-panel {
    min-width: 0;
    border: 1px solid rgba(255, 255, 255, 0.075);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.014)),
      rgba(8, 8, 10, 0.68);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  }

  .console-panel {
    display: grid;
    align-content: start;
    gap: 0.78rem;
    padding: 0.95rem;
    overflow: hidden;
  }

  .scenario-panel {
    background:
      linear-gradient(135deg, rgba(49, 92, 255, 0.08), transparent 48%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.014)),
      rgba(8, 8, 10, 0.72);
  }

  .scenario-panel h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.22rem, 1.45vw, 1.55rem);
    line-height: 1.08;
    letter-spacing: 0;
  }

  .scenario-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  .console-label,
  .mini-label,
  .session-id,
  .agent-step span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .scenario-tabs {
    display: grid;
    gap: 0.5rem;
  }

  .scenario-tab {
    display: grid;
    gap: 0.22rem;
    padding: 0.72rem 0.76rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.018);
    text-align: left;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard),
      transform var(--duration-micro) var(--ease-standard);
  }

  .scenario-tab:hover {
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }

  .scenario-tab.selected {
    border-color: rgba(118, 144, 255, 0.36);
    background: linear-gradient(180deg, rgba(49, 92, 255, 0.16), rgba(49, 92, 255, 0.06));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .scenario-tab__label {
    color: var(--color-fg-primary);
    font-size: 0.85rem;
    font-weight: var(--font-semibold);
    line-height: 1.2;
  }

  .scenario-tab__summary {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    line-height: 1.35;
    text-transform: uppercase;
  }

  .search-panel {
    align-content: stretch;
  }

  .search-line {
    display: flex;
    gap: 0.48rem;
    align-items: center;
    min-height: 2.1rem;
    padding: 0.5rem 0.62rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.54);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.3;
  }

  .tool-list {
    display: grid;
    gap: 0.42rem;
  }

  .tool-row,
  .connection-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.58rem;
    align-items: center;
    min-width: 0;
    padding: 0.58rem;
    border: 1px solid rgba(255, 255, 255, 0.045);
    background: rgba(255, 255, 255, 0.014);
  }

  .tool-row.matched {
    border-color: rgba(205, 213, 255, 0.12);
    background: rgba(255, 255, 255, 0.028);
  }

  .tool-logo {
    display: grid;
    place-items: center;
    width: 1.42rem;
    height: 1.42rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.44);
    font-family: var(--font-mono);
    font-size: 0.58rem;
  }

  .tool-row strong,
  .connection-row strong,
  .execute-name {
    display: block;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.74);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tool-row span,
  .connection-row span,
  .field-list dt,
  .field-list dd,
  .result-line {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .match-chip {
    padding: 0.18rem 0.3rem;
    border-radius: 999px;
    background: rgba(180, 190, 255, 0.1);
    color: rgba(224, 229, 255, 0.72) !important;
    font-family: var(--font-mono);
    font-size: 0.52rem !important;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .mini-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.72rem;
    margin-top: auto;
  }

  .mini-grid ol,
  .mini-grid ul {
    display: grid;
    gap: 0.28rem;
    margin: 0.42rem 0 0;
    padding: 0;
    list-style: none;
    color: rgba(255, 255, 255, 0.34);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    line-height: 1.35;
  }

  .mini-grid li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.32rem;
  }

  .mini-grid ol {
    counter-reset: plan;
  }

  .mini-grid ol li {
    counter-increment: plan;
  }

  .mini-grid ol li::before {
    content: counter(plan);
    color: rgba(255, 255, 255, 0.2);
  }

  .mini-grid ul li::before {
    content: '!';
    color: rgba(255, 255, 255, 0.22);
  }

  .agent-card {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 42%),
      rgba(18, 18, 20, 0.74);
    box-shadow:
      0 20px 42px rgba(0, 0, 0, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.035);
  }

  .agent-card__head {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    min-height: 2.8rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.82rem;
  }

  .agent-mark {
    display: grid;
    place-items: center;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    color: rgba(0, 0, 0, 0.8);
    font-family: var(--font-mono);
    font-size: 0.52rem;
    font-weight: var(--font-semibold);
  }

  .agent-card__scroll {
    display: grid;
    align-content: start;
    gap: 0.82rem;
    min-height: 0;
    padding: clamp(0.95rem, 2vw, 1.2rem);
  }

  .agent-prompt {
    justify-self: end;
    max-width: 88%;
    padding: 0.82rem 0.9rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.055);
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.92rem;
    line-height: 1.48;
  }

  .agent-steps {
    display: grid;
    gap: 0.45rem;
  }

  .agent-step {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.46rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.045);
  }

  .agent-step strong {
    color: rgba(255, 255, 255, 0.56);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: var(--font-medium);
    text-align: right;
  }

  .agent-response {
    margin: 0;
    padding: 0.78rem 0.86rem;
    border: 1px solid rgba(255, 255, 255, 0.055);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.035);
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.86rem;
    font-weight: var(--font-semibold);
    line-height: 1.44;
  }

  .console-row {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    align-items: center;
  }

  .connection-list,
  .field-list {
    display: grid;
    gap: 0.5rem;
    margin: 0;
  }

  .connection-row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .connection-dot,
  .run-dot {
    width: 0.48rem;
    height: 0.48rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.24);
  }

  .connection-dot.allow,
  .run-dot.pass {
    background: rgba(122, 190, 122, 0.92);
  }

  .connection-dot.review,
  .run-dot.warn {
    background: rgba(207, 174, 100, 0.92);
  }

  .connection-dot.block,
  .run-dot.halt {
    background: rgba(214, 107, 107, 0.92);
  }

  .field-list div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.42rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.045);
  }

  .field-list div:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .field-list dt {
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .field-list dd {
    margin: 0;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.62);
    font-family: var(--font-mono);
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-line {
    margin-top: auto;
    padding-top: 0.2rem;
    font-family: var(--font-mono);
  }

  .result-line.allow {
    color: rgba(165, 214, 165, 0.9);
  }

  .result-line.review {
    color: rgba(227, 203, 145, 0.9);
  }

  .result-line.block {
    color: rgba(229, 156, 156, 0.9);
  }

  .sandbox-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.72rem;
    padding: 0.85rem;
    overflow: hidden;
  }

  .sandbox-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.56rem;
    min-height: 0;
  }

  .sandbox-cell {
    display: grid;
    grid-template-columns: auto minmax(0, auto) minmax(0, 1fr);
    gap: 0.42rem;
    align-items: center;
    min-width: 0;
    padding: 0.55rem;
    border: 1px dashed rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.38);
    font-size: 0.66rem;
    line-height: 1.25;
  }

  .sandbox-cell strong {
    color: rgba(255, 255, 255, 0.62);
    font-family: var(--font-mono);
    font-size: 0.66rem;
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.85rem;
    padding: 0.32rem 0.6rem;
    border-radius: var(--radius-full);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status-chip.allow {
    color: #d7f1d7;
    background: rgba(68, 170, 68, 0.18);
    border-color: rgba(68, 170, 68, 0.28);
  }

  .status-chip.review {
    color: #f2e6c9;
    background: rgba(170, 136, 68, 0.18);
    border-color: rgba(170, 136, 68, 0.28);
  }

  .status-chip.block {
    color: #f2d2d2;
    background: rgba(212, 77, 77, 0.18);
    border-color: rgba(212, 77, 77, 0.28);
  }

  @media (max-width: 1100px) {
    .workbench {
      height: auto;
      overflow: visible;
    }

    .workbench__body {
      height: auto;
      grid-template-rows: auto;
    }

    .workbench__main {
      grid-template-columns: 1fr;
    }

    .workbench__column,
    .workbench__column--left,
    .workbench__column--right {
      grid-template-rows: none;
    }

    .sandbox-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .workbench__body {
      padding: 0.72rem;
    }

    .terminal-surface__bar {
      align-items: flex-start;
      flex-direction: column;
    }

    .mini-grid,
    .sandbox-grid {
      grid-template-columns: 1fr;
    }

    .agent-prompt {
      max-width: 100%;
    }
  }
</style>
