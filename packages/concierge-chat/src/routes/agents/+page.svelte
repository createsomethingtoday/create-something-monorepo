<script lang="ts">
  import { abundanceAgents, heroVisual, staffingCareCards, trustProof } from '$lib/site/abundance';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';
  import type { PageData } from './$types';

  export let data: PageData;

  const pageTitle = 'Abundance Agents | Staffing Desk Support';
  const pageDescription =
    'Abundance-branded staffing agents help nurses start clearly, facilities request coverage, and recruiters review prepared handoffs.';
  const pagePath = '/agents';
  const pageImage = absoluteUrl(heroVisual.src);
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Abundance staffing agent support',
      description: pageDescription,
      path: pagePath,
      audience: 'Staffing recruiters and operations teams'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Agents', path: pagePath }
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

<section class="hero-03 container-full abundance-agent-hero abundance-subpage-hero">
  <div class="container-fluid for-hero01">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Agent support for better staffing conversations.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Branded agents organize the details. Nurses, facilities, and recruiters keep the human judgment.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01">
              <div class="button-inside">
                <div class="button-text-01">Start application</div>
                <div class="button-text-01">Start application</div>
              </div>
            </div>
          </a>
          <a href={data.controlPlaneHref} target="_blank" rel="noreferrer" class="button-03 w-inline-block">
            <div class="button-outside-wrap">
              <div class="btn-text-outside-03">
                <div class="btn-text-inside-03">
                  <div class="button-text-03">Staff sign-in</div>
                  <div class="button-text-03">Staff sign-in</div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
    <div class="hero-thumb abundance-agent-thumb">
      <img src={heroVisual.src} alt={heroVisual.alt} class="hero-thumb-img" />
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-agent-roster">
  <div class="container-fluid for-works">
    <div class="works-content">
      <div class="abundance-agent-roster-head">
        <div>
          <span>Abundance agent system</span>
          <h2 class="works-title-02 heading-01">Useful support, clearly bounded.</h2>
        </div>
        <p class="p1-regular">
          Each agent has a job in the service: make the request clearer, keep context together, and prepare the next human review.
        </p>
      </div>
      <div class="abundance-agent-grid">
        {#each abundanceAgents as agent}
          <article class="abundance-agent-card">
            <div class="abundance-agent-card-top">
              <span class="abundance-agent-lane">{agent.lane}</span>
              <span class="abundance-agent-mark">A</span>
            </div>
            <div class="abundance-agent-card-body">
              <h3 class="heading-05">{agent.name}</h3>
              <p class="p2-regular">{agent.summary}</p>
            </div>
            <p class="abundance-agent-proof-line">{agent.proof}</p>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="support-02 container-full abundance-agent-boundary">
  <div class="container-fluid">
    <div class="support-head-02">
      <h2 class="support-title-02 heading-01">A better experience on both sides of the desk.</h2>
      <p class="support-text-02 p1-regular">
        Nurses get a clearer start. Facilities get cleaner coverage requests. Recruiters get the context they need to make the call.
      </p>
    </div>
    <div class="support-list-wrap abundance-agent-proof">
      {#each staffingCareCards as card}
        <a class="support-thumb-item abundance-agent-proof-card" href={card.href}>
          <img src={card.image} alt="" class="support-thumb-img" loading="lazy" />
          <span class="abundance-card-shade"></span>
          <span class="support-thumb-text heading-03">{card.title}</span>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="feature-blog-04 container-full abundance-staff-runtime">
  <div class="container-fluid">
    <div class="feature-blog-content-04">
      <div class="abundance-section-head">
        <h2 class="heading-01">Protected where staffing work needs protection.</h2>
        <p class="p1-regular">Public pages explain the service. Documents, keys, and staffing actions stay behind staff access.</p>
      </div>
      <div class="abundance-rule-strip" aria-label="Trust rules">
        {#each trustProof.slice(0, 4) as item}
          <span>{item}</span>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .abundance-agent-thumb {
    border-radius: 16px;
  }

  .abundance-agent-roster,
  .abundance-agent-boundary,
  .abundance-staff-runtime {
    padding-top: clamp(82px, 8vw, 116px);
    padding-bottom: clamp(82px, 8vw, 116px);
  }

  .abundance-agent-roster {
    background:
      radial-gradient(circle at 78% 20%, rgba(175, 124, 84, 0.12), transparent 28%),
      linear-gradient(180deg, var(--background, #faf5ef) 0%, #fbf7f1 100%);
  }

  .abundance-agent-roster .works-content {
    display: grid;
    gap: 42px;
  }

  .abundance-agent-roster-head {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(280px, 0.42fr);
    gap: clamp(20px, 5vw, 72px);
    align-items: end;
  }

  .abundance-agent-roster-head > div {
    display: grid;
    gap: 16px;
  }

  .abundance-agent-roster-head span,
  .abundance-agent-lane {
    color: var(--secondary, #af7c54);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .abundance-agent-roster-head h2 {
    max-width: 780px;
    margin: 0;
  }

  .abundance-agent-roster-head p {
    max-width: 430px;
    margin: 0;
    color: rgba(2, 2, 2, 0.62);
  }

  .abundance-agent-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .abundance-agent-card {
    display: grid;
    align-content: space-between;
    gap: 36px;
    min-height: 332px;
    padding: 28px;
    border: 1px solid rgba(175, 124, 84, 0.18);
    border-radius: 24px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(250, 245, 239, 0.74)),
      var(--sub-bg, #f6eee6);
    box-shadow: 0 22px 60px rgba(67, 48, 33, 0.08);
    color: var(--black, #020202);
    overflow: hidden;
    position: relative;
    isolation: isolate;
  }

  .abundance-agent-card::after {
    content: '';
    position: absolute;
    right: -54px;
    bottom: -54px;
    z-index: -1;
    width: 172px;
    height: 172px;
    border: 1px solid rgba(175, 124, 84, 0.16);
    border-radius: 999px;
  }

  .abundance-agent-card:nth-child(3) {
    background:
      linear-gradient(145deg, rgba(2, 2, 2, 0.9), rgba(67, 48, 33, 0.84)),
      var(--black, #020202);
    color: var(--white, #fff);
  }

  .abundance-agent-card:nth-child(3) .abundance-agent-card-body p,
  .abundance-agent-card:nth-child(3) .abundance-agent-proof-line {
    color: rgba(255, 255, 255, 0.72);
  }

  .abundance-agent-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .abundance-agent-lane {
    display: inline-flex;
    max-width: 100%;
    padding: 10px 13px;
    border: 1px solid rgba(175, 124, 84, 0.18);
    border-radius: 999px;
    background: rgba(175, 124, 84, 0.1);
    white-space: nowrap;
  }

  .abundance-agent-mark {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: var(--secondary, #af7c54);
    color: var(--white, #fff);
    font-size: 18px;
    line-height: 1;
    flex: 0 0 auto;
  }

  .abundance-agent-card-body {
    display: grid;
    gap: 18px;
    max-width: 330px;
  }

  .abundance-agent-card-body h3 {
    margin: 0;
    color: inherit;
  }

  .abundance-agent-card-body p {
    margin: 0;
    color: rgba(2, 2, 2, 0.64);
    font-size: 15px;
    line-height: 1.45;
  }

  .abundance-rule-strip span {
    color: var(--secondary);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .abundance-agent-proof-line {
    max-width: 320px;
    margin: 0;
    color: rgba(175, 124, 84, 0.92);
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .abundance-agent-proof {
    margin-top: 40px;
  }

  .abundance-agent-proof-card {
    text-decoration: none;
  }

  .abundance-card-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 25%, rgba(2, 2, 2, 0.62));
  }

  .abundance-section-head {
    display: grid;
    gap: 16px;
    margin-bottom: 34px;
  }

  .abundance-rule-strip {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .abundance-rule-strip span {
    padding: 9px 12px;
    border: 1px solid var(--secondary-20);
    border-radius: 999px;
    background: var(--secondary-12);
  }

  @media (max-width: 991px) {
    .hero-content-03,
    .support-head-02,
    .abundance-agent-roster-head,
    .abundance-agent-grid {
      grid-template-columns: 1fr;
    }

    .support-list-wrap {
      flex-direction: column;
    }

    .support-thumb-item {
      max-width: none;
    }
  }
</style>
