<script lang="ts">
  import WorkflowSignalIcon from './WorkflowSignalIcon.svelte';

  type SignalName = 'objects' | 'actions' | 'states' | 'receipts';
  type DecisionTone = 'run' | 'wait' | 'stop';

  const signals: Array<{
    icon: SignalName;
    label: string;
    title: string;
    detail: [string, string];
  }> = [
    {
      icon: 'objects',
      label: 'What it reads',
      title: 'Named objects',
      detail: ['Case, order, account', 'Shipment context']
    },
    {
      icon: 'actions',
      label: 'What it can do',
      title: 'Scoped actions',
      detail: ['Draft reply, add note', 'Assign owner']
    },
    {
      icon: 'states',
      label: 'What must pause',
      title: 'Decision state',
      detail: ['Run, wait, or stop', 'Reason required']
    },
    {
      icon: 'receipts',
      label: 'What proves it',
      title: 'Receipts',
      detail: ['Boundary, approval', 'Blocked state']
    }
  ];

  const decisions: Array<{
    tone: DecisionTone;
    label: string;
    detail: string;
  }> = [
    { tone: 'run', label: 'Run', detail: 'Inside lane' },
    { tone: 'wait', label: 'Wait', detail: 'Owner approval' },
    { tone: 'stop', label: 'Stop', detail: 'Reason logged' }
  ];

  const receipts = ['action-boundary.md', 'approval-note.md', 'blocked-state.json'];
</script>

