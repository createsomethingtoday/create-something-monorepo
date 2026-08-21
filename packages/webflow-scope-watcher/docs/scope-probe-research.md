# Research scope: auto-created test apps for new OAuth scopes ("Scope Probe")

**Origin**: Pablo, 8/18 — "what do they do? I already have developers submitting
apps with them turned on and I want to understand their intended or expected use
case before the review." Follow-up noted in the group thread 8/18.

**Objective**: when a new scope goes GA, hand the review team — before
third-party submissions arrive — (1) what the consent screen shows, (2) which
endpoints the scope guards, and (3) evidence of what those endpoints actually do
against a sandbox site.

## Verified facts (2026-08-18, from webflow/webflow@dev)

1. **Registry + gating**: all scopes live in
   `entrypoints/server/lib/logic/oauth/scopes.ts`. `getInvalidScopeKeys()`
   filters by Statsig flag, and app create/update validates through it — so **a
   test app cannot pre-enable a gated scope**. The earliest a probe can run is
   the GA moment, which is exactly the `scope_ungated`/`scope_added` event the
   watcher already detects. Preview of gated scopes stays registry-read-only
   (the watcher's heads-up already covers it).
2. **App CRUD is dashboard-session-only**:
   `POST/PUT /api/workspaces/:workspace_slug_or_id/applications[/:oauth_app_id]`
   (`entrypoints/server/routes/dashboard/workspaces/integrations.ts`) behind
   `isAuthorized` + CSRF + `restrictActiveWorkspace`. There is **no public-token
   or PAT path** for creating/updating an app. Full automation therefore
   requires session automation (browser or stored cookie); the `PUT` route means
   we need **one standing test app whose scope list we extend**, not an app per
   scope.
3. **Scope → endpoint map is statically derivable**: routes guard scopes via
   `middleware.oauth.restrictScopes([SCOPES.X])`. A GitHub code search for
   `restrictScopes SCOPES.<CONST>` returns the guarded route files (measured
   today: AI_WRITE 1, PAGE_CLIENT_WRITE 3, AGENT_INSTRUCTIONS_READ 1,
   BRANCHES_READ 2, CLOUD_APPS_READ 1). This alone answers most of "what does it
   do" — without creating any app.
4. **Plumbing that already exists**: the scope watcher (hourly registry diff →
   #wg-app-marketplace as Marketplace Asset Bot, `/api/announce` for one-offs),
   the `micahwithwf` GitHub token, and screenshot/browser precedents
   (template-review screenshot tool, Playwright skill, E2B in App Review
   Preflight).

## Proposed increments (recommendation: ship 1, then 2; 3 only if 2 proves insufficient)

### Increment 1 — scope→endpoint map in watcher alerts *(smallest, highest value/effort)*
When the watcher detects a new/un-gated scope, run a GitHub code search for
`restrictScopes SCOPES.<CONST>`, list the guarded route files/paths in the Slack
alert, and link the source PR (already included). Pure read, no new auth, lives
in the existing worker. Rough effort: ~half a day.

### Increment 2 — standing "Scope Probe" app + consent-screen capture
One private OAuth app in a dedicated test workspace. On GA of a new scope:
- add the scope to the app via `PUT .../applications/:id` — either a
  30-second manual dashboard step prompted by the alert, or automated with a
  stored dashboard session (Playwright); session freshness is the fragile part
  and the main decision;
- auto-generate the authorize URL with the new scope and screenshot the consent
  screen (needs a browser runtime — not the worker; a small local/CI runner or
  E2B);
- post both into the alert thread.
Rough effort: 1–2 days + one-time workspace/app setup.

### Increment 3 — scope exerciser
After authorizing the probe app against a sandbox site, mint a token and run
probes against the guarded endpoints, recording request/response shapes as the
"intended use case" artifact. Guardrails: read-only probes by default; write
scopes only against the dedicated sandbox site; never real customer data; app
stays private (never submitted to the marketplace). Rough effort: 2–4 days,
plus ongoing maintenance as endpoints evolve; some scopes need product fixtures
(cloud_apps → Cloud enabled; ecommerce → store) — accept partial coverage.

## Decisions (resolved 2026-08-18)

1. **Test identity — DECIDED: dedicated non-Okta account.** A fresh Webflow
   account on a plain email+password login (plus-alias on a non-`@webflow.com`
   domain — `@webflow.com` funnels into Okta SSO, which is unautomatable and
   policy-sensitive). Verified 8/18: the login page exposes an email+password
   path alongside SSO, with no bot challenge on render from a datacenter IP.
   This also reproduces the exact condition of a third-party developer — which
   is what review needs to see. The account owns only the "Scope Probe"
   workspace + one sandbox site (blast radius ≈ zero). Credentials go to
   Infisical (`/webflow-scope-watcher`) + the 1Password Marketplace vault (same
   home as the Marketplace Asset Bot token); no 2FA initially (the account owns
   nothing sensitive) — revisit if policy requires.

2. **Runner — DECIDED: Cloudflare Browser Rendering, driven by the existing
   watcher worker.** Verified working 8/18 on the CREATE SOMETHING account with
   the existing `CLOUDFLARE_BROWSER_RUN_API_TOKEN`: one REST call
   (`POST /accounts/{id}/browser-rendering/screenshot` with `url` + `cookies`)
   returned a real 1280×900 PNG of the authorize URL. Zero new systems — no
   laptop-uptime dependency (local runner), no secret sprawl into CI (GitHub
   Actions), no E2B integration. The consent screenshot becomes: stored
   probe-account session cookie + authorize URL → PNG → Slack thread.
   Known fragile leg: session-cookie expiry. Mitigation: the worker detects an
   auth failure (screenshot renders the login page instead of the consent
   screen) and alerts with the cookie-refresh one-liner; login automation is
   deferred (Turnstile risk on form submit; dashboard sessions are long-lived).

3. **App-update step — v1 is manual-from-alert** (a 30-second dashboard step to
   add the new scope to the probe app), a consequence of not automating login.
   A cookie-based `PUT .../applications/:id` from the worker is a possible v2
   once cookie-refresh cadence is observed.

## Still open

- **ai:write cost/entitlement**: the LLM proxy routes may require workspace AI
  entitlement — confirm the test workspace qualifies before probing.

## One-time setup checklist (human steps, ~15 min)

1. Create the probe account (plus-alias email, strong password) — expect
   Turnstile on signup, so do this in a normal browser.
2. Create the "Scope Probe" workspace + one blank sandbox site.
3. Create one private OAuth app in the workspace (name it so reviewers
   recognize it, e.g. "Scope Probe — internal review tooling"); enable the
   current GA scopes; note client_id.
4. Store credentials + client_id/secret in Infisical `/webflow-scope-watcher`
   and the 1Password Marketplace vault.
5. Export the dashboard session cookie and `wrangler secret put` it
   (exact cookie name + refresh one-liner to be documented during the build).

## Out of scope

- Pre-GA exercising of gated scopes (blocked by server-side validation).
- Anything marketplace-facing (the probe app is never listed or submitted).
- Backfilling probes for already-GA scopes is possible but secondary; the
  8/18 backfill post covers their descriptions and adoption.
