# Designer Extension Starter Apps — Data-Grounded Build Spec

**Status: PROPOSAL.** Build is blocked on naming an owning team — app-platform ownership is currently unlanded, and unowned starters are how the last generation went stale. This spec is the build brief and the evidence package for the FY27Q3 ownership ask. Do not build ahead of the owner decision.

- **Drafted:** 2026-08-05
- **Author:** Micah Johnson (app review / marketplace)
- **Origin:** [PR #953 review thread](https://webflow.slack.com/archives/C03JF4PJBB4/p1785904853458389) — developers paste the Marketplace Guidelines into coding agents; agents need working reference code, and the existing `Webflow-Examples` starters (last pushed Jan–Feb 2025) predate the V1.3 security rows.
- **Companions:** [Marketplace Guidelines](https://developers.webflow.com/apps/docs/marketplace-guidelines) (V1.3 rows: openapi-internal #953; agent-ready links/anchors: #954), `exception-transparency-loop.md` (review ops context)

## Why these four starters (the data)

Two analyses ran 2026-08-05 (queries in Appendix):

**Demand (Snowflake, 90-day installs, DE + Hybrid apps):** design import/conversion ~16.5k installs; service connectors ~13k; asset/icon/media insertion ~8k; component libraries ~6k; compliance/consent ~3k; site QA/validation ~1k but growing **9.4×** quarter-over-quarter — the fastest riser on the board. Context: the Webflow MCP Bridge is the #1 app overall (63.6k installs/90d, 7× the #2) while nearly every incumbent declines 20–50% Q/Q. Routine build work is migrating to agents; *checking work* is the growing human use case, and reference code must be agent-consumable.

**Review friction (Airtable, 200 app reviews with reviewer feedback, trailing 12 months):**

| Theme | % of reviews | Nature |
|---|---|---|
| Bundle never submitted / submission process | 54% | Process, not code |
| Workspace name/icon ≠ listing | 26% | Process; 65% reject-correlated |
| Listing quality (descriptions, screenshot specs) | 26% | Process |
| Broken functionality during review | 14% | Code |
| OAuth/scopes | 14% | Code — signature defects below |
| No review access (paywall, missing credentials) | 10% | Process; 70% reject-correlated |

**Signature code defects** (recurring across many apps): (1) **double-OAuth** — re-triggering the Webflow OAuth flow on login/session expiry; (2) **asking users to paste a site ID** instead of deriving the site list from OAuth. Both now have explicit guideline rows ([Session behavior](https://developers.webflow.com/apps/docs/marketplace-guidelines#session-behavior), [Backend authentication](https://developers.webflow.com/apps/docs/marketplace-guidelines#backend-authentication)).

**Security debt surfaces late:** tokens in `localStorage`, `eval()`/`new Function()`, missing `postMessage` origin checks, and localhost/staging references appear almost exclusively in *Asset Update* reviews of established apps — first reviews drown in process noise, and the debt enters the installed base. Starters that are compliant at birth close that path.

**Scope-profile ground truth (Snowflake `OAUTH_APPLICATIONS`):** the entire top asset/utility/QA cluster runs with **zero OAuth scopes** (pure Designer Extension, no backend). The connector and consent clusters all carry `custom_code:read/write` — the elevated-risk scope is their core. Consent Pro is the model minimal citizen (4 scopes, all justified).

## Design principles

1. **Use cases from data, patterns from guidelines.** Popular apps choose *what* the starters do; the Marketplace Guidelines choose *how*. Never copy incumbent code — it predates the current rows.
2. **Compliant by construction.** Every applicable guideline row is either demonstrated in code or made structurally impossible to violate. Each starter's README maps files to guideline anchors.
3. **Agent-ready.** Each repo ships `AGENTS.md` (guideline anchor map, scope policy, review expectations). READMEs written to be pasted into a coding agent alongside the guidelines `.md` export.
4. **Review-noise tooling in every starter.** The top three friction themes (54/26/26%) are process, not code — the shared tooling below attacks them at the source.
5. **Owner + CI, or don't ship.** Quarterly refresh tied to guideline releases; CI runs review-equivalent checks so drift fails loudly.

## Shared chassis (ships in all four)

- **Bundle tooling:** one command produces `bundle.zip` + source map + a version-notes template pre-filled with the dependency list, and prints the submission walkthrough (Publish → Upload Bundle for Review). *Targets the 54% theme.*
- **Preflight checklist** (also candidate checks for the app-form skill toolkit): workspace name/icon matches listing; logo is a 900×900 logomark; 3–5 screenshots at 1280×846, ≤2MB; short description ≤100 chars; demo video (2–5 min, English or subtitles); review access prepared (demo account / credentials — no paywall wall). *Targets the 26% + 26% + 10% themes.*
- **CI (review-equivalent checks):** lint bans on `eval`, `new Function()`, string-arg `setTimeout`/`setInterval`, `document.write`, `innerHTML`/`insertAdjacentHTML` script insertion; no-localhost/staging/IP-literal URL scan; secret scan; CSP-compatibility lint (no inline handlers, no `javascript:` URIs); bundle builds reproducibly.
- **`AGENTS.md`:** scope policy for the starter, guideline anchor map, "what reviewers will check," and the `.md`-export pointers (`developers.webflow.com/.../marketplace-guidelines.md`, `llms.txt`, MCP server).

## The starters

### S1 · `de-starter-utility` — pure Designer Extension

- **Cluster / demand:** asset, icon, and media insertion (~8k installs/90d across ~10 apps) — the highest app-count pattern in the Marketplace.
- **Architecture:** Designer Extension only. **No OAuth, no scopes, no backend.** Vite + TypeScript, minimal deps.
- **Working example:** search a public asset source, insert selected asset onto the canvas via Designer API.
- **Teaches:** that most DE ideas need *no* data access at all — [least privilege](https://developers.webflow.com/apps/docs/marketplace-guidelines#scopes-and-least-privilege) in its purest form; [Designer Extension code standards](https://developers.webflow.com/apps/docs/marketplace-guidelines#technical-designer-extensions) (CSP-compatible, static imports, no dynamic execution).

### S2 · `de-starter-import` — import & transform

- **Cluster / demand:** design import/conversion, the largest third-party cluster (~16.5k installs/90d: Figma to Webflow, Site Builder Import, HTMLtoflow).
- **Architecture:** DE + minimal Data API. Scope profile pinned to the cluster's ground truth: `assets:read/write`, `sites:read`, `authorized_user:read`.
- **Working example:** parse an uploaded file, create assets/elements in bulk with progress UI and idempotent re-runs.
- **Teaches:** minimal-scope OAuth; bulk Designer API creation; [Webflow as the source of truth](https://developers.webflow.com/apps/docs/marketplace-guidelines#webflow-as-the-source-of-truth) (no divergent local copies); rate-limit backoff ([Data access](https://developers.webflow.com/apps/docs/marketplace-guidelines#data-access)).
- **Defects made impossible:** scope over-request (manifest pinned); site-ID entry (site context from OAuth).

### S3 · `de-starter-connector` — hybrid service connector

- **Cluster / demand:** service connectors (~13k installs/90d) — and the cluster where every security row bites. Highest review-value starter.
- **Architecture:** Hybrid (DE + Data Client backend). Scope profile modeled on the cluster's minimal citizen: `authorized_user:read`, `sites:read`, `custom_code:read/write`.
- **Working example:** connect an external service, inject its snippet via the Custom Code API, clean up on uninstall.
- **Teaches / makes impossible:**
  - Single-OAuth session management — app login never re-triggers Webflow OAuth ([Session behavior](https://developers.webflow.com/apps/docs/marketplace-guidelines#session-behavior)). *The #1 signature defect.*
  - Site list derived from OAuth; backend verifies identity, never trusts client-supplied `siteId` ([Backend authentication](https://developers.webflow.com/apps/docs/marketplace-guidelines#backend-authentication)). *Signature defect #2.*
  - Server-side encrypted token storage — never `localStorage` ([Token security](https://developers.webflow.com/apps/docs/marketplace-guidelines#token-security)).
  - `state` parameter + exact redirect URI ([OAuth flow security](https://developers.webflow.com/apps/docs/marketplace-guidelines#oauth-flow-security)).
  - SRI'd, versioned, HTTPS script injection + uninstall removal ([App-delivered code](https://developers.webflow.com/apps/docs/marketplace-guidelines#app-delivered-code-and-injected-scripts)).
  - `postMessage` origin allowlist; no credential forwarding ([Request handling](https://developers.webflow.com/apps/docs/marketplace-guidelines#request-handling), [Credentials and secrets](https://developers.webflow.com/apps/docs/marketplace-guidelines#credentials-and-secrets)).

### S4 · `de-starter-validator` — site QA & reporting

- **Cluster / demand:** site QA/validation — smallest base (~1k installs/90d) but **9.4× Q/Q growth** and the most agent-adjacent use case (humans checking work agents produce).
- **Architecture:** pure DE on the S1 chassis; read-heavy element/style traversal with batching, results UI, export.
- **Teaches:** performant Designer API traversal; keeping derived findings visually distinct from live site data ([source of truth, row 4](https://developers.webflow.com/apps/docs/marketplace-guidelines#webflow-as-the-source-of-truth)); zero-scope read-only architecture.
- **Build note:** S1 and S4 share the pure-DE chassis — if the owner wants three repos instead of four, S4 ships as a second example inside S1 at the cost of the strategic signal ("Webflow blesses the QA use case").

## Sequencing, distribution, measurement

- **Order:** S1 first (cheapest, proves the chassis, serves the highest app volume) → S3 (highest security value) → S2 → S4.
- **Distribution:** once live, point Marketplace Guidelines [§Technical row 2](https://developers.webflow.com/apps/docs/marketplace-guidelines#technical) at the specific starters (today it points at the `Webflow-Examples` org — a stopgap; the org also needs hygiene: `fde-*` and experimental repos sit public alongside blessed examples). Link from the submission form confirmation and the app-form skill toolkit.
- **Metrics:** feedback cycles per new-asset submission (baseline mean 1.37, max 9); % of new-asset reviews raising bundling (85% baseline) / branding (33%) / listing (30%) themes; % of first submissions with zero security findings at first *update* review.

## The ownership ask

A named team owning four small repos with CI and a quarterly refresh SLA tied to guideline releases. Rough shape: S1/S4 are small builds, S2 medium, S3 the large one. The payoff is measurable review-load reduction (baselines above) plus prevention — security debt stops entering the installed base at birth, and agents consuming our docs get canonical code instead of 110 mixed repos or 18-month-old patterns. This spec plus its data is the evidence package for the FY27Q3 planning conversation.

## Appendix: data provenance

- **Demand & scopes:** Snowflake `ANALYTICS.WEBFLOW.EVENT_APP_INSTALLED` (APP_TYPE ∈ designer extension/hybrid; 90d vs prior-90d windows, 2026-08-05), `EVENT_APP_LAUNCHED` (90d), `OAUTH_APPLICATIONS.SCOPES` joined via `APPS.CLIENT_ID`. Designer-side telemetry — unaffected by the 2026-07-21 webflow.com front-end tracking outage.
- **Review friction:** Airtable 👛Marketplace Assets → 🖌️Asset Versions, app-type rows with non-empty 📝Review Feedback, trailing 365 days: 207 records, 200 analyzed (2 fixtures + 5 trivial excluded), ~100k chars of feedback text, per-record theme assignments retained from the analysis session.
- **Caveats:** review statuses are per-review-touch ("Rejected (No Notification)" is used as an awaiting-developer state, so "rejected" ≈ cycle ended unresolved, not permanent); install-decline reads may include summer seasonality — the MCP Bridge growing through the same window is the counter-signal; cluster assignment is by app name/description (marketplace category taxonomy did not join cleanly in Snowflake).
