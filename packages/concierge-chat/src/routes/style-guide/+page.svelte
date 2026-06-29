<script lang="ts">
  import { colorTokens, sourceModel, stylePrinciples } from '$lib/site/abundance';
</script>

<svelte:head>
  <title>Style Guide | Abundance Staffing</title>
  <meta
    name="description"
    content="Abundance nurse staffing website style guide for brand, accessibility, agent naming, and page patterns."
  />
</svelte:head>

<section class="page-hero compact">
  <div class="hero-copy">
    <div class="eyebrow">Style Guide</div>
    <h1 class="page-title">Clear, warm, governed.</h1>
    <p class="lede">
      Abundance should feel human first, with controls visible when they matter.
    </p>
  </div>
  <div class="proof-panel">
    <div class="eyebrow">Brand Rule</div>
    <h2>Public language belongs to Abundance.</h2>
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Principles</div>
    <h2>Page rules.</h2>
  </div>
  <div class="feature-grid four">
    {#each stylePrinciples as principle}
      <article class="feature-card">
        <h3>{principle.title}</h3>
        <p>{principle.body}</p>
      </article>
    {/each}
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Color Tokens</div>
    <h2>Color tokens.</h2>
  </div>
  <div class="swatch-grid">
    {#each colorTokens as color}
      <article class="swatch-card">
        <span class="swatch" style={`background: var(${color.token})`}></span>
        <div>
          <h3>{color.name}</h3>
          <p>{color.token} / {color.value}</p>
        </div>
      </article>
    {/each}
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Research Base</div>
    <h2>Research base.</h2>
  </div>
  <div class="feature-grid">
    {#each sourceModel as source}
      <article class="feature-card">
        <h3>{source.title}</h3>
        <p>{source.body}</p>
      </article>
    {/each}
  </div>
</section>
