# Marketplace Template Submission Cloud

Dedicated Webflow Cloud app that serves the template marketplace submission form. Designed to be embedded via iframe inside `webflow.com/templates/submit-a-template`, mirroring the pattern used by the App submission form.

## Scope

- Public creator intake + template submission form (two-step)
- Intake API routes (validation, upload, remote checks, webhook dispatch)
- Cloudflare Turnstile
- Cloudflare R2-backed upload worker for avatar/thumbnail/gallery images

Out of scope (those live in `apps/webflow-dashboard-cloud`):

- Authenticated dashboard, asset editing, API keys, profile, analytics

## Deployment pattern

Deploy as an independent Webflow Cloud project pointed at this directory. The existing `/templates/submit-a-template` Webflow page embeds the app's `/submit` route in an iframe. The app's responses resize the frame and accept UTM params via `postMessage`.

## Runtime bindings

Webflow Cloud should provision:

- `ASSETS`: OpenNext static asset binding

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

Validator app submission preflight:

- `VALIDATOR_APP_PREFLIGHT_POLICY`
  defaults to `enforce`. Use `warn` to collect bridge/result evidence without blocking the
  form, or `disabled` for rollback.
- `VALIDATOR_APP_WORKER_URL`
  defaults to `https://validation-worker.createsomething.workers.dev` and is used to confirm
  the published bridge plus latest persisted Validator result.
- `VALIDATOR_APP_INSTALL_URL`
  defaults to the Webflow OAuth install URL for the Webflow Way Validator app. The submission
  form uses this URL when the bridge or latest 100% pass result is missing so creators can
  install the app directly from the failed validation state. `NEXT_PUBLIC_VALIDATOR_APP_INSTALL_URL`
  is also supported as a public build/runtime alias.

Required upload worker:

- `UPLOADS_WORKER_SECRET`
  shared secret used by `POST /api/intake/upload` when proxying uploads to the worker

Optional upload worker override:

- `UPLOADS_WORKER_URL`
  public base URL for the dedicated Cloudflare upload worker. If omitted, the app defaults to
  `https://template-form-uploads.createsomething.workers.dev`.

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

The parent Webflow page owns the hero. Mount the iframe directly below that hero on `/templates/submit-a-template`, and let the embedded app own only the creator/template form flow.

- `ts-submission:resize` from the iframe to keep the frame height correct. The app posts its
  content height (measured at the app root, so the frame can shrink as well as grow). The
  placeholder `height:1800px` is overridden by the first resize message — do not use
  `min-height`, which would floor the frame and leave blank space below short steps.
- `ts-submission:utm` from the parent to pass through query params
- `ts-submission:scroll-to` from the iframe to make the parent page scroll to the relevant internal section when an in-app link or CTA jumps between creator and template sections

```html
<section id="template-submission-app" class="section cc-template-submission-embed">
  <div class="container">
    <iframe
      id="ts-submission-frame"
      src="https://<cloud-app-host>/submit"
      style="width:100%; height:1800px; border:0; display:block;"
      loading="lazy"
      allow="clipboard-read; clipboard-write"
      title="Template submission"
    ></iframe>
  </div>
</section>

<script>
(function () {
  var frame = document.getElementById('ts-submission-frame');
  var EMBED_SCROLL_MARGIN = 24;

  if (!frame) return;

  function postToFrame(message) {
    try {
      frame.contentWindow.postMessage(message, '*');
    } catch (_) {}
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
        top: Math.max(0, Math.round(frameTop + event.data.offsetTop - EMBED_SCROLL_MARGIN)),
        behavior: 'smooth'
      });
    }
  });

  frame.addEventListener('load', function () {
    postToFrame({
      type: 'ts-submission:utm',
      params: Object.fromEntries(new URLSearchParams(location.search))
    });
  });
})();
</script>
```

For the parent hero CTA, use a normal anchor to the iframe mount:

```html
<a href="#template-submission-app" class="button-sp w-inline-block">
  <div class="u-d-inline-block">Submit a template</div>
  <div class="button-icon_right">→</div>
</a>
```

The embedded app manages creator-vs-template navigation internally as a two-step flow: a stepper at the top switches between "Become a Creator" and "Submit a template", only one step renders at a time, and `?section=submit-today` / `#submit-today` (or a parent `ts-submission:navigate` message) deep-links straight to the template step. Step switches also notify the parent through `ts-submission:scroll-to` (offsetTop 0) so the outer page scrolls back to the top of the frame.

## Downstream ingestion

Both `/api/intake/creator` and `/api/intake/template` post the existing Airtable Automation webhook envelope (`Marketplace Creator Submission` / `Marketplace Template Submission`). The Automation owns record creation, reviewer routing, and email templates.
