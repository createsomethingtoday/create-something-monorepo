<script lang="ts">
  import { SEO } from '@create-something/canon';

  const artifactLinks = [
    {
      label: 'Abundance Concierge live app',
      href: 'https://abundance-concierge-chat.pages.dev/',
      meta: 'Live nurse-facing intake surface'
    },
    {
      label: 'Progress walkthrough',
      href: 'https://share.descript.com/view/RWYv3CqKbEC',
      meta: 'Current job/database workflow walkthrough'
    },
    {
      label: 'Pilot overview',
      href: 'https://share.descript.com/view/0wxPcYQzl8G',
      meta: 'Concierge pilot walkthrough'
    },
    {
      label: 'Generated delivery package',
      href: 'https://create-something-deliveries.pages.dev/projects/abundance/',
      meta: 'Portable monorepo-generated delivery page'
    }
  ];

  const operatingLayers = [
    {
      tier: 'Database',
      title: 'Created DB',
      status: 'Created',
      body:
        'The Abundance data layer captures profile context, intake history, matching state, and private source artifacts for the next staff/operator integration pass.'
    },
    {
      tier: 'Automation',
      title: 'Staff and Jobs MCP',
      status: 'Deployed endpoints',
      body:
        'Staff and jobs MCP endpoints are tracked as tokenless delivery artifacts. Credentials stay in secret storage and are not published in the delivery surface.'
    },
    {
      tier: 'Judgment',
      title: 'Agent Boundary',
      status: 'Ready for review',
      body:
        'The agent supports intake, shortlist, missing-information flags, and recruiter review. It does not autonomously make staffing decisions.'
    }
  ];

  const privateArtifacts = [
    'Paylocity active-headcount CSV received for private staff/operator context.',
    'Dify Abundance staff-agent configuration is tracked as an external operational artifact.',
    'MCP credentials should be verified from Infisical before live agent smoke tests.',
    'Any token shared outside secret storage should be rotated before production reliance.'
  ];

  const nextReview = [
    'Confirm how Paylocity fields map into staff/operator records.',
    'Verify Staff MCP and Jobs MCP credentials from Infisical.',
    'Walk through the live app, generated delivery package, and MCP boundaries with NPG.',
    'Decide which operator roster receives MCP/database access.'
  ];
</script>

<SEO
  title="Abundance Delivery | The NP Group"
  description="Client delivery page for The NP Group's Abundance nurse staffing system: live concierge app, database, MCP surfaces, agent boundary, walkthroughs, and private source artifacts."
  keywords="Abundance, The NP Group, nurse staffing, MCP, workflow delivery, CREATE SOMETHING"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Client Delivery</span>
      <h1>Abundance nurse staffing system.</h1>
      <p>
        The NP Group now has a live concierge app, a repo-backed database, Staff and Jobs MCP
        endpoint references, walkthrough artifacts, and a clear agent boundary for recruiter-led
        review.
      </p>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <span class="status-dot"></span>
      <p><strong>Client</strong><span>The NP Group / NPG</span></p>
      <p><strong>Owner</strong><span>CREATE SOMETHING</span></p>
      <p><strong>Phase</strong><span>Build / delivery review</span></p>
      <p><strong>Private data</strong><span>Paylocity export received</span></p>
    </aside>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Artifacts</span>
      <h2>What is ready to review.</h2>
      <p>
        These links are client-safe. Token-bearing MCP URLs, employee rows, and private Notion
        details are intentionally excluded.
      </p>
    </div>

    <div class="artifact-grid">
      {#each artifactLinks as artifact}
        <a class="artifact-link product-surface" href={artifact.href} target="_blank" rel="noreferrer">
          <span>{artifact.meta}</span>
          <strong>{artifact.label}</strong>
        </a>
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
      {#each operatingLayers as layer}
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
      <h2>Received, but not published.</h2>
      <div class="evidence-list">
        {#each privateArtifacts as item}
          <p>{item}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Next Review</span>
      <h2>What needs a human decision.</h2>
      <div class="evidence-list">
        {#each nextReview as item}
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
    max-width: 720px;
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 64px);
    line-height: 1;
    letter-spacing: 0;
  }

  .artifact-grid,
  .layer-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .layer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .artifact-link {
    display: grid;
    min-height: 170px;
    align-content: space-between;
    padding: 20px;
    text-decoration: none;
  }

  .artifact-link span,
  .layer-tier,
  .layer-status {
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

  .layer-card {
    padding: 24px;
    border-top: 4px solid rgba(167, 184, 255, 0.76);
  }

  .layer-card h3,
  .evidence-panel h2 {
    margin: 14px 0 10px;
    font-size: clamp(24px, 3vw, 36px);
    line-height: 1.05;
    letter-spacing: 0;
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
    border-top: 4px solid rgba(247, 200, 115, 0.8);
  }

  .evidence-list {
    display: grid;
    gap: 12px;
  }

  .evidence-list p {
    margin: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 12px;
  }

  @media (max-width: 980px) {
    .delivery-hero__inner,
    .artifact-grid,
    .layer-grid,
    .evidence-layout {
      grid-template-columns: 1fr;
    }

    .delivery-hero {
      min-height: auto;
    }
  }
</style>
