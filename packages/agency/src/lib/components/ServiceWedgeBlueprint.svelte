<script lang="ts">
  type WedgeStage = {
    index: string;
    label: string;
    title: string;
    detail: string;
    width: string;
  };

  const stages: WedgeStage[] = [
    {
      index: '01',
      label: 'Readiness Map',
      title: 'Safe first wedge',
      detail: 'The workflow is mapped before anything is automated, connected, or exposed to agents.',
      width: '48%'
    },
    {
      index: '02',
      label: 'Workflow Console',
      title: 'Operating surface',
      detail: 'One handoff gets rebuilt into a visible path with status, owners, and recovery.',
      width: '64%'
    },
    {
      index: '03',
      label: 'Agent Layer',
      title: 'Prepared work',
      detail: 'Agents draft, match, summarize, and route work through scoped tools and review states.',
      width: '80%'
    },
    {
      index: '04',
      label: 'Governance Review',
      title: 'Low-touch tuning',
      detail: 'Incidents, edge cases, approval rules, and tool scopes are reviewed on a defined cadence.',
      width: '96%'
    }
  ];

  const outcomes = ['Auto-allow', 'Approval needed', 'Blocked with reason'];
</script>

<div class="wedge-shell product-surface product-surface--soft" aria-labelledby="service-wedge-title">
  <div class="wedge-copy">
    <span class="wedge-eyebrow">Service blueprint</span>
    <h3 id="service-wedge-title">The offer ladder starts with one workflow and ends with a governed console.</h3>
    <p>
      The service is easier to buy as a progression: map the workflow, build the operating
      surface, add agent capacity where it helps, then review what real usage teaches.
    </p>
  </div>

  <div class="wedge-diagram" aria-label="Blueprint wedge from readiness map to governed workflow console">
    <div class="wedge-axis" aria-hidden="true">
      <span>Connectivity</span>
      <span>Workflow</span>
      <span>Judgment</span>
      <span>Surface</span>
    </div>

    <div class="wedge-stack" role="list">
      {#each stages as stage}
        <article class="wedge-stage" style={`--stage-width: ${stage.width};`} role="listitem">
          <span class="wedge-stage__index">{stage.index}</span>
          <div>
            <span class="wedge-stage__label">{stage.label}</span>
            <h4>{stage.title}</h4>
            <p>{stage.detail}</p>
          </div>
        </article>
      {/each}
    </div>

    <div class="policy-card" aria-label="Workflow console decision states">
      <span>Console output</span>
      <div>
        {#each outcomes as outcome}
          <strong>{outcome}</strong>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .wedge-shell {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 0.82fr) minmax(22rem, 1.18fr);
    gap: clamp(1.25rem, 3vw, 2rem);
    margin-bottom: clamp(1.4rem, 3.2vw, 2.5rem);
    overflow: hidden;
    padding: clamp(1rem, 2.4vw, 1.5rem);
    background:
      radial-gradient(circle at 74% 26%, rgba(49, 92, 255, 0.16), transparent 30%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.058), rgba(255, 255, 255, 0.018)),
      rgba(4, 5, 8, 0.9);
  }

  .wedge-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: linear-gradient(90deg, transparent, #000 10%, #000 92%);
    opacity: 0.45;
  }

  .wedge-copy,
  .wedge-diagram {
    position: relative;
    z-index: 1;
  }

  .wedge-copy {
    display: grid;
    align-content: center;
    gap: 0.85rem;
    max-width: 34rem;
  }

  .wedge-eyebrow,
  .wedge-stage__index,
  .wedge-stage__label,
  .policy-card span,
  .wedge-axis span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .wedge-eyebrow {
    font-size: 0.72rem;
  }

  .wedge-copy h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.85rem, 3.2vw, 3rem);
    line-height: 1.02;
    letter-spacing: -0.045em;
    text-wrap: balance;
  }

  .wedge-copy p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .wedge-diagram {
    display: grid;
    gap: 0.85rem;
    min-width: 0;
  }

  .wedge-axis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
    padding: 0 0.4rem;
  }

  .wedge-axis span {
    font-size: 0.58rem;
    text-align: center;
  }

  .wedge-stack {
    position: relative;
    display: grid;
    gap: 0.7rem;
    min-height: 22rem;
    padding: 0.95rem;
    border-radius: 1.35rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.018)),
      rgba(0, 0, 0, 0.32);
    background-size: 25% 100%, auto, auto;
  }

  .wedge-stack::after {
    content: '';
    position: absolute;
    right: 1.15rem;
    top: 1.15rem;
    bottom: 1.15rem;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(49, 92, 255, 0.55), transparent);
    opacity: 0.8;
  }

  .wedge-stage {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.8rem;
    align-items: start;
    width: var(--stage-width);
    min-width: min(100%, 18rem);
    margin-left: auto;
    padding: 0.85rem 0.95rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)),
      rgba(9, 11, 17, 0.86);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 18px 44px rgba(0, 0, 0, 0.22);
  }

  .wedge-stage::before {
    content: '';
    position: absolute;
    left: -0.55rem;
    top: 50%;
    width: 0.55rem;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }

  .wedge-stage__index {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: rgba(49, 92, 255, 0.14);
    color: color-mix(in srgb, var(--color-brand-primary, #315cff) 72%, white);
    font-size: 0.68rem;
  }

  .wedge-stage__label {
    display: block;
    font-size: 0.62rem;
  }

  .wedge-stage h4 {
    margin: 0.28rem 0 0.34rem;
    color: var(--color-fg-primary);
    font-size: 1rem;
    line-height: 1.15;
  }

  .wedge-stage p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.84rem;
    line-height: 1.52;
  }

  .policy-card {
    display: flex;
    gap: 0.85rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 0.95rem;
    border: 1px solid color-mix(in srgb, var(--color-brand-primary-border) 78%, transparent);
    border-radius: 1rem;
    background: rgba(49, 92, 255, 0.1);
  }

  .policy-card span {
    flex: 0 0 auto;
    color: color-mix(in srgb, var(--color-brand-primary, #315cff) 62%, white);
    font-size: 0.64rem;
  }

  .policy-card div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
  }

  .policy-card strong {
    padding: 0.38rem 0.58rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-fg-primary);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
  }

  @media (max-width: 980px) {
    .wedge-shell {
      grid-template-columns: 1fr;
    }

    .wedge-copy {
      max-width: none;
    }
  }

  @media (max-width: 640px) {
    .wedge-axis {
      display: none;
    }

    .wedge-stack {
      min-height: auto;
      padding: 0.75rem;
    }

    .wedge-stage {
      width: 100%;
      min-width: 0;
    }

    .policy-card {
      align-items: flex-start;
      flex-direction: column;
    }

    .policy-card div {
      justify-content: flex-start;
    }
  }
</style>
