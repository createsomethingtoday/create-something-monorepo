## Phase 2 Product Briefs: bd-webflow Creator Dashboard Parity

Date: `2026-04-16`
Status: `Awaiting product decisions`
Paired with: `BD_WEBFLOW_CREATOR_DASHBOARD_PORT_2026-04-16.md`

Three remaining gaps between the external `packages/webflow-dashboard` creator experience and the native bd-webflow Creator Dashboard cannot be closed through engineering alone. Each has a product decision that dictates whether the feature should be built at all, what it should do, and which team owns the downstream work.

Each brief states the decision needed, the proposed scope if the decision is yes, the scope if the decision is no, and the open questions to resolve in the meeting.

## Reuse-first framing

Apps are already covered by native bd-webflow surfaces: `AppDevelopment` hosts create/edit/submission-version workflow with an existing `CreateEditAppModal`, and `AppAnalytics` (`/workspace/:slug/app-development/:appId`) hosts the full time-series `LineChart` + tooltip + summary. Image uploads for apps are part of `AppInfoForm`. Version history for apps was already in the backend and is now surfaced in the Creator Dashboard detail page (Phase 1.2).

This matters for scoping the three briefs below:

- **Multi-image upload** is a **template-only** gap. Apps already handle image uploads natively. This brief should not imply creator-side app image work; that already exists.
- **MarketplaceInsights** splits into two subproblems: (a) *per-asset* time-series — apps already have it in App Analytics, templates/libraries would need it; (b) *cross-asset + competitive* leaderboards — net-new everywhere. The strategic "expose competitive data" question is only part (b).
- **Template versioning** is unchanged; apps have the pattern, templates do not.

The Creator Dashboard detail page (Phase 1.2 + 1.5 deep-links) routes users into those existing surfaces via "View full analytics" and "Manage versions" buttons rather than reimplementing them. Any new work below should prefer the same approach: extend existing surface area before building a parallel one.

---

## 2.1 Multi-image upload (creator-side) — **template-only**

### The gap

The external dashboard lets creators upload carousel images and a secondary thumbnail for their own templates, validated for WebP, aspect ratio (150:199), and a 10MB cap. bd-webflow today exposes equivalent uploads only through admin routes (`/admin/api/templates/:templateid/tall-thumbnail` and `/admin/templates/:templateid/thumbnail`), gated by `middleware.restrictAdminUser`. There is no non-admin path for a creator to replace their own template's imagery.

**Apps are already handled natively.** `AppInfoForm` + `CreateEditAppModal` in `AppDevelopment` let creators manage app icons and marketplace screenshots today. This brief is scoped to templates only.

### Decision needed

Should creators be allowed to self-edit their own template's thumbnail and carousel after initial submission, without an admin action?

### If yes — proposed scope

**Engineering (3 days):**

- New middleware: `server/middleware/loadTemplateForOwner.ts` that verifies `template.workspaceDesigner === user.workspace || template.designer === user._id` (with the legacy-field fallback) or an admin bypass.
- New creator-scoped route file: `server/routes/api/creatorTemplateMedia.ts` with:
  - `POST /api/v1/creator-dashboard/workspace/:workspaceId/templates/:templateId/thumbnail` — `multer` single, WebP-only, aspect-ratio check from decoded bytes, 10MB cap.
  - `POST /api/v1/creator-dashboard/workspace/:workspaceId/templates/:templateId/carousel` — `multer` array, up to 10, same validations.
  - `DELETE /api/v1/creator-dashboard/workspace/:workspaceId/templates/:templateId/carousel/:index`.
- Reuse `setTemplateThumbnailImg` from `lib/logic/templates/`. Add `setTemplateCarouselImage` as a sibling.
- Client components `CarouselUploader.tsx` and `ThumbnailUploader.tsx` in `CreatorDashboard/components/`, rendered on `DetailPage` when the asset is an owned template.

**Review-flow coordination (~1 week, with Marketplace team):**

- Any creator mutation on a live template should set `template.needsReReview = true` (new field) so the moderation pipeline re-queues it.
- Moderation tooling on the admin side needs to surface and clear that flag.

### If no — alternative

Keep the admin-only upload path. Add a "Request thumbnail update" action on the creator DetailPage that opens a pre-filled Zendesk ticket or Airtable form pointing at the admin team. Zero net-new backend.

### Open questions

