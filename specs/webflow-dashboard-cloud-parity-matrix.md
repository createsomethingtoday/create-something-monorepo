# Webflow Dashboard Cloud Parity Matrix

Source of truth: `packages/webflow-dashboard` code inventory as of 2026-03-18.

## MVP

- Auth/session
  - `/login`
  - `/verify`
  - `/api/auth/login`
  - `/api/auth/verify-token`
  - `/api/auth/logout`
  - `/api/auth/check-session`
- Dashboard shell and creator workflow
  - `/dashboard`
  - `/assets/[id]`
  - `AssetsDisplay`
  - `AssetTableRow`
  - `EditAssetModal`
  - `StatusBadge`
  - `SubmissionTracker`
- Asset mutation APIs
  - `/api/assets`
  - `/api/assets/[id]`
  - `/api/assets/[id]/archive`
  - `/api/assets/check-name`
- Upload flows
  - `ImageUploader`
  - `CarouselUploader`
  - `SecondaryThumbnailUploader`
  - `/api/upload`
  - `/api/uploads/[...path]`
- Profile and API keys
  - `/api/profile`
  - `/api/keys`
  - `/api/keys/generate`
  - `/api/keys/revoke`
- Marketplace insights
  - `/marketplace`
  - `/api/analytics/leaderboard`
  - `/api/analytics/categories`
  - Marketplace trend-history enrichment (`trendData`, `trend`, and `changePercent`)
  - Snapshot maintenance (`/api/cron/snapshot` or an equivalent Cloud scheduled job)
  - `MarketplaceInsights`
  - `OverviewStats`
  - `KineticNumber`
  - `DonutChart`
- Operational surface
  - `/api/cron/cleanup`
  - `/api/submission-status`

## Phase 2

- Validation flows
  - `/validation`
  - `/validation/playground`
  - `/api/validation/gsap`
  - `GsapValidationModal`
  - `WebflowWayCard`
- Analytics support APIs not needed for MVP UI
  - `/api/analytics/history`
  - `/api/analytics/requests`
  - `/api/analytics/track`
- Feedback flow
  - `/api/feedback`

## Deferred

- Asset version history and rollback UI
  - `/api/assets/[id]/history`
  - `/api/assets/[id]/versions`
  - `AssetVersionHistory`
  - `VersionComparisonModal`
- Related assets and status-history style enhancements
- Editor/admin-only extras not on the creator-critical path

## Notes

- This matrix intentionally prefers code inventory over repository docs such as `PRODUCTION_READINESS.md` and `FEATURE_PARITY_ANALYSIS.md`, which currently disagree.
- The Webflow Cloud migration target is a new Next.js app, not an in-place SvelteKit conversion.
- Marketplace trend history is part of the creator-critical marketplace surface. Do not promote the Cloud port without either sharing the SvelteKit D1 history reader/writer or explicitly replacing it with an equivalent scheduled snapshot path.
