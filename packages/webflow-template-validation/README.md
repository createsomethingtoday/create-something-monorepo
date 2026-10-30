# Webflow Way Validator (MVP)

Monorepo home: `packages/webflow-template-validation/`.

This package now preserves the validator's three surfaces together:

- Next.js companion app in `src/`
- Webflow Designer App in `extension/`
- Cloudflare backend in `worker/`

The deployed worker name and external endpoints remain unchanged for now.

Validate Webflow templates against Components, Typography, Variables, Styles, and Naming guidelines. This MVP focuses on published-site checks (Typography, Styles, Naming). Components and Variables require Webflow Apps SDK (Designer) and will be added next.

## Getting started

- Prereqs: Node 20+ and `pnpm`
- Install: `pnpm install`
- Dev app: `pnpm --filter @create-something/webflow-template-validation dev`
- Build app: `pnpm --filter @create-something/webflow-template-validation build`
- Dev worker: `pnpm --filter @create-something/webflow-template-validation-worker dev`
- Build extension: `pnpm --filter @create-something/webflow-template-validation-extension build`

## API

POST /api/validate

Body:
```json
{ "url": "https://your-template.webflow.io" }
```

Returns a structured JSON report with categories and issues.

### Validator app submission artifacts

`POST /app-validator/submit` accepts Designer Extension validation results and
keeps the creator flow non-blocking. Airtable persistence remains optional. For
review automation, the worker can also persist a sanitized validation-result
artifact to R2 when a bucket binding is configured:

- Primary binding: `VALIDATOR_RESULT_ARTIFACTS`
- Compatibility alias: `VALIDATION_RESULT_ARTIFACTS`

If neither binding exists, submissions are still accepted and the response
returns `artifact.persisted: false` with `reason: "r2_not_configured"`.

The worker also stores the latest sanitized submission status per site for the
Marketplace form:

- `GET /app-validator/submission/latest?siteId=<site-id>`
- `GET /app-validator/submission/latest?bridgeTokenSha256=<sha256>`
- `GET /app-validator/submission/latest?publishedUrl=<url-or-host>`

This endpoint returns whether the latest Validator run reached a 100% pass
without exposing the raw bridge token. It is submission-contract evidence only;
it does not emit approval, rejection, final rating, or visual quality judgment.
The response includes `siteId` and `evidence` (the object below, or `null`).

#### OAuth site-access evidence

A command-line client has no Designer bridge snippet, so it can prove site
access with a Webflow MCP OAuth token instead. `POST /app-validator/submit`
accepts an optional `evidence` object:

```json
{ "type": "oauth_site_access", "accessToken": "<Webflow MCP OAuth access token>" }
```

The worker calls Webflow's MCP server (`https://mcp.webflow.com/mcp`, or
`VALIDATOR_MCP_SERVER_URL` when set) as an MCP client: `initialize`, then
`data_sites_tool` `get_site` for the submitted `siteId`. Verification passes
only when the returned site id equals the submitted `siteId`. On failure the
worker responds `403 { error: "oauth_site_access evidence could not be
verified", correlationId }` and stores nothing. On success the stored result,
the submit response, and the R2 artifact carry:

```json
{
  "type": "oauth_site_access",
  "verified": true,
  "verifiedAt": "<ISO timestamp>",
  "workspaceId": "<workspace id or null>",
  "accessTokenSha256": "<sha256 hex of the token>",
  "rawAccessTokenStored": false,
  "publishedHosts": ["<shortName>.webflow.io", "<custom domain host>"]
}
```

The worker also maps each published host (keyed by its SHA-256) to the site id,
which is what `publishedUrl` lookups read. The raw token is never logged,
stored, or returned.

Persisted artifacts use schema `validator_app_results_submission.v0.2`, store
only sanitized summary/category/issue fields plus `evidence` (`null` without
evidence), and set `raw_bridge_token_stored: false`. v0.2 adds `evidence` to
v0.1; nothing else changed. The review MCP can normalize those artifacts with
`validator:results:normalize` before importing findings into the review ledger.

## Next steps

- Integrate Webflow Apps SDK for Components and Variables checks
- Map checks to `llms.txt` documented capabilities and scopes
- Add auto-fix proposals where possible
