<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import MineralsCarousel from '$lib/redesign/MineralsCarousel.svelte';

  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const overrides = $derived(data.content?.redesign);
</script>

<SEO
  title="Mining & Metals | Maverick X"
  description="Revitalizing critical resource extraction with precision biologics."
  canonical="https://www.maverickx.com/mining"
  ogImage="https://www.maverickx.com/images/logo.png"
/>

<div>
  <section
    class="design-section design-hero"
    style="position:relative;display:flex;align-items:flex-end;overflow:hidden"
    data-screen-label="Mining hero"
  >
    <Media kind="miningHero" opacity={1} />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.08) 40%,rgba(0,0,0,.65))"
    ></div>
    <div class="hero-copy" style="position:relative;padding:0 48px 88px;max-width:1000px;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.7);margin-bottom:20px"
      >
        MINING &amp; METALS
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(52px,6.5vw,96px);line-height:.95;text-transform:uppercase"
      >
        {#if overrides?.title}{overrides.title}{:else}LithX<br />Mining Chemistry{/if}
      </h1>
      <p
        style="margin:26px 0 0;font-size:19px;color:rgba(var(--section-ink, 255,255,255),.85);max-width:560px;line-height:1.5;text-wrap:pretty"
      >
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Bio-based chemistry designed to improve
          recovery from low-grade and hard-to-process ore.{/if}
      </p>
    </div>
  </section>

  <section
    class="design-section light-content"
    style="padding:120px 48px;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.12)"
    data-screen-label="LithX"
  >
    <div
      class="grid-two"
      style="max-width:1200px;margin:0 auto;display:grid;gap:72px;align-items:center"
    >
      <div class="media-panel" style="position:relative;height:480px;overflow:hidden">
        <Media kind="mining" />
      </div>
      <div>
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.6);margin-bottom:16px"
        >
          Curing Chemistry
        </div>
        <h2
          class="display-title"
          style="margin:0 0 24px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:60px;line-height:1;text-transform:uppercase"
        >
          LithX
        </h2>
        <p
          style="margin:0 0 18px;font-size:18px;color:rgba(var(--section-ink, 255,255,255),.85);line-height:1.6;text-wrap:pretty"
        >
          LithX is our chemistry for mining and metals, designed for use in agglomeration and curing
          within heap-leach processes.
        </p>
        <p
          style="margin:0 0 32px;font-size:18px;color:rgba(var(--section-ink, 255,255,255),.85);line-height:1.6;text-wrap:pretty"
        >
          Discuss your ore chemistry and process conditions with our team to evaluate suitability
          and plan a laboratory test.
        </p>
      </div>
    </div>
  </section>

  <MineralsCarousel />
</div>
