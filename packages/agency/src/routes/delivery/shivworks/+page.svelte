<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';

  export let data: PageData;

  const context = data.context;
  const engagement = context.engagement;
  const privateEvidence = context.evidence.filter((item) => item.visibility !== 'public');
</script>

<SEO
  title="ShivWorks Delivery Runbook | CREATE SOMETHING Agency"
  description="Client-safe delivery runbook for ShivWorks Network developer access, Infisical secrets, Cloudflare D1, app admin boundaries, and backend validation commands."
  keywords="ShivWorks, Cloudflare D1, Infisical, developer runbook, CREATE SOMETHING"
  canonical="https://createsomething.agency/delivery/shivworks"
  ogImage="/og-image.svg"
  propertyName="agency"
  noindex={true}
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Delivery record</span>
      <h1>{context.title}.</h1>
      <p>{context.summary}</p>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <span class="status-dot"></span>
      <p><strong>Client</strong><span>{engagement?.client}</span></p>
      <p><strong>Owner</strong><span>{engagement?.owner}</span></p>
      <p><strong>Phase</strong><span>{engagement?.phase}</span></p>
      <p><strong>Recipient</strong><span>{engagement?.recipient}</span></p>
      <p><strong>Secrets</strong><span>Infisical, not chat or GitHub</span></p>
    </aside>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Handoff packet</span>
      <h2>What to send and where ownership moves.</h2>
      <p>
        This is written so a non-technical PM can forward the page, while the technical recipient
        can take ownership without guessing where the repo, secrets, database, and acceptance checks
        live.
      </p>
    </div>

    <div class="package-grid">
      {#each context.handoffPackage ?? [] as item}
        <article class="product-surface package-card">
          <div>
            <span>{item.label}</span>
            <h3>{item.audience}</h3>
          </div>
          <p><strong>Deliver</strong>{item.deliverable}</p>
          <p><strong>How</strong>{item.how}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Shareable references</span>
      <h2>What the developer can open.</h2>
      <p>
        These references are safe to share. Secret values, production member data, and Cloudflare
        write permissions stay in GitHub, Infisical, Cloudflare, and the app admin workflow.
      </p>
    </div>

    <div class="artifact-grid">
      {#each context.artifacts as artifact}
        {#if artifact.href}
          <a
            class="artifact-link product-surface"
            href={artifact.href}
            target="_blank"
            rel="noreferrer"
          >
            <span>{artifact.type}</span>
            <strong>{artifact.title}</strong>
          </a>
        {:else}
          <article class="artifact-link artifact-link--static product-surface">
            <span>{artifact.type}</span>
            <strong>{artifact.title}</strong>
          </article>
        {/if}
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Database / Automation / Judgment</span>
      <h2>Map every handoff item to the operating layer.</h2>
    </div>

    <div class="layer-grid">
      {#each context.layers as layer}
        <article class="product-surface layer-card">
          <span class="layer-tier">{layer.tier}</span>
          <h3>{layer.title}</h3>
          <p class="layer-status">{layer.status}</p>
          <p>{layer.description}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section" id="developer-runbook">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Developer Runbook</span>
      <h2>Start with access, then local proof.</h2>
      <p>
        The normal path is GitHub access plus Infisical dev access. Cloudflare D1 access can be
        granted now to the named technical owner who needs direct production database operations.
      </p>
    </div>

    <div class="runbook-grid">
      {#each context.runbookCommands ?? [] as command}
        <article class="product-surface runbook-card">
          <span>{command.label}</span>
          <p>{command.description}</p>
          <pre><code>{command.command}</code></pre>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Access Lanes</span>
      <h2>Grant only the needed lane.</h2>
      <p>
        GitHub, Infisical, Cloudflare, and app-admin access solve different problems. Avoid using
        one broad credential as a shortcut for all four.
      </p>
    </div>

    <div class="access-table product-surface">
      {#each context.accessLanes ?? [] as lane}
        <article>
          <span>{lane.label}</span>
          <p><strong>Owner</strong>{lane.owner}</p>
          <p><strong>Scope</strong>{lane.scope}</p>
          <p><strong>Action</strong>{lane.action}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad evidence-layout">
    <div class="product-surface product-surface--soft evidence-panel">
      <span class="product-kicker">Private Boundary</span>
      <h2>Known but not published.</h2>
      <div class="evidence-list">
        {#each privateEvidence as item}
          <p>{item.detail}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Next Review</span>
      <h2>Decisions still open.</h2>
      <div class="evidence-list">
        {#each context.decisions as decision}
          <p>{decision.title}</p>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .delivery-hero {
    min-height: 68vh;
    display: flex;
    align-items: center;
    padding: clamp(52px, 7vw, 96px) 0 clamp(36px, 5vw, 64px);
    color: var(--color-clear-onyx, #0a0e19);
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
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(44px, 7vw, 82px);
    line-height: 0.96;
    letter-spacing: 0;
  }

  .delivery-copy p,
  .section-lead p,
  .layer-card p,
  .runbook-card p,
  .evidence-list p {
    color: var(--color-clear-grey, #636363);
  }

  .delivery-copy p {
    max-width: 760px;
    font-size: clamp(18px, 1.8vw, 22px);
    line-height: 1.45;
  }

  .delivery-hero :global(.product-surface),
  .delivery-section :global(.product-surface) {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    box-shadow: var(--shadow-clear-restraint, 0 4px 20px rgba(0, 0, 0, 0.06));
    color: var(--color-clear-onyx, #0a0e19);
  }

  .delivery-hero :global(.product-surface)::after,
  .delivery-section :global(.product-surface)::after {
    display: none;
  }

  .delivery-hero :global(.product-kicker),
  .delivery-section :global(.product-kicker) {
    color: var(--color-clear-grey, #636363);
  }

  .delivery-hero :global(.product-kicker)::before,
  .delivery-section :global(.product-kicker)::before {
    background: var(--color-clear-ocean, #0048ff);
    box-shadow: none;
  }

  .delivery-status {
    display: grid;
    gap: 18px;
    padding: 22px;
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .delivery-status p {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 0;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
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
    color: var(--color-clear-grey, #636363);
    text-align: right;
  }

  .status-dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: var(--color-clear-ocean, #0048ff);
  }

  .delivery-section {
    padding: clamp(36px, 6vw, 76px) 0;
    color: var(--color-clear-onyx, #0a0e19);
  }

  .section-lead {
    max-width: 760px;
    margin-bottom: 28px;
  }

  .section-lead h2 {
    margin: 10px 0 12px;
    max-width: 720px;
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 64px);
    line-height: 1;
    letter-spacing: 0;
  }

  .artifact-grid,
  .layer-grid,
  .package-grid,
  .runbook-grid {
    display: grid;
    gap: 16px;
  }

  .artifact-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .layer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .package-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .runbook-grid {
    grid-template-columns: 1fr;
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
    opacity: 0.88;
  }

  .artifact-link span,
  .layer-tier,
  .layer-status,
  .package-card span,
  .runbook-card > span,
  .access-table article > span {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .artifact-link strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1.2rem;
    line-height: 1.15;
  }

  .layer-card,
  .package-card,
  .runbook-card {
    padding: 24px;
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .layer-card h3,
  .package-card h3,
  .evidence-panel h2 {
    margin: 14px 0 10px;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: clamp(24px, 3vw, 36px);
    line-height: 1.05;
    letter-spacing: 0;
  }

  .package-card {
    display: grid;
    gap: 16px;
    align-content: start;
  }

  .package-card p {
    display: grid;
    gap: 7px;
    margin: 0;
    color: var(--color-clear-grey, #636363);
    line-height: 1.5;
  }

  .package-card strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.9rem;
  }

  .runbook-card {
    display: grid;
    gap: 14px;
  }

  .runbook-card p {
    margin: 0;
    max-width: 820px;
  }

  .runbook-card pre {
    overflow-x: auto;
    margin: 0;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-porcelain, #f9f9f9);
    padding: 18px;
  }

  .runbook-card code {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    line-height: 1.65;
    white-space: pre;
  }

  .access-table {
    display: grid;
    gap: 0;
    padding: 0;
    overflow: hidden;
  }

  .access-table article {
    display: grid;
    grid-template-columns: 0.6fr 1fr 1.2fr 1.4fr;
    gap: 18px;
    align-items: start;
    padding: 20px;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .access-table article:first-child {
    border-top: 0;
  }

  .access-table p {
    display: grid;
    gap: 5px;
    margin: 0;
    color: var(--color-clear-grey, #636363);
    line-height: 1.45;
  }

  .access-table strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.88rem;
  }

  .evidence-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .evidence-panel {
    padding: 24px;
  }

  .evidence-panel--accent {
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .evidence-list {
    display: grid;
    gap: 12px;
  }

  .evidence-list p {
    margin: 0;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
    padding-top: 12px;
  }

  @media (max-width: 980px) {
    .delivery-hero__inner,
    .artifact-grid,
    .layer-grid,
    .package-grid,
    .evidence-layout {
      grid-template-columns: 1fr;
    }

    .artifact-link,
    .artifact-link:nth-child(-n + 3),
    .artifact-link:nth-child(n + 4) {
      grid-column: auto;
    }

    .delivery-hero {
      min-height: auto;
    }

    .access-table article {
      grid-template-columns: 1fr;
    }
  }
</style>
