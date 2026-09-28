<script lang="ts">
  import { featuredHero } from '$lib/data/filmStories';
  import { reducedFilmMotion, visibleFilm } from '$lib/motion/filmPlayback';
</script>
<section class="hero-track" class:calm={$reducedFilmMotion} aria-labelledby="agency-hero-title">
  <div class="hero-pin">
    <img class="hero-still" src={featuredHero.poster} alt="" fetchpriority="high" />
    <div class="hero-shade"></div>
    <div class="hero-layout">
    <div class="hero-copy">
    <div class="hero-type">
      <p class="eyebrow">An independent practice / Building with agents</p>
      <a class="partner" href="/stack#openai-qualifications">OpenAI Select Partner ↗</a>
      <h1 id="agency-hero-title">{featuredHero.title}</h1>
      <p class="lede">{featuredHero.description}</p>
      <a class="hero-story" href={featuredHero.destination}>{featuredHero.label} ↗</a>
    </div>
    <p class="hero-principle">Start with the person. Follow the work. Build what helps.</p>
    </div>
    <video class="hero-product" src={featuredHero.video} poster={featuredHero.productPoster} muted playsinline loop preload="metadata" aria-label={featuredHero.alt} use:visibleFilm={{threshold:.25}}></video>
    </div>
    <div class="hero-bottom"><a href="#work">Explore the work ↓</a><a href="/stack">Ownership, tools &amp; handoff ↗</a><button onclick={() => reducedFilmMotion.update(v=>!v)} aria-pressed={$reducedFilmMotion}>{$reducedFilmMotion?'Enable motion':'Reduce motion'}</button></div>
  </div>
</section>
<style>
  .hero-track { padding: 0; background: var(--color-performance-ink); }
  .hero-pin { position: relative; overflow: hidden; color: var(--color-performance-paper); }
  .hero-still, .hero-shade { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero-shade { background: color-mix(in srgb, var(--color-performance-ink) 88%, transparent); }
  .hero-layout { position: relative; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: var(--space-performance-xl); align-items: center; padding: 7.5rem 7vw var(--space-performance-lg); }
  .hero-copy { min-width: 0; }
  .eyebrow, .partner, .hero-bottom { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  h1 { max-width: 16ch; margin-block: var(--space-performance-md); font: var(--font-performance-medium) clamp(2.2rem, 4.5vw, 4rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .lede { max-width: 48ch; font-size: var(--text-performance-body-sm); line-height: 1.6; }
  .hero-story { display: inline-flex; align-items: center; min-height: 44px; margin-top: var(--space-performance-sm); }
  .hero-principle { color: var(--color-performance-fg-secondary); font-size: var(--text-performance-caption); line-height: 1.5; }
  .hero-product { display: block; width: 100%; max-width: 380px; max-height: 460px; aspect-ratio: 760/780; object-fit: contain; justify-self: end; border: 1px solid var(--color-performance-shell-border-default); border-radius: var(--radius-performance-sm); }
  .hero-bottom { position: relative; display: flex; flex-wrap: wrap; gap: var(--space-performance-sm); justify-content: space-between; align-items: center; padding: var(--space-performance-sm) 7vw; border-top: 1px solid var(--color-performance-shell-border-default); }
  a { color: inherit; text-underline-offset: .3em; }
  .hero-bottom a, .partner { display: inline-flex; align-items: center; min-height: 44px; }
  button { min-height: 44px; padding: var(--space-performance-xs) var(--space-performance-sm); border: 1px solid var(--color-performance-shell-border-strong); border-radius: var(--radius-performance-sm); background: var(--color-performance-ink); color: inherit; font: inherit; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  @media (max-width: 720px) { .hero-layout { grid-template-columns: 1fr; gap: var(--space-performance-md); padding-block: 7.5rem var(--space-performance-lg); } .hero-product { justify-self: start; max-width: 300px; } }
</style>
