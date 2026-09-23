<script lang="ts">
  import Media from '$lib/redesign/Media.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { openContact } from '$lib/redesign/contact';
  import { team } from '$lib/redesign/content';
  const categoryId = 'general';
</script>

<SEO
  title="About | Maverick X"
  description="Revitalizing critical resource extraction with precision biologics."
  canonical="https://www.maverickx.com/about"
  ogImage="https://www.maverickx.com/images/logo.png"
/>

<div>
  <section
    class="design-section hero-banner"
    style="position:relative;padding:220px 48px 120px;overflow:hidden"
    data-screen-label="About"
  >
    <Media kind="about" opacity={1} />
    <div
      style="position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.55))"
    ></div>
    <div style="position:relative;max-width:1100px;margin:0 auto;">
      <div
        style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px"
      >
        About Maverick X
      </div>
      <h1
        class="display-title"
        style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:clamp(44px,5.5vw,80px);line-height:1;text-transform:uppercase;max-width:900px"
      >
        Revitalizing critical resource extraction with precision biologics
      </h1>
      <p
        style="margin:28px 0 0;font-size:19px;color:rgba(255,255,255,.85);max-width:640px;line-height:1.6;text-wrap:pretty"
      >
        We engineer biologically derived molecules that make extracting the world's critical
        resources safer, cleaner, and more profitable — solving pressing resource challenges facing
        the United States and the world.
      </p>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:100px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
  >
    <div style="max-width:1100px;margin:0 auto">
      <h2
        class="display-title"
        style="margin:0 0 48px;font-family:'Barlow Condensed',sans-serif;font-weight:500;font-size:40px;text-transform:uppercase"
      >
        Leadership
      </h2>
      <div class="grid-four" style="display:grid;gap:32px 32px;row-gap:56px">
        {#each team as p}
          <div>
            <a
              href={p.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              style="display:block;aspect-ratio:1;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#000"
              ><img
                src={p.photo}
                loading="lazy"
                width="400"
                height="400"
                alt={p.name}
                style="width:100%;height:100%;object-fit:cover;object-position:top;display:block;filter:grayscale(1) brightness(.9);transform:scale(1.02);transition:filter .4s ease,transform .4s ease"
              /></a
            >

            <div style="margin-top:16px;font-size:17px;font-weight:600">{p.name}</div>
            <div
              style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-top:4px"
            >
              {p.role}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section
    class="design-section"
    style="padding:100px 48px;border-bottom:1px solid rgba(255,255,255,.12)"
  >
    <div
      class="grid-two"
      style="max-width:1100px;margin:0 auto;display:grid;gap:64px;align-items:center"
    >
      <div>
        <h2
          class="display-title"
          style="margin:0 0 20px;font-family:'Barlow Condensed',sans-serif;font-weight:500;font-size:40px;text-transform:uppercase"
        >
          Built in Austin.<br />Backed by industry.
        </h2>
        <p
          style="margin:0;font-size:17px;color:rgba(255,255,255,.8);line-height:1.6;max-width:480px;text-wrap:pretty"
        >
          A team of scientists, engineers, and operators shipping precision biologics that work at
          industrial scale — from our lab to the field.
        </p>
      </div>
      <div style="display:flex;flex-direction:column;gap:24px">
        <div
          class="fact-row"
          style="border-top:1px solid rgba(255,255,255,.25);padding-top:16px;display:flex;justify-content:space-between;font-size:15px"
        >
          <span
            style="color:rgba(255,255,255,.6);letter-spacing:2px;text-transform:uppercase;font-size:12px"
            >Headquarters</span
          ><span>444 E. St. Elmo Rd, Bldg. B, Austin, TX</span>
        </div>
        <div
          class="fact-row"
          style="border-top:1px solid rgba(255,255,255,.25);padding-top:16px;display:flex;justify-content:space-between;font-size:15px"
        >
          <span
            style="color:rgba(255,255,255,.6);letter-spacing:2px;text-transform:uppercase;font-size:12px"
            >Backed By</span
          ><span style="text-align:right"
            >Chord Energy, Y Combinator,<br />and other leading organizations</span
          >
        </div>
        <div
          class="fact-row"
          style="border-top:1px solid rgba(255,255,255,.25);padding-top:16px;display:flex;justify-content:space-between;font-size:15px"
        >
          <span
            style="color:rgba(255,255,255,.6);letter-spacing:2px;text-transform:uppercase;font-size:12px"
            >Careers</span
          ><a
            href="https://jobs.lever.co/maverickx"
            target="_blank"
            rel="noopener noreferrer"
            style="border-bottom:1px solid rgba(255,255,255,.4)">We're hiring →</a
          >
        </div>
      </div>
    </div>
  </section>
</div>
