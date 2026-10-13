<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import MaterialStudy from '$lib/redesign/MaterialStudy.svelte';
  import { reveal } from '$lib/redesign/motion';
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
  <section class="design-section fresh-hero light-content" data-screen-label="Home hero">
    <div class="fresh-hero-copy" use:reveal>
      <p class="fresh-eyebrow">Industrial Biotechnology · Austin, TX</p>
      <h1>
        {#if overrides?.title}{overrides.title}{:else}Chemistry that<br /><em>Powers the World</em
          >{/if}
      </h1>
      <p class="fresh-intro">
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Revitalizing critical resource
          extraction with precision biologics.{/if}
      </p>
      <a class="fresh-explore" href="#chemistry"
        >Explore our chemistry <span aria-hidden="true">↘</span></a
      >
    </div>
    <MaterialStudy id="home-material" />
  </section>

  <section
    use:reveal
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
        <div class="chemistry-field"><Media kind="home" opacity={1} /></div>
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
</div>