1. What happens to a live, approved template when a creator swaps the thumbnail? Auto-delisted until re-approval, or live-with-pending-review, or rejected outright?
2. Aspect-ratio changes: today the admin pipeline produces a `tallThumbnailImg` separately. Can the creator upload replace both formats, or only the standard?
3. Rate-limiting: how many thumbnail replacements per creator per day before it looks like abuse?
4. Who owns the moderation cost added by this feature?

### Risk of building without the decision

Ships a feature that either breaks review flow (if `needsReReview` isn't added) or lets creators bypass moderation (if the flag doesn't re-queue). Both are live-site risks, not just rework risks.

---

## 2.2 MarketplaceInsights — two subproblems

### The gap

The external dashboard renders a `MarketplaceInsights` view (~770 lines in the SvelteKit version) with:

- Top-5 templates by installs across the marketplace, with the creator's own templates highlighted.
- Trending categories by install growth.
- Auto-generated insights ("Coffee-shop templates are up 40% week-over-week").
- Competition-level indicators per category.

### What bd-webflow already has

- **Per-asset time-series for apps**: `AppAnalytics/components/AppMetricOverTimeGraphContent.tsx` uses recharts `LineChart` + tooltip + summary. Creators land there from CreatorDashboard's "View full analytics" deep-link (Phase 1.5).
- **Cross-asset portfolio numbers**: Creator Dashboard `AnalyticsPage.tsx` aggregates apps + templates + libraries into summary counters (Phase 1.3, with `KineticNumber` animations).

### The two subproblems

**(a) Per-asset time-series for templates and libraries.** Apps have it; templates/libraries don't. This is a data-availability question, not a strategic one. If bd-webflow already tracks install events per template, the same `AppMetricOverTimeGraph` pattern can be reused; it's engineering work, not policy.

**(b) Cross-asset competitive leaderboard.** Net-new everywhere. This is the strategic call: showing creators aggregate data about other creators' work.

### Decision needed

Two decisions, not one:

1. **(a)** Is there event-level install data for templates/libraries that would support a per-asset trend graph, or does that data need to be captured first?
2. **(b)** Should bd-webflow show creators aggregate competitive data about the marketplace they're selling into?

(2b) is the harder call — exposing "your competitors' install counts" has implications for creator behavior (gaming categories), the Marketplace flywheel (everyone piling into trending niches), and the Marketplace team's ability to hand-curate featured placements.

### If (a) is yes — proposed scope (~1 week)

- Reuse `useGetResourceAnalyticsOverTime` if it already exists for apps; otherwise add a sibling data-access layer for templates and libraries.
- Render the existing `AppMetricOverTimeGraphContent` component (or a thin generalization) inside CreatorDashboard `DetailPage` for templates and libraries.
- No new strategic/competitive data exposed.

### If (b) is yes — proposed scope (~2 weeks)

- Nightly materialized view job: `workers/marketplaceLeaderboardDaily.ts`, writing one document per day to a new `marketplaceLeaderboardDaily` collection with:
  - Top-25 templates by last-30-day installs, overall and per category.
  - Trending categories (install growth week-over-week).
  - Competition-level buckets per category.
- Data-access: `dataAccess/marketplace/leaderboard/getLatestLeaderboard.ts`, `getTrendingCategories.ts`.
- New route: `routes/api/creatorMarketplaceInsights.ts` with two read-only endpoints, rate-limited per user, returning `{asOf, rankings, staleness}`.
- Client: `InsightsPage.tsx` + Wrapper inside `CreatorDashboard/`, highlighting rows where `template.designer === currentUserId`. Reuse `KineticNumber` + `Sparkline` from Phase 1.3.
- Staleness handling: if the job hasn't run in >48h, return a warning in the response and render a banner on the client.

### If no — alternative

Do (a) only if the data exists; skip (b). Creators see their own install/demand trend (native AppAnalytics for apps, extended to templates/libraries), not the competitive field. This is the minimum viable portfolio analytics story and doesn't expose anything new about other creators.

### Open questions

1. **(a)** Does bd-webflow already capture per-template and per-library install events with timestamps sufficient for a trend graph? If not, what's the cost of adding that capture?
2. **(b)** Who sees the leaderboard? All creators? Only creators with at least one published template? Behind a feature flag?
3. **(b)** What aggregation grain is safe? Per-category leaderboards seem fine; per-creator leaderboards might be problematic.
4. **(b)** Time window: 30 days is the dashboard default. bd-webflow might prefer 7 days or a configurable range.
5. **(b)** Attribution model: do installs include internal use, tutorial completions, or only paid/publish installs?
6. **(b)** Do featured templates get a separate shelf, or mix into the leaderboard?

