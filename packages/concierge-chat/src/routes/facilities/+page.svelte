<script lang="ts">
  import { facilitySteps, trustProof } from '$lib/site/abundance';
</script>

<svelte:head>
  <title>For Facilities | Abundance Staffing</title>
  <meta
    name="description"
    content="Request nurse staffing with Abundance and keep role needs, approvals, and recruiter handoffs visible."
  />
</svelte:head>

<section class="page-hero">
  <div class="hero-copy">
    <div class="eyebrow">For Facilities</div>
    <h1 class="page-title">Request coverage with the handoff clear.</h1>
    <p class="lede">
      Capture the role, schedule, credentials, urgency, owner, and review status in one place.
    </p>
    <div class="hero-actions">
      <a class="link-button" href="/apply">Start a staffing conversation</a>
      <a class="link-secondary" href="/agents">Review agent roles</a>
    </div>
  </div>

  <div class="proof-panel">
    <div class="eyebrow">Facility Trust</div>
    <h2>Software prepares. Recruiters approve.</h2>
    <ul>
      {#each trustProof as item}
        <li>{item}</li>
      {/each}
    </ul>
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Request Flow</div>
    <h2>From need to handoff.</h2>
  </div>
  <div class="feature-grid">
    {#each facilitySteps as step}
      <article class="feature-card">
        <span class="step-marker">{step.label}</span>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </article>
    {/each}
  </div>
</section>

<section class="split-section">
  <div>
    <div class="eyebrow">What Facilities Should See</div>
    <h2>What stays visible.</h2>
  </div>
  <div class="check-grid">
    <span>Request staffing</span>
    <span>Credential expectations</span>
    <span>Recruiter owner</span>
    <span>Candidate status</span>
    <span>Approval gate</span>
    <span>Audit trail</span>
  </div>
</section>
