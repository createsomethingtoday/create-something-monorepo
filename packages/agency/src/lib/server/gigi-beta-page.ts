import { gigiBeta, gigiWalkthroughs } from '../data/gigiBeta';

// Standalone HTML intentionally avoids the marketing layout, client scripts,
// analytics, cookies and third-party fonts. All substitutions are fixed constants.
export const gigiBetaHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <!-- Keep the page script-free even when production middleware augments the response CSP. -->
  <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Try GiGi, a local Mac workspace for gigs, contacts, tasks and money. An early beta for Apple Silicon Macs.">
  <meta name="theme-color" content="#111111">
  <title>GiGi for Mac — beta · CREATE SOMETHING</title>
  <style>
    /* Canon operator palette used by .agency. Kept inline for a script-free page. */
    :root {
      --color-operator-background: oklch(20.5% 0 0);
      --color-operator-panel: oklch(20.5% 0 0);
      --color-operator-secondary: oklch(26.9% 0 0);
      --color-operator-hover: oklch(32% 0 0);
      --color-operator-foreground: oklch(98.5% 0 0);
      --color-operator-muted: oklch(70.8% 0 0);
      --color-operator-border: oklch(100% 0 0 / .1);
      --color-operator-focus-ring-accessible: oklch(70.8% 0 0);
      --radius-operator-control: 6px;
      --radius-operator-panel: 10px;
      color-scheme: dark; font-family: 'Geist Variable', Arial, 'Helvetica Neue', Helvetica, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--color-operator-foreground); background: var(--color-operator-background);
    }
    * { box-sizing: border-box; }
    body { margin: 0; }
    a { color: inherit; text-underline-offset: .25em; }
    a:focus-visible, summary:focus-visible { outline: 3px solid var(--color-operator-focus-ring-accessible); outline-offset: 6px; }
    .wrap { max-width: 1080px; margin: auto; padding: 0 32px; }
    header { display: flex; justify-content: space-between; gap: 20px; padding: 30px 0; border-bottom: 1px solid var(--color-operator-border); font-size: 12px; letter-spacing: .12em; }
    .brand { text-decoration: none; font-weight: 650; }
    .label { color: var(--color-operator-focus-ring-accessible); text-transform: uppercase; font-size: 12px; letter-spacing: .14em; }
    .hero { padding: 84px 0 66px; display: grid; grid-template-columns: 1.4fr 1fr; gap: 64px; align-items: center; }
    h1 { font-size: clamp(52px, 8vw, 88px); line-height: 1; letter-spacing: -.03em; margin: 20px 0 25px; font-weight: 500; }
    h2 { font-size: 28px; font-weight: 500; letter-spacing: -.025em; margin: 0 0 24px; }
    h3 { font-size: 18px; margin: 0 0 10px; font-weight: 500; }
    p, li { font-size: 16px; line-height: 1.65; color: var(--color-operator-muted); }
    .intro { font-size: 20px; max-width: 500px; }
    .download { display: inline-flex; justify-content: center; align-items: center; gap: 16px; min-height: 54px; padding: 16px 22px; margin-top: 16px; background: var(--color-operator-foreground); color: var(--color-operator-background); text-decoration: none; font-weight: 600; border-radius: var(--radius-operator-control); }
    .download:hover { background: var(--color-operator-hover); color: var(--color-operator-foreground); }
    .requirements { font-size: 13px; margin-top: 16px; }
    .card { background: var(--color-operator-secondary); border: 1px solid var(--color-operator-border); border-radius: var(--radius-operator-panel); padding: 28px; }
    .card-top { display: flex; justify-content: space-between; font-size: 13px; color: var(--color-operator-muted); margin-bottom: 36px; }
    .record { border-top: 1px solid var(--color-operator-border); padding: 18px 0; }
    .record:last-child { padding-bottom: 0; }
    .record strong { display: block; font-size: 17px; font-weight: 500; margin-bottom: 6px; }
    .record span { font-size: 13px; color: var(--color-operator-muted); }
    .note { border-left: 2px solid var(--color-operator-focus-ring-accessible); padding: 5px 0 5px 20px; margin: 0 0 58px; }
    .note p { margin: 0; }
    section { padding: 42px 0; border-top: 1px solid var(--color-operator-border); }
    .steps { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
    .step { color: var(--color-operator-focus-ring-accessible); display: block; margin-bottom: 20px; font-size: 13px; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .walkthroughs { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    figure { margin: 0; min-width: 0; }
    video { display: block; width: 100%; aspect-ratio: 16 / 9; background: var(--color-operator-secondary); border: 1px solid var(--color-operator-border); border-radius: var(--radius-operator-panel); }
    figcaption { margin-top: 18px; }
    .columns p { margin-top: 0; }
    details { margin-top: 20px; }
    summary { cursor: pointer; padding: 10px 0; font-size: 15px; }
    dl { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 12px 20px; font-size: 14px; line-height: 1.5; }
    dt { color: var(--color-operator-muted); }
    dd { margin: 0; }
    code { font-family: 'IBM Plex Mono', 'SFMono-Regular', 'SF Mono', Menlo, Monaco, Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
    .checksum { padding: 16px; background: var(--color-operator-secondary); border: 1px solid var(--color-operator-border); border-radius: var(--radius-operator-control); }
    footer { padding: 34px 0 42px; display: flex; justify-content: space-between; gap: 20px; border-top: 1px solid var(--color-operator-border); color: var(--color-operator-muted); font-size: 12px; }
    @media (max-width: 700px) { .wrap { padding: 0 22px; } .hero { grid-template-columns: 1fr; gap: 40px; padding: 52px 0 40px; } .steps, .columns, .walkthroughs { grid-template-columns: 1fr; gap: 24px; } .steps li { border-bottom: 1px solid var(--color-operator-border); padding-bottom: 24px; } .step { margin-bottom: 12px; } header { font-size: 10px; } footer { flex-direction: column; } dl { grid-template-columns: 90px minmax(0, 1fr); } }
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
          <p class="requirements">Beta ${gigiBeta.version} · ${(gigiBeta.bytes / 1_000_000).toFixed(1)} MB · Apple Silicon · macOS 13 or later<br>Intel Macs are not supported by this download.</p>
        </div>
        <div class="card" aria-label="Illustrative workspace records, not a screenshot">
          <div class="card-top"><span>GiGi workspace</span><span>Illustrative example</span></div>
          <div class="record"><strong>Friday evening set</strong><span>Gig · date, contacts and fee</span></div>
          <div class="record"><strong>Venue contact</strong><span>Person · linked to the gig</span></div>
          <div class="record"><strong>Confirm the set time</strong><span>Task · the next thing to do</span></div>
        </div>
      </div>
      <div class="note"><p><strong>Early beta.</strong> First-time Mac setup is still being tested. Start with a few non-sensitive records and keep backups. This is a Mac app; automatic cloud sync and an iOS app are not included.</p></div>
      <section aria-labelledby="changes"><h2 id="changes">What changed in 0.2.9</h2><p>Today distinguishes Calendar events, performances, crew/work and unclassified gigs. The optional Work kind field leaves existing records unchanged. Review the selected title, kind, date and source before adding artwork; the earliest Calendar event is not automatically a performance.</p><p>After updating, Settings can check Codex’s registered app and workspace against a fresh connector’s version and tools. Configuration stays unchanged. An already-open agent session still needs its own connection and workspace check. Follow the app’s setup steps and open a new local session when needed.</p><p>External agents can read the same combined agenda as Today and select explicitly classified performances before pagination. Artwork selection keeps the record context visible. Original Type values and source references remain preserved when a compact agent result is shortened.</p><h3>Included from 0.2.8</h3><p>Today brings gigs and Calendar entries together in date order, including ongoing events. Add a local flyer or artwork to an event or music entry, then reuse it across your workspace. Cards fit the whole image, and you can open the original. Supplied official flyers and AI illustrations have distinct labels; an official-flyer label records your attribution, not verification by the event organizer.</p><p>Instagram drafts can keep a copy of the selected artwork and its description with your caption. Changing an event’s cover does not change an existing draft. Local artwork stays on this Mac and has no publish control. The separate public-JPEG publishing flow still requires an exact review and explicit confirmation.</p><p>The bundled artwork skill can generate images when native generation is available in an external Codex session. It then attaches the inspected result to GiGi. The session needs GiGi’s local connection and access to the image file. Generation uses your Codex usage allowance. Embedded Ask GiGi cannot generate images; remote access alone does not provide that capability. This update adds no automatic flyer discovery, local-image uploading or new account connections.</p><p>Artwork accepts static JPEG and PNG files up to 8 MiB, 24 megapixels and 8,192 pixels on either edge. Each workspace holds at most 100 images and 128 MiB of image bytes, including previews. Images are included in local database backups; original audio, video and project files still need separate backups. Unknown rights remain unknown, and conflicting provenance on identical image bytes needs review before explicit reuse.</p><h3>Included from 0.2.7</h3><p>Gigs opens with Upcoming in date order, with Past, All and Needs date views close at hand. Search titles and linked people or places, then narrow by Status, Type and date range. Search, filters and stable sorting cover the full local gig collection before pagination, with accurate matching counts.</p><p>Gigs uses the same local-day and date-range rules as Schedule. Your chosen filters and scroll position stay with you when you open a gig and return. Reset brings the default view back to the top.</p><h3>Included from 0.2.6</h3><p>Preview a bounded Gmail or primary Calendar selection before saving local records, directly in GiGi, through Ask GiGi or an external MCP agent. Account and UTC date scope stay with the preview; date filtering covers scanned pages, not complete history. Review the selected records, then approve the local import.</p><p>Receipts distinguish created, existing and failed records. Stop prevents further saves and keeps already saved records; a stopped import does not roll back saved work. Check the receipt before retrying an interrupted action. “Sign out of GiGi sources” clears this Mac’s source session while preserving Google consent and imported records.</p><h3>Included from 0.2.5</h3><p>A compact top navigation and centered Today board bring upcoming work, open tasks and unpaid records together. More keeps the other workspaces within reach. People search has a visible keyboard shortcut, status labels are easier to read, and chat setup and approval review use space more consistently.</p><p>Your existing local records, People search, Music and Instagram tools, publishing approvals and saved receipts retain their behavior. Version 0.2.5 also included reviewed dependency hardening and release verification improvements; it did not change source-account access or prove a fix for an individual account connection.</p><h3>Included from 0.2.3</h3><p>People search matches words across a name, so a first-and-last-name query can find a name containing a middle name. Matching normalizes case, whitespace and accents without changing saved contacts. Linked-company search uses a more efficient local query. If a read takes too long, GiGi stops waiting and offers retry or clear; the native read may still finish.</p><h3>Included from 0.2.2</h3><p>People search covers the full local contact collection by name, email, phone or linked company before pagination. Finance records appear newest first by transaction date, with missing or invalid dates last.</p><p>Agents can find and organize indexed music, or ask you to choose files in the native picker. GiGi’s music tools cannot scan arbitrary folders or upload your media. Instagram tools can prepare drafts and request review of an exact revision and account; they cannot publish. Changing a draft makes its earlier review request stale. Saved receipts help recover interrupted agent actions without blindly repeating them.</p></section>
      <section aria-labelledby="walkthroughs"><h2 id="walkthroughs">See the flow.</h2>
        <p>Silent walkthroughs with on-screen guidance and synthetic records, recorded September 30–October 1, 2026 on earlier beta builds. These show the workflow, not acceptance of a fresh installation of this download.</p>
        <div class="walkthroughs">${gigiWalkthroughs.map((video) => `<figure>
          <video controls playsinline preload="none" aria-label="${video.title}"><source src="${video.url}" type="video/mp4">Your browser cannot play this video. <a href="${video.url}">Open the walkthrough</a>.</video>
          <figcaption><h3>${video.title}</h3><p>${video.seconds} seconds · Silent<br>${video.description}</p><a href="${video.url}">Open video separately ↗</a></figcaption>
        </figure>`).join('')}</div>
      </section>
      <section aria-labelledby="start"><h2 id="start">Start with one gig.</h2>
        <ol class="steps">
          <li><span class="step">01 / INSTALL</span><h3>Make room on your Mac.</h3><p>Open the disk image, drag GiGi to Applications, eject the image, then launch GiGi from Finder. Keep macOS security controls enabled. If launch is blocked, stop and report the message.</p></li>
          <li><span class="step">02 / MAKE IT YOURS</span><h3>Create your workspace.</h3><p>Enter your name, workspace name and currency. No sign-in is needed for local records. Choose currency carefully: it locks after you save monetary records.</p></li>
          <li><span class="step">03 / TRY IT</span><h3>Add a gig and its details.</h3><p>Choose “Start with a gig” in Setup &amp; safety. Save a gig, then link a contact or task. Correct a field, quit and reopen GiGi, and check that your changes remain.</p></li>
        </ol>
      </section>
      <section aria-labelledby="creative"><h2 id="creative">Organize your music. Prepare a post.</h2>
        <div class="columns">
          <div><h3>Music library</h3><p>Choose files or a folder on your Mac to index audio, music videos, including MP4s, and project files. Add an artist, project, collection, version label or tags, then search and filter your library. Playable previews depend on the file’s codec; project files are indexed, not opened for editing.</p><p>GiGi does not upload, move or delete your original media. Folder imports are bounded and cancellable. Missing or changed files need attention before playback. Version labels organize references, not copies of earlier file contents. Workspace backups include the index and saved artwork, not the media originals; keep separate media backups.</p></div>
          <div><h3>Instagram drafts</h3><p>Save a title and caption locally without a connection. Reuse saved local artwork for a private preview that stays on this Mac and has no publish control. The publishing flow supports one JPEG image from a direct public HTTPS URL on an approved image host, plus a caption. It does not upload local photos or library media.</p><p>Publishing requires a configured Composio connection to a verified Instagram Business or Creator account. Personal accounts, Reels, Stories, carousels and scheduling are not supported. Connection consent is a separate choice. Review the verified image preview, account and caption, then explicitly confirm publication.</p><p>Read the publish receipt. If verification is pending or the outcome is unknown, check the receipt and Instagram before trying again. No real Instagram publication has been verified for this release; local drafting remains available if connection setup is unavailable.</p></div>
        </div>
      </section>
      <section aria-labelledby="optional"><h2 id="optional">Connections can wait.</h2>
        <div class="columns">
          <div><h3>Work directly in GiGi.</h3><p>Choose “Continue with local records” to skip connections. Your records live on this Mac. Gmail and Calendar require separate GiGi connector sign-in and Google consent. Verification, preview and local import are separate steps. Previews are bounded and paginated; date windows filter only scanned pages. Only the primary Calendar is supported, and dates without a clear timezone may be excluded and counted. GiGi does not send mail or change calendars.</p></div>
          <div><h3>Bring your own agent, if useful.</h3><p>Optional Ask GiGi requires a separately installed Codex CLI, signed in with an eligible ChatGPT subscription. Codex or Claude Code can also connect through the external agent setup. Follow the official guides linked in the app; provider limits and availability apply. Local records need no API key or developer tools.</p></div>
        </div>
        <details><summary>Chat and connector beta limits</summary><p>Fresh-user chat and connector setup still need acceptance testing. Embedded chat reads local records, can preview a bounded source selection when asked, and proposes supported changes for your approval, including local source imports, music organization and Instagram drafts. Publication still requires confirmation in the Instagram workspace. Create general records and change links through the manual controls. Context used by an agent is processed through your provider account. Record backups do not include provider transcripts or chat metadata. Embedded conversations do not automatically appear in mobile chat. Remote phone access is a separate provider-dependent setup and test.</p></details>
      </section>
      <section aria-labelledby="task-history"><h2 id="task-history">Saved tasks and supporting history</h2><p>Tasks shows records saved in this local workspace. Connecting Gmail or Calendar does not automatically turn messages or events into tasks. Preview a source page, approve the local import, then choose which tasks or gigs to create and save from those records.</p><p>Context search is separate from saved tasks. This update gives clearer guidance for unsupported search inputs or local history configuration problems. It does not change history configuration or repair an account connection. Keep the diagnostic code and ask for help before changing configuration or signing in again.</p></section>
      <section aria-labelledby="safety"><h2 id="safety">Keep a recovery point.</h2>
        <div class="columns">
          <div><h3>Back up before major changes.</h3><p>In Settings → Backup &amp; restore, choose “Create backup” and keep its ID. These are local recovery points, not off-device backups. Restore replaces the active workspace after confirmation and creates a safety backup. Check a record before retrying an interrupted edit.</p></div>
          <div><h3>Updates are manual for this beta.</h3><p>Create a backup in GiGi, then quit the app before installing a new release. Removing the app preserves its local records; do not delete app data to fix a setup issue. Ask the person who shared this beta for help. Include your version, Mac/OS and a redacted error—not passwords, tokens or private records.</p></div>
        </div>
      </section>
      <section aria-labelledby="release"><h2 id="release">Know what you’re downloading.</h2>
        <p><strong>Acceptance status:</strong> This exact installer passed Developer ID signing, Apple notarization and Gatekeeper checks. This release’s automated checks covered connector registration and capability checks, typed agent reads, classification, original-field preservation and agenda ordering. Native checks used the final compiled app code and data in isolated QA wrappers for Today artwork and labels, setup-check scrolling and local draft previews. One real Codex-generated illustration completed MCP import, attachment, provenance and draft readback using the installed 0.2.8 MCP. Follow-up 0.2.9 checks verified classification, typed reads and preserved artwork and draft state. A fresh native Codex connection also completed real read-only tool calls. A human-selected music-cover test and an already-running agent session remain unverified in these follow-up checks; first-time setup, real Google import and social publication are not established. GiGi 0.2.8: Earlier checks used synthetic native companion/database fixtures and synthetic UI. Local artwork checks covered combined Today ordering, original image preservation, provenance conflicts, workspace isolation, safe imports, quotas, backup restoration and local draft snapshots. Native checks covered the file picker, full-image viewing, music artwork, local draft previews, keyboard recovery and narrow and expanded windows. The packaged artwork skill and MCP attachment workflow used mocked generation; no real image generation was invoked. These checks do not establish a fresh Mac installation or real Google import, connected social access or Instagram publication. GiGi 0.2.7: Native Gigs checks used 59 synthetic gigs in an isolated workspace: full collection search and filtering, date views, keyboard navigation, narrow and expanded windows, and Reset and detail/Back scroll recovery passed. Automated checks cover equal dates, time zones, date-only values, ranges and stale responses. These checks do not establish real Google import, Grant’s access or fresh-installation acceptance. GiGi 0.2.5: Visual checks used an isolated synthetic workspace in a source-equivalent native preview for onboarding, contact creation and search, unsaved-change protection, Music and Instagram empty states and disconnected chat, including compact and expanded windows. Keyboard focus and Escape recovery passed; the reviewed layout also passed contrast checks. Search checks from 0.2.3 used an isolated synthetic workspace with 5,000 contacts and 200 linked companies. Full collection matching, filtered pagination, detail/back query retention and clear/no-results states passed. Automated tests cover stale requests, timeouts and database contention. These checks do not establish Grant’s live outcome or repair account connections. Native checks used an isolated test workspace on GiGi 0.2.2 for People search, local music preview, Instagram draft selection, finance date ordering and in-app confirmation. That release’s automated tests exercised the packaged MCP protocol with synthetic requests and embedded-host approval, receipt recovery and conflict rules. These do not establish a real Instagram publication or fresh-user agent setup. GiGi 0.2.1 previously passed unsaved-record protection, dated gigs in Schedule, disconnected-chat recovery and keyboard-focus checks. Earlier builds passed native onboarding, save/restart, backup restoration, reviewed agent edits, and bounded Gmail and Calendar imports with linked local task/gig creation. Phone remote access passed on an earlier build; that physical-device test was not repeated for this installer. This remains an early beta.</p>
        <dl><dt>Release</dt><dd>GiGi ${gigiBeta.version} · macOS arm64</dd><dt>Size</dt><dd>${gigiBeta.bytes.toLocaleString('en-US')} bytes (${(gigiBeta.bytes / 1_000_000).toFixed(1)} MB)</dd><dt>Security</dt><dd>Developer ID signed, Apple notarized and stapled. Gatekeeper checks passed for this exact installer.</dd><dt>SHA-256</dt><dd class="checksum"><code>${gigiBeta.sha256}</code></dd></dl>
        <p>Previous installer: <a href="https://media.createsomething.io/releases/gigi/0.2.8/2be3b50358f220fbfc6dd6ca9310747a1e32b151ac8b9b646223b0a2d303ab4d/GiGi-0.2.8-arm64-private-beta.dmg">GiGi 0.2.8 for Apple Silicon</a>. Keep a workspace backup before switching versions.</p><details><summary>Check the installer checksum</summary><p>In Terminal, run this against the file you downloaded:</p><div class="checksum"><code>shasum -a 256 ~/Downloads/${gigiBeta.filename}</code></div><p>The result should match the SHA-256 above. If it does not, stop and request a verified installer.</p></details>
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
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; media-src https://media.createsomething.io; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};
