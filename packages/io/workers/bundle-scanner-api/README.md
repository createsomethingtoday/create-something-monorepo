# Bundle Scanner API

Worker endpoint for pre-review Webflow App bundle scanning.

## Authentication

`POST /scan` requires the shared secret `SCAN_WEBHOOK_SECRET`, supplied as either:

- `Authorization: Bearer <secret>`, or
- `X-Scan-Secret: <secret>`

The secret is compared in constant time. In `production` the worker **fails closed**:
if `SCAN_WEBHOOK_SECRET` is unset, `/scan` returns `500`. In non-production
environments an unset secret allows unauthenticated access for local development.

`GET /health` is unauthenticated.

## Scan Contract

`POST /scan`

```json
{
  "submissionId": "airtable-or-form-submission-id",
  "bundleUrl": "https://private.example.com/app-bundle.zip",
  "sourceMapUrl": "https://private.example.com/source-maps.zip",
  "callbackUrl": "https://optional-callback.example.com/scan-result"
}
```

Artifact URLs must be `http(s)` and resolve to a **public** host — requests to
loopback, private, or link-local addresses are rejected (`400`) as an SSRF guard.

- `bundleUrl` is the canonical app bundle artifact. In the final pipeline this should come
  from Webflow Admin or from a hash-linked copy of that Admin bundle.
- `sourceMapUrl` is optional during rollout, but should be supplied by the App Submission Form
  when developers provide private source maps for review.
- `sourceMapUrl` may point to a ZIP of `.map` files or a single `.map` file.
- Source maps are review artifacts only. They should not be included in a public production bundle.

The response includes `artifacts.bundle.sha256` and, when provided, `artifacts.sourceMap.sha256`.
Those hashes are the handoff boundary between the form/Admin artifact and the automated review.

## Source Map Status

The scan report includes `sourceMapSummary`:

- `matched`: private source maps matched generated bundle files.
- `partial`: some generated files or source map references did not match.
- `missing`: generated files need source maps, but no artifact was provided.
- `mismatch`: a source map artifact was provided but did not match any generated bundle files.
- `invalid`: source maps were provided but could not be parsed.
- `not_required`: no generated bundle files needed maps.
- `not_provided`: no source maps were provided and no generated files were detected.

`publicExposure: true` means the production bundle contained `.map` files or `sourceMappingURL`
references. The form can still collect source maps separately, but public exposure should be
handled as a release-blocking cleanup item before publication.

## Local Development

```bash
cp .dev.vars.example .dev.vars   # then edit SCAN_WEBHOOK_SECRET
pnpm --filter=@create-something/bundle-scanner-api dev
pnpm --filter=@create-something/bundle-scanner-api test
```

## Deploy

Deployment is a deliberate step — run it yourself when ready.

```bash
# 1. Set secrets (once per environment)
wrangler secret put SCAN_WEBHOOK_SECRET
wrangler secret put AIRTABLE_API_KEY        # optional

# 2. Deploy (workers.dev subdomain by default)
pnpm --filter=@create-something/bundle-scanner-api deploy

# 3. (Optional) Bind the custom domain: uncomment the `routes` line in
#    wrangler.toml, then deploy again. Requires the createsomething.io zone.
```

Smoke test after deploy:

```bash
curl https://<deployed-host>/health
curl -X POST https://<deployed-host>/scan \
  -H "Authorization: Bearer $SCAN_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"submissionId":"test","bundleUrl":"https://.../bundle.zip"}'
```
