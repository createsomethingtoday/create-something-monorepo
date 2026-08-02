<script lang="ts">
  import {
    abundanceAgents,
    publicHeroVisuals,
    staffingCareCards,
    trustProof
  } from '$lib/site/abundance';
  import '$lib/site/public-page.css';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';
  import type { PageData } from './$types';

  export let data: PageData;

  const pageTitle = 'Abundance Agents | Staffing Desk Support';
  const pageDescription =
    'Abundance-branded staffing agents help nurses start clearly, facilities request coverage, and recruiters review prepared handoffs.';
  const pagePath = '/agents';
  const pageVisual = publicHeroVisuals.agents;
  const pageImage = absoluteUrl(pageVisual.src);
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Abundance staffing agent support',
      description: pageDescription,
      path: pagePath,
      audience: 'Staffing recruiters and operations teams'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Agents', path: pagePath }
    ])
  ]);
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <link rel="canonical" href={absoluteUrl(pagePath)} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Abundance Staffing" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={absoluteUrl(pagePath)} />
  <meta property="og:image" content={pageImage} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={pageDescription} />
  <meta name="twitter:image" content={pageImage} />
  {@html structuredData}
</svelte:head>

<div class="public-page">
  <section class="public-hero">
    <div class="public-shell public-hero-grid">
      <div class="public-hero-copy">
        <span class="public-kicker">The Abundance agent system</span>
        <h1 class="public-title">Support for better staffing <em>conversations.</em></h1>
        <p class="public-lede">
          Abundance agents organize role, fit, credential, and coverage context. Nurses, facilities,
          and recruiters keep the judgment that belongs with people.
        </p>
        <div class="public-actions">
          <a class="public-button primary" href="/apply">
            <span>Start an application</span>
            <span class="public-button-arrow" aria-hidden="true">↗</span>
          </a>
          <a
            class="public-button secondary"
            href={data.controlPlaneHref}
            target="_blank"
            rel="noreferrer">Staff access ↗</a
          >
        </div>
        <div class="public-trust-inline" aria-label="Agent system boundaries">
          <span>Named lanes</span>
          <span>Visible handoffs</span>
          <span>Human decisions</span>
        </div>
      </div>

      <div class="public-visual" aria-label="Abundance recruiter handoff preview">
        <div class="public-visual-frame">
          <img src={pageVisual.src} alt={pageVisual.alt} />
        </div>
        <div class="public-visual-note">
          <div class="public-visual-note-head">
            <div>
              <span class="public-mini-label">{abundanceAgents.length} focused agents</span>
              <strong>One human decision boundary</strong>
            </div>
            <span class="public-visual-mark" aria-hidden="true">A</span>
          </div>
          <p>Agents prepare the request, profile, and evidence. Recruiters decide what moves.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="public-section bright">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">The roster</span>
          <h2 class="public-section-title">Useful support, clearly bounded.</h2>
        </div>
        <p class="public-section-copy">
          Each agent owns one preparation lane: clarify the request, keep context together, and make
          the next human review easier to see.
        </p>
      </div>

      <div class="public-agent-grid">
        {#each abundanceAgents as agent}
          <article class="public-agent-card">
            <div class="public-agent-card-head">
              <span class="public-agent-lane">{agent.lane}</span>
              <span class="public-agent-mark" aria-hidden="true">A</span>
            </div>
            <div>
              <h3>{agent.name}</h3>
              <p>{agent.summary}</p>
              <span class="public-agent-proof">{agent.proof}</span>
            </div>
          </article>
        {/each}
      </div>

      <a class="npg-delivery-card" href="/client-service">
        <span class="npg-delivery-mark" aria-hidden="true">
          <img src="/npg-client-service/logo-mark.png" alt="" />
        </span>
        <div>
          <span class="npg-delivery-index">Client delivery 01</span>
          <h2>NPG Client Service Representative</h2>
          <p>
            A dedicated voice agent for Loyal Source location assistance, shared-office access, and
            controlled attendance handoffs.
          </p>
        </div>
        <span class="npg-delivery-action">Open live experience ↗</span>
      </a>
    </div>
  </section>

  <section class="public-section deep">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Both sides of the desk</span>
          <h2 class="public-section-title">The right context for each person.</h2>
        </div>
        <p class="public-section-copy">
          Nurses get a clearer start. Facilities get cleaner coverage requests. Recruiters get a
          prepared handoff instead of a loose thread.
        </p>
      </div>

      <div class="public-lane-grid">
        {#each staffingCareCards as card}
          <a class="public-lane-card" href={card.href}>
            <img src={card.image} alt="" />
            <span class="public-lane-shade"></span>
            <span class="public-lane-copy">
              <strong>{card.title}</strong>
              <span>{card.body}</span>
            </span>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <section class="public-section bright">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Protection by design</span>
          <h2 class="public-section-title">Public where useful. Protected where necessary.</h2>
        </div>
        <p class="public-section-copy">
          Public pages explain the service. Documents, keys, private records, and staffing actions
          stay behind the appropriate staff or verified applicant access.
        </p>
      </div>

      <div class="public-proof-list">
        {#each trustProof.slice(0, 4) as item, index}
          <div class="public-proof-row">
            <span>0{index + 1}</span>
            <strong>{item}</strong>
            <span
              >{index === 0
                ? 'Service credentials never ship into public browser code.'
                : index === 1
                  ? 'Recruiters own consequential staffing calls.'
                  : index === 2
                    ? 'Sensitive uploads require a verified applicant session.'
                    : 'Discovery can inform a choice without mutating inventory.'}</span
            >
          </div>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .npg-delivery-card {
    display: grid;
    grid-template-columns: 84px 1fr auto;
    gap: 32px;
    align-items: center;
    margin-bottom: clamp(72px, 8vw, 110px);
    padding: clamp(28px, 4vw, 46px);
    border-radius: 30px;
    background:
      radial-gradient(circle at 90% 10%, rgba(29, 111, 138, 0.2), transparent 28%), #020202;
    color: white;
    text-decoration: none;
    transition: transform 160ms ease;
  }

  .npg-delivery-card:hover {
    transform: translateY(-3px);
  }

  .npg-delivery-mark {
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    background: #fffaf4;
  }

  .npg-delivery-mark img {
    width: 58px;
    height: 58px;
  }

  .npg-delivery-index,
  .npg-delivery-action {
    color: #d7b79e;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .npg-delivery-card h2 {
    margin: 9px 0 10px;
    font-size: clamp(1.8rem, 3vw, 3.2rem);
    font-weight: 560;
    letter-spacing: -0.055em;
  }

  .npg-delivery-card p {
    max-width: 760px;
    margin: 0;
    color: rgba(255, 255, 255, 0.58);
    line-height: 1.55;
  }

  .npg-delivery-action {
    white-space: nowrap;
  }

  @media (max-width: 800px) {
    .npg-delivery-card {
      grid-template-columns: 1fr;
      gap: 20px;
    }
  }
</style>