### Risk of building without the decision

(2a) is mostly engineering risk — if install event data is missing, the graph shows empty for templates/libraries, which is better than no graph but worse than the apps experience. Recoverable.

(2b) is the highest-stakes item in the phase. A wrong policy decision here is visible to every paying creator and can distort marketplace behavior. Do not build speculative.

---

## 2.3 Template versioning — draft history, compare, rollback

### The gap

Apps in bd-webflow already support versioned drafts via `getAppVersionHistory` (surfaced in Phase 1.2 as `AppVersionHistoryTimeline` inside the CreatorDashboard detail page). Templates do not — template mutations in `routes/dashboard/admin/templates.ts:176` are admin-only PUTs that mutate the single `Template` document in place. There is no version history, no compare, no rollback.

The external dashboard exposes all three for templates.

**The shipped App version history pattern is the reference implementation.** `versionHistoryUtils.ts` + `AppVersionHistoryTimeline.tsx` (from Phase 1.2) already define the status tones, timeline formatting, and relative-time rendering. If templates adopt versioning, the client-side timeline component reuses verbatim; only the data source changes.

### Decision needed

Should creators be able to produce versioned template drafts with review history, compare successive versions, and roll back — the same way they can for apps today?

This affects data model, review throughput, and moderation load. Review cost roughly doubles: a version pending review is a distinct object from the live version.

### If yes — proposed scope

**Schema (~3 days):**

- New collection `TemplateVersion` with `{templateId, version, status, createdAt, createdBy, snapshot, reviewNotes}`.
- `Template.currentVersionId` FK.
- Migration: for every existing template, backfill one `TemplateVersion` with `status: 'approved', isLive: true`.

**Backend (~1 week):**

- Data-access: `dataAccess/marketplace/templateVersions/` — create, list, get, rollback.
- Logic: `lib/logic/templates/submitTemplateVersion.ts` — sets version status to `'submitted'`, enqueues moderation.
- Route: `routes/api/creatorTemplateVersions.ts` — CRUD + compare + rollback, mirroring the App version pattern.

**Review flow (~1 week, coordinated with Marketplace + Moderation):**

- Admin moderation UI needs to review specific versions, not the whole template.
- Moderation queue needs version-level state transitions.
- Legal/content-policy team needs to confirm this doesn't open a loophole (e.g. swap out approved content after review).

**Client (~3 days):**

- `components/TemplateVersionHistoryTimeline.tsx` parallel to `AppVersionHistoryTimeline` (already shipped in Phase 1.2 — the timeline pattern reuses).
- Compare-versions modal (diff of name, description, thumbnail, features).
- Drop into `DetailPage` for templates.

Total: 3–4 weeks with product/moderation coordination on the critical path.

### If no — alternative

Keep the in-place mutation model. Creators request edits through the admin path (which today is `/admin/api/templates/:id`) or through a Zendesk ticket. This is the current state of the world; the external dashboard's versioning works against Airtable, which is a less stringent review environment.

### Open questions

1. What happens to live installs when a version is rolled back? Do existing `usedCount` and reviews carry over?
2. Draft visibility: can a creator preview a drafted version before submission?
3. Version cap: one draft at a time, or unbounded history?
4. Review latency: how long are creators expected to wait between submitting a version and hearing back?
5. Diff surface: which fields count as "content changes" that require review? Name change? Description change? Thumbnail swap?

### Risk of building without the decision

Second-highest stakes after MarketplaceInsights. Schema decisions here are hard to unwind. Build ordering matters: if the migration runs before the review tooling is updated, every live template becomes ambiguously versioned.

---

## Meeting agenda

Suggested order for a single 45-minute meeting covering all three:

1. **Multi-image upload** (10 min) — decision, review-flow owner, rate-limit policy
2. **Template versioning** (15 min) — biggest downstream cost; decide first whether versioning exists at all, then scope
3. **MarketplaceInsights** (15 min) — strategic policy question, not implementation
4. **Feedback button** (5 min) — which channel receives creator feedback today

Output for each item: `decision` (yes/no/defer), `owner` (engineering PM + product PM), `target ship week` if approved, `follow-up ticket` in Beads.

## Engineering availability

Phase 1 is shipped (uncommitted in bd-webflow working tree). Engineering has the patterns, the middleware stack, the test harness, and the component library in place. Each of these three can start within 24h of a decision.
