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
    <h1 class="page-title">A healthcare staffing brand system for governed AI work.</h1>
    <p class="lede">
      This guide bases Abundance on CMS and USWDS discipline: accessible forms, clear hierarchy,
      earned trust, and continuity across nurse, facility, and operator workflows.
    </p>
  </div>
  <div class="proof-panel">
    <div class="eyebrow">Brand Rule</div>
    <h2>Abundance owns the public agent brand. Ona remains internal design precedent.</h2>
  </div>
</section>

<section class="section-band">
  <div class="section-heading">
    <div class="eyebrow">Principles</div>
    <h2>What every page should preserve</h2>
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
    <h2>Clinical, calm, and operational without becoming one-note.</h2>
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
    <h2>How the website plan was derived</h2>
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
