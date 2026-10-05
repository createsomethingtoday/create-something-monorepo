import { gigiBeta } from '../data/gigiBeta';

// Standalone HTML intentionally avoids the marketing layout, client scripts,
// analytics, cookies and third-party fonts. All substitutions are fixed constants.
export const gigiBetaHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Try GiGi, a local Mac workspace for gigs, contacts, tasks and money. An early beta for Apple Silicon Macs.">
  <meta name="theme-color" content="#111111">
  <title>GiGi for Mac — beta · CREATE SOMETHING</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #eeeae2; background: #111111; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    a { color: inherit; text-underline-offset: .25em; }
    a:focus-visible, summary:focus-visible { outline: 3px solid #e1bc74; outline-offset: 6px; }
    .wrap { max-width: 1080px; margin: auto; padding: 0 32px; }
    header { display: flex; justify-content: space-between; gap: 20px; padding: 30px 0; border-bottom: 1px solid #36342f; font-size: 12px; letter-spacing: .12em; }
    .brand { text-decoration: none; font-weight: 650; }
    .label { color: #e1bc74; text-transform: uppercase; font-size: 12px; letter-spacing: .14em; }
    .hero { padding: 84px 0 66px; display: grid; grid-template-columns: 1.4fr 1fr; gap: 64px; align-items: center; }
    h1 { font-size: clamp(52px, 8vw, 88px); line-height: 1; letter-spacing: -.065em; margin: 20px 0 25px; font-weight: 550; }
    h2 { font-size: 28px; font-weight: 500; letter-spacing: -.025em; margin: 0 0 24px; }
    h3 { font-size: 18px; margin: 0 0 10px; font-weight: 550; }
    p, li { font-size: 16px; line-height: 1.65; color: #c4bfb5; }
    .intro { font-size: 20px; max-width: 500px; }
    .download { display: inline-flex; justify-content: center; align-items: center; gap: 16px; min-height: 54px; padding: 16px 22px; margin-top: 16px; background: #eeeae2; color: #171613; text-decoration: none; font-weight: 600; border-radius: 5px; }
    .download:hover { background: #e1bc74; }
    .requirements { font-size: 13px; margin-top: 16px; }
    .card { background: #191917; border: 1px solid #393831; border-radius: 12px; padding: 28px; }
    .card-top { display: flex; justify-content: space-between; font-size: 13px; color: #c4bfb5; margin-bottom: 36px; }
    .record { border-top: 1px solid #393831; padding: 18px 0; }
    .record:last-child { padding-bottom: 0; }
    .record strong { display: block; font-size: 17px; font-weight: 500; margin-bottom: 6px; }
    .record span { font-size: 13px; color: #aaa69d; }
    .note { border-left: 2px solid #e1bc74; padding: 5px 0 5px 20px; margin: 0 0 58px; }
    .note p { margin: 0; }
    section { padding: 42px 0; border-top: 1px solid #36342f; }
    .steps { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
    .step { color: #e1bc74; display: block; margin-bottom: 20px; font-size: 13px; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .columns p { margin-top: 0; }
    details { margin-top: 20px; }
    summary { cursor: pointer; padding: 10px 0; font-size: 15px; }
    dl { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 12px 20px; font-size: 14px; line-height: 1.5; }
    dt { color: #aaa69d; }
    dd { margin: 0; }
    code { font-size: 12px; overflow-wrap: anywhere; }
    .checksum { padding: 16px; background: #191917; border: 1px solid #393831; border-radius: 5px; }
    footer { padding: 34px 0 42px; display: flex; justify-content: space-between; gap: 20px; border-top: 1px solid #36342f; color: #aaa69d; font-size: 12px; }
    @media (max-width: 700px) { .wrap { padding: 0 22px; } .hero { grid-template-columns: 1fr; gap: 40px; padding: 52px 0 40px; } .steps, .columns { grid-template-columns: 1fr; gap: 24px; } .steps li { border-bottom: 1px solid #36342f; padding-bottom: 24px; } .step { margin-bottom: 12px; } header { font-size: 10px; } footer { flex-direction: column; } dl { grid-template-columns: 90px minmax(0, 1fr); } }
  </style>
</head>
<body>
  <div class="wrap">
    <header><a class="brand" href="https://createsomething.agency">CREATE SOMETHING</a><span>GiGi / MAC BETA</span></header>
    <main>
      <div class="hero">
        <div>
          <span class="label">A private workspace on your Mac</span>
          <h1>Your gigs.<br>Your people.<br>One place.</h1>
          <p class="intro">GiGi keeps gigs, contacts, tasks and money connected, so the details of your work stay together.</p>
          <a class="download" href="${gigiBeta.url}" download="${gigiBeta.filename}">Download GiGi for Mac <span aria-hidden="true">↓</span></a>
          <p class="requirements">Beta ${gigiBeta.version} · 75.4 MB · Apple Silicon · macOS 13 or later<br>Intel Macs are not supported by this download.</p>
        </div>
        <div class="card" aria-label="Illustrative workspace records, not a screenshot">
          <div class="card-top"><span>GiGi workspace</span><span>Illustrative example</span></div>
          <div class="record"><strong>Friday evening set</strong><span>Gig · date, contacts and fee</span></div>
          <div class="record"><strong>Venue contact</strong><span>Person · linked to the gig</span></div>
          <div class="record"><strong>Confirm the set time</strong><span>Task · the next thing to do</span></div>
        </div>
      </div>
      <div class="note"><p><strong>Early beta.</strong> First-time Mac setup is still being tested. Start with a few non-sensitive records and keep backups. This is a Mac app; automatic cloud sync and an iOS app are not included.</p></div>
      <section aria-labelledby="start"><h2 id="start">Start with one gig.</h2>
        <ol class="steps">
          <li><span class="step">01 / INSTALL</span><h3>Make room on your Mac.</h3><p>Open the disk image, drag GiGi to Applications, eject the image, then launch GiGi from Finder. Keep macOS security controls enabled. If launch is blocked, stop and report the message.</p></li>
          <li><span class="step">02 / MAKE IT YOURS</span><h3>Create your workspace.</h3><p>Enter your name, workspace name and currency. No sign-in is needed for local records. Choose currency carefully: it locks after you save monetary records.</p></li>
          <li><span class="step">03 / TRY IT</span><h3>Add a gig and its details.</h3><p>Choose “Start with a gig” in Setup &amp; safety. Save a gig, then link a contact or task. Correct a field, quit and reopen GiGi, and check that your changes remain.</p></li>
        </ol>
      </section>
      <section aria-labelledby="optional"><h2 id="optional">Connections can wait.</h2>
        <div class="columns">
          <div><h3>Work directly in GiGi.</h3><p>Choose “Continue with local records” to skip connections. Your records live on this Mac. Gmail and Calendar require separate GiGi connector sign-in and Google consent. Verification and import are separate steps; imports are paginated. GiGi does not send mail or change calendars.</p></div>
          <div><h3>Bring your own agent, if useful.</h3><p>Optional Ask GiGi requires a separately installed Codex CLI, signed in with an eligible ChatGPT subscription. Codex or Claude Code can also connect through the external agent setup. Follow the official guides linked in the app; provider limits and availability apply. Local records need no API key or developer tools.</p></div>
        </div>
        <details><summary>Chat and connector beta limits</summary><p>Fresh-user chat and connector setup still need acceptance testing. Embedded chat reads records and proposes edits to existing records for your approval. Create records and change links through the manual controls. Context used by an agent is processed through your provider account. Record backups do not include provider transcripts or chat metadata. Embedded conversations do not automatically appear in mobile chat. Remote phone access is a separate provider-dependent setup and test.</p></details>
      </section>
      <section aria-labelledby="safety"><h2 id="safety">Keep a recovery point.</h2>
        <div class="columns">
          <div><h3>Back up before major changes.</h3><p>In Settings → Backup &amp; restore, choose “Create backup” and keep its ID. These are local recovery points, not off-device backups. Restore replaces the active workspace after confirmation and creates a safety backup. Check a record before retrying an interrupted edit.</p></div>
          <div><h3>Updates are manual for this beta.</h3><p>Quit GiGi and create a backup before installing a new release. Removing the app preserves its local records; do not delete app data to fix a setup issue. Ask the person who shared this beta for help. Include your version, Mac/OS and a redacted error—not passwords, tokens or private records.</p></div>
        </div>
      </section>
      <section aria-labelledby="release"><h2 id="release">Know what you’re downloading.</h2>
        <dl><dt>Release</dt><dd>GiGi ${gigiBeta.version} · macOS arm64</dd><dt>Size</dt><dd>${gigiBeta.bytes.toLocaleString('en-US')} bytes (75.4 MB)</dd><dt>Security</dt><dd>Developer ID signed, Apple notarized and stapled. Gatekeeper checks passed for this exact installer.</dd><dt>SHA-256</dt><dd class="checksum"><code>${gigiBeta.sha256}</code></dd></dl>
        <details><summary>Check the installer checksum</summary><p>In Terminal, run this against the file you downloaded:</p><div class="checksum"><code>shasum -a 256 ~/Downloads/${gigiBeta.filename}</code></div><p>The result should match the SHA-256 above. If it does not, stop and request a verified installer.</p></details>
      </section>
    </main>
    <footer><span>GiGi · CREATE SOMETHING</span><span>Unlisted beta page. Anyone with the link can access this download.</span></footer>
  </div>
</body>
</html>`;

export const gigiBetaHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};
