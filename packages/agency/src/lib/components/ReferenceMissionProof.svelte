<script lang="ts">
  import type { ReferenceMissionPublicProjection } from '$lib/governance/reference-mission';

  let { mission }: { mission: ReferenceMissionPublicProjection } = $props();

  const stateLabels: Record<ReferenceMissionPublicProjection['state'], string> = {
    unavailable: 'Not yet publicly defended',
    incomplete: 'Evidence chain incomplete',
    review: 'Waiting for accountable review',
    blocked: 'Stopped by policy',
    failed: 'Verification failed',
    rolled_back: 'Rollback recorded',
    recovered: 'Recovered and reverified',
    proven: 'Production proof current',
    stale: 'Proof needs a fresh readback'
  };

  function displayDate(value: string | null): string {
    if (!value) return 'No public observation';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
</script>

<section class="mission-proof" data-state={mission.state} aria-labelledby="reference-mission-title">
  <header>
    <div>
      <p class="eyebrow">Reference mission · {mission.state.replace('_', ' ')}</p>
      <h3 id="reference-mission-title">{mission.title ?? 'Governed Agent Delivery'}</h3>
    </div>
    <span class="state">{stateLabels[mission.state]}</span>
  </header>

  {#if mission.state === 'unavailable'}
    <p class="unavailable">
      No source-backed mission is available on this public surface. The case remains a proposal, not
      production proof.
    </p>
  {:else}
    <p class="objective">{mission.objective}</p>

    <dl class="identity">
      <div>
        <dt>Correlation</dt>
        <dd>{mission.correlation_id}</dd>
      </div>
      <div>
        <dt>Scope</dt>
        <dd>{mission.scope}</dd>
      </div>
      <div>
        <dt>Authority</dt>
        <dd>{mission.authority_class}</dd>
      </div>
      <div>
        <dt>Source class</dt>
        <dd>{mission.source_class}</dd>
      </div>
    </dl>

    <div class="evidence-grid">
      <section>
        <span>Verification</span>
        <p>{mission.verification_summary}</p>
      </section>
      <section>
        <span>Proof</span>
        <p>{mission.proof_summary}</p>
      </section>
      <section>
        <span>Recovery</span>
        <p>{mission.recovery_summary}</p>
      </section>
    </div>

    <footer>
      <span>{mission.freshness.state} observation</span>
      <time datetime={mission.freshness.observed_at ?? undefined}
        >{displayDate(mission.freshness.observed_at)}</time
      >
      <span>Refresh boundary: {mission.freshness.stale_after_days} days</span>
    </footer>
  {/if}
</section>

<style>
  .mission-proof {
    --mission-accent: #ff4f00;
    display: grid;
    gap: clamp(1rem, 2vw, 1.5rem);
    border: 1px solid color-mix(in srgb, var(--mission-accent) 42%, #d4d4d4);
    background:
      linear-gradient(
        120deg,
        color-mix(in srgb, var(--mission-accent) 8%, transparent),
        transparent 42%
      ),
      #fff;
    padding: clamp(1.25rem, 3vw, 2rem);
    color: #090909;
  }

  .mission-proof[data-state='proven'],
  .mission-proof[data-state='recovered'] {
    --mission-accent: #00a86b;
  }

  .mission-proof[data-state='failed'],
  .mission-proof[data-state='rolled_back'],
  .mission-proof[data-state='blocked'] {
    --mission-accent: #d71920;
  }

  header,
  footer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  h3,
  p,
  dl,
  dd {
    margin: 0;
  }

  h3 {
    max-width: 18ch;
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    line-height: 1;
    letter-spacing: -0.035em;
  }

  .eyebrow,
  .state,
  dt,
  .evidence-grid span,
  footer {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .eyebrow {
    margin-bottom: 0.65rem;
    color: #5c5c5c;
  }

  .state {
    border: 1px solid var(--mission-accent);
    padding: 0.45rem 0.6rem;
    color: var(--mission-accent);
    text-align: right;
  }

  .objective,
  .unavailable {
    max-width: 62ch;
    font-size: clamp(1rem, 1.5vw, 1.2rem);
    line-height: 1.55;
  }

  .identity,
  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    background: #d4d4d4;
  }

  .identity > div,
  .evidence-grid > section {
    display: grid;
    align-content: start;
    gap: 0.45rem;
    min-width: 0;
    background: #fff;
    padding: 1rem;
  }

  .evidence-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  dt,
  .evidence-grid span,
  footer {
    color: #626262;
  }

  dd,
  .evidence-grid p {
    overflow-wrap: anywhere;
    line-height: 1.45;
  }

  footer {
    flex-wrap: wrap;
    border-top: 1px solid #d4d4d4;
    padding-top: 1rem;
  }

  @media (max-width: 720px) {
    header {
      align-items: stretch;
      flex-direction: column;
    }

    .state {
      text-align: left;
    }

    .identity,
    .evidence-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
