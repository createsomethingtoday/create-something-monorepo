<script lang="ts">
  import { jobHighlights } from '$lib/site/abundance';
</script>

<svelte:head>
  <title>Nurse Jobs | Abundance Staffing</title>
  <meta
    name="description"
    content="Review sample nursing roles and start a guided Abundance Concierge application for recruiter review."
  />
</svelte:head>

<section class="page-hero compact">
  <div class="hero-copy">
    <div class="eyebrow">Nurse Jobs</div>
    <h1 class="page-title">Browse roles. Start with context.</h1>
    <p class="lede">
      Role cards should help nurses decide fit before they enter a staffing conversation.
    </p>
  </div>
  <div class="metric-stack">
    <div>
      <span>Serving source</span>
      <strong>D1 public jobs</strong>
    </div>
    <div>
      <span>Agent action</span>
      <strong>Read-only discovery</strong>
    </div>
    <div>
      <span>Next step</span>
      <strong>Concierge application</strong>
    </div>
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Open Role Pattern</div>
    <h2>Sample roles.</h2>
  </div>
  <div class="job-grid">
    {#each jobHighlights as job}
      <article class="job-card">
        <div>
          <span>{job.term}</span>
          <h3>{job.role}</h3>
          <p>{job.location}</p>
        </div>
        <p>{job.detail}</p>
        <a class="link-secondary" href="/apply">Start with this role</a>
      </article>
    {/each}
  </div>
</section>

<section class="split-section">
  <div>
    <div class="eyebrow">Production Contract</div>
    <h2>Public search stays read-only.</h2>
  </div>
  <p class="lede small">
    Job discovery reads from Abundance-controlled data. Paid refreshes stay behind staff access.
  </p>
</section>
