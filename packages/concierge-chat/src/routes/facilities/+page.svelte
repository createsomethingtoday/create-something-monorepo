<script lang="ts">
  import { staffingCareCards } from '$lib/site/abundance';
  import '$lib/site/public-page.css';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';

  const pageTitle = 'For Facilities | Abundance Staffing';
  const pageDescription =
    'Nurse staffing support for facilities that need reliable coverage, clearer fit, and recruiter-reviewed placement support.';
  const pagePath = '/facilities';
  const facilityVisual = staffingCareCards[1];
  const pageImage = absoluteUrl(facilityVisual.image);
  const facilityBenefits = [
    {
      label: '1',
      eyebrow: 'Coverage',
      title: 'Coverage when the schedule gets tight',
      body: 'Share the unit, shift, timing, and credential needs. Abundance helps turn the open need into a clear staffing request.'
    },
    {
      label: '2',
      eyebrow: 'Fit',
      title: 'Better fit before the conversation starts',
      body: 'See nurse context that matters for the role: specialty, availability, location, license, and schedule constraints.'
    },
    {
      label: '3',
      eyebrow: 'Follow-up',
      title: 'A staffing partner that stays organized',
      body: 'Keep coverage priorities, candidate context, and recruiter follow-up in one place so your team can move faster.'
    }
  ];
  const serviceProof = [
    'Travel and per diem coverage',
    'Credential-aware matching',
    'Recruiter-reviewed placements',
    'Clear facility communication',
    'Private staffing conversations'
  ];
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Facility nurse staffing support',
      description: pageDescription,
      path: pagePath,
      audience: 'Healthcare facilities and staffing coordinators'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Facilities', path: pagePath }
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
        <span class="public-kicker">For facilities</span>
        <h1 class="public-title">Coverage without the <em>scramble.</em></h1>
        <p class="public-lede">
          Bring the unit, shift, urgency, credentials, and approval owner together from the start.
          Abundance prepares the request so a recruiter can move with the full context.
        </p>
        <div class="public-actions">
          <a class="public-button primary" href="/apply">
            <span>Request coverage</span>
            <span class="public-button-arrow" aria-hidden="true">↗</span>
          </a>
          <a class="public-button secondary" href="/agents">See the staffing system</a>
        </div>
        <div class="public-trust-inline" aria-label="Facility staffing safeguards">
          <span>Named request owner</span>
          <span>Credential-aware</span>
          <span>Recruiter-reviewed</span>
        </div>
      </div>

      <div class="public-visual" aria-label="Facility staffing request preview">
        <div class="public-visual-frame">
          <img
            src={facilityVisual.image}
            alt="Healthcare staffing coordinator reviewing a coverage request"
          />
        </div>
        <div class="public-visual-note">
          <div class="public-visual-note-head">
            <div>
              <span class="public-mini-label">Coverage request</span>
              <strong>Need, timing, owner</strong>
            </div>
            <span class="public-visual-mark" aria-hidden="true">A</span>
          </div>
          <p>Urgency stays visible without letting speed erase credentials, fit, or approval.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="public-section bright">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Facility staffing</span>
          <h2 class="public-section-title">Built for teams that need coverage now.</h2>
        </div>
        <p class="public-section-copy">
          A clearer way to bring nurse availability, facility needs, and recruiter support together
          without losing the boundary between preparation and decision.
        </p>
      </div>

      <div class="public-card-grid">
        {#each facilityBenefits as benefit, index}
          <article class:featured={index === 1} class="public-card">
            <div class="public-card-head">
              <span class="public-card-index">0{benefit.label}</span>
              <span class="public-card-owner">{benefit.eyebrow}</span>
            </div>
            <div>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="public-section deep">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Service standard</span>
          <h2 class="public-section-title">Fit, speed, and trust stay together.</h2>
        </div>
        <p class="public-section-copy">
          Coverage can move quickly while the request remains explicit about credentials, human
          review, and private staffing conversations.
        </p>
      </div>
      <div class="public-pill-row" aria-label="Facility service standards">
        {#each serviceProof as item}
          <span>{item}</span>
        {/each}
      </div>
    </div>
  </section>
</div>
