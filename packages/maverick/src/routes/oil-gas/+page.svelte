<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { openContact } from '$lib/redesign/contact';
  import { oilApps } from '$lib/redesign/content';
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
    <Media kind="oil" />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.2) 40%,rgba(0,0,0,.85))"
    ></div>
    <div class="hero-copy" style="position:relative;padding:0 48px 88px;max-width:1000px;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px"
      >
        Oil &amp; Gas
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(52px,6.5vw,96px);line-height:.95;text-transform:uppercase"
      >
        {#if overrides?.title}{overrides.title}{:else}More Oil<br />From Every Well{/if}
      </h1>
      <p
        style="margin:26px 0 0;font-size:19px;color:rgba(255,255,255,.85);max-width:560px;line-height:1.5;text-wrap:pretty"
      >
        {#if overrides?.subtitle}{overrides.subtitle}{:else}Next-gen stimulation chemistry that
          breaks silicates through ultra-strong chelation — boosting production rates and extending
          well life.{/if}
      </p>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:120px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
    data-screen-label="PetroX Boost"
  >
    <div
      class="grid-two"
      style="max-width:1200px;margin:0 auto;display:grid;gap:72px;align-items:center"
    >
      <div>
        <div
          style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:16px"
        >
          Production Enhancement
        </div>
        <h2
          class="display-title"
          style="margin:0 0 24px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:60px;line-height:1;text-transform:uppercase"
        >
          PetroX Boost
        </h2>
        <p
          style="margin:0 0 18px;font-size:18px;color:rgba(255,255,255,.85);line-height:1.6;text-wrap:pretty"
        >
          Our production enhancement technology breaks down the silicates that trap oil, enhancing
          porosity and permeability to supercharge production rates. Where surfactants only change
          wettability, PetroX Boost changes the rock itself.
        </p>
        <p
          style="margin:0 0 32px;font-size:18px;color:rgba(255,255,255,.85);line-height:1.6;text-wrap:pretty"
        >
          Treatments are non-hazmat and run through your existing infrastructure.
        </p>
        <button
          type="button"
          onclick={() => openContact(categoryId)}
          style="cursor:pointer;display:inline-block;background:#fff;color:#000;font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;padding:16px 34px"
          >Talk to Us</button
        >
      </div>
      <div class="media-panel" style="position:relative;height:480px;overflow:hidden">
        <Media kind="oil" />
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
        Applications
      </h2>
      <div
        class="grid-three"
        style="display:grid;gap:1px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.12)"
      >
        {#each oilApps as app}
          <div style="background:#000;padding:36px 32px 44px">
            <div
              style="font-family:'Barlow Condensed',sans-serif;font-size:15px;color:rgba(255,255,255,.4);margin-bottom:18px"
            >
              {app.num}
            </div>
            <h3
              class="display-title"
              style="margin:0 0 12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:26px;text-transform:uppercase;letter-spacing:.5px"
            >
              {app.name}
            </h3>
            <p style="margin:0;font-size:15px;color:rgba(255,255,255,.7);line-height:1.55">
              {app.desc}
            </p>
          </div>
        {/each}
        <div style="background:#000;padding:36px 32px 44px;display:flex;align-items:flex-end">
          <button
            type="button"
            onclick={() => openContact(categoryId)}
            style="cursor:pointer;font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.6);padding-bottom:4px"
            >Discuss your application →</button
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
          Increased Production
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Enhanced porosity and permeability lift production rates in treated wells.
        </div>
      </div>
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Extended Well Life
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Keeps mature wells economic longer by recovering oil conventional methods leave behind.
        </div>
      </div>
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Non-Hazardous
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Non-hazmat chemistry — safe to ship, store, and handle in the field.
        </div>
      </div>
      <div>
        <div style="width:32px;height:2px;background:#fff;margin-bottom:20px"></div>
        <div
          style="font-size:15px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px"
        >
          Drop-In Deployment
        </div>
        <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.5">
          Infrastructure-safe treatments run through your existing wellsite equipment.
        </div>
      </div>
    </div>
  </section>
</div>
