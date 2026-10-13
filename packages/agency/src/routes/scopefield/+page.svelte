<script lang="ts">
  import { SEO } from '@create-something/canon';

  const releaseRoot = 'https://media.createsomething.io/releases/scopefield/0.1.0-beta.1/0289e532714af555c11c4c6be0d701179fb7f2fb52616607ddc775d1412fdca6';
  const downloadUrl = `${releaseRoot}/Scopefield-0.1.0-beta.1-macos-arm64.zip`;
</script>

<SEO
  title="Scopefield — A browser with room for the work"
  description="A Mac browser with a collapsible Page workspace and explicit human control. Explore the Scopefield public beta for Apple Silicon, macOS 13 or newer."
  propertyName="agency"
/>

<div class="scopefield-page">
  <section class="opening" id="opening" aria-labelledby="scopefield-title">
    <div class="edition"><a href="/products">CREATE SOMETHING / Products</a><span>Public beta · 0.1.0-beta.1</span></div>
    <div class="hero-grid">
      <div>
        <p class="eyebrow">Scopefield for Mac</p>
        <h1 id="scopefield-title">A browser.<br />Room for<br /><em>the work.</em></h1>
      </div>
      <div class="hero-aside">
        <p class="lede">Browse with a Page workspace beside you. Open it when you need it. Hide it when you need the page.</p>
        <p class="support">Scopefield brings browsing and a collapsible workspace into one Mac app, with human control made explicit.</p>
        <a class="primary" href="#handoff">Get the Mac beta <span aria-hidden="true">↘</span></a>
        <p class="compatibility">Apple Silicon · macOS 13+<br />Experimental public browsing · No automatic updates</p>
      </div>
    </div>
    <figure class="workspace-map" aria-labelledby="map-caption">
      <div class="map-top"><span>01 / Browser + workspace</span><span>One app. Two working areas.</span></div>
      <div class="map-body">
        <div class="browser-area"><span class="map-index">01</span><strong>Browse.</strong><p>The page stays in view.</p><div class="browser-rule" aria-hidden="true"></div><span class="map-note">Public browsing is opt-in</span></div>
        <div class="page-area"><span class="map-index">02</span><strong>Make room.</strong><p>Show or hide the Page workspace without losing its state.</p><span class="map-note">Collapsible workspace</span></div>
      </div>
      <figcaption id="map-caption"><span>Workspace relationship diagram — not a product screenshot.</span><span>Human control remains explicit.</span></figcaption>
    </figure>
  </section>

  <section class="proof" id="focused-proof" aria-labelledby="boundary-title">
    <div class="section-heading"><p class="eyebrow">02 / The boundary</p><h2 id="boundary-title">You choose<br />what opens up.</h2></div>
    <div class="boundary-body">
      <p class="section-lede">Public browsing starts with a choice in settings. Visiting a site does not grant project access or permission to deploy.</p>
      <dl class="boundary-list">
        <div><dt>Browse by choice.</dt><dd>Enable Experimental public browsing, save for next launch, then quit and reopen. Offline-practice launches always stay offline.</dd></div>
        <div><dt>Keep the workspace close.</dt><dd>Show or hide the Page workspace while preserving its state. Give the browser more room without closing the workspace.</dd></div>
        <div><dt>Keep control explicit.</dt><dd>Browser access is separate from permission to act. Public agent navigation and native WebMCP execution are unavailable in this beta.</dd></div>
      </dl>
      <div class="release-proof"><span class="proof-label">Release evidence</span><p>Signed by Create Something LLC.<br />Notarized by Apple.</p><a href={`${releaseRoot}/README.txt`}>Read the beta release notes <span aria-hidden="true">↗</span></a></div>
    </div>
  </section>

  <section class="download" id="handoff" aria-labelledby="download-title">
    <div class="download-intro"><p class="eyebrow">03 / Try Scopefield</p><h2 id="download-title">A small start.<br /><em>A real beta.</em></h2><p>For exploring the browser and workspace on an Apple Silicon Mac. Read the limits before you install.</p><a class="primary" href={downloadUrl}>Download for Apple Silicon <span aria-hidden="true">↓</span></a><p class="compatibility">0.1.0-beta.1 · macOS 13 or newer · ZIP, 131 MB</p><a class="text-link" href={`${releaseRoot}/SHA256SUMS.txt`}>Verify the download checksum <span aria-hidden="true">↗</span></a></div>
    <div class="install-details">
      <h3>Before you install</h3>
      <ul class="limits"><li>Experimental public HTTPS only: IPv4, port 443.</li><li>Up to eight browser tabs.</li><li>General login and SSO are not qualified for this beta.</li><li>Public agent navigation and native WebMCP execution are unavailable.</li><li>No automatic updates.</li></ul>
      <h3>Install on your Mac</h3>
      <ol class="install-steps"><li><span>Unzip the download.</span></li><li><span>Copy Scopefield.app to Applications. Preserve any existing copy before replacing it.</span></li><li><span>Open Scopefield normally.</span></li></ol>
      <p class="install-note">To browse public sites, enable <strong>Experimental public browsing</strong> in browsing settings. Save for next launch, quit, and reopen normally.</p>
      <a class="text-link" href={`${releaseRoot}/README.txt`}>Full installation notes <span aria-hidden="true">↗</span></a>
    </div>
  </section>
