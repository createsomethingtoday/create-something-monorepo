<script lang="ts">
  import { onMount } from 'svelte';
  import { featuredHero } from '$lib/data/filmStories';
  import { reducedFilmMotion, visibleFilm } from '$lib/motion/filmPlayback';
  let track: HTMLElement;
  let progress = $state(0), wide = $state(false);
  onMount(() => {
    const width=matchMedia('(min-width:1100px)');
    const resize=()=>{wide=width.matches;};
    resize();width.addEventListener('change',resize);
    const scroll = () => { const r = track.getBoundingClientRect(); progress = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight))); };
    scroll(); addEventListener('scroll', scroll, {passive:true});
    return () => {width.removeEventListener('change',resize);removeEventListener('scroll', scroll);};
  });
</script>
<section class="hero-track" class:calm={$reducedFilmMotion} bind:this={track} aria-labelledby="agency-hero-title">
  <div class="hero-pin">
    <img class="hero-still" src={featuredHero.poster} alt="" fetchpriority="high" />
    <div class="hero-shade"></div>
    <div class="hero-layout">
    <div class="hero-copy">
    <div class="hero-type" inert={wide && !$reducedFilmMotion && progress>.45} style:opacity={$reducedFilmMotion ? 1 : 1-Math.min(1,progress*2.2)} style:transform={`translateY(${$reducedFilmMotion?0:-progress*130}px)`}>
      <p class="eyebrow">An independent practice / Building with agents</p>
      <a class="partner" href="/stack#openai-qualifications">OpenAI Select Partner ↗</a>
      <h1 id="agency-hero-title">{featuredHero.title}</h1>
      <p class="lede">{featuredHero.description}</p>
      <a class="hero-story" href={featuredHero.destination}>{featuredHero.label} ↗</a>
    </div>
    {#if !$reducedFilmMotion}<p class="hero-reveal" style:opacity={Math.max(0,(progress-.4)*2.5)}>Start with the person.<br />Follow the work.<br />Build what helps.</p>{/if}
    </div>
    <video class="hero-product" src={featuredHero.video} poster={featuredHero.productPoster} muted playsinline loop preload="metadata" aria-label={featuredHero.alt} use:visibleFilm={{threshold:.25}}></video>
    </div>
    <div class="hero-bottom"><a href="#work">Explore the work ↓</a><button onclick={() => reducedFilmMotion.update(v=>!v)} aria-pressed={$reducedFilmMotion}>{$reducedFilmMotion?'Enable motion':'Reduce motion'}</button></div>
  </div>
</section>
<style>
.partner{font-size:12px;text-underline-offset:4px;}
.hero-track.calm{height:100svh}.hero-track{padding:0;height:180svh;background:var(--color-performance-ink)}.hero-pin{height:100svh;min-height:640px;position:sticky;top:0;overflow:hidden;color:var(--color-performance-paper)}.hero-still,.hero-shade{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right center}.hero-shade{background:linear-gradient(90deg,color-mix(in srgb,var(--color-performance-ink) 85%,transparent),transparent 68%)}.hero-type{position:absolute;left:7vw;width:43vw;bottom:17%}.eyebrow{font:11px/1.5 var(--font-performance-mono);letter-spacing:.07em;text-transform:uppercase}h1{max-width:550px;font:400 clamp(56px,5.7vw,92px)/1.04 var(--font-performance-editorial);letter-spacing:-.035em;margin:25px 0}.lede{font-size:18px;max-width:430px;line-height:1.6}.hero-story{display:inline-block;font-size:13px;margin-top:20px;min-height:44px}.hero-reveal{pointer-events:none;position:absolute;left:7vw;bottom:20%;max-width:43vw;font:clamp(38px,4.2vw,70px)/1.1 var(--font-performance-editorial)}.hero-bottom{position:absolute;left:7vw;right:7vw;bottom:5%;display:flex;align-items:center;justify-content:space-between;font-size:12px}a{color:inherit;text-underline-offset:5px}button{border:1px solid currentColor;background:var(--color-performance-ink);color:inherit;padding:10px 16px;min-height:44px;font-size:12px}a:focus-visible,button:focus-visible{outline:3px solid currentColor;outline-offset:5px}@media(max-width:899px){.hero-type{width:auto;right:7vw}.hero-type h1{font-size:clamp(52px,10vw,88px)}.hero-still{object-position:55% center}.hero-reveal{max-width:86vw}.lede{font-size:15px}.eyebrow{font-size:9px}.hero-track{height:150svh}.hero-shade{background:linear-gradient(0deg,var(--color-performance-ink),transparent)}}@media(prefers-reduced-motion:reduce){.hero-track{height:100svh}.hero-pin{position:relative}}

/* The film owns its camera; the page owns its position beside the copy. */
.hero-layout{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5vw;align-items:center;height:100%;padding:130px 7vw 110px;box-sizing:border-box}
.hero-copy{position:relative;min-width:0}.hero-type{position:relative;left:auto;right:auto;bottom:auto;width:auto}.hero-reveal{left:0;bottom:auto;top:0;max-width:100%}.hero-product{display:block;width:100%;max-width:540px;max-height:calc(100svh - 240px);aspect-ratio:760/780;object-fit:contain;justify-self:end;border-radius:14px;background:#e4e7df}
@media(max-width:1099px){.hero-track,.hero-track.calm{height:auto}.hero-pin{position:relative;height:auto;min-height:100svh}.hero-layout{grid-template-columns:1fr;height:auto;gap:40px;padding:140px 7vw 130px}.hero-type{opacity:1!important;transform:none!important}.hero-type h1{font-size:clamp(52px,7vw,80px)}.hero-copy{max-width:680px}.hero-product{justify-self:center;max-width:560px;max-height:none}.hero-reveal{display:none}.hero-bottom{bottom:30px}.hero-shade{background:linear-gradient(90deg,#141512dd,#14151244)}}
@media(max-width:599px){.hero-layout{padding-top:120px;gap:28px}.hero-type h1{font-size:52px}.hero-bottom{left:7vw;right:7vw;font-size:11px}}
</style>
