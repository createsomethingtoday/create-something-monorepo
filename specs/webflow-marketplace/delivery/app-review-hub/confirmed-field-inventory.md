# Confirmed Field Inventory

**Status:** Confirmed reviewer input  
**Audience:** Marketplace review lead, Senior Systems Architect, Hub operators  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-11`

## Source

This inventory reflects reviewer field usage as described by Pablo Miranda on `2026-03-11`.

The goal is to distinguish:

- fields the reviewer actually uses in Airtable today
- fields the current MCP schema already covers
- fields that should remain reviewer-facing context only versus broader metadata mutation

## Summary fields

These are top-level queue and status fields reviewers use to understand the current state of a submission:

- `Marketplace status`
- `Latest review status`
- `Days in current review stage`

These align with the current app-review asset queue surface and should remain available in reviewer read context.

## Version fields

These are the submission/version fields Pablo identified as the core review record:

- `Version #`
- `Review Type`
- `Reviewer`
- `Review Status`
- `Submission Datetime`
- `Rejection Reason`
- `Review Feedback`

These align with the current version schema and are the primary future candidate surface for reviewer-owned write actions.

## Basic info / app fields

Reviewer-used app-level context fields:

- `App capabilities`
- `Client ID`
- `App ID`
- `Visibility status`
- `Relationships status`

Notes:

- `Client ID` is present but Pablo noted it is not commonly used.
- `App ID` may be more useful operationally and should remain available in reviewer context where safe.

## Basic info libraries

- `Features Text`

Reviewer note:

- `Features Text` is expected to migrate to a linked-field model later.

Treat that as a likely future schema change, but not a blocker for the current Phase A read-only lane.

## Basic info content

Reviewer-used descriptive fields:

- `App name`
- `Notes`
- `Credentials` (when given)
- `Description (short)`
- `Description (Long)`
- `Install url`
- `Workspace Dashboard Url`

These are useful reviewer context fields, but they should remain outside reviewer-facing metadata mutation during Phase A.

## Categories

- `Categories`

## Imagery

- `Icon image`
- `Icon image alt text`
- `Carousel image`
- `Carousel image alt text`

## Payments

- `Payment times`

Current MCP mapping note:

- the Airtable field is represented through the current schema mapping for payment types

## URLs

- `Demo video URL`
- `Privacy Policy URL`
- `Terms & Conditions URL`
- `Website URL`
- `Support Email/URL`
- `Preview Site URL`
- `Promo Video URL`

## Rollout implications

The confirmed field inventory supports the current rollout posture:

- reviewer read/context lane should expose queue, asset, version, and field-map context
- reviewer write rollout should begin with version review fields, not broad asset metadata mutation
- `app_review_update_asset_metadata` remains too broad for the initial reviewer lane because it covers many content, credential, category, image, and URL fields that go beyond the core review decision workflow

## Current schema alignment

The current `webflow-app-review-mcp` schema already appears to cover the field groups Pablo described:

- queue/status fields
- version review fields
- app identity and visibility context
- content and descriptive metadata
- image/media fields
- URL fields

The main remaining production gap is not field coverage. It is reviewer identity, Hub authz posture, and staged write enablement.
