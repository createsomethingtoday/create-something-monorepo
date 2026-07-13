<script lang="ts">
  type BlockedState = {
    label: string;
    reason: string;
    recovery: string;
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    states?: BlockedState[];
  };

  const DEFAULT_STATES: BlockedState[] = [
    {
      label: 'No entitlement',
      reason: 'The account is real, but the service has not been granted for this tenant.',
      recovery: 'Grant or activate the package before token or host access resumes.'
    },
    {
      label: 'Contract inactive',
      reason: 'The credential exists, but the operating agreement no longer allows execution.',
      recovery: 'Renew or restore the contract state before writes resume.'
    },
    {
      label: 'Billing issue',
      reason: 'Commercial standing is part of the live access check, not a separate back-office process.',
      recovery: 'Resolve the billing state and re-run the entitlement check.'
    },
    {
      label: 'Policy acceptance required',
      reason: 'The user is known, but the access policy has not been accepted for the current account.',
      recovery: 'Accept the active trust rule and retry the controlled action.'
    },
    {
      label: 'Trust pause',
      reason: 'The workflow remains installed, but controls have paused execution for risk or review.',
      recovery: 'Resume only after operator review or updated policy conditions.'
    }
  ];

  let {
    eyebrow = 'Reason-coded Blocking',
    title = 'Why access can stop even when credentials still exist',
    description = 'Blocked states are product behavior. Each one needs a clear reason and a recovery path so support, decision owners, and operators see the same reality.',
    states = DEFAULT_STATES
  }: Props = $props();
</script>

<div class="blocked-shell">
  <div class="blocked-copy">
    <span class="blocked-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{description}</p>
  </div>

  <div class="blocked-grid" role="list">
    {#each states as state}
      <article class="blocked-card" role="listitem">
        <h3>{state.label}</h3>
        <p>{state.reason}</p>
        <span>{state.recovery}</span>
      </article>
    {/each}
  </div>
</div>

<style>
  .blocked-shell {
    display: grid;
    gap: 1.4rem;
  }

  .blocked-copy {
    display: grid;
    gap: 0.65rem;
    max-width: 46rem;
  }

  .blocked-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.6));
  }

  .blocked-copy h2 {
    margin: 0;
    color: var(--color-performance-fg-primary, #fff);
    font-size: clamp(1.55rem, 2.6vw, 2.35rem);
    line-height: 1.06;
  }

  .blocked-copy p {
    margin: 0;
    color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.76));
    line-height: 1.7;
  }

  .blocked-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .blocked-card {
    padding: 1.1rem;
    border-radius: 20px;
    border: 1px solid rgba(248, 113, 113, 0.16);
    background:
      radial-gradient(circle at top left, rgba(248, 113, 113, 0.12), transparent 45%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
      rgba(18, 5, 8, 0.74);
  }

  .blocked-card h3 {
    margin: 0 0 0.65rem;
    color: var(--color-performance-fg-primary, #fff);
    font-size: 1rem;
    line-height: 1.25;
  }

  .blocked-card p,
  .blocked-card span {
    display: block;
    margin: 0;
    color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.76));
    line-height: 1.6;
    font-size: 0.92rem;
  }

  .blocked-card span {
    margin-top: 0.8rem;
    color: rgba(254, 202, 202, 0.92);
  }

  @media (max-width: 1100px) {
    .blocked-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 740px) {
    .blocked-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
