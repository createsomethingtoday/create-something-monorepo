# Marketplace Template Submission Cloud

Dedicated Webflow Cloud app that serves the template marketplace submission form. Designed to be embedded via iframe inside `webflow.com/templates/submit-a-template`, mirroring the pattern used by the App submission form.

## Scope

- Public creator intake + template submission form (two-step)
- Intake API routes (validation, upload, remote checks, webhook dispatch)
- Cloudflare Turnstile
- R2 upload for avatar/thumbnail/gallery images

Out of scope (those live in `apps/webflow-dashboard-cloud`):

- Authenticated dashboard, asset editing, API keys, profile, analytics

## Deployment pattern

Deploy as an independent Webflow Cloud project pointed at this directory. The existing `/templates/submit-a-template` Webflow page embeds the app's `/submit` route in an iframe. The app's responses resize the frame and accept UTM params via `postMessage`.

## Runtime bindings

Webflow Cloud should provision:

- `ASSETS`: OpenNext static asset binding
- `UPLOADS`: R2 bucket for dashboard uploads

## Environment variables

Required:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `CSRF_TRUSTED_ORIGINS` (include `https://webflow.com` and the deployed Cloud app host)

Framework/runtime path values (set to the Cloud mount path):

- `BASE_URL`
- `ASSETS_PREFIX`
- `NEXT_PUBLIC_BASE_PATH`

Strongly recommended (bot protection):

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_EXPECTED_HOSTNAME`

Optional analyzer autofill:

- `TEMPLATE_ANALYZER_API_BASE`
  defaults to `https://webflow-template-analyzer.createsomething.workers.dev`
  and is used by `POST /api/intake/validate-published-url` to suggest template details and
  expose screenshot-download links after a successful validation pass.

## Commands

```bash
pnpm --filter @create-something/marketplace-template-submission-cloud dev
pnpm --filter @create-something/marketplace-template-submission-cloud check
pnpm --filter @create-something/marketplace-template-submission-cloud build
pnpm --filter @create-something/marketplace-template-submission-cloud preview
```

## Styling

The form inherits the canonical marketplace look by importing the live Webflow-published CSS at the top of `app/globals.css`:

```css
@import url("https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/css/template-marketplace.webflow.shared.654a57c9583f8111cb371d48.64cfa4961.min.css");
```

That stylesheet carries the `:root` token system (`--webflow-blue`, `--spring-branded-*`, WF Visual Sans font faces) and the custom classes used on our markup (`.field-input`, `.button-sp`, `.button-sp.cc-white`, `.ts_link`, `.mp-breadcrumbs`, `.cc-check`, `.form-checkbox`, etc.).

### Rotating the CSS URL

The URL is hash-versioned — when Webflow rebuilds the template-marketplace site, the hash changes and the old URL returns 404. To refresh:

```bash
curl -sL "https://webflow.com/templates/submit-a-template" \
  -H "User-Agent: Mozilla/5.0" \
  | grep -oE 'href="https://cdn\.prod\.website-files\.com/5e593fb060cf87bbaf75dd20/[^"]+\.css"' \
  | head -1
```

Replace the URL at the top of `app/globals.css` with whatever that returns, commit, and redeploy.

App-specific overrides (layout, spacing, per-field feedback colors, country picker dropdown) live below the `@import` in the same file under `.submission-*` classes.

## Parent page embed

Mount the iframe directly below the hero section on `/templates/submit-a-template`, and stop using the old local `join-today` / `submit-today` section-toggle script. The embedded app now accepts three parent-page behaviors:

- `ts-submission:resize` from the iframe to keep the frame height correct
- `ts-submission:utm` from the parent to pass through query params
- `ts-submission:navigate` from the parent to scroll the iframe to either `join-today` or `submit-today`

Give the hero CTA buttons stable ids first:

- `id="submit-button"` on the primary "Submit a template" button
- `id="join-button"` on the secondary "Become a creator" button

Then place this block below the hero:

```html
<section id="template-submission-app" class="section cc-submission-wrapper">
  <div class="container">
    <iframe
      id="ts-submission-frame"
      src="https://<cloud-app-host>/submit"
      style="width:100%; min-height:1800px; border:0; display:block;"
      loading="lazy"
      allow="clipboard-read; clipboard-write"
      title="Template submission"
    ></iframe>
  </div>
</section>

<script>
(function () {
  var frame = document.getElementById('ts-submission-frame');
  var mount = document.getElementById('template-submission-app');
  var joinButton = document.getElementById('join-button');
  var submitButton = document.getElementById('submit-button');
  var frameLoaded = false;
  var pendingSection = null;

  if (!frame || !mount) return;

  function postToFrame(message) {
    try {
      frame.contentWindow.postMessage(message, '*');
    } catch (_) {}
  }

  function scrollToApp() {
    window.scrollTo({
      top: mount.offsetTop,
      behavior: 'smooth'
    });
  }

  function flushPendingSection() {
    if (!frameLoaded || !pendingSection) return;
    postToFrame({
      type: 'ts-submission:navigate',
      section: pendingSection
    });
    pendingSection = null;
  }

  function openSection(section) {
    pendingSection = section;
    scrollToApp();
    flushPendingSection();
  }

  window.addEventListener('message', function (event) {
    if (!event.data) return;

    if (event.data.type === 'ts-submission:resize' && typeof event.data.height === 'number') {
      frame.style.height = event.data.height + 'px';
      return;
    }

    if (
      event.data.type === 'ts-submission:scroll-to' &&
      typeof event.data.offsetTop === 'number'
    ) {
      var frameTop = frame.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(frameTop + event.data.offsetTop - 24, 0),
        behavior: 'smooth'
      });
    }
  });

  frame.addEventListener('load', function () {
    frameLoaded = true;

    postToFrame({
      type: 'ts-submission:utm',
      params: Object.fromEntries(new URLSearchParams(location.search))
    });

    var params = new URLSearchParams(location.search);
    var section = params.get('section');
    var hash = window.location.hash;
    if (section === 'submit-today' || hash === '#submit-today') {
      openSection('submit-today');
      return;
    }
    if (section === 'join-today' || hash === '#join-today') {
      openSection('join-today');
      return;
    }

    flushPendingSection();
  });

  if (joinButton) {
    joinButton.addEventListener('click', function (event) {
      event.preventDefault();
      openSection('join-today');
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', function (event) {
      event.preventDefault();
      openSection('submit-today');
    });
  }
})();
</script>
```

## Downstream ingestion

Both `/api/intake/creator` and `/api/intake/template` post the existing Airtable Automation webhook envelope (`Marketplace Creator Submission` / `Marketplace Template Submission`). The Automation owns record creation, reviewer routing, and email templates.
