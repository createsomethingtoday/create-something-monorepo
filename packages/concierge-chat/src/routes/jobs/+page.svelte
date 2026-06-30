<script lang="ts">
  import { jobHighlights } from '$lib/site/abundance';
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>Nurse Jobs | Abundance Staffing</title>
  <meta
    name="description"
    content="Review sample nursing roles and start a guided Abundance Concierge application for recruiter review."
  />
</svelte:head>

<section class="hero-03 container-full abundance-subpage-hero">
  <div class="container-fluid">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Browse roles. Start with context.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Sample roles show the kind of fit context Abundance captures before recruiter review.
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
      <h2 class="heading-01">Representative nursing roles</h2>
      <p class="feature-dr-text p1-regular">Use these as starting points. Live matching still moves through Abundance review.</p>
    </div>
    <div class="abundance-job-list">
      {#each jobHighlights as job}
        <article class="abundance-job-card">
          <div>
            <span class="abundance-text-link">{job.term}</span>
            <h3 class="heading-05">{job.role}</h3>
            <p class="p2-regular abundance-job-location">{job.location}</p>
          </div>
          <p class="p2-regular">{job.detail}</p>
          <a href="/apply" class="abundance-text-link">Start with this role</a>
        </article>
      {/each}
    </div>
  </div>
</section>
