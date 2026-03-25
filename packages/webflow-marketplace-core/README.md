# Webflow Marketplace Core

Shared Marketplace domain contracts for hosted apps, MCPs, extensions, and automation surfaces.

## Purpose

This package is the dependency boundary for Marketplace-wide logic that should not live inside a single app surface:

- submission statuses
- retry policy defaults
- surface descriptors
- shared configuration values

The goal is to let:

- `apps/webflow-app-form-cloud`
- `apps/webflow-dashboard-cloud`
- Webflow MCP packages
- Designer Extension packages
- Marketplace automation workers

depend on the same core vocabulary without importing app-internal modules.

## Current Exports

- `MARKETPLACE_SUBMISSION_STATUSES`
- `MARKETPLACE_SUBMISSION_STATUS`
- `MarketplaceSubmissionStatus`
- `MARKETPLACE_RETRY_POLICY`
- `MARKETPLACE_TEMPLATE_SUBMISSION_POLICY`
- `canRetrySubmission`
- `needsManualReview`
- `isMarketplaceSubmissionStatus`
- `calculateMarketplaceWarningLevel`
- `calculateRemainingSubmissionSlots`
- `isMarketplaceTemplateActiveReviewStatus`
- `TEMPLATE_REVIEW_QUEUE_STATUSES`
- `TEMPLATE_REVIEW_STATUS_OPTIONS`
- `REVIEWER_CONTROLLED_TEMPLATE_REVIEW_STATUS_OPTIONS`
- `normalizeTemplateReviewQueueStatus`
- `APP_REVIEW_QUEUE_STATUSES`
- `APP_REVIEW_STATUS_OPTIONS`
- `APP_REVIEW_REVIEWER_CONTROLLED_STATUS_OPTIONS`
- `APP_REVIEW_REQUEST_CHANGES_STATUS_OPTIONS`
- `normalizeAppReviewQueueStatus`
- `MARKETPLACE_SURFACES`
- `MARKETPLACE_SURFACE_TYPES`
- `MARKETPLACE_SURFACE_IDS`
- `MarketplaceSurfaceId`
- `MarketplaceSurfaceType`
- `MarketplaceSurfaceDescriptor`
