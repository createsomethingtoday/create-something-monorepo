<script lang="ts">
  import {
    abundanceAgents,
    careStories,
    heroVisual,
    sourceModel,
    staffingPages,
    staffingStats,
    trustProof
  } from '$lib/site/abundance';
  import type { PageData } from './$types';

  export let data: PageData;

  $: verificationTone = data.intakeAccess.granted ? 'good' : 'warn';
  $: showStaffSurface = data.agencyAccess.status === 'allowed';
  $: verificationLabel = data.intakeAccess.granted
    ? 'Already verified in this browser'
    : 'No account needed to start';
  $: verificationDetail = data.intakeAccess.granted
    ? 'Secure upload and recruiter review steps can continue from this browser when they appear.'
    : 'Start now. Verification appears only when documents or recruiter review need it.';
</script>

<svelte:head>
  <title>Abundance Staffing | Guided Nurse Applications</title>
  <meta
    name="description"
    content="Abundance is a nurse staffing website and guided application system with public job discovery, recruiter-gated staffing, and Abundance-branded agents."
  />
</svelte:head>

<section class="page-hero">
  <div class="hero-copy">
    <div class="eyebrow">Abundance Nurse Staffing</div>
    <h1 class="page-title">Nurse staffing with a clearer handoff.</h1>
    <p class="lede">
      Nurses start in plain language. Facilities request coverage clearly. Recruiters keep the
      final staffing decision.
    </p>

    <div class="hero-actions">
      <a class="link-button" href="/apply">Start an application</a>
      <a class="link-secondary" href="/facilities">Request staffing</a>
      {#if data.workspace?.latestThreadId}
        <a class="link-secondary" href={`/chat/${data.workspace.latestThreadId}`}>
          Continue thread
        </a>
      {/if}
    </div>
  </div>

  <div class="human-visual">
    <div class="photo-frame">
      <img src={heroVisual.src} alt={heroVisual.alt} />
      <div class="photo-caption">
        <strong>{heroVisual.caption}</strong>
        <span>Guided by software. Reviewed by people.</span>
      </div>
    </div>
    <div class="human-note">
      <strong>Human first, system supported.</strong>
      <span>{heroVisual.note}</span>
    </div>
  </div>
</section>

<section class={`trust-strip ${verificationTone} section-gap`}>
  <span class={`status-pill ${verificationTone}`}>{verificationLabel}</span>
  <p>{verificationDetail}</p>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Who It Serves</div>
    <h2>Three audiences. One clean handoff.</h2>
  </div>
  <div class="feature-grid">
    {#each careStories as story}
      <article class="story-card">
        <h3>{story.title}</h3>
        <p>{story.body}</p>
      </article>
    {/each}
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Start Here</div>
    <h2>Pick the path. Keep the context.</h2>
  </div>
  <div class="feature-grid">
    {#each staffingPages as page}
      <article class="feature-card">
        <div class="eyebrow">{page.eyebrow}</div>
        <h3>{page.title}</h3>
        <p>{page.body}</p>
        <a class="link-secondary" href={page.href}>{page.cta}</a>
      </article>
    {/each}
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Trust Rules</div>
    <h2>Simple boundaries, visible from the start.</h2>
  </div>
  <div class="feature-grid four">
    {#each [...staffingStats, { label: 'Keys', value: 'Server-side', detail: trustProof[0] }] as stat}
      <article class="feature-card">
        <span class="step-marker">{stat.label}</span>
        <h3>{stat.value}</h3>
        <p>{stat.detail}</p>
      </article>
    {/each}
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Agents</div>
    <h2>Support roles, not staffing authorities.</h2>
  </div>
  <div class="feature-grid">
    {#each abundanceAgents.slice(0, 3) as agent}
      <article class="feature-card">
        <span class="step-marker">{agent.lane}</span>
        <h3>{agent.name}</h3>
        <p>{agent.summary}</p>
      </article>
    {/each}
  </div>
</section>

{#if showStaffSurface}
  <section class="glass panel operator-shell section-gap">
    <div class="section-header">
      <div>
        <div class="eyebrow">Staff Workspace</div>
        <h2 class="section-title">Clear controls for governed agent work</h2>
      </div>
      <span class="status-pill good">Server-side agent runtime</span>
    </div>

    <p class="muted shell-copy">
      {data.operatorMode.promise} The staff surface keeps state, actions, evidence, and approvals
      in CREATE SOMETHING language while the public site uses Abundance brand language.
    </p>

    <div class="state-strip" aria-label="Operator states">
      {#each data.operatorStateDefinitions as state}
        <div class={`state-cell ${state.tone}`}>
          <strong>{state.label}</strong>
          <span>{state.summary}</span>
        </div>
      {/each}
    </div>

    <div class="plane-grid">
      {#each data.operatorShellPlanes as plane}
        <article class="plane-card">
          <div>
            <div class="eyebrow">{plane.owner}</div>
            <h3>{plane.label}</h3>
          </div>
          <p>{plane.purpose}</p>
          <div class="signal-list">
            {#each plane.requiredSignals as signal}
              <span>{signal}</span>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  </section>
{/if}

<section class="split-section quiet">
  <div>
    <div class="eyebrow">Research Base</div>
    <h2>Based on staffing-market patterns and accessible healthcare UX.</h2>
  </div>
  <div class="feature-grid">
    {#each sourceModel as source}
      <article class="feature-card">
        <h3>{source.title}</h3>
        <p>{source.body}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .section-gap {
    margin-top: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .operator-shell {
    display: grid;
    gap: 1rem;
  }

  .shell-copy {
    max-width: 62rem;
  }

  .state-strip,
  .plane-grid {
    display: grid;
    gap: 0.85rem;
  }

  .state-strip {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .state-cell,
  .plane-card {
    border: 1px solid var(--line);
    border-radius: var(--radius-tight);
    background: var(--surface-strong);
  }

  .state-cell {
    display: grid;
    gap: 0.35rem;
    min-height: 7rem;
    padding: 0.8rem;
  }

  .state-cell span,
  .plane-card p {
    color: var(--muted);
    line-height: var(--leading-normal, 1.5);
  }

  .state-cell.good {
    border-color: var(--good-line);
  }

  .state-cell.warn {
    border-color: var(--warn-line);
  }

  .state-cell.danger {
    border-color: var(--danger-line);
  }

  .plane-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .plane-card {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
  }

  .plane-card h3 {
    margin: 0.45rem 0 0;
    font-size: var(--text-h4, 1.095rem);
    font-weight: var(--font-medium, 500);
    line-height: var(--leading-snug, 1.375);
  }

  .signal-list {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .signal-list span {
    border: 1px solid var(--line);
    border-radius: var(--radius-tight);
    padding: 0.32rem 0.45rem;
    background: var(--surface-overlay);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  @media (max-width: 900px) {
    .state-strip,
    .plane-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
