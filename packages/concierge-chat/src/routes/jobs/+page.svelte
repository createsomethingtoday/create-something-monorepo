<script lang="ts">
  import { heroVisual } from '$lib/site/abundance';
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
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>{pageTitle}</title>
  <meta
    name="description"
    content={pageDescription}
  />
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

<section class="hero-03 container-full abundance-subpage-hero">
  <div class="container-fluid">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Browse roles. Start with context.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          A database preview of the roles nurses can start from with Abundance.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01"><div class="button-inside"><div class="button-text-01">Start application</div><div class="button-text-01">Start application</div></div></div>
          </a>
          <a href="/nurses" class="button-03 w-inline-block">
            <div class="button-outside-wrap"><div class="btn-text-outside-03"><div class="btn-text-inside-03"><div class="button-text-03">Nurse path</div><div class="button-text-03">Nurse path</div></div></div></div>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="feature-doctors container-full abundance-roles">
  <div class="feature-doctor-content">
    <div class="feature-dr-head">
      <div>
        <div class="abundance-section-label">Database preview</div>
        <h2 class="heading-01">20 nursing jobs from Abundance</h2>
      </div>
      <p class="feature-dr-text p1-regular">
        Pulled on page load from the Abundance jobs database. Start with a role, then Abundance
        collects the context recruiters need.
      </p>
    </div>
    {#if publicJobs.length > 0}
      <div class="abundance-job-meta">
        <span>{publicJobs.length} open roles</span>
        <span>Fresh server-side pull</span>
        <span>Read-only public results</span>
        <span>Recruiter review before any match</span>
      </div>
      <div class="abundance-job-list">
        {#each publicJobs as job}
          <article class="abundance-job-card">
            <div class="abundance-job-card-top">
              <span class="abundance-job-eyebrow">Open role</span>
            </div>
            <div>
              <h3 class="heading-05">{job.title}</h3>
              <p class="p2-regular abundance-job-location">
                {[job.employer, job.display_location].filter(Boolean).join(' / ')}
              </p>
            </div>
            {#if summarizeJob(job)}
              <p class="p2-regular abundance-job-detail">{summarizeJob(job)}</p>
            {/if}
            <div class="abundance-job-actions">
              <a href={`/apply?job_id=${encodeURIComponent(job.id)}`} class="abundance-text-link">Start with this role</a>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="abundance-job-empty">
        <h3 class="heading-05">Job inventory is temporarily unavailable.</h3>
        <p class="p2-regular">
          The production site reads open nurse roles from the server-side Abundance jobs database.
          Start the application and Abundance can still capture role, location, shift, and timing.
        </p>
        <a href="/apply" class="abundance-text-link">Start application</a>
      </div>
    {/if}
  </div>
</section>

<style>
  .abundance-section-label {
    margin-bottom: 0.65rem;
    color: var(--brand);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .abundance-job-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin: 2rem 0 1.25rem;
  }

  .abundance-job-meta span {
    border: 1px solid rgba(176, 122, 80, 0.22);
    border-radius: 999px;
    padding: 0.5rem 0.8rem;
    color: var(--muted);
    font-size: 0.86rem;
  }

  .abundance-job-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .abundance-job-card {
    min-height: 17rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .abundance-job-card-top {
    display: block;
  }

  .abundance-job-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .abundance-job-eyebrow {
    color: var(--brand);
    font-size: 0.82rem;
  }

  .abundance-job-detail {
    color: var(--muted);
  }

  .abundance-job-empty {
    margin-top: 2rem;
    border: 1px solid rgba(176, 122, 80, 0.18);
    border-radius: 1.25rem;
    padding: 2rem;
    background: rgba(255, 250, 244, 0.72);
  }

  @media (max-width: 900px) {
    .abundance-job-list {
      grid-template-columns: 1fr;
    }
  }
</style>
