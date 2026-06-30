<script lang="ts">
  import { abundanceAgents, heroVisual, staffingCareCards, trustProof } from '$lib/site/abundance';
  import type { PageData } from './$types';

  export let data: PageData;

  $: availableCount = data.agents.filter((agent) => agent.credentialState === 'available').length;
  $: missingCount = data.agents.length - availableCount;
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>Abundance Agents</title>
  <meta
    name="description"
    content="Abundance-branded staffing agents for nurse intake, job discovery, recruiter review, facility handoff, and compliance readiness."
  />
</svelte:head>

<section class="hero-03 container-full abundance-agent-hero abundance-subpage-hero">
  <div class="container-fluid for-hero01">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Agents that support the staffing desk.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Abundance agents prepare context. Recruiters approve staffing moves.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01">
              <div class="button-inside">
                <div class="button-text-01">Start application</div>
                <div class="button-text-01">Start application</div>
              </div>
            </div>
          </a>
          <a href={data.controlPlaneHref} target="_blank" rel="noreferrer" class="button-03 w-inline-block">
            <div class="button-outside-wrap">
              <div class="btn-text-outside-03">
                <div class="btn-text-inside-03">
                  <div class="button-text-03">Staff sign-in</div>
                  <div class="button-text-03">Staff sign-in</div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
    <div class="hero-thumb abundance-agent-thumb">
      <img src={heroVisual.src} alt={heroVisual.alt} class="hero-thumb-img" />
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-agent-roster">
  <div class="container-fluid for-works">
    <div class="works-content">
      <h2 class="works-title-02 heading-01">Named for Abundance work</h2>
      <div class="works-items">
        {#each abundanceAgents as agent}
          <article class="works-item abundance-agent-card">
            <div class="works-item-thumb-wrap abundance-agent-lane">{agent.lane}</div>
            <div class="works-item-info">
              <h3 class="works-item-info-title heading-05">{agent.name}</h3>
              <p class="works-itm-info-text p2-regular">{agent.summary}</p>
              <span>{agent.proof}</span>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="support-02 container-full abundance-agent-boundary">
  <div class="container-fluid">
    <div class="support-head-02">
      <h2 class="support-title-02 heading-01">Public story. Protected runtime.</h2>
      <p class="support-text-02 p1-regular">
        Public pages describe the workflow. Keys, documents, and write actions stay private.
      </p>
    </div>
    <div class="support-list-wrap abundance-agent-proof">
      {#each staffingCareCards as card}
        <a class="support-thumb-item abundance-agent-proof-card" href={card.href}>
          <img src={card.image} alt="" class="support-thumb-img" loading="lazy" />
          <span class="abundance-card-shade"></span>
          <span class="support-thumb-text heading-03">{card.title}</span>
        </a>
      {/each}
    </div>
  </div>
</section>

{#if data.accessAllowed}
  <section class="feature-blog-04 container-full abundance-staff-runtime">
    <div class="container-fluid">
      <div class="feature-blog-content-04">
        <div class="abundance-section-head">
          <h2 class="heading-01">Protected operator chat</h2>
          <p class="p1-regular">
            {availableCount} agents ready. {missingCount} credential checks remain.
          </p>
        </div>
        <div class="abundance-runtime-list">
          {#each data.agents as agent}
            <a class="abundance-runtime-row" href={`/agents/${agent.id}`}>
              <div>
                <h3 class="heading-05">{agent.label}</h3>
                <p class="p2-regular">{agent.operatorSummary}</p>
              </div>
              <span>{agent.credentialState === 'available' ? 'Key ready' : 'Needs key'}</span>
            </a>
          {/each}
        </div>
      </div>
    </div>
  </section>
{:else}
  <section class="feature-blog-04 container-full abundance-staff-runtime">
    <div class="container-fluid">
      <div class="feature-blog-content-04">
        <div class="abundance-section-head">
          <h2 class="heading-01">Staff access unlocks operator chat</h2>
          <p class="p1-regular">Protected staffing actions stay behind named access.</p>
        </div>
        <div class="abundance-rule-strip" aria-label="Trust rules">
          {#each trustProof.slice(0, 4) as item}
            <span>{item}</span>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .abundance-agent-thumb {
    border-radius: 16px;
  }

  .abundance-agent-roster,
  .abundance-agent-boundary,
  .abundance-staff-runtime {
    padding-top: 90px;
    padding-bottom: 90px;
  }

  .abundance-agent-card {
    min-height: 260px;
    padding: 22px;
    border: 1px solid var(--black-10);
    border-radius: 16px;
    background: var(--sub-bg);
  }

  .abundance-agent-lane {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 58px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--secondary-12);
    color: var(--secondary);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .abundance-agent-card span,
  .abundance-rule-strip span,
  .abundance-runtime-row span {
    color: var(--secondary);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .abundance-agent-proof {
    margin-top: 40px;
  }

  .abundance-agent-proof-card {
    text-decoration: none;
  }

  .abundance-card-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 25%, rgba(2, 2, 2, 0.62));
  }

  .abundance-section-head {
    display: grid;
    gap: 16px;
    margin-bottom: 34px;
  }

  .abundance-rule-strip {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .abundance-rule-strip span {
    padding: 9px 12px;
    border: 1px solid var(--secondary-20);
    border-radius: 999px;
    background: var(--secondary-12);
  }

  .abundance-runtime-list {
    display: grid;
    gap: 14px;
  }

  .abundance-runtime-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    align-items: center;
    padding: 20px;
    border: 1px solid var(--black-10);
    border-radius: 16px;
    color: var(--black);
    text-decoration: none;
    background: var(--background);
  }

  @media (max-width: 991px) {
    .hero-content-03,
    .support-head-02,
    .works-items,
    .abundance-runtime-row {
      grid-template-columns: 1fr;
    }

    .support-list-wrap {
      flex-direction: column;
    }

    .support-thumb-item {
      max-width: none;
    }
  }
</style>
