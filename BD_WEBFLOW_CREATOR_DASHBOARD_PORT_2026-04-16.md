## Status: bd-webflow Creator Dashboard Port (Phase 1)

Date: `2026-04-16`
Status: `Phase 1 shipped (uncommitted); Phase 2 blocked on product decisions`
Target repo: `bd-webflow` (Webflow's internal monorepo, not this repo)
Branch context (this repo): `emdash/webflow-dashboard-in-prod-5um`

## Context

`packages/webflow-dashboard` in this monorepo is the external SvelteKit creator dashboard running on Cloudflare Pages. It backs creator portfolios, template submissions, GSAP validation, and multi-image uploads for the Webflow Marketplace.

A prior session ported the *read-side* of that dashboard into bd-webflow as a new `CreatorDashboard` route family (portfolio list, asset detail, submissions view, validation, profile settings, portfolio analytics). The parity audit identified seven additional dashboard features that did not exist natively in bd-webflow.

Phase 1 of that parity closure has now been implemented directly in bd-webflow. Phase 2 requires product decisions before any more code ships.

## Phase 1: Shipped

All Phase 1 work lives in the bd-webflow working tree, uncommitted. Files below are paths inside `/Users/micahjohnson/Desktop/bd-webflow`.

### 1.1 SubmissionTracker — rolling-window quota

Surfaces the creator's 30-day submission quota with a configurable 6-submission cap and an env-var whitelist. Replaces the dashboard's dependency on `check-asset-name.vercel.app/api/checkTemplateuser`.

- Server:
  - `entrypoints/server/dataAccess/marketplace/templates/countCreatorSubmissionsInWindow.ts`
  - `entrypoints/server/lib/logic/creator/getSubmissionQuota.ts`
  - `entrypoints/server/controllers/creator/getSubmissionQuotaHandler.ts`
  - `entrypoints/server/routes/api/creatorSubmissionQuota.ts`
  - `entrypoints/server/routes/vhost/routers/defaultApp.ts` (modified: registered new route)
- Client:
  - `entrypoints/dashboard/client/src/api/types/creatorSubmissionQuota.ts`
  - `entrypoints/dashboard/client/src/api/CreatorSubmissionQuota.ts`
  - `entrypoints/dashboard/client/src/api/hooks/useGetCreatorSubmissionQuota.ts`
  - `entrypoints/dashboard/client/src/api/utils/queryKeys.ts` (modified: added key)
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/submissionQuotaUtils.ts`
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/components/SubmissionQuotaCard.tsx`
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/index.tsx` (modified: mounted card)
- Tests:
  - `entrypoints/server/test/logic/creator/getSubmissionQuota_test.ts` — 7 integration scenarios (scaffold)
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/__tests__/submissionQuotaUtils.test.ts` — 13 unit tests, all passing

Route contract:

- `GET /api/v1/creator-dashboard/workspace/:workspaceId/submission-quota`
- Middleware stack: `restrictSso → loadWorkspace → restrictActions(WORKSPACE.READ) → rateLimit(30/60s per user)`
- Response: `{used, limit, remaining, windowDays, isWhitelisted, nextAvailableSlotAt}`

Whitelist model: env var `CREATOR_QUOTA_WHITELIST_PERSON_IDS` (comma-separated ObjectIds). See "Follow-ups" for why this is not on the `Person` schema yet.

### 1.2 App version history UI

Surfaces the existing `getAppVersionHistory` data in the creator asset detail view. Zero new backend.

- Client:
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/versionHistoryUtils.ts`
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/components/AppVersionHistoryTimeline.tsx`
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/DetailPage.tsx` (modified: renders timeline card when `asset.raw.kind === 'app'`)
- Tests:
  - `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/__tests__/versionHistoryUtils.test.ts` — 10 unit tests, all passing

Reuses existing `useGetAppVersionHistory` hook and `DesignerExtensionVersion` type. Status tones align with Submission lane tones already in place.

### 1.3 Analytics presentation primitives

Three chart/motion components built against `@visx/*` packages already in the bd-webflow dependency tree. No new dependencies added.

- Client components:
  - `components/Sparkline.tsx` — `@visx/group` + `@visx/scale` + `@visx/shape` `LinePath`; 4 tones; empty placeholder below 2 points
  - `components/DonutChart.tsx` — `@visx/shape` `Pie` with optional center label/hint; 5 tones; renders null when total is 0
  - `components/KineticNumber.tsx` — `requestAnimationFrame` tween; honors `prefers-reduced-motion`; 800ms default
- Supporting:
  - `kineticNumberUtils.ts` — `easeOutCubic`, `interpolateKineticValue`, `defaultKineticFormatter`
- Integrated into:
  - `AnalyticsPage.tsx` (modified) — 4 summary-card numbers now use `<KineticNumber />`
  - `SubmissionsPage.tsx` (modified) — added `<DonutChart />` for lane distribution; 4 summary counters also use `<KineticNumber />`
- Tests:
  - `__tests__/kineticNumberUtils.test.ts` — 8 unit tests, all passing

### 1.5 Deep-links into existing bd-webflow surfaces

`DetailPage.tsx` (modified) — app assets now surface:

- "View full analytics" button → `/workspace/:slug/app-development/:appId` (existing `AppMetricOverTimeGraph` time-series view)
- "App development" button → `/workspace/:slug/app-development` (app list + edit modal)
- "Manage versions" button inside the Version history card → same per-app analytics route (where version submission/release lives)

No new backend. No new component. Three lines of wiring that route creators into the rich App Analytics and App Development screens that already exist. This enforces a reuse-first pattern for Phase 2 — extend existing surface before building parallel screens.

### 1.6 Polish pass (Tier 1)

Four low-risk improvements built on the Phase 1 foundation. Each is self-contained and shippable.

**Telemetry**

- 6 new `CREATOR_DASHBOARD_*` events registered alphabetically in `packages/systems/core/constants/analytics/analyticsEvents.ts`: `VIEWED`, `FILTER_APPLIED`, `SEARCH_ISSUED`, `ASSET_OPENED`, `ACTION_CLICKED`, `SUBMISSION_QUOTA_VIEWED`.
- New helper module `telemetry.ts` in the CreatorDashboard directory with a typed `surface` enum and function-per-event API.
- Wired into all 6 surfaces (home, detail, submissions, analytics, settings, validation) as page-view events, plus per-surface filter/search/action hooks.
- Search event tracks `query_length` only, never the raw query — PII safety.
- 5 unit tests mocking `trackEvent`.

**Error boundaries**

- All 6 page wrappers (`PageWrapper`, `DetailPageWrapper`, `SubmissionsPageWrapper`, `AnalyticsPageWrapper`, `SettingsPageWrapper`, `ValidationPageWrapper`) refactored into outer `ErrorBoundary` + inner body component. Each wrapper passes a unique `surface` metadata tag so telemetry can distinguish crashes by page.
- Reuses the existing `@components/ErrorBoundary`, which already sends errors through `telemetry.sendError(REPORT_EXCEPTION, …)`.
- `allowReset` is enabled so creators can retry without a page reload.

**Chart tooltips**

- `Sparkline` (Phase 1.3) + `DonutChart` (Phase 1.3) now use `@visx/tooltip` `useTooltip` + `TooltipWithBounds`.
- Sparkline: overlay rect tracks mouse x, hovered point gets a dot + tooltip with the formatted value. `formatValue` prop is optional.
- DonutChart: each segment gets `onMouseMove` + `onMouseLeave`, non-hovered segments dim to 0.85 opacity, tooltip shows `label: value (percent%)`.
- No new dependencies — `@visx/tooltip` was already in `package.json`.

**Submission quota 90-day trend**

- Server: new `listCreatorSubmissionTimestampsInWindow` DAL + `bucketTimestampsByDay` pure helper; `getSubmissionQuota` now returns `trend: number[]` (90 daily buckets) and `trendWindowDays`.
- Integration test gains 4 new scenarios — empty trend, bucket alignment (index by day offset), out-of-window ignored, end-to-end trend on the quota response.
- Client type `CreatorSubmissionQuota` extended; `SubmissionQuotaCard` renders a `<Sparkline>` below the progress bar, tone-matched to the quota state, hidden when the creator has zero submissions in the 90-day window.

**Validation**: 13 + 10 + 8 + 5 + 5 = 41 client unit tests pass (Phase 1 + Tier 1). Focused ESLint clean across every touched file. One `no-implicit-coercion` lint hit on `1 * DAY_MS` in the new test scenarios, fixed.

### 1.7 Tier 2 extras

Two more self-contained improvements shipped on top of Tier 1. Neither requires product input.

**CSV export on Analytics page**

- New module `analyticsExport.ts` with pure helpers: `escapeCsvCell` (RFC 4180-ish quoting, doubles embedded quotes), `renderCsv` (CRLF row separator), `formatCreatorAnalyticsCsv` (12-column output: name, type, id, coverage, installs, likes, views, uninstalls, demand, resource count, activity score, updated on), `buildCreatorAnalyticsCsvFilename` (slug + date stamp), `downloadCsv` (Blob + transient `<a>`, SSR-safe).
- `AnalyticsPage` gains a `Download CSV` button in the page header, disabled when the portfolio is empty, emits `download_csv` via the Phase 1.6 action-click telemetry.
- 13 unit tests covering quoting, row shape, header alignment, filename format.

**A11y pass on Phase 1 components**

- `SubmissionQuotaCard` progress bar now has `role="progressbar"` + `aria-valuemin/max/now` + `aria-valuetext` (reads "3 of 6 submissions used" or "Whitelisted, no limit"). Inner fill is `aria-hidden` since the track carries the semantic value.
- `DonutChart` each segment `<path>` now includes a SVG `<title>` child, so screen readers announce `"Needs attention: 4 (28%)"` on focus even without mouse hover. Tooltip behavior unchanged for sighted users.
- `KineticNumber` gets `aria-live="off"` (prevents mid-animation RAF updates from spamming assistive tech) plus `aria-label` pinned to the *final* value so SR users hear the real number regardless of animation state.

**Recent-activity timeline on home**

- New module `activityFeedUtils.ts` with pure helpers: `buildCreatorActivityFeed(assets)`, `takeRecentActivity(events, limit)`, `formatActivityRelativeTime(at)`. 4 event kinds covered: `template_created`, `template_archived`, `library_shared`, `library_source_archived`.
- **No new fetches** — events are derived from the asset snapshots `useCreatorDashboardAssets` already returns. App version events are intentionally out of scope here since apps already get a rich timeline on the asset detail page (Phase 1.2).
- Template archive events use `createdOn` as a floor timestamp with a clear "Archived" label, since bd-webflow doesn't expose a true archive-at timestamp.
- New component `components/RecentActivityCard.tsx` renders the 5 most recent events newest-first; each row links through to the asset detail; hidden when the feed is empty.
- Mounted on the CreatorDashboard home between the submission-quota card and the summary row.
- 10 unit tests covering event derivation rules, ordering, limit behavior, relative-time formatting.

**Keyboard navigation on asset tables**

- New shared hook `useTableKeyboardRowProps({onActivate})` in the CreatorDashboard directory. Returns a `getRowProps(index)` function that each row spreads onto `<TableRow>`. Rows pick each other up via `data-creator-table-row="true"` — no shared ref registry or context needed.
- `ArrowDown`/`ArrowUp` move focus between siblings; `Home`/`End` jump to first/last; `Enter`/`Space` call `onActivate(index)`; unrelated keys pass through.
- Wired into all three asset tables (CreatorDashboard home, SubmissionsPage, AnalyticsPage). Each page's `onActivate` routes to the asset detail via `useRouterForApp().navigate(getCreatorAssetDetailPath(...))` and also emits `CREATOR_DASHBOARD_ASSET_OPENED` telemetry so keyboard and mouse paths are tracked identically.
- Each row gets an `aria-label` describing the asset and "Press Enter to open detail" so screen-reader users know what activation does.
- Uses `ArrowUp`/`ArrowDown` rather than `j`/`k`; bd-webflow's existing QuickFind surface uses the same convention (`components/QuickFind/utils.tsx:178`), so this matches the in-product pattern rather than introducing vim bindings.
- 6 unit tests against the hook using `@testing-library/react` with `fireEvent.keyDown` + the repo's `data-automation-id` convention.

### 1.4 Feedback button — deferred

Not implemented. bd-webflow has no shared feedback widget (verified by searching for Intercom, Productboard, Appcues, Pendo, Delighted, Hotjar — none present). The only existing "feedback" pattern is an external survey-URL link inside `Sites/GeneralSettings/.../RealtimeSection`.

Shipping a `POST /api/v1/creator-dashboard/feedback` + modal + outbound webhook without a decided channel would commit a new collection and an outbound integration the team hasn't approved. A "feedback button" that routes nowhere is worse than no button.

Minimal implementation once the channel exists:

- If the decision is a survey URL: a single `<Button href={CREATOR_FEEDBACK_SURVEY_URL} target="_blank">Share feedback</Button>` in the dashboard header, URL from config. ~30 min.
- If the decision is Slack or a ticketing system: backend endpoint + modal per the plan. ~1 day.

## Validation

- 31 client-side unit tests added across Phase 1 (13 + 10 + 8). All passing under `pnpm nx anytest` on bd-webflow's Jest harness.
- 1 server-side integration test file added (`getSubmissionQuota_test.ts`). Not run locally — requires bd-webflow's Mongo-backed integration-test setup. Should run on CI.
- Focused ESLint (`--quiet --no-cache`) clean across every touched file. One `curly` rule violation found and fixed during iteration.
- One SSRF-adjacent substring check already merged via commit `d1ab8624` in this repo; bd-webflow had the same `.webflow.io` substring bug in `entrypoints/server/routes/api/creatorValidation.ts:94` and has been patched to `new URL(...).hostname.endsWith('.webflow.io')` in the same session.

Not yet verified:

- No browser render. I did not run bd-webflow locally.
- Server integration test (`getSubmissionQuota_test.ts`) depends on `Template.collection.insertOne({...})` bypassing schema validation. If a required index interferes, it will need `new Template({...}).save({validateBeforeSave: false})`.

## Follow-ups

### Whitelist persistence

v1 reads the quota whitelist from `CREATOR_QUOTA_WHITELIST_PERSON_IDS`. The Person schema lives in a shared package (`@packages/domains/identity-and-access/authentication/mongodb`); adding a field there is a cross-team change. When the whitelist needs admin management, graduate to either:

1. A field on `Person`, updated through the existing admin user routes.
2. A dedicated `creatorQuotaWhitelist` collection keyed by `personId`.

The `getSubmissionQuota` logic already accepts an injectable `isWhitelisted` function, so the substitution is mechanical.

### Server integration test

Schedule a run on bd-webflow's CI harness. If the raw-insert pattern fails on a schema-required index, switch to Mongoose `new Template(...).save({validateBeforeSave: false})`. The test assertions themselves depend only on `{designer, createdOn, archived}`.

### Feedback channel decision

Phase 1.4 will collapse to a one-liner or a small endpoint once a channel is decided. See `BD_WEBFLOW_CREATOR_DASHBOARD_PHASE_2_BRIEFS.md` (this same set) if that conversation happens alongside the Phase 2 product calls.

## Phase 2: Blocked on product

Three remaining parity items each require a product decision before engineering. Briefs for each are in `BD_WEBFLOW_CREATOR_DASHBOARD_PHASE_2_BRIEFS.md`.

| Item | Blocker | Eng scope once unblocked |
|---|---|---|
| 2.1 Multi-image upload (creator-side) | Does the Marketplace team accept creator self-service editing of template thumbnails/carousel images post-approval? | 3 days creator-side + ~1 week review-flow coordination |
| 2.2 MarketplaceInsights | Does Marketplace Product approve showing leaderboard + trending + competition data to creators? | ~2 weeks (includes nightly materialized view) |
| 2.3 Template versioning | Does Marketplace commit to creator self-serve template drafts with review history? | 3–4 weeks (schema + review-flow rewrite) |

## Commit handoff

Phase 1 is preserved in the bd-webflow working tree. These changes should land through bd-webflow's normal PR process — not force-pushed. Suggested breakdown:

1. One PR: SubmissionTracker (server + client + tests + route wiring).
2. One PR: App version history UI (client-only, uses existing backend).
3. One PR: Analytics primitives (the three components + their test + the AnalyticsPage/SubmissionsPage integration).
4. One PR: Deep-links on app DetailPage to App Analytics + App Development (client-only, tiny).
5. One PR: Telemetry wiring (analytics registry additions + `telemetry.ts` helper + event emissions across surfaces + tests).
6. One PR: Error boundaries on 6 page wrappers.
7. One PR: Chart tooltips on `Sparkline` + `DonutChart`.
8. One PR: Submission quota 90-day trend (server + client + extended tests).
9. One PR: CSV export on Analytics page (pure helpers + button + tests).
10. One PR: A11y pass (progress-bar semantics + donut `<title>` + kinetic `aria-live`).
11. One PR: Keyboard navigation on asset tables (`useTableKeyboardRowProps` + wiring in 3 pages + tests).
12. One PR: Recent-activity timeline on home (`activityFeedUtils` + `RecentActivityCard` + tests).

Each is independent and ships value on its own. PRs 2 and 4 can reasonably combine since they both touch `DetailPage.tsx` and neither has new backend. PRs 7 and 8 can reasonably combine since both touch `Sparkline` / `SubmissionQuotaCard`. PR 5 touches the shared analytics registry — flag that in the PR description so the Analytics/Data team reviews the event names before merge.

## References

- Upstream dashboard: `packages/webflow-dashboard/` in this repo
- Prior CreatorDashboard slice: `entrypoints/dashboard/client/src/pages/Workspaces/CreatorDashboard/` in bd-webflow
- Port-issues manifest: `WEBFLOW_DASHBOARD_PORT_ISSUES.md` in this repo
- Hostname-check fix: `entrypoints/server/routes/api/creatorValidation.ts` in bd-webflow
