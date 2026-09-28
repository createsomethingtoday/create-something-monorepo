# Templates retirement surface

Owner: CREATE SOMETHING. Canonical work: Linear CRE-2153; execution: create-something Paperclip CRE-135. Independent review: CRE-138. Root Release owns GitHub promotion, provider acceptance and Linear mirroring.

This is the new implementation authority for the retired first-party Templates storefront. It does not restore `packages/templates-platform`, deliberately removed in `4fae2b6a26efe24f3eedc4304711c245fcdb7906`. Historical deployment source `e0ff00d0b41a0bdc3a57d74fe79b41c15d1e1804` had uncommitted changes and is not a reproducible baseline. Webflow client marketplace sources are unrelated.

## Build and behavior

From repository root, using Node from `.nvmrc`:

```sh
node packages/templates-retirement/build.mjs
node packages/templates-retirement/verify.mjs
node packages/templates-retirement/preview.mjs
```

No dependency installation is needed for the build or checks. `dist/` contains static HTML/CSS, Canon tokens copied verbatim from `packages/canon-tokens/tokens.css`, a truthful `404.html` fallback, `_routes.json`, and a small Pages advanced-mode `_worker.js`. Browser JavaScript, forms, analytics, external assets and commerce code are absent. The Canon font stack uses its installed/system fallbacks; no new font assets are added.

The edge guard returns 200 only for GET/HEAD `/` and the two CSS assets. All other GET/HEAD pages show the retirement notice with 410. API paths and every write/OPTIONS request return 410 JSON; no request body or credentials are forwarded. Failed static-asset reads return 503. The guard uses only Cloudflare's implicit ASSETS binding. It does not read or write existing data/storage bindings. Local preview uses that exact handler with a file-backed ASSETS substitute; it is not provider acceptance.

The visual is a compact status surface: existing monochrome Canon palette, one workshop action, readable previous-purchase contact section, visible keyboard focus and no motion. It claims no retirement date, refund/access policy or purchase success. `https://createsomething.space` and `https://createsomething.agency/contact` were checked live. No message or form was sent.

## Existing provider ownership and rollback

Read-only provider inspection on 2026-09-28:

| Field | Value |
| --- | --- |
| Account | Create Something / `9645bd52e640b8a4f40a3a55ff1dd75a` |
| Pages project | `templates-platform` / `29bb2723-e0cf-4ff0-9a9a-74c3964b41f1` |
| Public domains | `templates.createsomething.space`, `templates-platform.pages.dev` |
| Production branch | `main`; direct upload, no linked Git source returned |
| Existing rollback deployment | `f47eed32-a45e-44a7-b6c9-4ed870c1260d` |
| Historical source metadata | `e0ff00d0b41a0bdc3a57d74fe79b41c15d1e1804`, dirty=true |
| Existing build destination | `.svelte-kit/cloudflare` |
| Production compatibility | `2024-12-01`, `nodejs_compat` |
| Preview compatibility | `2025-12-10`, no flags |
| Existing failure policy | `fail_open=true` in both environments; unchanged |
| D1 DB | `a06516a5-6c4b-472f-8826-d730e3a74926` |
| KV / TENANT_CACHE | both `bcb39a6258fe49b79da9dc9b09440934` |
| R2 SITE_BUCKET | `templates-site-assets` |
| Production environment names | BASE_DOMAIN, ENVIRONMENT, INTERNAL_API_SECRET; retained |

Full sanitized settings and production deployment metadata are in the attached CRE-135 evidence. Do not delete or migrate resources, update secrets, alter auth, DNS, tenant router or project settings. The new package intentionally has no Wrangler config. Deployment uses the existing project dashboard settings. The existing fail-open policy may serve static fallbacks if Functions are unavailable; those assets also contain only retirement content. Exact 410 semantics require the edge guard to run. This release does not remove separately hosted tenant sites or historical immutable deployment URLs.

## Promotion contract

1. CRE-138 reviews the exact candidate source, request behavior, screenshots and workflow. Root publishes the branch/PR and runs normal CI. Re-review any source delta introduced during merge.
2. Root dispatches `Templates Retirement Deploy` on `main`, providing the full reviewed main SHA. No push/PR trigger deploys. It uses the existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets and an allowlisted account/project, with no credential mutation.
3. Workflow builds without workspace installation, verifies handler behavior and clean tracked source, captures current provider settings/rollback, then uses pinned Wrangler 4.110.0 in an isolated temporary directory. It uploads the exact artifact to `templates-platform` on branch `main` and records before/after settings plus artifact hashes. The readback must show the dispatched clean SHA and unchanged project configuration. A mismatch fails acceptance; inspect rather than automatically repairing settings.
4. Root and reviewer verify both public domains and the deployment URL: `/` 200 retirement; representative `/templates/restaurant`, `/checkout`, `/checkout/success?session_id=not-a-transaction`, `/dashboard` GET 410; benign empty POST to `/api/sites/provision`, `/api/subscriptions/update`, `/api/upload` and `/checkout` 410. Only perform production POST checks after GET/source/provider verification proves the retirement deployment is active. Never send a real transaction, customer ID or credential.
5. Recheck 1440/390/320 widths, keyboard, no-JS, outgoing workshop/contact links, provider binding/settings preservation and release evidence. Mark accepted only after live checks. No API/worker fallback to old commerce is permitted.

Rollback is Root-owned using the saved existing Pages deployment, after verifying it remains available. It restores the old storefront behavior, so prefer a reviewed retirement fix when possible. No automatic rollback runs. Preserve DB/KV/R2 throughout.

Cloudflare references: [advanced-mode handler](https://developers.cloudflare.com/pages/functions/advanced-mode/), [Pages rollback](https://developers.cloudflare.com/pages/configuration/rollbacks/).
