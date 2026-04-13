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

## Next steps

- Integrate Webflow Apps SDK for Components and Variables checks
- Map checks to `llms.txt` documented capabilities and scopes
- Add auto-fix proposals where possible
