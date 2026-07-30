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
      label: 'Signal',
      title: 'What it reads',
      detail: ['Case, order, account', 'Shipment context']
    },
    {
      icon: 'states',
      label: 'Decision',
      title: 'What must pause',
      detail: ['Run, wait, or stop', 'Reason required']
    },
    {
      icon: 'actions',
      label: 'Action',
      title: 'What it can do',
      detail: ['Draft reply, add note', 'Assign owner']
    },
    {
      icon: 'receipts',
      label: 'Proof',
      title: 'What proves it',
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

  const receipts = ['workflow-map.md', 'owner-approval.md', 'proof-record.json'];
</script>

<aside class="hero-trust-artifact" aria-label="Signal Decision Proof delegation object">
  <div class="hero-trust-artifact__header">
    <div>
      <span>Delegation Card</span>
      <strong>Controlled delegation object</strong>
    </div>
    <small>Signal / Decision / Action / Proof</small>
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
    width: 100%;
    max-width: none;
    container-type: inline-size;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
    box-shadow: 0 18px 44px rgba(10, 14, 25, 0.08);
  }

  .hero-trust-artifact::before {
    content: '';
    position: absolute;
    inset: 0.62rem;
    z-index: 0;
    border: 1px solid rgba(0, 72, 255, 0.1);
    border-radius: 10px;
    transform: translate(0.42rem, 0.42rem);
    pointer-events: none;
  }

  .hero-trust-artifact::after {
    content: '';
    position: absolute;
    top: 5.35rem;
    right: 1rem;
    z-index: 0;
    width: min(11rem, 34%);
    height: min(11rem, 34%);
    border: 1px solid rgba(0, 72, 255, 0.14);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 18%, transparent);
    pointer-events: none;
  }

  .hero-trust-artifact__header,
  .hero-trust-artifact__path,
  .hero-trust-artifact__decision,
  .hero-trust-artifact__footer {
    position: relative;
    z-index: 1;
  }

  .hero-trust-artifact__header,
  .hero-trust-artifact__footer {
    display: grid;
    gap: 0.72rem;
    padding: 1rem 1.05rem;
    background: var(--color-performance-court, #e6e6e0);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
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
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    line-height: 1.12;
    text-transform: uppercase;
  }

  .hero-trust-artifact__header strong {
    display: block;
    margin-top: 0.32rem;
    color: var(--color-performance-ink, #090909);
    max-width: 18ch;
    font-size: clamp(1.5rem, 1.85vw, 1.86rem);
    font-weight: var(--font-performance-medium);
    line-height: 1.04;
    text-wrap: balance;
  }

  .hero-trust-artifact__header small {
    display: inline-flex;
    align-items: center;
    min-height: 1.65rem;
    padding: 0.32rem 0.5rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .hero-trust-artifact__path {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.62rem;
    padding: 0.62rem;
    background: var(--color-performance-panel, #ffffff);
  }

  .hero-trust-artifact__signal {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.64rem;
    align-items: start;
    min-height: 7.05rem;
    padding: 0.76rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 6px;
    background: #ffffff;
  }

  .hero-trust-artifact__signal:nth-child(1) {
    border-top: 3px solid var(--color-performance-signal, #2563ff);
  }

  .hero-trust-artifact__signal:nth-child(2) {
    border-top: 3px solid var(--color-performance-pressure, #ff6a00);
  }

  .hero-trust-artifact__signal:nth-child(3) {
    border-top: 3px solid var(--color-performance-growth, #16a34a);
  }

  .hero-trust-artifact__signal:nth-child(4) {
    border-top: 3px solid var(--color-performance-risk, #e11048);
  }

  .hero-trust-artifact__icon {
    --workflow-signal-icon-size: 1.52rem;
    display: grid;
    width: 2.12rem;
    height: 2.12rem;
    place-items: center;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .hero-trust-artifact__signal strong {
    display: block;
    margin-top: 0.24rem;
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.18;
  }

  .hero-trust-artifact__signal p {
    margin: 0.24rem 0 0;
    color: var(--color-performance-muted, #5e6268);
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
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
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
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .hero-trust-artifact__state--run {
    border-color: color-mix(in srgb, var(--color-performance-growth, #007a4d) 32%, white);
    background: color-mix(in srgb, var(--color-performance-growth-soft, #dcece5) 31%, white);
  }

  .hero-trust-artifact__state--wait {
    border-color: color-mix(in srgb, var(--color-performance-ink, #090909) 18%, white);
    background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 23%, white);
  }

  .hero-trust-artifact__state--stop {
    border-color: color-mix(in srgb, var(--color-performance-risk, #c62026) 22%, white);
    background: color-mix(in srgb, var(--color-performance-pressure-soft, #f7e2d7) 24%, white);
  }

  .hero-trust-artifact__state strong {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.9rem;
    font-weight: var(--font-performance-bold);
    line-height: 1.1;
    text-transform: uppercase;
  }

  .hero-trust-artifact__state small {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.78rem;
    line-height: 1.25;
  }

  .hero-trust-artifact__footer {
    gap: 0.55rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
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
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.78rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .hero-trust-artifact__footer strong::before {
    content: '';
    width: 0.62rem;
    height: 0.76rem;
    border: 1px solid var(--color-performance-muted, #5e6268);
    border-radius: 2px;
    background: linear-gradient(135deg, transparent 0 66%, rgba(10, 14, 25, 0.08) 66% 100%);
  }

  @container (min-width: 52rem) {
    .hero-trust-artifact__header {
      grid-template-columns: minmax(18rem, 1fr) auto;
      align-items: end;
      padding: 1.25rem 1.35rem;
    }

    .hero-trust-artifact__header strong {
      max-width: none;
      font-size: clamp(1.65rem, 2.4cqw, 2.2rem);
    }

    .hero-trust-artifact__path {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
      padding: 0.75rem;
    }

    .hero-trust-artifact__signal {
      min-height: 8.1rem;
      padding: 0.88rem;
    }

    .hero-trust-artifact__decision,
    .hero-trust-artifact__footer {
      grid-template-columns: minmax(9rem, 0.28fr) minmax(0, 1fr);
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.35rem;
    }

    .hero-trust-artifact__footer div {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .hero-trust-artifact__footer strong {
      min-width: 0;
    }
  }

  @media (max-width: 640px) {
    .hero-trust-artifact {
      max-width: none;
      box-shadow: 0 14px 38px rgba(10, 14, 25, 0.08);
    }

    .hero-trust-artifact__header,
    .hero-trust-artifact__decision,
    .hero-trust-artifact__footer {
      padding: 0.7rem;
    }

    .hero-trust-artifact__header {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }

    .hero-trust-artifact__header small {
      justify-self: start;
    }

    .hero-trust-artifact__path {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      padding: 0.45rem;
    }

    .hero-trust-artifact__signal {
      grid-template-columns: 1fr;
      min-height: auto;
      padding: 0.55rem;
    }

    .hero-trust-artifact__icon {
      width: 1.9rem;
      height: 1.9rem;
    }

    .hero-trust-artifact__footer strong {
      min-width: 0;
      flex-basis: calc(50% - 0.21rem);
    }

    .hero-trust-artifact__states {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .hero-trust-artifact__state {
      min-height: auto;
      padding: 0.5rem;
    }
  }
</style>
