<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';

  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const overrides = $derived(data.content?.redesign);
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
    <Media kind="home" opacity={0.9} />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.08) 40%,rgba(0,0,0,.65))"
    ></div>
    <div class="hero-copy" style="position:relative;padding:0 48px 96px;max-width:1100px;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.7);margin-bottom:20px"
      >
        Industrial Biotechnology · Austin, TX
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(56px,7.5vw,110px);line-height:.95;text-transform:uppercase;letter-spacing:1px"
      >
        {#if overrides?.title}{overrides.title}{:else}Chemistry that<br />Powers the World{/if}
      </h1>
      <p
        style="margin:28px 0 40px;font-size:20px;font-weight:400;color:rgba(var(--section-ink, 255,255,255),.85);max-width:560px;line-height:1.5;text-wrap:pretty"
      >
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Revitalizing critical resource
          extraction with precision biologics.&nbsp;{/if}
      </p>
      <div
        style="display:flex;align-items:center;gap:12px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.6)"
      >
        <span
          style="display:inline-block;width:1px;height:36px;background:rgba(var(--section-ink, 255,255,255),.5)"
        ></span>Scroll to explore
      </div>
    </div>
  </section>

  <section
    id="chemistry"
    class="design-section light-content"
    style="padding:120px 48px;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.12)"
  >
    <div
      class="grid-two"
      style="max-width:1200px;margin:0 auto;display:grid;gap:64px;align-items:start"
    >
      <div>
        <p style="margin:0 0 16px;font-size:13px;letter-spacing:3px;text-transform:uppercase">
          How our chemistry works
        </p>
        <h2
          class="display-title"
          style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:500;font-size:44px;line-height:1.1;text-transform:uppercase"
        >
          One platform. Two markets.
        </h2>
      </div>
      <div style="display:grid;gap:36px">
        <div
          style="border-top:1px solid rgba(var(--section-ink, 255,255,255),.25);padding-top:20px"
        >
          <div
            style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.6);margin-bottom:8px"
          >
            Engineered for the job
          </div>
          <div
            style="font-size:17px;color:rgba(var(--section-ink, 255,255,255),.9);line-height:1.5"
          >
            Bio-based chemistry engineered for specific industrial applications.
          </div>
        </div>
        <div
          style="border-top:1px solid rgba(var(--section-ink, 255,255,255),.25);padding-top:20px"
        >
          <div
            style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.6);margin-bottom:8px"
          >
            Two markets
          </div>
          <div
            style="font-size:17px;color:rgba(var(--section-ink, 255,255,255),.9);line-height:1.5"
          >
            Oil &amp; gas and water treatment. Mining &amp; metals.
          </div>
        </div>
        <div
          style="border-top:1px solid rgba(var(--section-ink, 255,255,255),.25);padding-top:20px"
        >
          <div
            style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.6);margin-bottom:8px"
          >
            Made by us
          </div>
          <div
            style="font-size:17px;color:rgba(var(--section-ink, 255,255,255),.9);line-height:1.5"
          >
            We manufacture our own chemistry.
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="design-section grid-two" style="display:grid;" data-screen-label="Sector cards">
    <a class="sector-card" href="/oil-gas">
      <Media kind="oil" />
      <div
        style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.05) 40%,rgba(0,0,0,.7))"
      ></div>
      <div class="sector-copy" style="position:absolute;left:44px;right:44px;bottom:44px">
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.65);margin-bottom:10px"
        >
          Solutions
        </div>
        <h3
          class="display-title"
          style="margin:0 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:42px;text-transform:uppercase;line-height:1"
        >
          Oil &amp; Gas<br />and Water Treatment
        </h3>
        <p
          style="margin:0 0 18px;font-size:16px;color:rgba(var(--section-ink, 255,255,255),.8);max-width:440px;line-height:1.5"
        >
          Our family of oilfield chemistries, including produced-water treatment.
        </p>
        <span
          style="font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.6);padding-bottom:4px"
          >Explore →</span
        >
      </div>
    </a>
    <a class="sector-card" href="/mining">
      <Media kind="mining" />
      <div
        style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.05) 40%,rgba(0,0,0,.7))"
      ></div>
      <div class="sector-copy" style="position:absolute;left:44px;right:44px;bottom:44px">
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(var(--section-ink, 255,255,255),.65);margin-bottom:10px"
        >
          Solutions
        </div>
        <h3
          class="display-title"
          style="margin:0 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:42px;text-transform:uppercase;line-height:1"
        >
          Mining &amp; Metals
        </h3>
        <p
          style="margin:0 0 18px;font-size:16px;color:rgba(var(--section-ink, 255,255,255),.8);max-width:440px;line-height:1.5"
        >
          Bio-based chemistry designed to improve recovery from low-grade and hard-to-process ore.
        </p>
        <span
          style="font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(var(--section-ink, 255,255,255),.6);padding-bottom:4px"
          >Explore →</span
        >
      </div>
    </a>
  </section>
</div>