</div>

<style>
  .scopefield-page { color: var(--color-performance-ink); font-family: var(--font-performance-sans); }
  .opening, .proof, .download { padding: clamp(2rem, 5vw, 6rem) 7vw; }
  .opening { padding-top: 1rem; }
  .edition, .eyebrow, .compatibility, .map-top, .map-index, .map-note, figcaption, .proof-label { font-family: var(--font-performance-mono); font-size: 0.75rem; line-height: 1.6; }
  .edition { display: flex; justify-content: space-between; gap: 1rem; padding-block: 1rem; border-bottom: 1px solid var(--color-performance-line); color: var(--color-performance-muted); }
  a { text-underline-offset: 0.3em; }
  .edition a { color: inherit; }
  .hero-grid { display: grid; grid-template-columns: 1.45fr 1fr; gap: 8vw; align-items: end; padding-block: clamp(3rem, 6vw, 6rem); }
  .eyebrow { margin: 0 0 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-performance-muted); }
  h1, h2, h3, p { margin: 0; }
  h1 { font-family: var(--font-performance-display); font-size: clamp(3.8rem, 7.7vw, 8.5rem); line-height: 0.95; font-weight: 600; letter-spacing: -0.055em; }
  em { font-family: var(--font-performance-editorial); font-weight: 400; }
  .hero-aside { max-width: 29rem; padding-bottom: 0.25rem; }
  .lede { font-size: clamp(1.3rem, 2.1vw, 2rem); line-height: 1.35; letter-spacing: -0.025em; }
  .support { color: var(--color-performance-muted); line-height: 1.6; margin-top: 1.5rem; }
  .primary { display: flex; justify-content: space-between; align-items: center; gap: 2rem; padding: 1rem 1.25rem; background: var(--color-performance-ink); color: var(--color-performance-paper); border: 1px solid var(--color-performance-ink); border-radius: var(--radius-operator-control); font-weight: 600; text-decoration: none; margin-top: 2rem; min-height: 3.5rem; }
  .primary:hover { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .primary span { font-size: 1.5rem; line-height: 1; }
  .compatibility { margin-top: 1rem; color: var(--color-performance-muted); }
  .workspace-map { margin: 0; border: 1px solid var(--color-performance-line); background: var(--color-performance-panel); }
  .map-top, figcaption { display: flex; gap: 1rem; justify-content: space-between; padding: 1rem 1.5rem; color: var(--color-performance-muted); }
  .map-top { border-bottom: 1px solid var(--color-performance-line); }
  .map-body { display: grid; grid-template-columns: 1.6fr 1fr; }
  .browser-area, .page-area { min-height: 20rem; padding: 2rem 2.5rem; display: flex; flex-direction: column; align-items: start; }
  .page-area { border-left: 1px dashed var(--color-performance-line-strong); background: var(--color-performance-paper); }
  .map-index { color: var(--color-performance-muted); margin-bottom: 2rem; }
  .map-body strong { font-size: clamp(2rem, 3.8vw, 4rem); font-weight: 400; letter-spacing: -0.04em; line-height: 1.1; }
  .map-body p { color: var(--color-performance-muted); line-height: 1.6; margin-top: 0.8rem; max-width: 22rem; }
  .map-note { margin-top: auto; padding-top: 2rem; }
  .browser-rule { width: 60%; border-top: 1px solid var(--color-performance-line); margin-top: 1.5rem; }
  figcaption { border-top: 1px solid var(--color-performance-line); font-size: 0.6875rem; }
  .proof, .download { display: grid; grid-template-columns: 1fr 1fr; gap: 8vw; border-top: 1px solid var(--color-performance-line); padding-block: clamp(4rem, 8vw, 8rem); }
  h2 { font-size: clamp(2.6rem, 4.6vw, 5rem); line-height: 1.05; letter-spacing: -0.045em; font-weight: 500; }
  .section-lede { font-size: 1.35rem; line-height: 1.5; max-width: 34rem; }
  .boundary-list { margin: 2.5rem 0 0; }
  .boundary-list > div { padding-block: 1.5rem; border-top: 1px solid var(--color-performance-line); }
  dt { font-weight: 600; margin-bottom: 0.65rem; font-size: 1.1rem; }
  dd { margin: 0; color: var(--color-performance-muted); line-height: 1.65; }
  .release-proof { margin-top: 1.5rem; border-left: 2px solid var(--color-operator-status-done-text); padding-left: 1.5rem; }
  .proof-label { color: var(--color-performance-muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .release-proof p { margin-block: 0.7rem 1rem; line-height: 1.6; }
  .release-proof a, .text-link { font-size: 0.875rem; }
  .download { background: var(--color-performance-panel); }
  .download-intro > p:not(.eyebrow):not(.compatibility) { margin-top: 1.5rem; line-height: 1.6; color: var(--color-performance-muted); max-width: 26rem; }
  .download-intro .primary { max-width: 28rem; }
  .download-intro .text-link { display: inline-block; margin-top: 1rem; }
  h3 { font-size: 1.2rem; font-weight: 600; }
  .limits { padding-left: 1.2rem; margin: 1rem 0 2.5rem; color: var(--color-performance-muted); line-height: 1.6; }
  .limits li + li { margin-top: 0.65rem; }
  .install-steps { list-style: decimal-leading-zero; margin: 1.25rem 0; padding-left: 1.8rem; }
  .install-steps li { padding: 0.75rem 0 0.75rem 0.5rem; border-bottom: 1px solid var(--color-performance-line); line-height: 1.6; }
  .install-steps li::marker { color: var(--color-performance-muted); font-family: var(--font-performance-mono); font-size: 0.75rem; }
  .install-note { color: var(--color-performance-muted); line-height: 1.6; margin-block: 1.5rem; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 5px; }
  @media (min-width: 1600px) { .opening, .proof, .download { padding-inline: max(7vw, calc((100vw - 1440px) / 2)); } }
  @media (max-width: 760px) {
    .opening, .proof, .download { padding-inline: 6vw; }
    .edition { flex-direction: column; gap: 0.35rem; }
    .hero-grid, .proof, .download { grid-template-columns: 1fr; gap: 2.5rem; }
    .hero-grid { padding-block: 2.5rem; }
    h1 { font-size: clamp(3.6rem, 15vw, 6.5rem); }
    .hero-aside { max-width: none; }
    .map-top, figcaption { flex-direction: column; gap: 0.35rem; padding: 1rem; }
    .map-body { grid-template-columns: 1fr; }
    .browser-area, .page-area { padding: 1.5rem; min-height: 15rem; }
    .page-area { border-left: 0; border-top: 1px dashed var(--color-performance-line-strong); }
    .map-index { margin-bottom: 1.25rem; }
    .download-intro .primary { max-width: none; }
  }
</style>
