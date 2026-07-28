<script lang="ts">
  import { heroVisual } from '$lib/site/abundance';
  import '$lib/site/public-page.css';
  import {
    absoluteUrl,
    breadcrumbJsonLd,
    jobItemListJsonLd,
    jsonLdScript,
    serviceJsonLd
  } from '$lib/site/seo';
  import type { PageData } from './$types';

  export let data: PageData;

  const publicJobs = data.publicJobs.jobs;
  const pageTitle = 'Nurse Jobs | Abundance Staffing';
  const pageDescription =
    'Preview 20 open nursing jobs from the Abundance public jobs database, then start a guided nurse staffing application for recruiter review.';
  const pagePath = '/jobs';
  const pageImage = absoluteUrl(heroVisual.src);
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Public nursing job discovery',
      description: pageDescription,
      path: pagePath,
      audience: 'Registered nurses and nurse staffing candidates'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Jobs', path: pagePath }
    ]),
    ...(publicJobs.length > 0 ? [jobItemListJsonLd(publicJobs)] : [])
  ]);

  function summarizeJob(job: (typeof publicJobs)[number]) {
    return [job.employment_type, job.shift, job.specialty ?? job.discipline]
      .filter(Boolean)
      .slice(0, 3)
      .join(' / ');
  }
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
        <span class="public-kicker">Open nurse roles</span>
        <h1 class="public-title">Browse roles. Start with <em>context.</em></h1>
        <p class="public-lede">
          See the current Abundance job inventory before you apply. Choose a useful starting point,
          then tell Concierge what would make the role fit—or not fit—your life.
        </p>
        <div class="public-actions">
          <a class="public-button primary" href="/apply">
            <span>Start an application</span>
            <span class="public-button-arrow" aria-hidden="true">↗</span>
          </a>
          <a class="public-button secondary" href="/nurses">See the nurse path</a>
        </div>
        <div class="public-trust-inline" aria-label="Public jobs safeguards">
          <span>Fresh server-side pull</span>
          <span>Read-only results</span>
          <span>Recruiter review before matching</span>
        </div>
      </div>

      <div class="public-visual" aria-label="Abundance jobs database preview">
        <div class="public-visual-frame">
          <img src={heroVisual.src} alt={heroVisual.alt} />
        </div>
        <div class="public-database-panel">
          <span class="public-mini-label">Database preview</span>
          <div class="public-database-stat">
            <strong>{publicJobs.length}</strong>
            <span>open roles available in this public view</span>
          </div>
          <div class="public-database-rules">
            <span>Live inventory, loaded on the server</span>
            <span>Application context stays separate until you choose a role</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="public-section bright">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Available now</span>
          <h2 class="public-section-title">Nursing jobs from Abundance.</h2>
        </div>
        <p class="public-section-copy">
          Start from a specific opening or begin with your preferences. Concierge keeps role context
          together before a recruiter reviews the fit.
        </p>
      </div>

      {#if publicJobs.length > 0}
        <div class="public-data-list">
          {#each publicJobs as job, index}
            <article class="public-data-row">
              <span class="public-data-index">{String(index + 1).padStart(2, '0')}</span>
              <div class="public-data-copy">
                <h3>{job.title}</h3>
                <p>{[job.employer, job.display_location].filter(Boolean).join(' / ')}</p>
              </div>
              <span class="public-data-meta"
                >{summarizeJob(job) || 'Details available in application'}</span
              >
              <a class="public-data-link" href={`/apply?job_id=${encodeURIComponent(job.id)}`}
                >Start with this role ↗</a
              >
            </article>
          {/each}
        </div>
      {:else}
        <div class="public-empty">
          <span class="public-mini-label">Inventory unavailable</span>
          <h3>Job inventory is temporarily unavailable.</h3>
          <p>
            The production site reads open nurse roles from the server-side Abundance jobs database.
            Concierge can still capture role, location, shift, and timing while inventory recovers.
          </p>
          <a class="public-data-link" href="/apply">Start an application ↗</a>
        </div>
      {/if}
    </div>
  </section>

  <section class="public-section deep">
    <div class="public-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">From listing to conversation</span>
          <h2 class="public-section-title">A role is a starting point, not a staffing decision.</h2>
        </div>
        <p class="public-section-copy">
          Public results help nurses orient. Recruiters still review experience, credentials,
          availability, and fit before any staffing move.
        </p>
      </div>
      <div class="public-pill-row">
        <span>Public inventory stays read-only</span>
        <span>Fit context comes from the nurse</span>
        <span>Recruiters make the call</span>
      </div>
    </div>
  </section>
</div>
