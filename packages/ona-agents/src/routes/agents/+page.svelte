<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;

  $: availableCount = data.agents.filter((agent) => agent.credentialState === 'available').length;
  $: missingCount = data.agents.length - availableCount;
</script>

<svelte:head>
  <title>Ona Operator Agents</title>
</svelte:head>

{#if !data.accessAllowed}
  <section class="access-shell clear-paper">
    <div class="access-copy">
      <div class="eyebrow">Clerk Access</div>
      <h1 class="section-title">Sign in with Clerk to use the Ona agent shell.</h1>
      <p class="muted">
        Agent keys stay server-side. Staff access is required before agent names, credentials,
        or chat actions are available. {data.accessDetail}
      </p>
    </div>
    <a class="link-button" href={data.signInUrl}>Staff sign-in</a>
  </section>
{:else}
  <section class="agents-shell">
    <header class="agents-header clear-grid">
      <div>
        <div class="eyebrow">Workflow Trust Layer</div>
        <h1 class="page-title">Dify agents in one standalone operator surface.</h1>
        <p>
          Each agent keeps its API key server-side, exposes its lane and proof path, and waits
          behind Clerk before any operator chat can run.
        </p>
      </div>
      <div class="header-proof" aria-label="Agent credential summary">
        <article>
          <strong>{availableCount}</strong>
          <span>ready</span>
        </article>
        <article>
          <strong>{missingCount}</strong>
          <span>needs key</span>
        </article>
        <article>
          <strong>{data.agents.length}</strong>
          <span>agent lanes</span>
        </article>
      </div>
    </header>

    <div class="proof-strip" aria-label="Operator proof surfaces">
      <span>Proof surfaces</span>
      <article>
        <strong>Objects</strong>
        <small>Client, lane, state</small>
      </article>
      <article>
        <strong>Actions</strong>
        <small>Read, draft, route</small>
      </article>
      <article>
        <strong>Receipts</strong>
        <small>Smoke, eval, tool calls</small>
      </article>
    </div>

    <div class="agent-grid">
      {#each data.agents as agent}
        <a class="agent-row clear-panel" href={`/agents/${agent.id}`}>
          <div class="agent-main">
            <div class="agent-title-line">
              <h2>{agent.label}</h2>
              <span
                class={`status-pill ${agent.credentialState === 'available' ? 'good' : 'warn'}`}
              >
                {agent.credentialState === 'available' ? 'Key ready' : 'Needs key'}
              </span>
            </div>
            <p>{agent.operatorSummary}</p>
            <div class="agent-meta" aria-label={`${agent.label} metadata`}>
              <span>{agent.client}</span>
              <span>{agent.lane}</span>
              <span>{agent.operatorStateLabel}</span>
            </div>
          </div>
          <div class="agent-proof">
            <strong>{agent.nextAction}</strong>
            <span>{agent.apiKeyEnv}</span>
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .access-shell,
  .agents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: min(var(--content-width-clear), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .access-shell {
    margin-top: 2rem;
    padding: 1.1rem;
  }

  .access-copy {
    display: grid;
    gap: 0.75rem;
    max-width: 42rem;
  }

  .agents-shell {
    display: grid;
    gap: 0;
  }

  .agents-header {
    align-items: end;
    min-height: 26rem;
    padding-block: 3rem 2rem;
    border-bottom: 1px solid var(--color-clear-border);
  }

  .agents-header > div:first-child {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
  }

  .agents-header p {
    max-width: 41rem;
    margin: 0;
    color: var(--color-clear-grey);
    font-size: 1.08rem;
  }

  .header-proof {
    display: grid;
    grid-template-columns: repeat(3, minmax(6.4rem, 1fr));
    gap: 0.5rem;
    width: min(100%, 24rem);
  }

  .header-proof article {
    display: grid;
    gap: 0.22rem;
    min-height: 5.1rem;
    align-content: center;
    padding: 0.8rem;
    border: 1px solid var(--color-clear-border);
    border-radius: var(--radius-clear-sm);
    background: rgba(255, 255, 255, 0.76);
  }

  .header-proof strong {
    font-family: var(--font-mono);
    font-size: 1.4rem;
    font-weight: 500;
    line-height: 1;
  }

  .header-proof span {
    color: var(--color-clear-grey);
    font-size: 0.84rem;
  }

  .proof-strip {
    display: grid;
    grid-template-columns: minmax(9rem, 0.22fr) repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    align-items: center;
    width: min(var(--content-width-clear), calc(100% - 2.5rem));
    margin-inline: auto;
    padding-block: 1rem;
    border-bottom: 1px solid var(--color-clear-border);
  }

  .proof-strip > span {
    color: var(--color-clear-grey);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .proof-strip article {
    display: grid;
    gap: 0.16rem;
    min-height: 3.3rem;
    align-content: center;
    padding: 0.62rem 0.72rem;
    border: 1px solid var(--color-clear-border);
    border-radius: var(--radius-clear-sm);
    background: var(--color-clear-panel);
  }

  .proof-strip strong {
    font-size: 0.94rem;
    line-height: 1.16;
  }

  .proof-strip small {
    color: var(--color-clear-grey);
    font-size: 0.78rem;
    line-height: 1.25;
  }

  .agent-grid {
    display: grid;
    gap: 0.7rem;
    width: min(var(--content-width-clear), calc(100% - 2.5rem));
    margin-inline: auto;
    padding-block: 1rem 3rem;
  }

  .agent-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.7fr);
    gap: 1rem;
    padding: 0.95rem;
    text-decoration: none;
  }

  .agent-row:hover {
    border-color: var(--color-clear-border-strong);
    background: var(--color-clear-porcelain);
    opacity: 1;
  }

  .agent-main {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  .agent-title-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .agent-title-line h2 {
    margin: 0;
    font-size: 1.12rem;
    letter-spacing: 0;
    line-height: 1.16;
  }

  .agent-main p {
    margin: 0;
    color: var(--color-clear-grey);
  }

  .agent-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    color: var(--color-clear-grey);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .agent-meta span,
  .agent-proof span {
    border: 1px solid var(--color-clear-border);
    border-radius: var(--radius-clear-sm);
    padding: 0.35rem 0.5rem;
    background: var(--color-clear-panel);
  }

  .agent-proof {
    display: grid;
    gap: 0.65rem;
    align-content: center;
    color: var(--color-clear-onyx);
  }

  .agent-proof strong {
    font-size: 0.94rem;
    line-height: 1.45;
  }

  .agent-proof span {
    overflow-wrap: anywhere;
    color: var(--color-clear-grey);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  @media (max-width: 820px) {
    .access-shell,
    .agents-header,
    .agent-row,
    .proof-strip {
      grid-template-columns: 1fr;
      flex-direction: column;
      align-items: stretch;
    }

    .agents-header,
    .access-shell,
    .agent-grid,
    .proof-strip {
      width: min(100% - 1.5rem, var(--content-width-clear));
    }

    .agents-header {
      min-height: auto;
      padding-block: 2rem;
    }

    .header-proof {
      width: 100%;
    }
  }

  @media (max-width: 560px) {
    .header-proof {
      grid-template-columns: 1fr;
    }
  }
</style>
