<script lang="ts">
  import './page.css';
  import { onMount } from 'svelte';

  const canonicalUrl = 'https://draw.createsomething.agency/download';
  const title = 'Draw for Mac | CREATE SOMETHING';
  const description = 'Request the CREATE SOMETHING Draw Mac preview, or open the free local-first drawing canvas in your browser.';
  const sourceSha = '7c74dc1485377e316efa7173796dda883cb21eee';
  const dmgSha256 = '0c82b266fa7df6d7078bdc93d7ff2f02186da4168e7b3567f97a376f5843f0bd';
  const workflowUrl = 'https://github.com/createsomethingtoday/create-something-monorepo/actions/runs/33711866576';
  const requestUrl = 'mailto:micah@createsomething.io?subject=CREATE%20SOMETHING%20Draw%20Mac%20preview&body=I%27d%20like%20the%20individual%20Draw%20for%20Mac%20preview.%20I%20understand%20the%20current%20build%20is%20unsigned%20and%20not%20a%20general-public%20release.';
  const applicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${canonicalUrl}#mac`,
    name: 'CREATE SOMETHING Draw for Mac',
    url: canonicalUrl,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'macOS',
    softwareVersion: '0.1.0 preview',
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
      <div class="eyebrow"><span>MAC PREVIEW · 0.1.0</span><span>INDIVIDUAL DELIVERY</span></div>
      <h1 id="download-title">Draw together.<br />Keep the Mac authoritative.</h1>
      <p class="lede">The browser canvas is free and ready now. The optional Mac preview hosts a local session so an iPhone can draw, navigate, and mirror changes during a meeting.</p>
      <div class="actions">
        <a class="primary" href="/">Open Draw</a>
        <a class="secondary" href={requestUrl}>Request Mac preview</a>
      </div>
      <p class="boundary">Current Mac builds are delivered directly to informed testers. They are unsigned, not notarized, and not a general-public release.</p>
    </div>
    <figure class="hero-visual">
      <img src="/images/draw/draw-together-mapping-instrument.webp" width="1536" height="1024" alt="A tactile desktop mapping plane linked to a smaller handheld companion plane" fetchpriority="high" />
      <figcaption><span>DRAW TOGETHER</span><p>The phone moves with the conversation. The larger canvas keeps the shared map visible and authoritative.</p></figcaption>
    </figure>
  </section>

  <section class="proof" aria-labelledby="proof-title">
    <div class="section-label"><span>01</span><h2 id="proof-title">One local canvas. Two useful surfaces.</h2></div>
    <div class="flow" aria-label="Mac and iPhone pairing flow">
      <article><span class="node">O</span><small>MAC HOST</small><strong>Owns the document</strong><p>History, reset, exports, and the authoritative revision stay on the Mac.</p></article>
      <div class="route" aria-hidden="true"><span>LOCAL WI-FI</span><i>→</i></div>
      <article><span class="node signal">O</span><small>IPHONE COMPANION</small><strong>Moves with the room</strong><p>Draw, pinch, pan, undo, and redo from the phone while the desktop mirrors the session.</p></article>
      <div class="receipt"><small>RECEIPT</small><strong>Pairing is local, revocable, and fail-closed.</strong></div>
    </div>
  </section>

  <section class="conditions" aria-labelledby="conditions-title">
    <div class="section-label"><span>02</span><h2 id="conditions-title">Know the release boundary.</h2></div>
    <div class="condition-grid">
      <article><small>READY</small><strong>Web canvas</strong><p>Production at draw.createsomething.agency. Local-first storage, WebMCP controls, and JSON, SVG, or PNG export.</p></article>
      <article><small>PREVIEW</small><strong>Mac + iPhone pairing</strong><p>Verified native candidate for selected testers. Both devices use the same local network; the Mac remains in control.</p></article>
      <article class="review"><small>REVIEW</small><strong>Unsigned distribution</strong><p>macOS may block or warn on installation. Only install a build delivered directly by CREATE SOMETHING after verifying its checksum.</p></article>
    </div>
    <dl class="release-record">
      <div><dt>Source revision</dt><dd><code>{sourceSha}</code></dd></div>
      <div><dt>DMG SHA-256</dt><dd><code>{dmgSha256}</code></dd></div>
      <div><dt>Candidate receipt</dt><dd><a href={workflowUrl} target="_blank" rel="noreferrer">GitHub Actions 33711866576 ↗</a></dd></div>
      <div><dt>Public download</dt><dd>Held until Developer ID signing and Apple notarization pass.</dd></div>
    </dl>
  </section>

  <section class="handoff" aria-labelledby="handoff-title">
    <small>THE NEXT MOVE</small>
    <h2 id="handoff-title">Use Draw now. Request the companion when the room needs it.</h2>
    <p>No account is required for the web canvas. Preview requests are reviewed individually so the exact build and installation boundary remain clear.</p>
    <div class="actions">
      <a class="primary" href="/">Open Draw</a>
      <a class="secondary" href={requestUrl}>Request Mac preview</a>
    </div>
  </section>

  <footer><span>CREATE SOMETHING Draw</span><span>FREE · OPEN SOURCE · LOCAL-FIRST</span></footer>
</main>
