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
    tools: string[];
    checks: Array<{ label: string; tone: CheckTone }>;
    artifacts: string[];
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    scenarios?: Scenario[];
  };

  const DEFAULT_SCENARIOS: Scenario[] = [
    {
      id: 'lead-intake',
      label: 'Lead Intake',
      prompt: 'Route a qualified inbound lead, create the internal brief, and notify the owner.',
      summary: 'The workflow can run automatically because scope, ownership, and downstream writes are already bounded.',
      result: 'Auto-allow with release evidence',
      decision: 'allow',
      tools: ['HubSpot', 'Notion', 'Slack'],
      checks: [
        { label: 'Verified account and role scope', tone: 'pass' },
        { label: 'Matched qualified-lead policy pack', tone: 'pass' },
        { label: 'Recorded owner, timestamp, and lane id', tone: 'pass' }
      ],
      artifacts: ['mcp_contract.yaml', 'outcome_contract.md', 'release-evidence.json']
    },
    {
      id: 'publish-review',
      label: 'Publish Review',
      prompt: 'Prepare the publish request, bundle supporting artifacts, and hold for human approval.',
      summary: 'The system can build the package, but content promotion still crosses a trust boundary and waits for review.',
      result: 'Paused for approval',
      decision: 'review',
      tools: ['GitHub', 'Notion', 'Slack'],
      checks: [
        { label: 'Draft assembled from approved source records', tone: 'pass' },
        { label: 'Promotion hits customer-facing surface', tone: 'warn' },
        { label: 'Approval owner required before deploy step', tone: 'warn' }
      ],
      artifacts: ['approval-request.md', 'runbook.md', 'rollback-note.md']
    },
    {
      id: 'finance-boundary',
      label: 'Finance Boundary',
      prompt: 'Attempt a write-off larger than the approved policy threshold.',
      summary: 'The workflow stops cleanly because the requested action exceeds the allowed financial boundary for this lane.',
      result: 'Blocked with reason code',
      decision: 'block',
      tools: ['Stripe', 'CRM', 'Slack'],
      checks: [
        { label: 'Threshold exceeds current policy ceiling', tone: 'halt' },
        { label: 'No delegated approval for this action', tone: 'halt' },
        { label: 'Incident lane opened for follow-up', tone: 'warn' }
      ],
      artifacts: ['blocked-state.json', 'incident-log.md', 'operator-handoff.md']
    }
  ];

  let {
    eyebrow = 'Live Workflow Surface',
    title = 'What governed execution looks like',
    description = 'A CREATE SOMETHING workflow does not just connect tools. It decides what can run, what waits for review, and what stops with a reason your team can inspect.',
    scenarios = DEFAULT_SCENARIOS
  }: Props = $props();

  let activeIndex = $state(0);
  const activeScenario = $derived(scenarios[activeIndex] ?? scenarios[0]);

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
    <span class="terminal-surface__title">workflow console</span>
    <span class={`status-chip ${activeScenario.decision}`}>
      {activeScenario.decision === 'allow'
        ? 'Auto-allow'
        : activeScenario.decision === 'review'
          ? 'Needs review'
          : 'Blocked'}
    </span>
  </div>

  <div class="workbench__body">
    <div class="workbench__sidebar">
      <div class="workbench__intro">
        <span class="product-kicker">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

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
    </div>

    <div class="workbench__panel">
      <section class="panel-block">
        <span class="panel-label">Request</span>
        <p class="panel-command">{activeScenario.prompt}</p>
        <div class="product-pills">
          {#each activeScenario.tools as tool}
            <span class="product-pill">{tool}</span>
          {/each}
        </div>
      </section>

      <div class="panel-grid">
        <section class="panel-block">
          <span class="panel-label">Policy Checks</span>
          <ul class="check-list">
            {#each activeScenario.checks as check}
              <li>
                <span class={`check-dot ${check.tone}`}></span>
                <span>{check.label}</span>
              </li>
            {/each}
          </ul>
        </section>

        <section class="panel-block">
          <span class="panel-label">Artifacts</span>
          <ul class="artifact-list">
            {#each activeScenario.artifacts as artifact}
              <li><code>{artifact}</code></li>
            {/each}
          </ul>
        </section>
      </div>

      <section
        class="panel-block decision-card"
        class:decisionAllow={activeScenario.decision === 'allow'}
        class:decisionReview={activeScenario.decision === 'review'}
        class:decisionBlock={activeScenario.decision === 'block'}
      >
        <span class="panel-label">Decision</span>
        <h4>{activeScenario.result}</h4>
        <p>{activeScenario.summary}</p>
      </section>
    </div>
  </div>
</div>

<style>
  .workbench {
    width: 100%;
  }

  .workbench__body {
    display: grid;
    grid-template-columns: minmax(0, 16rem) minmax(0, 1fr);
    min-height: 100%;
  }

  .workbench__sidebar {
    display: grid;
    gap: 1.25rem;
    padding: 1.2rem;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.01));
  }

  .workbench__intro {
    display: grid;
    gap: 0.8rem;
  }

  .workbench__intro h3 {
    margin: 0;
    font-size: clamp(1.4rem, 1.6vw, 1.85rem);
    line-height: 1.08;
    color: var(--color-fg-primary);
  }

  .workbench__intro p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.95rem;
    line-height: 1.65;
  }

  .scenario-tabs {
    display: grid;
    gap: 0.6rem;
  }

  .scenario-tab {
    display: grid;
    gap: 0.3rem;
    padding: 0.9rem 0.95rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.025);
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
    border-color: var(--color-brand-primary-border);
    background: linear-gradient(180deg, rgba(49, 92, 255, 0.18), rgba(49, 92, 255, 0.08));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .scenario-tab__label {
    color: var(--color-fg-primary);
    font-size: 0.9rem;
    font-weight: var(--font-semibold);
    line-height: 1.2;
  }

  .scenario-tab__summary {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .workbench__panel {
    display: grid;
    gap: 1rem;
    padding: 1.2rem;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .panel-block {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012)),
      rgba(255, 255, 255, 0.02);
  }

  .panel-label {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .panel-command {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .check-list,
  .artifact-list {
    display: grid;
    gap: 0.7rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .check-list li,
  .artifact-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    color: var(--color-fg-secondary);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .artifact-list code {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-brand-ink);
  }

  .check-dot {
    width: 0.58rem;
    height: 0.58rem;
    margin-top: 0.34rem;
    border-radius: 999px;
    flex: 0 0 auto;
    background: rgba(255, 255, 255, 0.2);
  }

  .check-dot.pass {
    background: var(--color-success);
    box-shadow: 0 0 16px rgba(68, 170, 68, 0.32);
  }

  .check-dot.warn {
    background: var(--color-warning);
    box-shadow: 0 0 16px rgba(170, 136, 68, 0.28);
  }

  .check-dot.halt {
    background: var(--color-error);
    box-shadow: 0 0 16px rgba(212, 77, 77, 0.28);
  }

  .decision-card h4 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1.15rem;
    line-height: 1.2;
  }

  .decision-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.65;
  }

  .decision-card.decisionAllow {
    border-color: rgba(68, 170, 68, 0.28);
    background:
      linear-gradient(180deg, rgba(68, 170, 68, 0.16), rgba(68, 170, 68, 0.06)),
      rgba(255, 255, 255, 0.02);
  }

  .decision-card.decisionReview {
    border-color: rgba(170, 136, 68, 0.28);
    background:
      linear-gradient(180deg, rgba(170, 136, 68, 0.14), rgba(170, 136, 68, 0.05)),
      rgba(255, 255, 255, 0.02);
  }

  .decision-card.decisionBlock {
    border-color: rgba(212, 77, 77, 0.28);
    background:
      linear-gradient(180deg, rgba(212, 77, 77, 0.14), rgba(212, 77, 77, 0.05)),
      rgba(255, 255, 255, 0.02);
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

  @media (max-width: 960px) {
    .workbench__body {
      grid-template-columns: 1fr;
    }

    .workbench__sidebar {
      border-right: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
  }

  @media (max-width: 720px) {
    .panel-grid {
      grid-template-columns: 1fr;
    }

    .terminal-surface__bar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
