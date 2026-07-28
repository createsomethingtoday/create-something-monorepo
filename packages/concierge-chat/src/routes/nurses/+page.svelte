<script lang="ts">
  import { nurseSteps, publicHeroVisuals, trustProof } from '$lib/site/abundance';
  import '$lib/site/public-page.css';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';

  const pageTitle = 'For Nurses | Abundance Staffing';
  const pageDescription =
    'Start a nurse staffing application with Abundance, share role and shift preferences, and move into recruiter-reviewed matching when ready.';
  const pagePath = '/nurses';
  const pageVisual = publicHeroVisuals.nurses;
  const pageImage = absoluteUrl(pageVisual.src);
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Guided nurse staffing application',
      description: pageDescription,
      path: pagePath,
      audience: 'Registered nurses and travel nurses'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Nurses', path: pagePath }
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
        <span class="public-kicker">For nurses</span>
        <h1 class="public-title">Start with the contract <em>you want.</em></h1>
        <p class="public-lede">
          Share role, shift, location, and timing in plain language. Concierge turns the details
          into a recruiter-ready path without making you complete a long intake form first.
        </p>
        <div class="public-actions">
          <a class="public-button primary" href="/apply">
            <span>Start an application</span>
            <span class="public-button-arrow" aria-hidden="true">↗</span>
          </a>
          <a class="public-button secondary" href="/jobs">Browse open roles</a>
        </div>
        <div class="public-trust-inline" aria-label="Nurse application safeguards">
          <span>No account required</span>
          <span>Private by default</span>
          <span>Recruiter-reviewed</span>
        </div>
      </div>

      <div class="public-visual" aria-label="Guided nurse application preview">
        <div class="public-visual-frame">
          <img src={pageVisual.src} alt={pageVisual.alt} />
        </div>
        <div class="public-visual-note">
          <div class="public-visual-note-head">
            <div>
              <span class="public-mini-label">Your application</span>
              <strong>One guided thread</strong>
            </div>
            <span class="public-visual-mark" aria-hidden="true">A</span>
          </div>
          <p>
            Start with fit. Add identity, documents, and consent only when the next step needs them.
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="public-section deep">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">The nurse path</span>
          <h2 class="public-section-title">Clear at every <em>next step.</em></h2>
        </div>
        <p class="public-section-copy">
          Concierge organizes the profile and keeps gaps visible. Verification waits until a
          protected action needs it, and a recruiter owns the staffing decision.
        </p>
      </div>

      <div class="public-step-list">
        {#each nurseSteps as step}
          <article class="public-step-row">
            <span>0{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="public-section bright">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Built around trust</span>
          <h2 class="public-section-title">Protected only when needed.</h2>
        </div>
        <p class="public-section-copy">
          The public experience stays easy to enter. Sensitive records and consequential actions
          stay behind the right access and human review.
        </p>
      </div>

      <div class="public-proof-list">
        {#each trustProof.slice(1, 4) as item, index}
          <div class="public-proof-row">
            <span>0{index + 1}</span>
            <strong>{item}</strong>
            <span
              >{index === 0
                ? 'A recruiter reviews fit before staffing moves.'
                : index === 1
                  ? 'Uploads unlock only inside a verified session.'
                  : 'Discovery remains read-only until you choose to apply.'}</span
            >
          </div>
        {/each}
      </div>
    </div>
  </section>
</div>
