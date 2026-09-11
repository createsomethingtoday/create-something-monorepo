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
  title="Mining | Maverick X"
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
    <Media kind="mining" opacity={0.55} />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.2) 40%,rgba(0,0,0,.85))"
    ></div>
    <div class="hero-copy" style="position:relative;padding:0 48px 88px;max-width:1000px;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px"
      >
        MINING
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(52px,6.5vw,96px);line-height:.95;text-transform:uppercase"
      >
        {#if overrides?.title}{overrides.title}{:else}more metal <br />from every mine{/if}
      </h1>
      <p
        style="margin:26px 0 0;font-size:19px;color:rgba(255,255,255,.85);max-width:560px;line-height:1.5;text-wrap:pretty"
      >
        {#if overrides?.subtitle}{overrides.subtitle}{:else}LithX — a revolutionary curing agent
          that unlocks copper, gold, and more from ores too lean for conventional leaching.{/if}
      </p>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:120px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
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
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:16px"
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
          style="margin:0 0 18px;font-size:18px;color:rgba(255,255,255,.85);line-height:1.6;text-wrap:pretty"
        >
          LithX raises the efficiency of leaching low-grade ores. Applied during agglomeration and
          curing, it accelerates metal dissolution and lifts recovery across heaps, tailings, and
          complex mineralogy.
        </p>
        <p
          style="margin:0 0 32px;font-size:18px;color:rgba(255,255,255,.85);line-height:1.6;text-wrap:pretty"
        >
          A drop-in addition to existing leach circuits. LithX is non-toxic, operates at ambient
          temperature across a wide pH range, and requires no new infrastructure.
        </p>
        <button
          type="button"
          onclick={() => openContact(categoryId)}
          style="cursor:pointer;display:inline-block;background:#fff;color:#000;font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;padding:16px 34px"
          >Talk to Us</button
        >
      </div>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:120px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
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
        style="display:grid;gap:1px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.12)"
      >
        <div style="background:#000;padding:56px 48px">
          <div
            style="font-family:'Barlow Condensed',sans-serif;font-size:80px;font-weight:400;color:rgba(255,255,255,.35);line-height:1"
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
            style="margin:0;font-size:16px;color:rgba(255,255,255,.75);line-height:1.6;max-width:420px"
          >
            Unlock stranded copper in low-grade sulfide and oxide heaps. LithX curing lifts
            dissolution rates where conventional acid leaching stalls.
          </p>
        </div>
        <div style="background:#000;padding:56px 48px">
          <div
            style="font-family:'Barlow Condensed',sans-serif;font-size:80px;font-weight:400;color:rgba(255,255,255,.35);line-height:1"
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
            style="margin:0;font-size:16px;color:rgba(255,255,255,.75);line-height:1.6;max-width:420px"
          >
            Recover more ounces from heaps and tailings previously written off. Higher extraction
            from the ore you already own.
          </p>
        </div>
        <div style="background:#000;padding:56px 48px;display:flex;flex-direction:column">
          <div
            style="font-family:'Barlow Condensed',sans-serif;font-size:80px;font-weight:400;color:rgba(255,255,255,.35);line-height:1"
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
            style="margin:0 0 24px;font-size:16px;color:rgba(255,255,255,.75);line-height:1.6;max-width:420px"
          >
            Working a different metal or a challenging ore body? Tell us what you’re leaching —
            we’ll tell you if LithX fits.
          </p>
          <button
            type="button"
            onclick={() => openContact(categoryId)}
            style="cursor:pointer;margin-top:auto;align-self:flex-start;font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.6);padding-bottom:4px"
            >Ask about your ore →</button
          >
        </div>
      </div>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:100px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
  >
    <div class="grid-four" style="max-width:1200px;margin:0 auto;display:grid;gap:48px">
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Higher Recovery
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          More metal from every tonne placed on the pad.
        </div>
      </div>
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Ambient Temperature
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Works in existing heap conditions — no heating.
        </div>
      </div>
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Environmentally Friendly
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Biodegradable chemistry from organic feedstocks.
        </div>
      </div>
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Drop-In Solution
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Integrates into your agglomeration circuit as-is.
        </div>
      </div>
    </div>
  </section>
</div>
