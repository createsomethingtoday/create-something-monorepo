<script lang="ts">
  import { nurseSteps, trustProof } from '$lib/site/abundance';
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>For Nurses | Abundance Staffing</title>
  <meta
    name="description"
    content="Start a nurse staffing application with Abundance Concierge, confirm your profile, and move into recruiter review."
  />
</svelte:head>

<section class="hero-03 container-full abundance-subpage-hero">
  <div class="container-fluid">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Start with the contract you want.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Share role, shift, location, and timing. Abundance turns it into a recruiter-ready path.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01"><div class="button-inside"><div class="button-text-01">Start application</div><div class="button-text-01">Start application</div></div></div>
          </a>
          <a href="/jobs" class="button-03 w-inline-block">
            <div class="button-outside-wrap"><div class="btn-text-outside-03"><div class="btn-text-inside-03"><div class="button-text-03">Browse jobs</div><div class="button-text-03">Browse jobs</div></div></div></div>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-process">
  <div class="container-fluid for-works">
    <h2 class="works-title-02 heading-01">Four simple steps</h2>
    <div class="works-items">
      {#each nurseSteps as step}
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
      <h2 class="heading-01">Protected only when needed</h2>
      <div class="abundance-rule-strip">
        {#each trustProof.slice(1, 4) as item}
          <span>{item}</span>
        {/each}
      </div>
    </div>
  </div>
</section>
