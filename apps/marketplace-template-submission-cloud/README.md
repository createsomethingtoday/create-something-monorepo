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

## Commands

```bash
pnpm --filter @create-something/marketplace-template-submission-cloud dev
pnpm --filter @create-something/marketplace-template-submission-cloud check
pnpm --filter @create-something/marketplace-template-submission-cloud build
pnpm --filter @create-something/marketplace-template-submission-cloud preview
```

## Parent page embed

Inside the `/templates/submit-a-template` Webflow Designer page, replace both `<form>` blocks (and their inline `<script>` tags) with:

```html
<iframe
  id="ts-submission-frame"
  src="https://<cloud-app-host>/submit"
  style="width:100%; min-height:1800px; border:0; display:block;"
  loading="lazy"
  allow="clipboard-read; clipboard-write"
  title="Template submission"
></iframe>

<script>
(function () {
  var f = document.getElementById('ts-submission-frame');
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'ts-submission:resize') return;
    if (typeof e.data.height === 'number') f.style.height = e.data.height + 'px';
  });
  f.addEventListener('load', function () {
    try {
      f.contentWindow.postMessage({
        type: 'ts-submission:utm',
        params: Object.fromEntries(new URLSearchParams(location.search))
      }, '*');
    } catch (_) {}
  });
})();
</script>
```

## Downstream ingestion

Both `/api/intake/creator` and `/api/intake/template` post the existing Airtable Automation webhook envelope (`Marketplace Creator Submission` / `Marketplace Template Submission`). The Automation owns record creation, reviewer routing, and email templates.
