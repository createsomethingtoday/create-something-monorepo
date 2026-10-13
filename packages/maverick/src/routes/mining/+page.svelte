<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { openContact } from '$lib/redesign/contact';

  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const overrides = $derived(data.content?.redesign);
  const categoryId = 'lithx';
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
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Bio-based chemistry designed to improve recovery from low-grade and hard-to-process ore.{/if}
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
          LithX is our chemistry for mining and metals, designed for use in agglomeration and curing within heap-leach processes.
        </p>
        <p
          style="margin:0 0 32px;font-size:18px;color:rgba(var(--section-ink, 255,255,255),.85);line-height:1.6;text-wrap:pretty"
        >
          Discuss your ore chemistry and process conditions with our team to evaluate suitability and plan a laboratory test.
        </p>
        <button
          type="button"
          onclick={() => openContact(categoryId)}
          style="cursor:pointer;display:inline-block;background:var(--section-button, #fff);color:var(--section-button-text, #000);font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;padding:16px 34px"
          >Talk to Us</button
        >
      </div>
    </div>
  </section>

  <section
    class="design-section light-content"
    style="padding:120px 48px;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.12)"
  >
    <div style="max-width:1200px;margin:0 auto">
      <h2
        class="display-title"
        style="margin:0 0 56px;font-family:'Barlow Condensed',sans-serif;font-weight:500;font-size:44px;text-transform:uppercase"
      >
        Metals of Interest
      </h2>
      <div
        class="grid-three"
        style="display:grid;gap:1px;background:rgba(var(--section-ink, 255,255,255),.12);border:1px solid rgba(var(--section-ink, 255,255,255),.12)"
      >
        <div style="background:var(--section-surface, #000);padding:56px 48px">
          <div
            style="font-family:'Barlow Condensed',sans-serif;font-size:80px;font-weight:400;color:rgba(var(--section-ink, 255,255,255),.35);line-height:1"
          >
            Cu
          </div>
          <h3
            class="display-title"
            style="margin:20px 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:34px;text-transform:uppercase"
          >
            Copper
          </h3>
          <p
            style="margin:0;font-size:16px;color:rgba(var(--section-ink, 255,255,255),.75);line-height:1.6;max-width:420px"
          >
            Explore whether LithX is suitable for your copper ore and leaching process.
          </p>
        </div>
        <div style="background:var(--section-surface, #000);padding:56px 48px">
          <div
            style="font-family:'Barlow Condensed',sans-serif;font-size:80px;font-weight:400;color:rgba(var(--section-ink, 255,255,255),.35);line-height:1"
          >
            Au
          </div>
          <h3
            class="display-title"
            style="margin:20px 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:34px;text-transform:uppercase"
          >
            Gold
          </h3>
          <p
            style="margin:0;font-size:16px;color:rgba(var(--section-ink, 255,255,255),.75);line-height:1.6;max-width:420px"
          >
            Discuss a laboratory evaluation for your gold-bearing ore or tailings.
          </p>
        </div>
        <div style="background:var(--section-surface, #000);padding:56px 48px;display:flex;flex-direction:column">
          <div
            style="font-family:'Barlow Condensed',sans-serif;font-size:80px;font-weight:400;color:rgba(var(--section-ink, 255,255,255),.35);line-height:1"
          >
            +
          </div>
          <h3
            class="display-title"
            style="margin:20px 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:34px;text-transform:uppercase"
          >
            More
          </h3>
          <p
            style="margin:0 0 24px;font-size:16px;color:rgba(var(--section-ink, 255,255,255),.75);line-height:1.6;max-width:420px"
          >
            Working a different metal or a challenging ore body? Tell us what you’re leaching —
            we’ll tell you if LithX fits.
          </p>
          <button
            type="button"
            onclick={() => openContact(categoryId)}
            style="cursor:pointer;margin-top:auto;align-self:flex-start;font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.6);padding-bottom:4px"
            >Ask about your ore →</button
          >
        </div>
      </div>
    </div>
  </section>

</div>
