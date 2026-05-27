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

Persisted artifacts use schema `validator_app_results_submission.v0.1`, store
only sanitized summary/category/issue fields, and set
`raw_bridge_token_stored: false`. The review MCP can normalize those artifacts
with `validator:results:normalize` before importing findings into the review
ledger.

## Next steps

- Integrate Webflow Apps SDK for Components and Variables checks
- Map checks to `llms.txt` documented capabilities and scopes
- Add auto-fix proposals where possible
