<script lang="ts">
  import { abundanceAgents, trustProof } from '$lib/site/abundance';
  import type { PageData } from './$types';

  export let data: PageData;

  $: availableCount = data.agents.filter((agent) => agent.credentialState === 'available').length;
  $: missingCount = data.agents.length - availableCount;
</script>

<svelte:head>
  <title>Abundance Agents</title>
  <meta
    name="description"
    content="Abundance-branded staffing agents for nurse intake, job discovery, recruiter review, facility handoff, and compliance readiness."
  />
</svelte:head>

<section class="page-hero compact">
  <div class="hero-copy">
    <div class="eyebrow">Abundance Agents</div>
    <h1 class="page-title">A staffing agent system with recruiter approval built in.</h1>
    <p class="lede">
      These are the client-facing Abundance agent roles. Ona remains a useful internal design
      precedent for clear operator surfaces, but the staffing brand, naming, and public workflow
      belong to Abundance.
    </p>
  </div>

  <div class="proof-panel">
    <div class="eyebrow">Protected Runtime</div>
    <h2>Agent keys and write-capable actions stay behind staff access.</h2>
    <ul>
      {#each trustProof.slice(0, 4) as item}
        <li>{item}</li>
      {/each}
    </ul>
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Public Agent Roster</div>
    <h2>Named for the staffing workflow, not for the internal design system.</h2>
  </div>
  <div class="feature-grid">
    {#each abundanceAgents as agent}
      <article class="feature-card">
        <span class="step-marker">{agent.lane}</span>
        <h3>{agent.name}</h3>
        <p>{agent.summary}</p>
        <p><strong>{agent.proof}</strong></p>
      </article>
    {/each}
  </div>
</section>

{#if !data.accessAllowed}
  <section class="access-shell glass panel section-gap">
    <div class="access-copy">
      <div class="eyebrow">Staff Access</div>
      <h2 class="section-title">Sign in through .agency to use the protected operator chat.</h2>
      <p class="muted">
        Public pages can describe agent roles. Live Dify calls, credentials, and staffing actions
        require staff access and remain server-side.
      </p>
    </div>
    <a class="link-button" href={data.controlPlaneHref} target="_blank" rel="noreferrer"
      >Staff sign-in</a
    >
  </section>
{:else}
  <section class="agents-shell section-gap">
    <header class="agents-header glass panel">
      <div>
        <div class="eyebrow">Protected Operator Chat</div>
        <h2 class="section-title">Dify-backed agents in one staff surface</h2>
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
              <h3>{agent.label}</h3>
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
  .section-gap {
    margin-top: 1rem;
  }

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

  .agent-title-line h3 {
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
    background: var(--surface-overlay);
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
