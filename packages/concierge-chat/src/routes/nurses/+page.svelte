<script lang="ts">
  import { nurseSteps, trustProof } from '$lib/site/abundance';
</script>

<svelte:head>
  <title>For Nurses | Abundance Staffing</title>
  <meta
    name="description"
    content="Start a nurse staffing application with Abundance Concierge, confirm your profile, and move into recruiter review when the workflow is ready."
  />
</svelte:head>

<section class="page-hero">
  <div class="hero-copy">
    <div class="eyebrow">For Nurses</div>
    <h1 class="page-title">Start with the contract you want. Concierge builds the application around it.</h1>
    <p class="lede">
      Abundance is built for nurses who should not have to repeat the same intake details across
      every staffing handoff. Start with plain language, verify only when needed, and keep the
      recruiter review boundary visible.
    </p>
    <div class="hero-actions">
      <a class="link-button" href="/apply">Start an application</a>
      <a class="link-secondary" href="/jobs">Browse sample roles</a>
    </div>
  </div>

  <div class="proof-panel">
    <div class="eyebrow">Application Path</div>
    <h2>Profile, documents, and recruiter review stay in one thread.</h2>
    <ul>
      {#each trustProof.slice(1, 4) as item}
        <li>{item}</li>
      {/each}
    </ul>
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">How It Works</div>
    <h2>One guided nurse path</h2>
  </div>
  <div class="feature-grid four">
    {#each nurseSteps as step}
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
    <div class="eyebrow">What Concierge Captures</div>
    <h2>Enough context to help a recruiter without turning the nurse into a data-entry clerk.</h2>
  </div>
  <div class="check-grid">
    <span>Specialty and unit experience</span>
    <span>Shift, location, and start window</span>
    <span>Compact license and credential status</span>
    <span>Documents when the secure step appears</span>
    <span>Consent and recruiter review scheduling</span>
    <span>Staffing packet handoff state</span>
  </div>
</section>
