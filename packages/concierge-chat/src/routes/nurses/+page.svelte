<script lang="ts">
  import { heroVisual, nurseSteps, trustProof } from '$lib/site/abundance';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';

  const pageTitle = 'For Nurses | Abundance Staffing';
  const pageDescription =
    'Start a nurse staffing application with Abundance, share role and shift preferences, and move into recruiter-reviewed matching when ready.';
  const pagePath = '/nurses';
  const pageImage = absoluteUrl(heroVisual.src);
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Guided nurse staffing application',
      description: pageDescription,
      path: pagePath,
      audience: 'Registered nurses and travel nurses'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Nurses', path: pagePath }
    ])
  ]);
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

<section class="works-02 container-full abundance-process abundance-subpage-process">
  <div class="container-fluid for-works">
    <div class="abundance-process-head">
      <span>Nurse path</span>
      <h2 class="works-title-02 heading-01">A clearer start, then recruiter review.</h2>
      <p class="p1-regular">Start with fit. Verification appears only when a protected step needs it.</p>
    </div>
    <div class="works-items abundance-step-grid">
      {#each nurseSteps as step}
        <article class="works-item abundance-work-card abundance-step-card">
          <div class="abundance-work-top">
            <div class="abundance-step-number"><span>{step.label}</span></div>
            <span class="abundance-step-owner">Nurse</span>
          </div>
          <div class="works-item-info">
            <h3 class="works-item-info-title heading-05">{step.title}</h3>
            <p class="works-itm-info-text p2-regular">{step.body}</p>
          </div>
          <span class="abundance-work-rule"></span>
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
