<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { openContact } from '$lib/redesign/contact';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const overrides = $derived(data.content?.redesign);
  const categoryId = 'petrox';
</script>

<SEO
  title="Oil & Gas | Maverick X"
  description="Revitalizing critical resource extraction with precision biologics."
  canonical="https://www.maverickx.com/oil-gas"
  ogImage="https://www.maverickx.com/images/logo.png"
/>

<div>
  <section
    class="design-section design-hero"
    style="position:relative;display:flex;align-items:flex-end;overflow:hidden"
    data-screen-label="Oil hero"
  >
    <Media kind="oilHero" opacity={1} />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.08) 40%,rgba(0,0,0,.65))"
    ></div>
    <div class="hero-copy" style="position:relative;padding:0 48px 88px;max-width:1000px;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.7);margin-bottom:20px"
      >
        Oil &amp; Gas
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(52px,6.5vw,96px);line-height:.95;text-transform:uppercase"
      >
        {#if overrides?.title}{overrides.title}{:else}PetroX<br />Oilfield Chemistry{/if}
      </h1>
      <p
        style="margin:26px 0 0;font-size:19px;color:rgba(var(--section-ink, 255,255,255),.85);max-width:560px;line-height:1.5;text-wrap:pretty"
      >
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Bio-based chemistry for oil &amp; gas,
          including treatment of the produced water that returns from the well.{/if}
      </p>
    </div>
  </section>

  <section
    class="design-section light-content"
    style="padding:120px 48px;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.12)"
    id="produced-water"
    data-screen-label="PetroX Boost"
  >
    <div
      class="grid-two"
      style="max-width:1200px;margin:0 auto;display:grid;gap:72px;align-items:center"
    >
      <div>
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.6);margin-bottom:16px"
        >
          Part of the PetroX family
        </div>
        <h2
          class="display-title"
          style="margin:0 0 24px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:60px;line-height:1;text-transform:uppercase"
        >
          PetroX Boost
        </h2>
        <p
          style="margin:0 0 18px;font-size:18px;color:rgba(var(--section-ink, 255,255,255),.85);line-height:1.6;text-wrap:pretty"
        >
          PetroX Boost is our oilfield formulation designed to improve porosity and permeability.
        </p>
        <p
          style="margin:0 0 32px;font-size:18px;color:rgba(var(--section-ink, 255,255,255),.85);line-height:1.6;text-wrap:pretty"
        >
          Tell us about your well conditions to discuss formulation suitability and a test plan.
        </p>
        <button
          type="button"
          onclick={() => openContact(categoryId)}
          style="cursor:pointer;display:inline-block;background:var(--section-button, #fff);color:var(--section-button-text, #000);font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;padding:16px 34px"
          >Talk to Us</button
        >
      </div>
      <div class="media-panel" style="position:relative;height:480px;overflow:hidden">
        <img
          src="/images/petrox-processing.jpg"
          alt="Industrial processing equipment at dusk"
          loading="lazy"
          width="2048"
          height="937"
          style="width:100%;height:100%;object-fit:cover"
        />
      </div>
    </div>
  </section>
</div>
