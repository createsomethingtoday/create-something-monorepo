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
    <h1 class="page-title">Search starts with jobs. Matching still ends with recruiter review.</h1>
    <p class="lede">
      The production Jobs Agent reads normalized public job data through the governed Abundance Jobs
      MCP. This page gives the public website a staffing-style jobs entry while keeping writes and
      paid ingest paths out of the browser.
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
    <h2>Role cards should make fit scannable before a nurse enters chat.</h2>
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
    <h2>Public search stays inexpensive and governed.</h2>
  </div>
  <p class="lede small">
    End-user job discovery should read from Abundance-controlled D1 data. Paid upstream refreshes
    remain behind authenticated admin ingestion, and zero-result searches should explain coverage
    before creating more vendor calls.
  </p>
</section>
