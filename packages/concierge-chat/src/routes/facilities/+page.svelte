<script lang="ts">
  import { facilitySteps, trustProof } from '$lib/site/abundance';
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>For Facilities | Abundance Staffing</title>
  <meta
    name="description"
    content="Request nurse staffing with Abundance and keep role needs, approvals, and recruiter handoffs visible."
  />
</svelte:head>

<section class="hero-03 container-full abundance-subpage-hero">
  <div class="container-fluid">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Request coverage with the handoff clear.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Capture role, schedule, credentials, urgency, owner, and review status in one place.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01"><div class="button-inside"><div class="button-text-01">Request staffing</div><div class="button-text-01">Request staffing</div></div></div>
          </a>
          <a href="/agents" class="button-03 w-inline-block">
            <div class="button-outside-wrap"><div class="btn-text-outside-03"><div class="btn-text-inside-03"><div class="button-text-03">Agent roles</div><div class="button-text-03">Agent roles</div></div></div></div>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-process">
  <div class="container-fluid for-works">
    <h2 class="works-title-02 heading-01">From need to handoff</h2>
    <div class="works-items">
      {#each facilitySteps as step}
        <article class="works-item abundance-work-card">
          <div class="works-item-thumb-wrap abundance-step-number"><span>{step.label}</span></div>
          <div class="works-item-info">
            <h3 class="works-item-info-title heading-05">{step.title}</h3>
            <p class="works-itm-info-text p2-regular">{step.body}</p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="feature-blog-04 container-full abundance-proof">
  <div class="container-fluid">
    <div class="feature-blog-content-04">
      <h2 class="heading-01">Software prepares. Recruiters approve.</h2>
      <div class="abundance-rule-strip">
        {#each trustProof as item}
          <span>{item}</span>
        {/each}
      </div>
    </div>
  </div>
</section>
