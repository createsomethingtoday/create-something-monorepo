# Webflow Dashboard Cloud

Next.js 15 Webflow Cloud port of the `packages/webflow-dashboard` creator dashboard.

## Scope

This app is the MVP cut of the dashboard migration. It keeps the current creator workflow on Webflow Cloud:

- public creator intake and template submission flow
- magic-link login and verification
- protected dashboard and marketplace routes
- asset list, detail, edit, and archive flows
- primary, secondary, and carousel image uploads through R2
- profile and API key management
- submission tracking and marketplace analytics

The canonical parity inventory lives in [specs/webflow-dashboard-cloud-parity-matrix.md](/Volumes/LaCie/Create%20Something/create-something-monorepo/specs/webflow-dashboard-cloud-parity-matrix.md).

## Workspace layout

- app: [apps/webflow-dashboard-cloud](/Volumes/LaCie/Create%20Something/create-something-monorepo/apps/webflow-dashboard-cloud)
- shared domain layer: [packages/webflow-dashboard-core](/Volumes/LaCie/Create%20Something/create-something-monorepo/packages/webflow-dashboard-core)
- source reference: [packages/webflow-dashboard](/Volumes/LaCie/Create%20Something/create-something-monorepo/packages/webflow-dashboard)

## Runtime bindings

Webflow Cloud should provision these Cloudflare bindings from [wrangler.json](/Volumes/LaCie/Create%20Something/create-something-monorepo/apps/webflow-dashboard-cloud/wrangler.json):

- `ASSETS`: OpenNext static asset binding for the generated Next.js build
- `DB`: D1 database for marketplace snapshot history and future app-owned persistence
- `SESSIONS`: KV namespace for login rate limits and session storage
- `UPLOADS`: R2 bucket for dashboard uploads

## Environment variables

Required:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `CSRF_TRUSTED_ORIGINS`

Recommended:

- `ADMIN_EMAILS`
- `ENVIRONMENT`
- `DEBUG_LOGS`
- `DEBUG_AIRTABLE`

Framework/runtime path values:

- `BASE_URL`
- `ASSETS_PREFIX`
- `NEXT_PUBLIC_BASE_PATH`

Optional intake bot protection:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_EXPECTED_HOSTNAME`

Optional analyzer autofill:

- `TEMPLATE_ANALYZER_API_BASE`
  defaults to `https://webflow-template-analyzer.createsomething.workers.dev`
  and is used by `POST /api/intake/validate-published-url` to suggest template details and
  expose screenshot-download links after a successful validation pass.

For local development, copy values from [.env.example](/Volumes/LaCie/Create%20Something/create-something-monorepo/apps/webflow-dashboard-cloud/.env.example). In Webflow Cloud, set the secrets in the environment UI instead of committing them.

## Commands

```bash
pnpm --filter @create-something/webflow-dashboard-core check
pnpm --filter @create-something/webflow-dashboard-core test
pnpm --filter @create-something/webflow-dashboard-cloud dev
pnpm --filter @create-something/webflow-dashboard-cloud check
pnpm --filter @create-something/webflow-dashboard-cloud build
pnpm --filter @create-something/webflow-dashboard-cloud preview
```

## Route surface

UI routes:

- `/submit`
- `/login`
- `/verify`
- `/dashboard`
- `/assets/[id]`
- `/marketplace`

API routes:

- `POST /api/auth/login`
- `POST /api/auth/verify-token`
- `POST /api/auth/logout`
- `GET /api/auth/check-session`
- `GET /api/assets`
- `GET /api/assets/check-name`
- `GET|PUT /api/assets/[id]`
- `DELETE /api/assets/[id]/archive`
- `POST /api/upload`
- `GET /api/uploads/[...path]`
- `GET|PUT /api/profile`
- `GET /api/keys`
- `POST /api/keys/generate`
- `DELETE /api/keys/revoke`
- `GET /api/analytics/leaderboard`
- `GET /api/analytics/categories`
- `GET|POST /api/cron/snapshot`
- `GET /api/submission-status`
- `GET|POST /api/cron/cleanup`
- `POST /api/intake/check-email`
- `POST /api/intake/check-creator`
- `POST /api/intake/check-template-name`
- `POST /api/intake/validate-published-url`
- `POST /api/intake/upload`
- `POST /api/intake/creator`
- `POST /api/intake/template`

## Security model

- session cookie: `session_token`
- cookie policy: `HttpOnly`, `Secure`, `SameSite=None`
- default session TTL: 2 hours
- verification token TTL: 60 minutes
- middleware protects dashboard routes and rejects invalid origins on mutating API requests
- iframe headers explicitly allow Webflow-hosted embedding and remove `X-Frame-Options`
- when Turnstile env vars are present, creator-profile creation and template submission require a
  valid Cloudflare Turnstile token

## Deployment notes

- Keep business logic in standard route handlers and server components. Do not add `runtime = "edge"` to app routes.
- Webflow Cloud injects the mount path. The app reads `BASE_URL`, `ASSETS_PREFIX`, and `window.__NEXT_DATA__.assetPrefix` to resolve paths correctly under a prefixed deployment.
- The app now includes [open-next.config.ts](/Volumes/LaCie/Create%20Something/create-something-monorepo/apps/webflow-dashboard-cloud/open-next.config.ts) and [cloudflare-env.d.ts](/Volumes/LaCie/Create%20Something/create-something-monorepo/apps/webflow-dashboard-cloud/cloudflare-env.d.ts) to match the current Webflow Cloud Next.js deployment docs.
- The Cloud app depends on [packages/webflow-dashboard-core](/Volumes/LaCie/Create%20Something/create-something-monorepo/packages/webflow-dashboard-core) through a local `file:` dependency so a subdirectory npm install has a better chance of working in Webflow Cloud.
- The cron cleanup and marketplace snapshot routes exist, but scheduling should stay external until Webflow Cloud scheduling is confirmed for this app.
