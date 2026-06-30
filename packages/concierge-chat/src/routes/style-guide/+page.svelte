<script lang="ts">
  import { colorTokens, heroVisual, sourceModel, stylePrinciples } from '$lib/site/abundance';
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>Style Guide | Abundance Staffing</title>
  <meta
    name="description"
    content="Abundance nurse staffing website style guide for brand, accessibility, agent naming, and page patterns."
  />
</svelte:head>

<section class="hero-03 container-full abundance-style-hero">
  <div class="container-fluid for-hero01">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Clear, warm, governed.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Abundance should feel human first. Controls appear only where trust depends on them.
        </p>
        <div class="hero-content-btns-03">
          <a href="/" class="button-01 w-inline-block">
            <div class="button-outside-01">
              <div class="button-inside">
                <div class="button-text-01">View homepage</div>
                <div class="button-text-01">View homepage</div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
    <div class="hero-thumb abundance-style-thumb">
      <img src={heroVisual.src} alt={heroVisual.alt} class="hero-thumb-img" />
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-style-section">
  <div class="container-fluid for-works">
    <div class="works-content">
      <h2 class="works-title-02 heading-01">Page rules</h2>
      <div class="works-items">
        {#each stylePrinciples as principle}
          <article class="works-item abundance-style-card">
            <div class="works-item-thumb-wrap abundance-style-mark">{principle.title.slice(0, 1)}</div>
            <div class="works-item-info">
              <h3 class="works-item-info-title heading-05">{principle.title}</h3>
              <p class="works-itm-info-text p2-regular">{principle.body}</p>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="feature-blog-04 container-full abundance-style-section">
  <div class="container-fluid">
    <div class="feature-blog-content-04">
      <div class="abundance-section-head">
        <h2 class="heading-01">Color system</h2>
        <p class="p1-regular">Warm base, clinical signal, restrained contrast.</p>
      </div>
      <div class="abundance-swatch-grid">
        {#each colorTokens as color}
          <article class="abundance-swatch-card">
            <span class="abundance-swatch" style={`background: ${color.value}`}></span>
            <div>
              <h3 class="heading-05">{color.name}</h3>
              <p class="p2-regular">{color.value}</p>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="support-02 container-full abundance-style-section">
  <div class="container-fluid">
    <div class="support-head-02">
      <h2 class="support-title-02 heading-01">Research base</h2>
      <p class="support-text-02 p1-regular">The website model stays simple and legible.</p>
    </div>
    <div class="abundance-source-grid">
      {#each sourceModel as source}
        <article class="abundance-source-card">
          <h3 class="heading-05">{source.title}</h3>
          <p class="p2-regular">{source.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .abundance-style-hero {
    padding-top: 80px;
  }

  .abundance-style-thumb {
    border-radius: 16px;
  }

  .abundance-style-section {
    padding-top: 90px;
    padding-bottom: 90px;
  }

  .abundance-style-card,
  .abundance-source-card,
  .abundance-swatch-card {
    border: 1px solid var(--black-10);
    border-radius: 16px;
    background: var(--sub-bg);
  }

  .abundance-style-card {
    min-height: 230px;
    padding: 22px;
  }

  .abundance-style-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 62px;
    height: 62px;
    border-radius: 999px;
    background: var(--secondary-12);
    color: var(--secondary);
    font-size: 22px;
  }

  .abundance-section-head {
    display: grid;
    gap: 16px;
    margin-bottom: 34px;
  }

  .abundance-swatch-grid,
  .abundance-source-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .abundance-swatch-card,
  .abundance-source-card {
    display: grid;
    gap: 16px;
    padding: 22px;
  }

  .abundance-swatch {
    width: 100%;
    height: 86px;
    border-radius: 14px;
    border: 1px solid var(--black-10);
  }

  @media (max-width: 991px) {
    .hero-content-03,
    .works-items,
    .abundance-swatch-grid,
    .abundance-source-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
