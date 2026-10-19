<script lang="ts">
  import { page } from '$app/stores';
  let expanded = false;
  // Preserve existing film deep links when the optional evidence library is closed.
  $: if ($page.url.searchParams.has('film') || $page.url.hash === '#work') expanded = true;
</script>

<section id="built-work" class="proof" aria-labelledby="proof-title">
  <header><div><p class="eyebrow">Selected work / inspect the evidence</p><h2 id="proof-title">Work you can<br />inspect.</h2></div><p>From a customer-facing website to the checks behind a review. Explore what we built and where our work begins and ends.</p></header>
  <div class="projects">
    <article><a href="https://www.maverickx.com/" target="_blank" rel="noreferrer" class="project-image"><img src="/films/websites/reference.png" alt="MaverickX website, a CREATE SOMETHING web development project" width="1440" height="1000" loading="lazy" /></a><p class="eyebrow">01 / Web development</p><h3>MaverickX</h3><p>A website presenting chemistry across energy, mining and water treatment for a Y Combinator–backed company.</p><a href="https://www.maverickx.com/" target="_blank" rel="noreferrer">Visit the live website ↗</a></article>
    <article><a href="/field-reports/template-review" class="project-image"><img src="/films/dashboard-poster.jpg" alt="Webflow Asset Dashboard showing a test portfolio" width="1600" height="1000" loading="lazy" /></a><p class="eyebrow">02 / Tools &amp; review workflows</p><h3>Webflow review systems</h3><p>Creator interfaces and evidence for human reviewers. The field report documents what worked, what failed, and what still needs judgment.</p><a href="/field-reports/template-review">Read the work and its limits ↗</a></article>
  </div>
  <div class="proof-note"><p>Selected projects demonstrate our capabilities. Your deliverable, acceptance checks and support scope are agreed separately.</p><a href="/field-reports/upstream-contributions">Inspect our engineering contributions ↗</a></div>
  <details bind:open={expanded}><summary>Explore the full work library <span>Source, walkthroughs &amp; project stories</span></summary><noscript><p><a href="/products">Explore the product catalog</a> or <a href="/field-reports">read the field reports</a>.</p></noscript>{#if expanded}<slot />{/if}</details>
</section>

<style>
  .proof { padding: var(--space-performance-xl) 7vw; background: var(--color-performance-paper); color: var(--color-performance-ink); scroll-margin-top: 6rem; }
  header { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--space-performance-lg); align-items: end; }
  .eyebrow { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); text-transform: uppercase; }
  h2 { font: var(--font-performance-medium) clamp(2.5rem, 5vw, 4.5rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); margin: var(--space-performance-sm) 0 0; }
  p { line-height: 1.65; max-width: 54ch; }
  .projects { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-performance-lg); margin-top: var(--space-performance-lg); }
  .project-image { display: block; overflow: hidden; border: 1px solid var(--color-performance-line); background: var(--color-performance-ink); border-radius: var(--radius-performance-sm); }
  img { display: block; width: 100%; aspect-ratio: 1.6; height: auto; object-fit: cover; object-position: top; }
  article .eyebrow { margin-top: var(--space-performance-md); }
  h3 { font: var(--font-performance-medium) clamp(1.5rem,2.5vw,2rem)/1.2 var(--font-performance-interface); margin-block: var(--space-performance-sm); }
  a { color: inherit; text-underline-offset: .3em; }
  article > a:last-child, .proof-note a { display: inline-flex; align-items: center; min-height: 44px; }
  .proof-note { display: flex; justify-content: space-between; gap: var(--space-performance-lg); align-items: center; padding-block: var(--space-performance-md); margin-top: var(--space-performance-lg); border-top: 1px solid var(--color-performance-line-strong); font-size: var(--text-performance-caption); }
  details { border-block: 1px solid var(--color-performance-line-strong); }
  summary { cursor: pointer; padding-block: var(--space-performance-md); font-size: var(--text-performance-body-sm); }
  summary span { float: right; font-size: var(--text-performance-caption); }
  a:focus-visible, summary:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  @media(max-width:700px) { header, .projects { grid-template-columns: 1fr; } header { gap: var(--space-performance-sm); } .proof-note { display: block; } summary span { float: none; display: block; margin-top: var(--space-performance-xs); } }
</style>
