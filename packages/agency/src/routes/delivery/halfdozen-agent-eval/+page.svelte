<script lang="ts">
  import { SEO } from '@create-something/canon';
  import {
    halfdozenAgentEvalArtifacts,
    halfdozenAgentEvalNextReview,
    halfdozenAgentEvalOperatingLayers,
    halfdozenAgentEvalPrivateArtifacts,
    halfdozenAgentEvalSummary,
    halfdozenAgentEvalWorkflow
  } from '$lib/delivery/halfdozenAgentEval';
</script>

<SEO
  title="Half Dozen Agent Eval Delivery | CREATE SOMETHING Agency"
  description="Internal delivery page for Half Dozen's Notion-triggered external agent instruction eval workflow, Cloudflare Worker queue, Dify review boundary, Test Reports writeback, and live testing handoff."
  keywords="Half Dozen, Notion agents, Dify eval, Cloudflare Worker, agent testing, CREATE SOMETHING"
  canonical="https://createsomething.agency/delivery/halfdozen-agent-eval"
  ogImage="/og-image.svg"
  propertyName="agency"
  noindex={true}
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Internal Delivery</span>
      <h1>{halfdozenAgentEvalSummary.headline}</h1>
      <p>{halfdozenAgentEvalSummary.description}</p>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <span class="status-dot"></span>
      <p><strong>Client</strong><span>{halfdozenAgentEvalSummary.client}</span></p>
      <p><strong>Owner</strong><span>{halfdozenAgentEvalSummary.owner}</span></p>
      <p><strong>Phase</strong><span>{halfdozenAgentEvalSummary.phase}</span></p>
      <p><strong>Runtime</strong><span>Worker + Queue + Dify optional</span></p>
      <p><strong>Gate</strong><span>Testing before Validated</span></p>
    </aside>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Artifacts</span>
      <h2>What is ready to review.</h2>
      <p>
        These references describe the delivery without publishing private Notion records, token
        values, Dify keys, or Linear comment bodies.
      </p>
    </div>

    <div class="artifact-grid">
      {#each halfdozenAgentEvalArtifacts as artifact}
        {#if artifact.href}
          <a class="artifact-link product-surface" href={artifact.href} target="_blank" rel="noreferrer">
            <span>{artifact.meta}</span>
            <strong>{artifact.label}</strong>
          </a>
        {:else}
          <article class="artifact-link artifact-link--static product-surface">
            <span>{artifact.meta}</span>
            <strong>{artifact.label}</strong>
          </article>
        {/if}
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Workflow</span>
      <h2>The system is a gated handoff, not an autonomous promotion path.</h2>
      <p>
        Updating starts the external review. Testing remains the human runtime proof before any
        agent can be treated as validated or active.
      </p>
    </div>

    <div class="workflow-grid">
      {#each halfdozenAgentEvalWorkflow as step}
        <article class="product-surface workflow-card">
          <span>{step.label}</span>
          <h3>{step.title}</h3>
          <p class="workflow-status">{step.status}</p>
          <p>{step.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Database / Automation / Judgment</span>
      <h2>The delivery is organized around the operating model.</h2>
    </div>

    <div class="layer-grid">
      {#each halfdozenAgentEvalOperatingLayers as layer}
        <article class="product-surface layer-card">
          <span class="layer-tier">{layer.tier}</span>
          <h3>{layer.title}</h3>
          <p class="layer-status">{layer.status}</p>
          <p>{layer.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad evidence-layout">
    <div class="product-surface product-surface--soft evidence-panel">
      <span class="product-kicker">Private Source Artifacts</span>
      <h2>Known, but not published.</h2>
      <div class="evidence-list">
        {#each halfdozenAgentEvalPrivateArtifacts as item}
          <p>{item}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Verified Run</span>
      <h2>What is complete, and what still needs testing.</h2>
      <div class="evidence-list">
        {#each halfdozenAgentEvalNextReview as item}
          <p>{item}</p>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .delivery-hero {
    min-height: 82vh;
    display: flex;
    align-items: center;
    padding: clamp(56px, 8vw, 112px) 0 clamp(36px, 6vw, 72px);
  }

  .delivery-hero__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
    gap: clamp(28px, 5vw, 68px);
    align-items: end;
  }

  .delivery-copy {
    max-width: 860px;
  }

  .delivery-copy h1 {
    margin: 14px 0 20px;
    max-width: 820px;
    font-family: var(--font-display);
    font-size: clamp(48px, 8vw, 104px);
    line-height: 0.92;
    letter-spacing: 0;
  }

  .delivery-copy p,
  .section-lead p,
  .layer-card p,
  .workflow-card p,
  .evidence-list p {
    color: rgba(246, 247, 251, 0.72);
  }

  .delivery-copy p {
    max-width: 760px;
    font-size: clamp(19px, 2vw, 25px);
    line-height: 1.35;
  }

  .delivery-status {
    display: grid;
    gap: 18px;
    padding: 22px;
    border-top: 4px solid rgba(94, 234, 212, 0.78);
  }

  .delivery-status p {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    padding-bottom: 12px;
  }

  .delivery-status p:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .delivery-status strong,
  .delivery-status span {
    font-size: 0.92rem;
  }

  .delivery-status span {
    color: rgba(246, 247, 251, 0.68);
    text-align: right;
  }

  .status-dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: #5eead4;
    box-shadow: 0 0 34px rgba(94, 234, 212, 0.75);
  }

  .delivery-section {
    padding: clamp(36px, 6vw, 76px) 0;
  }

  .section-lead {
    max-width: 760px;
    margin-bottom: 28px;
  }

  .section-lead h2 {
    margin: 10px 0 12px;
    max-width: 760px;
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 64px);
    line-height: 1;
    letter-spacing: 0;
  }

  .artifact-grid,
  .layer-grid,
  .workflow-grid {
    display: grid;
    gap: 16px;
  }

  .artifact-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .artifact-link:nth-child(-n + 3) {
    grid-column: span 2;
  }

  .artifact-link:nth-child(n + 4) {
    grid-column: span 3;
  }

  .artifact-link {
    display: grid;
    min-height: 170px;
    align-content: space-between;
    padding: 20px;
    text-decoration: none;
  }

  .artifact-link--static {
    cursor: default;
  }

  .workflow-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .workflow-card,
  .layer-card {
    padding: 20px;
  }

  .workflow-card {
    min-height: 260px;
  }

  .layer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .artifact-link span,
  .workflow-card span,
  .layer-tier,
  .layer-status,
  .workflow-status {
    color: #5eead4;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .artifact-link strong {
    font-size: 1.2rem;
    line-height: 1.15;
  }

  .workflow-card h3,
  .layer-card h3,
  .evidence-panel h2 {
    margin: 10px 0;
    font-family: var(--font-display);
    font-size: clamp(24px, 3vw, 34px);
    line-height: 1;
    letter-spacing: 0;
  }

  .workflow-card p,
  .layer-card p {
    line-height: 1.55;
  }

  .evidence-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    align-items: stretch;
  }

  .evidence-panel {
    padding: clamp(22px, 4vw, 36px);
    border-top: 4px solid rgba(94, 234, 212, 0.78);
  }

  .evidence-panel--accent {
    border-top-color: rgba(251, 191, 36, 0.82);
  }

  .evidence-list {
    display: grid;
    gap: 14px;
  }

  .evidence-list p {
    margin: 0;
    line-height: 1.55;
  }

  @media (max-width: 980px) {
    .delivery-hero__inner,
    .evidence-layout,
    .layer-grid {
      grid-template-columns: 1fr;
    }

    .workflow-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .artifact-grid {
      grid-template-columns: 1fr;
    }

    .artifact-link:nth-child(n) {
      grid-column: auto;
    }
  }

  @media (max-width: 640px) {
    .delivery-hero {
      min-height: auto;
      padding-top: 54px;
    }

    .delivery-copy h1 {
      font-size: clamp(42px, 15vw, 62px);
    }

    .workflow-grid {
      grid-template-columns: 1fr;
    }

    .delivery-status p {
      display: grid;
      gap: 4px;
    }

    .delivery-status span {
      text-align: left;
    }
  }
</style>
