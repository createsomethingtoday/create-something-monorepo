<script lang="ts">
  import MaterialStudy from './MaterialStudy.svelte';
  import { reveal } from './motion';
  import SEO from '$lib/components/SEO.svelte';
  let {
    title,
    eyebrow,
    intro,
    path,
    children,
    imagery = true
  }: {
    title: string;
    eyebrow: string;
    intro: string;
    path: string;
    children: import('svelte').Snippet;
    imagery?: boolean;
  } = $props();
</script>

<SEO
  title={`${title} | Maverick X`}
  description={intro}
  canonical={`https://www.maverickx.com${path}`}
  ogImage="https://www.maverickx.com/images/logo.png"
/>
<section class="design-section hero-banner editorial-hero light-content">
  {#if imagery}<div class="editorial-material">
      <MaterialStudy id={path.replaceAll('/', '')} />
    </div>{/if}
  <div class="editorial-copy" use:reveal>
    <p class="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    <p class="intro">{intro}</p>
  </div>
</section>
<section class="design-section light-content editorial-body">
  <div class="editorial-inner">{@render children()}</div>
</section>

<style>
  .editorial-hero {
    position: relative;
    overflow: hidden;
    padding: 200px 48px 100px;
    background: #f0f4ed;
  }
  .editorial-copy {
    position: relative;
    max-width: 1200px;
    margin: auto;
  }
  .eyebrow {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin: 0 0 24px;
  }
  h1 {
    font:
      600 clamp(48px, 6vw, 88px)/1 'Barlow Condensed',
      sans-serif;
    text-transform: uppercase;
    max-width: 760px;
    margin: 0;
  }
  .intro {
    font-size: 20px;
    line-height: 1.6;
    max-width: 660px;
    margin: 28px 0 0;
  }
  .editorial-body {
    padding: 96px 48px;
  }
  .editorial-inner {
    max-width: 1200px;
    margin: auto;
  }
  .editorial-material {
    position: absolute;
    width: 48%;
    right: -4%;
    top: 40px;
    opacity: 0.55;
  }
  .editorial-copy {
    z-index: 1;
  }
  .editorial-copy h1,
  .editorial-copy .intro {
    max-width: 65%;
  }
  @media (max-width: 700px) {
    .editorial-material {
      width: 80%;
      right: -35%;
      opacity: 0.2;
    }
    .editorial-copy h1,
    .editorial-copy .intro {
      max-width: 100%;
    }
  }
</style>
