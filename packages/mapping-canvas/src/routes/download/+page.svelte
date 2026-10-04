<script lang="ts">
  import './page.css';
  import { onMount } from 'svelte';

  const canonicalUrl = 'https://draw.createsomething.agency/download';
  const title = 'Draw for Mac | CREATE SOMETHING';
  const description = 'Map a workflow with readable notes, connectors and groups. Draw 0.1.1 for Apple Silicon Mac is signed and notarized; pilot delivery is by request.';
  const sourceSha = '659ca02c3300f70f6bc549f4896df989debf9ff2';
  const dmgSha256 = '25c4394b1ab71ab7e71ec28b0711f084bf6a5dace321cc212c9e30a57153e141';
  const requestUrl = 'mailto:micah@createsomething.io?subject=Draw%200.1.1%20Mac%20pilot&body=I%27d%20like%20to%20try%20the%20Draw%20Mac%20pilot.%20I%20use%20an%20Apple%20Silicon%20Mac%20running%20macOS%2013%20or%20later.%20I%20can%20test%20one%20synthetic%20or%20redacted%20workflow.';
  const applicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${canonicalUrl}#mac`,
    name: 'CREATE SOMETHING Draw for Mac',
    url: canonicalUrl,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'macOS 13 or later; Apple Silicon',
    softwareVersion: '0.1.1',
    description,
    isAccessibleForFree: true,
    license: 'https://opensource.org/license/mit',
    downloadUrl: requestUrl,
    codeRepository: 'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/apps/draw-native',
    publisher: {
      '@type': 'Organization',
      '@id': 'https://createsomething.ltd/#organization',
      name: 'CREATE SOMETHING',
      url: 'https://createsomething.agency'
    }
  };
  const jsonLd = `<script type="application/ld+json">${JSON.stringify(applicationSchema).replace(/</g, '\\u003c')}</scr` + 'ipt>';

  onMount(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:site_name" content="CREATE SOMETHING Draw" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content="https://draw.createsomething.agency/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content="https://draw.createsomething.agency/og-image.png" />
  {@html jsonLd}
</svelte:head>

<main class="download-page">
  <nav class="page-nav" aria-label="Draw navigation">
    <a class="brand" href="/" aria-label="Open CREATE SOMETHING Draw">
      <img src="/brand/create-something-agency-white.svg" alt="CREATE SOMETHING .agency" />
      <span>Draw</span>
    </a>
    <div>
      <a href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/apps/draw-native" target="_blank" rel="noreferrer">Source</a>
      <a class="nav-action" href="/">Open Draw</a>
    </div>
  </nav>

  <section class="opening" aria-labelledby="download-title">
    <div class="opening-copy">
      <div class="eyebrow"><span>MAC PILOT · 0.1.1</span><span>SIGNED · NOTARIZED</span></div>
      <h1 id="download-title">Map the work.<br />Make the handoff clear.</h1>
      <p class="lede">Turn one workflow into a shared picture: readable notes, steps, connectors and decisions. Correct it during the conversation, then export a map someone else can use.</p>
      <div class="actions"><a class="primary" href="/">Open Draw</a><a class="secondary" href={requestUrl}>Request pilot build</a></div>
      <p class="boundary">Apple Silicon · macOS 13 or later · 9,152,911-byte DMG. Developer ID signed, Apple notarized, Gatekeeper accepted. Pilot delivery by request; public hosting is pending.</p>
    </div>
    <figure class="hero-visual">
      <img src="/images/draw/workflow-pilot.png" width="1440" height="1000" alt="Synthetic request-to-handoff workflow in Draw, with formatted notes and connected steps" fetchpriority="high" />
      <figcaption><span>ACTUAL DRAW CANVAS</span><p>A synthetic automation workflow. Notes separate the trigger, decision and handoff without hiding the details.</p></figcaption>
    </figure>
  </section>

  <section class="proof" aria-labelledby="proof-title">
    <div class="section-label"><span>01</span><h2 id="proof-title">One workflow. A useful handoff.</h2></div>
    <div class="flow" aria-label="Mapping and handoff workflow">
      <article><span class="node">1</span><small>MAP + CORRECT</small><strong>Make the decision visible</strong><p>Arrange notes and connect the steps. Give each text block a role, add selected emphasis, and undo a change when the map needs correction.</p></article>
      <div class="route" aria-hidden="true"><span>EXPORT</span><i>→</i></div>
      <article><span class="node signal">2</span><small>SAVE + HAND OFF</small><strong>Keep an editable copy</strong><p>Export JSON for backup and later editing. Use SVG or PNG for a review document. Send only the file and details your recipient needs.</p></article>
      <div class="receipt"><small>LOCAL FIRST</small><strong>No account needed for a local canvas. Export before moving between devices.</strong></div>
    </div>
  </section>

  <section class="conditions" aria-labelledby="conditions-title">
    <div class="section-label"><span>02</span><h2 id="conditions-title">Install with a clear boundary.</h2></div>
    <div class="condition-grid">
      <article><small>VERIFIED</small><strong>Mac 0.1.1</strong><p>Apple Silicon, macOS 13 or later. Signed with CREATE SOMETHING’s Developer ID; Apple notarization, stapling and Gatekeeper checks passed.</p></article>
      <article><small>YOUR COPY</small><strong>Storage and backups</strong><p>The Mac retains its local document across relaunch. Export JSON after each session and before updates. Browser storage is separate for each browser and website address; clearing it can remove local work.</p></article>
      <article class="review"><small>PILOT SCOPE</small><strong>One redacted workflow</strong><p>Desktop mapping and file handoff are the pilot. Intel Macs and physical iPhone pairing are not qualified for this release. Browser agent controls require a supported agent browser and do not operate the paired native shell.</p></article>
    </div>
    <ol class="install-steps">
      <li>Request the pilot build and confirm your Mac uses Apple Silicon and macOS 13 or later.</li>
      <li>Compare the delivered DMG’s SHA-256 with the release record below: <code>shasum -a 256 "Draw-0.1.1-arm64-notarized.dmg"</code>.</li>
      <li>Open the DMG and drag CREATE SOMETHING Draw to Applications. If an older copy is present, export its JSON first and keep the original until the new copy is checked.</li>
      <li>Open Draw from Applications. macOS may ask you to confirm opening a downloaded app. If it reports an unidentified developer or damaged app, stop and contact us; do not bypass Gatekeeper.</li>
      <li>Use a synthetic or redacted workflow. Save an editable JSON backup and export SVG or PNG for the handoff.</li>
    </ol>
    <dl class="release-record">
      <div><dt>Version / compatibility</dt><dd>0.1.1 · arm64 · macOS 13+</dd></div>
      <div><dt>Application source</dt><dd><code>{sourceSha}</code></dd></div>
      <div><dt>DMG SHA-256</dt><dd><code>{dmgSha256}</code></dd></div>
      <div><dt>Mac verification</dt><dd>Fresh profile and existing-document relaunch, native editing, undo/redo, cancel, and signed package acceptance passed.</dd></div>
      <div><dt>Delivery</dt><dd>By request. A public binary URL will be added after publication approval.</dd></div>
    </dl>
  </section>

  <section class="handoff" aria-labelledby="handoff-title">
    <small>FIVE-USER PILOT</small>
    <h2 id="handoff-title">Bring one workflow that needs a clearer next step.</h2>
    <p>For automation consultants and technical leads. Try a redacted mapping session, make one correction, and ask a colleague to explain the exported handoff. Feedback should show where the map helped and where Draw got in the way.</p>
    <p>Local work stays on your device. Exporting a file does not publish it. Optional cloud sharing sends content to the service; a share link gives access to its holder. Use local files for this pilot and review them before sending.</p>
    <div class="actions"><a class="primary" href="/">Open Draw</a><a class="secondary" href={requestUrl}>Request pilot build</a></div>
  </section>

  <footer><span>CREATE SOMETHING Draw</span><span>FREE · OPEN SOURCE · LOCAL-FIRST</span></footer>
</main>
