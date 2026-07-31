<script lang="ts">
  import { publicHeroVisuals } from '$lib/site/abundance';
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
  const pageVisual = publicHeroVisuals.jobs;
  const pageImage = absoluteUrl(pageVisual.src);
  const specialtyOptions = [
    ...new Set(
      publicJobs
        .map((job) => job.specialty ?? job.discipline)
        .filter((value): value is string => Boolean(value))
    )
  ].sort((left, right) => left.localeCompare(right));
  const shiftOptions = [
    ...new Set(publicJobs.map((job) => job.shift).filter((value): value is string => Boolean(value)))
  ].sort((left, right) => left.localeCompare(right));

  let searchQuery = '';
  let selectedSpecialty = 'all';
  let selectedShift = 'all';

  $: normalizedQuery = searchQuery.trim().toLowerCase();
  $: filteredJobs = publicJobs.filter((job) => {
    const searchableText = [
      job.title,
      job.employer,
      job.display_location,
      job.specialty,
      job.discipline,
      job.employment_type,
      job.shift
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const specialty = job.specialty ?? job.discipline ?? '';

    return (
      (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
      (selectedSpecialty === 'all' || specialty === selectedSpecialty) &&
      (selectedShift === 'all' || job.shift === selectedShift)
    );
  });
  $: filtersActive =
    Boolean(normalizedQuery) || selectedSpecialty !== 'all' || selectedShift !== 'all';

  function clearFilters() {
    searchQuery = '';
    selectedSpecialty = 'all';
    selectedShift = 'all';
  }
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
          <img src={pageVisual.src} alt={pageVisual.alt} />
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
        <div class="public-filter-panel" role="search" aria-label="Filter open nursing roles">
          <div class="public-filter-grid">
            <label class="public-filter-field search-field">
              <span>Search roles</span>
              <input
                type="search"
                placeholder="Try ICU, Austin, or nights"
                bind:value={searchQuery}
              />
            </label>
            <label class="public-filter-field">
              <span>Specialty</span>
              <select bind:value={selectedSpecialty}>
                <option value="all">All specialties</option>
                {#each specialtyOptions as specialty}
                  <option value={specialty}>{specialty}</option>
                {/each}
              </select>
            </label>
            <label class="public-filter-field">
              <span>Shift</span>
              <select bind:value={selectedShift}>
                <option value="all">All shifts</option>
                {#each shiftOptions as shift}
                  <option value={shift}>{shift}</option>
                {/each}
              </select>
            </label>
          </div>
          <div class="public-filter-status" role="status" aria-live="polite">
            <span><strong>{filteredJobs.length}</strong> of {publicJobs.length} open roles</span>
            {#if filtersActive}
              <button type="button" on:click={clearFilters}>Clear filters</button>
            {/if}
          </div>
        </div>

        {#if filteredJobs.length > 0}
          <div class="public-data-list filtered">
            {#each filteredJobs as job, index}
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
          <div class="public-empty filtered-empty">
            <span class="public-mini-label">No matching roles</span>
            <h3>Try a broader search.</h3>
            <p>
              Clear one or more filters, or start an application with your preferred specialty,
              shift, and location so a recruiter can review the fit.
            </p>
            <div class="public-filter-empty-actions">
              <button type="button" on:click={clearFilters}>Clear filters</button>
              <a class="public-data-link" href="/apply">Start with preferences ↗</a>
            </div>
          </div>
        {/if}
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
