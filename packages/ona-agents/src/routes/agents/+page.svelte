<script lang="ts">
  const transitionReceipts = [
    {
      id: 'CRE-1233-RUNTIME',
      kind: 'Replacement system',
      title: 'The replacement passed its pre-release checks.',
      detail:
        'The checks cover predictable failures, saved continuation records in D1, approved tool lists, and requests that are accepted or rejected before work starts.',
      state: 'Verified',
      date: '2026-07-13'
    },
    {
      id: 'CRE-1233-ROUTE',
      kind: 'Retired route',
      title: 'Old agent links return here.',
      detail:
        'Every legacy agent detail URL permanently redirects to this notice. This app no longer opens or runs an agent.',
      state: 'Verified',
      date: '2026-07-13'
    },
    {
      id: 'CRE-1233-GATE',
      kind: 'Approval',
      title: 'Production promotion has not been approved.',
      detail:
        'Deploying, merging, or deleting the old provider secrets requires the owning approval process and a rollback receipt.',
      state: 'Review',
      date: 'Awaiting approval'
    }
  ] as const;
</script>

<svelte:head>
  <title>Agent app transition · CREATE SOMETHING</title>
  <meta
    name="description"
    content="The standalone operator-agent app is closed. Review the replacement system, retired route, and remaining approval gate."
  />
</svelte:head>

<article class="retirement-notice">
  <section class="retirement-opening" data-performance-chapter="thesis">
    <div class="eyebrow">Agent app transition</div>
    <h1>This standalone agent app is closed.</h1>
    <p class="retirement-lede">
      CREATE SOMETHING now runs operator agents through a system it controls. Staff can review the
      transition here, but no agent can be opened or run from this app.
    </p>
    <div class="retirement-state" aria-label="Current app state">
      <span class="status-pill stop">Closed</span>
      <span>Old agent links return to this notice.</span>
    </div>
  </section>

  <section class="retirement-evidence" data-performance-chapter="evidence-body">
    <header>
      <div class="eyebrow">What changed</div>
      <h2>The system moved; the approval limits remain.</h2>
      <p>
        CREATE SOMETHING keeps the agent rules, state, tool access, receipts, and operator limits.
        Cloudflare runs the network and storage. OpenAI runs the model work through an interface
        CREATE SOMETHING controls.
      </p>
    </header>

    <ol class="receipt-list" aria-label="Agent transition receipts">
      {#each transitionReceipts as receipt}
        <li>
          <div class="receipt-heading">
            <span>{receipt.kind}</span>
            <span class:review={receipt.state === 'Review'}>{receipt.state}</span>
          </div>
          <h3>{receipt.title}</h3>
          <p>{receipt.detail}</p>
          <dl>
            <div>
              <dt>Receipt</dt>
              <dd>{receipt.id}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{receipt.date}</dd>
            </div>
          </dl>
        </li>
      {/each}
    </ol>
  </section>

  <section class="retirement-handoff" data-performance-chapter="continuation">
    <div>
      <div class="eyebrow">What you can do now</div>
      <h2>Review the replacement. Do not promote it from this page.</h2>
      <p>
        The stack page explains who controls each part of the replacement. Production changes still
        wait for the named approval process and rollback proof.
      </p>
    </div>
    <a class="link-button" href="https://createsomething.agency/stack">Review the replacement stack</a>
  </section>
</article>

<style>
  .retirement-notice {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    width: min(62rem, calc(100% - 2.5rem));
    margin: 2rem auto 0;
    border: 1px solid var(--color-performance-line-strong);
    border-radius: var(--radius-performance-md);
    background: var(--color-performance-panel);
    overflow: hidden;
  }

  .retirement-notice > section {
    padding: clamp(1.25rem, 4vw, 3rem);
  }

  .retirement-notice > section + section {
    border-top: 1px solid var(--color-performance-line);
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1,
  h2,
  h3 {
    color: var(--color-performance-ink);
    font-family: var(--font-performance-display, var(--font-heading));
    letter-spacing: var(--tracking-performance-display, -0.03em);
    text-wrap: balance;
  }

  h1 {
    max-width: 16ch;
    margin: 0.8rem 0 1rem;
    font-size: clamp(2.5rem, 7vw, 5rem);
    font-weight: 500;
    line-height: 0.95;
  }

  h2 {
    max-width: 24ch;
    margin: 0.75rem 0 0.8rem;
    font-size: clamp(1.7rem, 3.5vw, 2.6rem);
    font-weight: 500;
    line-height: 1;
  }

  h3 {
    margin-bottom: 0.55rem;
    font-size: 1.25rem;
    line-height: 1.08;
  }

  .retirement-lede,
  .retirement-evidence header p,
  .retirement-handoff p {
    max-width: 44rem;
    margin-bottom: 0;
    color: var(--color-performance-muted);
    font-size: 1.05rem;
  }

  .retirement-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    color: var(--color-performance-muted);
  }

  .receipt-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 2rem 0 0;
    padding: 0;
    border: 1px solid var(--color-performance-line);
    list-style: none;
  }

  .receipt-list li {
    min-width: 0;
    padding: 1.25rem;
  }

  .receipt-list li + li {
    border-left: 1px solid var(--color-performance-line);
  }

  .receipt-heading {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .receipt-heading .review {
    color: var(--color-performance-review);
  }

  .receipt-list p {
    color: var(--color-performance-muted);
    font-size: 0.92rem;
  }

  .receipt-list dl {
    display: grid;
    gap: 0.45rem;
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--color-performance-line);
  }

  .receipt-list dl div {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: 0.5rem;
  }

  .receipt-list dt,
  .receipt-list dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  .receipt-list dt {
    color: var(--color-performance-muted);
    text-transform: uppercase;
  }

  .retirement-handoff {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
  }

  @media (max-width: 760px) {
    .retirement-notice {
      width: min(100% - 1.5rem, 62rem);
      margin-top: 0.75rem;
    }

    .receipt-list {
      grid-template-columns: 1fr;
    }

    .receipt-list li + li {
      border-top: 1px solid var(--color-performance-line);
      border-left: 0;
    }

    .retirement-handoff {
      align-items: stretch;
      flex-direction: column;
    }

    .retirement-handoff .link-button {
      width: 100%;
    }
  }
</style>
