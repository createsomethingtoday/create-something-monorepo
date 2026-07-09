<script lang="ts">
  type DecisionTone = 'allow' | 'review' | 'block';

  type Props = {
    decision?: DecisionTone;
    matches?: number;
    receipts?: number;
  };

  let { decision = 'allow', matches = 2, receipts = 3 }: Props = $props();

  const states = [
    { id: 'allow', label: 'Run', detail: 'Inside lane' },
    { id: 'review', label: 'Wait', detail: 'Owner review' },
    { id: 'block', label: 'Stop', detail: 'Reason logged' }
  ] as const;
</script>

<div class="governed-visual governed-visual--{decision}" aria-hidden="true">
  <div class="governed-visual__timeline">
    <span></span>
    <span></span>
    <span class:active={decision === 'block'}></span>
    <span></span>
  </div>

  <div class="governed-visual__surface">
    <div class="governed-visual__header">
      <span class="node-icon node-icon--object"></span>
      <div class="line-stack">
        <span></span>
        <span></span>
      </div>
      <span class="status-dot"></span>
    </div>

    <div class="stage-list">
      <div class="stage-card">
        <span class="node-icon node-icon--case"></span>
        <div class="line-stack">
          <span></span>
          <span></span>
        </div>
        <span class="stage-card__count">{matches}</span>
      </div>

      <div class="stage-card">
        <span class="node-icon node-icon--scope"></span>
        <div class="line-stack">
          <span></span>
          <span></span>
        </div>
        <span class="check-dot"></span>
      </div>

      <div class="decision-row">
        {#each states as state}
          <div class="decision-pill {state.id}" class:selected={decision === state.id}>
            <span class="decision-dot"></span>
            <strong>{state.label}</strong>
            <span>{state.detail}</span>
          </div>
        {/each}
      </div>

      <div class="receipt-row">
        <div class="line-stack">
          <span></span>
          <span></span>
        </div>
        <div class="receipt-files" aria-label={`${receipts} receipt files`}>
          {#each Array.from({ length: receipts }) as _, index}
            <span>{String(index + 1).padStart(2, '0')}</span>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .governed-visual {
    --governed-accent: var(--color-performance-signal-soft, #dce8f5);
    --governed-surface: #eef2ff;
    position: relative;
    display: grid;
    grid-template-columns: 1rem minmax(0, 28rem);
    column-gap: 0.72rem;
    align-items: center;
    justify-content: center;
    min-height: inherit;
    padding: clamp(1rem, 2.5vw, 1.65rem);
    overflow: hidden;
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.045) 1px, transparent 1px) 0 0 / 2.6rem 2.6rem,
      linear-gradient(180deg, var(--governed-surface) 0%, #ffffff 100%);
  }

  .governed-visual--allow {
    --governed-accent: var(--color-performance-growth-soft, #dcece5);
    --governed-surface: var(--color-performance-growth-soft, #dcece5);
  }

  .governed-visual--review {
    --governed-accent: var(--color-performance-signal-soft, #dce8f5);
    --governed-surface: #eef2ff;
  }

  .governed-visual--block {
    --governed-accent: var(--color-performance-pressure-soft, #f7e2d7);
    --governed-surface: #f7e8ff;
  }

  .governed-visual__timeline {
    position: relative;
    display: grid;
    align-content: space-between;
    justify-items: center;
    width: 1rem;
    height: min(21rem, 100%);
    min-height: 18.5rem;
  }

  .governed-visual__timeline::before {
    content: '';
    position: absolute;
    top: 0.42rem;
    bottom: 0.42rem;
    left: 50%;
    width: 1px;
    background: rgba(10, 14, 25, 0.16);
    transform: translateX(-50%);
  }

  .governed-visual__timeline span {
    position: relative;
    z-index: 1;
    width: 0.72rem;
    height: 0.72rem;
    border: 1px solid rgba(10, 14, 25, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
  }

  .governed-visual__timeline span.active {
    border-color: rgba(196, 30, 58, 0.42);
    background: var(--color-performance-risk, #c62026);
  }

  .governed-visual__surface {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--governed-accent) 68%, rgba(10, 14, 25, 0.18));
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 22px 60px rgba(10, 14, 25, 0.12);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .governed-visual__header,
  .stage-card,
  .receipt-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    min-height: 3.65rem;
    padding: 0.78rem 1rem;
    border-bottom: 1px solid rgba(10, 14, 25, 0.08);
  }

  .governed-visual__header {
    border-radius: 8px 8px 0 0;
    background: rgba(255, 255, 255, 0.72);
  }

  .stage-list {
    display: grid;
    grid-template-rows: repeat(2, minmax(3.65rem, auto)) auto minmax(3.65rem, auto);
  }

  .stage-card {
    background: rgba(255, 255, 255, 0.82);
  }

  .node-icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 2.35rem;
    height: 2.35rem;
    border: 1px solid rgba(10, 14, 25, 0.1);
    border-radius: 7px;
    background:
      radial-gradient(circle, rgba(10, 14, 25, 0.2) 0 1.2px, transparent 1.4px) 0.42rem 0.42rem /
        0.65rem 0.65rem,
      color-mix(in srgb, var(--governed-accent) 35%, white);
  }

  .node-icon::after {
    content: '';
    width: 0.92rem;
    height: 0.92rem;
    border: 1.4px solid var(--color-performance-ink, #090909);
  }

  .node-icon--case::after {
    border-radius: 3px;
  }

  .node-icon--object::after {
    border-radius: 999px;
  }

  .node-icon--scope::after {
    width: 1rem;
    height: 0.55rem;
    border-top: 0;
    border-right: 0;
    transform: rotate(-45deg);
  }

  .line-stack {
    display: grid;
    gap: 0.4rem;
  }

  .line-stack span {
    display: block;
    height: 0.36rem;
    border-radius: 999px;
    background: rgba(10, 14, 25, 0.11);
  }

  .line-stack span:first-child {
    width: min(7rem, 72%);
    background: rgba(10, 14, 25, 0.82);
  }

  .line-stack span:last-child {
    width: min(14rem, 92%);
  }

  .status-dot,
  .check-dot {
    width: 0.54rem;
    height: 0.54rem;
    border-radius: 999px;
    background: var(--color-performance-signal, #0057b8);
  }

  .check-dot {
    border: 1px solid rgba(57, 117, 84, 0.42);
    background: rgba(57, 117, 84, 0.28);
  }

  .stage-card__count {
    display: inline-grid;
    place-items: center;
    min-width: 1.8rem;
    min-height: 1.5rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 4px;
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    background: rgba(255, 255, 255, 0.68);
  }

  .decision-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    padding: 0.72rem 0.9rem;
    border-bottom: 1px solid rgba(10, 14, 25, 0.08);
    background: color-mix(in srgb, var(--governed-accent) 18%, white);
  }

  .decision-pill {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.2rem 0.36rem;
    align-items: center;
    min-width: 0;
    min-height: 3.18rem;
    padding: 0.54rem 0.5rem;
    border: 1px solid rgba(10, 14, 25, 0.1);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.62);
  }

  .decision-pill.selected.allow {
    background: rgba(57, 117, 84, 0.12);
  }

  .decision-pill.selected.review {
    background: rgba(10, 14, 25, 0.08);
  }

  .decision-pill.selected.block {
    background: rgba(196, 30, 58, 0.1);
  }

  .decision-dot {
    grid-row: span 2;
    width: 0.62rem;
    height: 0.62rem;
    border-radius: 999px;
    background: var(--color-performance-muted, #5e6268);
  }

  .allow .decision-dot {
    background: #007a4d;
  }

  .review .decision-dot {
    background: var(--color-performance-ink, #090909);
  }

  .block .decision-dot {
    background: var(--color-performance-risk, #c62026);
  }

  .decision-pill strong {
    color: var(--color-performance-ink, #090909);
    font-size: 0.8rem;
    font-weight: var(--font-medium);
    line-height: 1.1;
  }

  .decision-pill span:last-child {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.58rem;
    line-height: 1.18;
    white-space: normal;
  }

  .receipt-row {
    grid-template-columns: minmax(0, 1fr) auto;
    border-bottom: 0;
    border-radius: 0 0 8px 8px;
    background: rgba(255, 255, 255, 0.84);
  }

  .receipt-files {
    display: flex;
    gap: 0.35rem;
  }

  .receipt-files span {
    display: inline-grid;
    place-items: center;
    width: 1.65rem;
    height: 1.9rem;
    border: 1px solid rgba(10, 14, 25, 0.1);
    border-radius: 5px;
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-mono);
    font-size: 0.58rem;
    background: color-mix(in srgb, var(--governed-accent) 34%, white);
  }

  @media (max-width: 640px) {
    .governed-visual {
      grid-template-columns: 1fr;
      padding: 0.8rem;
    }

    .governed-visual__timeline {
      display: none;
    }

    .decision-row {
      grid-template-columns: 1fr;
    }
  }
</style>
