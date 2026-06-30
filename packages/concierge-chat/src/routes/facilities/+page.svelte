<script lang="ts">
  import { heroVisual } from '$lib/site/abundance';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';

  const pageTitle = 'For Facilities | Abundance Staffing';
  const pageDescription =
    'Nurse staffing support for facilities that need reliable coverage, clearer fit, and recruiter-reviewed placement support.';
  const pagePath = '/facilities';
  const pageImage = absoluteUrl(heroVisual.src);
  const facilityBenefits = [
    {
      label: '1',
      eyebrow: 'Coverage',
      title: 'Coverage when the schedule gets tight',
      body:
        'Share the unit, shift, timing, and credential needs. Abundance helps turn the open need into a clear staffing request.'
    },
    {
      label: '2',
      eyebrow: 'Fit',
      title: 'Better fit before the conversation starts',
      body:
        'See nurse context that matters for the role: specialty, availability, location, license, and schedule constraints.'
    },
    {
      label: '3',
      eyebrow: 'Follow-up',
      title: 'A staffing partner that stays organized',
      body:
        'Keep coverage priorities, candidate context, and recruiter follow-up in one place so your team can move faster.'
    }
  ];
  const serviceProof = [
    'Travel and per diem coverage',
    'Credential-aware matching',
    'Recruiter-reviewed placements',
    'Clear facility communication',
    'Private staffing conversations'
  ];
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Facility nurse staffing support',
      description: pageDescription,
      path: pagePath,
      audience: 'Healthcare facilities and staffing coordinators'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Facilities', path: pagePath }
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
      <h1 class="hero-content-title display">Nurse coverage without the scramble.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Abundance helps facilities find qualified nurses, clarify fit, and keep urgent staffing needs moving.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01"><div class="button-inside"><div class="button-text-01">Request staffing</div><div class="button-text-01">Request staffing</div></div></div>
          </a>
          <a href="/jobs" class="button-03 w-inline-block">
            <div class="button-outside-wrap"><div class="btn-text-outside-03"><div class="btn-text-inside-03"><div class="button-text-03">Browse roles</div><div class="button-text-03">Browse roles</div></div></div></div>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-process abundance-subpage-process">
  <div class="container-fluid for-works">
    <div class="abundance-process-head">
      <span>Facility staffing</span>
      <h2 class="works-title-02 heading-01">Built for teams that need coverage now.</h2>
      <p class="p1-regular">A clearer way to bring nurse availability, facility needs, and recruiter support together.</p>
    </div>
    <div class="works-items abundance-step-grid abundance-facility-grid">
      {#each facilityBenefits as step}
        <article class="works-item abundance-work-card abundance-step-card">
          <div class="abundance-work-top">
            <div class="abundance-step-number"><span>{step.label}</span></div>
            <span class="abundance-step-owner">{step.eyebrow}</span>
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
      <h2 class="heading-01">A service built around fit, speed, and trust.</h2>
      <div class="abundance-rule-strip">
        {#each serviceProof as item}
          <span>{item}</span>
        {/each}
      </div>
    </div>
  </div>
</section>
