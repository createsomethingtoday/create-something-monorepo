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
  <section class="access-shell glass panel">
    <div class="access-copy">
      <div class="eyebrow">Operator Access</div>
      <h1 class="section-title">Sign in through .agency to use the Dify operator shell.</h1>
      <p class="muted">
        Agent keys stay server-side. Staff access is required before agent names, credentials, or
        chat actions are available.
      </p>
    </div>
    <a class="link-button" href={data.controlPlaneHref} target="_blank" rel="noreferrer"
      >Staff sign-in</a
    >
  </section>
{:else}
  <section class="agents-shell">
    <header class="agents-header glass panel">
      <div>
        <div class="eyebrow">Ona Operator Chat</div>
        <h1 class="section-title">Dify agents in one staff chat surface</h1>
      </div>
      <div class="header-proof" aria-label="Agent credential summary">
        <span class="status-pill good">{availableCount} ready</span>
        <span class={`status-pill ${missingCount ? 'warn' : 'good'}`}>{missingCount} needs key</span
        >
      </div>
    </header>

    <div class="agent-grid">
      {#each data.agents as agent}
        <a class="agent-row glass" href={`/agents/${agent.id}`}>
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
  }

  .access-copy {
    display: grid;
    gap: 0.75rem;
    max-width: 42rem;
  }

  .link-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.8rem 1.1rem;
    border-radius: 999px;
    background: var(--button-bg);
    color: var(--button-ink);
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 16px 34px rgba(49, 92, 255, 0.22);
    white-space: nowrap;
  }

  .agents-shell {
    display: grid;
    gap: 1rem;
  }

  .header-proof {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .agent-grid {
    display: grid;
    gap: 0.85rem;
  }

  .agent-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.7fr);
    gap: 1rem;
    padding: 1rem;
    text-decoration: none;
    transition:
      border-color 140ms ease,
      transform 140ms ease,
      background 140ms ease;
  }

  .agent-row:hover {
    border-color: var(--line-strong);
    transform: translateY(-1px);
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
  }

  .agent-main p {
    margin: 0;
    color: var(--muted);
  }

  .agent-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    color: var(--muted-strong);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .agent-meta span,
  .agent-proof span {
    border: 1px solid var(--line);
    border-radius: var(--radius-tight);
    padding: 0.35rem 0.5rem;
    background: rgba(7, 10, 16, 0.42);
  }

  .agent-proof {
    display: grid;
    gap: 0.65rem;
    align-content: center;
    color: var(--ink-soft);
  }

  .agent-proof strong {
    font-size: 0.94rem;
    line-height: 1.45;
  }

  .agent-proof span {
    overflow-wrap: anywhere;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  @media (max-width: 820px) {
    .access-shell,
    .agents-header,
    .agent-row {
      grid-template-columns: 1fr;
      flex-direction: column;
      align-items: stretch;
    }

    .header-proof {
      justify-content: flex-start;
    }
  }
</style>
