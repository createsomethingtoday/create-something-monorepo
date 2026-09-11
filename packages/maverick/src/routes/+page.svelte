<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { openContact } from '$lib/redesign/contact';

  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const overrides = $derived(data.content?.redesign);
  const categoryId = 'general';
</script>

<SEO
  title="Maverick X | Precision Biologics for Critical Resources"
  description="Revitalizing critical resource extraction with precision biologics."
  canonical="https://www.maverickx.com/"
  ogImage="https://www.maverickx.com/images/logo.png"
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Maverick X',
    url: 'https://www.maverickx.com',
    logo: 'https://www.maverickx.com/images/full-logo.svg',
    description: 'Revitalizing critical resource extraction with precision biologics.',
    sameAs: ['https://www.linkedin.com/company/maverickx', 'https://x.com/maverickx']
  }}
/>

<div>
  <section
    class="design-section design-hero home-hero"
    style="position:relative;display:flex;align-items:flex-end;overflow:hidden"
    data-screen-label="Home hero"
  >
    <Media kind="home" />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.2) 40%,rgba(0,0,0,.85))"
    ></div>
    <div class="hero-copy" style="position:relative;padding:0 48px 96px;max-width:1100px;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px"
      >
        Industrial Biotechnology · Austin, TX
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(56px,7.5vw,110px);line-height:.95;text-transform:uppercase;letter-spacing:1px"
      >
        {#if overrides?.title}{overrides.title}{:else}chemistry that<br />Powers the World{/if}
      </h1>
      <p
        style="margin:28px 0 40px;font-size:20px;font-weight:400;color:rgba(255,255,255,.85);max-width:560px;line-height:1.5;text-wrap:pretty"
      >
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Revitalizing critical resource
          extraction with precision biologics.&nbsp;{/if}
      </p>
      <div
        style="display:flex;align-items:center;gap:12px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6)"
      >
        <span style="display:inline-block;width:1px;height:36px;background:rgba(255,255,255,.5)"
        ></span>Scroll to explore
      </div>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:120px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
  >
    <div
      class="grid-two"
      style="max-width:1200px;margin:0 auto;display:grid;gap:64px;align-items:start"
    >
      <h2
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:500;font-size:44px;line-height:1.1;text-transform:uppercase"
      >
        helping operators recover more, for less
      </h2>
      <div style="display:grid;gap:36px">
        <div style="border-top:1px solid rgba(255,255,255,.25);padding-top:20px">
          <div
            style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:8px"
          >
            Strong
          </div>
          <div style="font-size:17px;color:rgba(255,255,255,.9);line-height:1.5">
            Precision biologics engineered and manufactured for targeted use cases.
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.25);padding-top:20px">
          <div
            style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:8px"
          >
            Safe
          </div>
          <div style="font-size:17px;color:rgba(255,255,255,.9);line-height:1.5">
            Non-hazmat, non-toxic, non-flammable, non-carcinogenic.
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.25);padding-top:20px">
          <div
            style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:8px"
          >
            Sustainable
          </div>
          <div style="font-size:17px;color:rgba(255,255,255,.9);line-height:1.5">
            Biodegradable, environmentally safe, and manufactured in America with clean feedstocks.
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="design-section grid-two" style="display:grid;" data-screen-label="Sector cards">
    <a class="sector-card" href="/oil-gas">
      <Media kind="oil" />
      <div
        style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.1) 40%,rgba(0,0,0,.9))"
      ></div>
      <div class="sector-copy" style="position:absolute;left:44px;right:44px;bottom:44px">
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:10px"
        >
          Oil &amp; Gas
        </div>
        <h3
          class="display-title"
          style="margin:0 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:42px;text-transform:uppercase;line-height:1"
        >
          More Oil From Every Well
        </h3>
        <p
          style="margin:0 0 18px;font-size:16px;color:rgba(255,255,255,.8);max-width:440px;line-height:1.5"
        >
          PetroX Boost — flagship stimulation chemistry that boosts production rates and extends
          well life.
        </p>
        <span
          style="font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.6);padding-bottom:4px"
          >Explore →</span
        >
      </div>
    </a>
    <a class="sector-card" href="/mining">
      <Media kind="mining" />
      <div
        style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.1) 40%,rgba(0,0,0,.9))"
      ></div>
      <div class="sector-copy" style="position:absolute;left:44px;right:44px;bottom:44px">
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:10px"
        >
          Mining
        </div>
        <h3
          class="display-title"
          style="margin:0 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:42px;text-transform:uppercase;line-height:1"
        >
          more metal from every mine
        </h3>
        <p
          style="margin:0 0 18px;font-size:16px;color:rgba(255,255,255,.8);max-width:440px;line-height:1.5"
        >
          LithX — a revolutionary curing agent that unlocks copper, gold, and more from low-grade
          ores.
        </p>
        <span
          style="font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.6);padding-bottom:4px"
          >Explore →</span
        >
      </div>
    </a>
  </section>
</div>