<aside class="hero-trust-artifact" aria-label="Delegation Card for support recovery">
  <div class="hero-trust-artifact__header">
    <div>
      <span>Delegation Card</span>
      <strong>Support recovery boundary</strong>
    </div>
    <small>Run / Wait / Stop</small>
  </div>

  <div class="hero-trust-artifact__path" aria-label="Controlled workflow path">
    {#each signals as signal}
      <article class="hero-trust-artifact__signal">
        <span class="hero-trust-artifact__icon" aria-hidden="true">
          <WorkflowSignalIcon name={signal.icon} />
        </span>
        <div>
          <small>{signal.label}</small>
          <strong>{signal.title}</strong>
          <p>
            {#each signal.detail as detailLine}
              <span>{detailLine}</span>
            {/each}
          </p>
        </div>
      </article>
    {/each}
  </div>

  <div class="hero-trust-artifact__decision">
    <span>What can happen now?</span>
    <div class="hero-trust-artifact__states">
      {#each decisions as decision}
        <article class={`hero-trust-artifact__state hero-trust-artifact__state--${decision.tone}`}>
          <strong>{decision.label}</strong>
          <small>{decision.detail}</small>
        </article>
      {/each}
    </div>
  </div>

  <div class="hero-trust-artifact__footer">
    <span>Receipt</span>
    <div>
      {#each receipts as receipt}
        <strong>{receipt}</strong>
      {/each}
    </div>
  </div>
</aside>

<style>
  .hero-trust-artifact {
    position: relative;
    overflow: hidden;
    display: grid;
    gap: 0;
    max-width: 35rem;
    border: 1px solid var(--color-clear-border-strong, #cecece);
    border-radius: var(--radius-clear-md, 8px);
    background: var(--color-clear-panel, #ffffff);
    box-shadow: 0 18px 44px rgba(10, 14, 25, 0.08);
  }

  .hero-trust-artifact::before {
    content: none;
  }

  .hero-trust-artifact__header,
  .hero-trust-artifact__footer {
    display: grid;
    gap: 0.72rem;
    padding: 1rem 1.05rem;
    background: var(--color-clear-porcelain-soft, #f2f2f2);
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .hero-trust-artifact__header {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    padding: 1rem 1.05rem 1.02rem;
  }

  .hero-trust-artifact__header span,
  .hero-trust-artifact__decision > span,
  .hero-trust-artifact__footer > span,
  .hero-trust-artifact__signal small {
    display: block;
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.12;
    text-transform: uppercase;
  }

  .hero-trust-artifact__header strong {
    display: block;
    margin-top: 0.32rem;
    color: var(--color-clear-onyx, #0a0e19);
    max-width: 18ch;
    font-size: clamp(1.5rem, 1.85vw, 1.86rem);
    font-weight: var(--font-medium);
    line-height: 1.04;
    text-wrap: balance;
  }

  .hero-trust-artifact__header small {
    display: inline-flex;
    align-items: center;
    min-height: 1.65rem;
    padding: 0.32rem 0.5rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: var(--font-semibold);
    line-height: 1.1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .hero-trust-artifact__path {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.62rem;
    padding: 0.62rem;
    background: var(--color-clear-panel, #ffffff);
  }

  .hero-trust-artifact__signal {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.64rem;
    align-items: start;
    min-height: 7.05rem;
    padding: 0.76rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 6px;
    background: #ffffff;
  }

  .hero-trust-artifact__icon {
    --workflow-signal-icon-size: 1.52rem;
    display: grid;
    width: 2.12rem;
    height: 2.12rem;
    place-items: center;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .hero-trust-artifact__signal strong {
    display: block;
    margin-top: 0.24rem;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1rem;
    font-weight: var(--font-semibold);
    line-height: 1.18;
  }

  .hero-trust-artifact__signal p {
    margin: 0.24rem 0 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.82rem;
    line-height: 1.28;
  }

  .hero-trust-artifact__signal p span {
    display: block;
  }

  .hero-trust-artifact__decision {
    display: grid;
    gap: 0.62rem;
    padding: 0.86rem 1.05rem;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .hero-trust-artifact__states {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.52rem;
  }

  .hero-trust-artifact__state {
    display: grid;
    gap: 0.24rem;
    min-height: 4.18rem;
    align-content: center;
    padding: 0.72rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
  }

  .hero-trust-artifact__state--run {
    border-color: color-mix(in srgb, var(--color-clear-moss, #397554) 32%, white);
    background: color-mix(in srgb, var(--color-clear-pistachio, #dbefdb) 31%, white);
  }

  .hero-trust-artifact__state--wait {
    border-color: color-mix(in srgb, var(--color-clear-onyx, #0a0e19) 18%, white);
    background: color-mix(in srgb, var(--color-clear-pastel-blue, #afc1fd) 23%, white);
  }

  .hero-trust-artifact__state--stop {
    border-color: color-mix(in srgb, var(--color-clear-stop, #c41e3a) 22%, white);
    background: color-mix(in srgb, var(--color-clear-candy-purple, #efd4ff) 24%, white);
  }

  .hero-trust-artifact__state strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    font-weight: var(--font-bold);
    line-height: 1.1;
    text-transform: uppercase;
  }

  .hero-trust-artifact__state small {
    color: var(--color-clear-grey, #636363);
    font-size: 0.78rem;
    line-height: 1.25;
  }

  .hero-trust-artifact__footer {
    gap: 0.55rem;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
    border-bottom: 0;
  }

  .hero-trust-artifact__footer div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.42rem;
  }

  .hero-trust-artifact__footer strong {
    display: inline-flex;
    align-items: center;
    gap: 0.36rem;
    min-width: 9.6rem;
    flex: 1 1 9.6rem;
    max-width: 100%;
    justify-content: flex-start;
    padding: 0.28rem 0.45rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .hero-trust-artifact__footer strong::before {
    content: '';
    width: 0.62rem;
    height: 0.76rem;
    border: 1px solid var(--color-clear-grey-quiet, #818181);
    border-radius: 2px;
    background: linear-gradient(135deg, transparent 0 66%, rgba(10, 14, 25, 0.08) 66% 100%);
  }

  @media (max-width: 640px) {
    .hero-trust-artifact {
      max-width: none;
      box-shadow: 0 14px 38px rgba(10, 14, 25, 0.08);
    }

    .hero-trust-artifact__header,
    .hero-trust-artifact__decision,
    .hero-trust-artifact__footer {
      padding: 0.86rem;
    }

    .hero-trust-artifact__header {
      grid-template-columns: 1fr;
    }

    .hero-trust-artifact__header small {
      justify-self: start;
    }

    .hero-trust-artifact__path {
      grid-template-columns: 1fr;
      gap: 0.54rem;
      padding: 0.6rem;
    }

    .hero-trust-artifact__signal {
      min-height: auto;
      padding: 0.72rem;
    }

    .hero-trust-artifact__footer strong {
      min-width: 0;
      flex-basis: 100%;
    }

    .hero-trust-artifact__states {
      grid-template-columns: 1fr;
    }

    .hero-trust-artifact__state {
      min-height: auto;
    }
  }
</style>
