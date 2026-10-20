<script lang="ts">
  import { SEO } from '@create-something/canon';
  import ScopefieldStory from '$lib/components/scopefield/ScopefieldStory.svelte';

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
    <div class="edition"><a href="/products">Products</a><span>Mac public beta · 0.1.0-beta.1</span></div>
    <div class="hero-grid">
      <div><p class="eyebrow">Scopefield / A browser by CREATE SOMETHING</p><h1 id="scopefield-title">Your browser.<br /><em>Your call.</em></h1></div>
      <div class="hero-aside">
        <p class="lede">A URL browser with room for the page, the work, and your decisions.</p>
        <p class="support">Explore the published Mac beta. See separately how we’re testing bounded context sharing with AI agents.</p>
        <a class="primary" href={downloadUrl}>Download the Mac beta <span aria-hidden="true">↘</span></a>
        <p class="compatibility">0.1.0-beta.1 · Apple Silicon · macOS 13+<br />ZIP · 131 MB · Early beta, not a daily-browser replacement.</p><a class="text-link hero-details" href="#handoff">Requirements, installation &amp; integrity ↓</a>
      </div>
    </div>
    <div class="opening-footer"><span class="product-name"><img src="/scopefield/mark.svg" width="52" height="52" alt="" />Scopefield</span><a href="#focused-proof">Understand the boundary <span aria-hidden="true">↓</span></a></div>
  </section>

  <section class="proof" id="focused-proof" aria-labelledby="story-title">
    <div class="story-heading"><p class="eyebrow">01 / Anatomy of a bounded task</p><h2 id="story-title">What crosses<br /><em>the boundary?</em></h2><p>A conceptual model of context, recipient, approval, interruption, and evidence. The capability record below states what is actually available.</p></div>
    <ScopefieldStory />
    <div class="reality">
      <div><p class="eyebrow">02 / Direction, with a boundary</p><h2>Built toward<br />daily AI work.<br /><em>Starting here.</em></h2></div>
      <div class="reality-body"><p class="section-lede">The illustration explains the idea. The public beta is a smaller, specific release.</p>
        <dl>
          <div><dt>Available in beta 1</dt><dd>A Mac browser and collapsible Page workspace. Experimental public browsing is an explicit opt-in.</dd></div>
          <div><dt>Verified locally · newer candidate</dt><dd>Codex observation was exercised; its human-approved action loop remains unverified. Claude has only a browser-side check that one page observation was read and the connection was cleaned up. These results do not qualify general agent actions or describe features in this download.</dd></div>
          <div><dt>Roadmap · unavailable today</dt><dd>Agent access to real websites is disabled. There is no supported way to attach Dots. Here “Dots” refers to ChatGPT dots; no integration or partnership is implied. Daily-browser reliability and general login/SSO remain unqualified.</dd></div>
        </dl>
        <p class="candidate-note">The newer 0.1.2-beta.9 candidate is not notarized or published. It is not offered for download here.</p><div class="release-proof"><span class="proof-label">Public release</span><p>Signed by Create Something LLC.<br />Notarized by Apple.<br /><small>Applies to published beta1 only.</small></p><a href={`${releaseRoot}/README.txt`}>Read the beta release notes <span aria-hidden="true">↗</span></a></div>
      </div>
    </div>
  </section>

  <section class="download" id="handoff" aria-labelledby="download-title">
    <div class="download-intro"><p class="eyebrow">03 / Try Scopefield</p><h2 id="download-title">A small start.<br /><em>A real beta.</em></h2><p>For exploring the browser and workspace on an Apple Silicon Mac. Read the limits before you install.</p><a class="primary" href={downloadUrl}>Download for Apple Silicon <span aria-hidden="true">↓</span></a><p class="compatibility">0.1.0-beta.1 · macOS 13 or newer · ZIP, 131 MB</p><a class="text-link" href={`${releaseRoot}/SHA256SUMS.txt`}>Verify the download checksum <span aria-hidden="true">↗</span></a><details class="integrity"><summary>SHA-256 · published beta1</summary><code>0289e532714af555c11c4c6be0d701179fb7f2fb52616607ddc775d1412fdca6</code><p>Run <code>shasum -a 256</code> on the downloaded ZIP and compare all 64 characters with this value.</p></details></div>
    <div class="install-details">
      <h3>Before you install</h3>
      <ul class="limits"><li>Experimental public HTTPS only: IPv4, port 443.</li><li>Up to eight browser tabs.</li><li>General login and SSO are not qualified for this beta.</li><li>Public agent navigation and native WebMCP execution are unavailable.</li><li>No automatic updates.</li></ul>
      <h3>Install on your Mac</h3>
      <ol class="install-steps"><li><span>Unzip the download.</span></li><li><span>Copy Scopefield.app to Applications. Preserve any existing copy before replacing it.</span></li><li><span>Open Scopefield normally.</span></li></ol>
      <p class="install-note">To browse public sites, enable <strong>Experimental public browsing</strong> in browsing settings. Save for next launch, quit, and reopen normally.</p>
      <a class="text-link" href={`${releaseRoot}/README.txt`}>Full installation notes <span aria-hidden="true">↗</span></a><p class="install-note">Questions or a problem with the beta?<br /><a href="mailto:support@createsomething.io">support@createsomething.io</a></p>
    </div>
  </section>
</div>

