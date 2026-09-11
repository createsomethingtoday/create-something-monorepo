<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { openContact } from '$lib/redesign/contact';
  import { news as approvedNews } from '$lib/redesign/content';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const news = $derived(data.content?.redesign?.articles ?? approvedNews);
  const categoryId = 'general';
</script>

<SEO
  title="News | Maverick X"
  description="Revitalizing critical resource extraction with precision biologics."
  canonical="https://www.maverickx.com/news"
  ogImage="https://www.maverickx.com/images/logo.png"
/>

<div>
  <section
    class="design-section hero-banner"
    style="position:relative;padding:220px 48px 100px;border-bottom:1px solid rgba(255,255,255,.12);overflow:hidden"
    data-screen-label="News"
  >
    <Media kind="oil" opacity={0.55} />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.85))"
    ></div>
    <div style="position:relative;max-width:1100px;margin:0 auto;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px"
      >
        Newsroom
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(44px,5.5vw,80px);line-height:1;text-transform:uppercase"
      >
        News
      </h1>
      <p
        style="margin:24px 0 0;font-size:18px;color:rgba(255,255,255,.8);max-width:560px;line-height:1.6;text-wrap:pretty"
      >
        Follow us on our mission to revitalize critical resource extraction with precision
        biologics.
      </p>
    </div>
  </section>
  <section
    class="design-section"
    style="padding:80px 48px 40px;border-bottom:1px solid rgba(255,255,255,.12)"
  >
    <div style="max-width:1100px;margin:0 auto">
      {#each news as item}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          class="news-row"
          style="display:grid;gap:32px;align-items:baseline;padding:32px 0;border-top:1px solid rgba(255,255,255,.15)"
        >
          <span
            style="font-family:'Barlow Condensed',sans-serif;font-size:16px;color:rgba(255,255,255,.5)"
            >{item.date}</span
          >
          <span
            style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.55)"
            >{item.kind}</span
          >
          <span style="font-size:19px;font-weight:500;line-height:1.4;text-wrap:pretty"
            >{item.title}</span
          >
          <span
            style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.5)"
            >{item.source} →</span
          >
        </a>
      {/each}
    </div>
  </section>
  <section
    class="design-section"
    style="padding:64px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
  >
    <div
      style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px"
    >
      <div>
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:8px"
        >
          Media Inquiries
        </div>
        <div style="font-size:16px;color:rgba(255,255,255,.85)">
          For interviews, assets, or press questions, reach out directly.
        </div>
      </div>
      <a
        href="mailto:press@maverickx.com"
        style="border:1px solid rgba(255,255,255,.5);font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;padding:14px 30px"
        >press@maverickx.com</a
      >
    </div>
  </section>
</div>