<style>
  .hero-details { display:inline-block; margin-top:1rem; padding-block:0.5rem; }
  .candidate-note { margin-top:1.5rem; font-size:0.85rem; line-height:1.6; color:var(--color-performance-muted); }
  .product-name img { background:#f3f3f0; border-radius:6px; padding:4px; }
  .product-name { display:flex; align-items:center; gap:1rem; }
  .integrity { margin-top:1.5rem; border-top:1px solid var(--color-performance-line); font-size:0.8rem; line-height:1.6; }
  summary { cursor:pointer; padding:1rem 0; min-height:44px; }
  .integrity code { overflow-wrap:anywhere; }
  .integrity > code { display:block; margin-bottom:1rem; }
  summary:focus-visible { outline:2px solid var(--color-performance-focus); outline-offset:4px; }
  @media print { .opening,.proof,.download { padding:1.5rem 0 !important; } .hero-grid,.reality,.download { display:block !important; } h1 { font-size:3rem !important; } h2 { font-size:2rem !important; } .primary { background:transparent !important; color:#000 !important; } .integrity > * { display:block !important; } }
  .scopefield-page { color: var(--color-performance-ink); font-family: var(--font-performance-sans); }
  .opening, .proof, .download { padding: clamp(2rem, 5vw, 6rem) 6vw; }
  .opening { padding-top: 1rem; }
  .edition, .eyebrow, .compatibility, .proof-label, .opening-footer a { font-family: var(--font-performance-mono); font-size: 0.75rem; line-height: 1.6; }
  .edition { display: flex; justify-content: space-between; gap: 1rem; padding-block: 1rem; border-bottom: 1px solid var(--color-performance-line); color: var(--color-performance-muted); }
  a { text-underline-offset: 0.3em; }
  .edition a { color: inherit; }
  .hero-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 7vw; align-items: end; padding-block: clamp(3rem, 7vw, 7rem); }
  .eyebrow { margin: 0 0 1.5rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-performance-muted); }
  h1, h2, h3, p { margin: 0; }
  h1 { font-family: var(--font-performance-display); font-size: clamp(4rem, 8.5vw, 9rem); line-height: 0.98; font-weight: 500; letter-spacing: -0.065em; }
  em { font-family: var(--font-performance-editorial); font-weight: 400; }
  .hero-aside { max-width: 29rem; padding-bottom: 0.25rem; }
  .lede { font-size: clamp(1.3rem, 1.85vw, 1.85rem); line-height: 1.4; letter-spacing: -0.025em; }
  .support { color: var(--color-performance-muted); line-height: 1.6; margin-top: 1.5rem; }
  .primary { display: flex; justify-content: space-between; align-items: center; gap: 2rem; padding: 1rem 1.25rem; background: var(--color-performance-ink); color: var(--color-performance-paper); border: 1px solid var(--color-performance-ink); border-radius: var(--radius-operator-control); font-weight: 600; text-decoration: none; margin-top: 2rem; min-height: 3.5rem; }
  .primary:hover { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .primary span { font-size: 1.5rem; line-height: 1; }
  .compatibility { margin-top: 1rem; color: var(--color-performance-muted); }
  .opening-footer { display: flex; justify-content: space-between; align-items: end; gap: 2rem; border-top: 1px solid var(--color-performance-line); padding-top: 2rem; }
  .product-name { font-size: clamp(2.8rem, 6vw, 6rem); letter-spacing: -0.06em; line-height: 1; }
  .opening-footer a { color: var(--color-performance-muted); padding-block: 0.75rem; }
  .proof { border-top: 1px solid var(--color-performance-line); padding-block: 5rem 0; }
  .story-heading { display: grid; grid-template-columns: 1.35fr 1fr; column-gap: 6vw; margin-bottom: 4rem; align-items: end; }
  .story-heading .eyebrow { grid-column: 1 / -1; }
  .story-heading > p:last-child { font-size: 1.15rem; color: var(--color-performance-muted); line-height: 1.6; max-width: 29rem; }
  h2 { font-size: clamp(2.6rem, 4.6vw, 5rem); line-height: 1.05; letter-spacing: -0.045em; font-weight: 500; }
  .reality, .download { display: grid; grid-template-columns: 1fr 1fr; gap: 8vw; border-top: 1px solid var(--color-performance-line); padding-block: clamp(4rem, 8vw, 8rem); }
  .reality { margin-top: 4rem; }
  .section-lede { font-size: 1.35rem; line-height: 1.5; max-width: 34rem; }
  dl { margin: 2rem 0 0; }
  dl > div { padding-block: 1.5rem; border-top: 1px solid var(--color-performance-line); }
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
  @media (min-width: 1600px) { .opening, .proof, .download { padding-inline: max(6vw, calc((100vw - 1440px) / 2)); } }
  @media (max-width: 850px) {
    .edition { flex-direction: column; gap: 0.35rem; }
    .hero-grid, .story-heading, .reality, .download { grid-template-columns: 1fr; gap: 2.5rem; }
    .hero-grid { padding-block: 2.5rem; }
    h1 { font-size: clamp(3.6rem, 14vw, 6.5rem); }
    .hero-aside { max-width: none; }
    .opening-footer { flex-direction: column; align-items: start; gap: 0.75rem; }
    .story-heading .eyebrow { margin-bottom: 0; }
    .download-intro .primary { max-width: none; }
  }
</style>
