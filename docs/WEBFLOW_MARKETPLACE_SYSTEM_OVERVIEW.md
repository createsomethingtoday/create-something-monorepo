# Webflow Marketplace System Overview

This document is the canonical operating map for Webflow Marketplace work in this monorepo.

## Purpose

Use this document to understand how Marketplace surfaces fit together across hosted apps, MCPs, Designer Extensions, and deterministic automation.

Pair this with:

- `docs/WEBFLOW_MARKETPLACE_SURFACE_REGISTRY.md`
- `docs/policies/v1/policy.webflow-marketplace-intake-governance.v1.md`
- `packages/webflow-marketplace-core/`

## Three-Tier Mapping

### Database

- submission records and retry state
- Airtable records and workflow endpoints
- file storage for uploaded assets
- app, review, and metrics datasets

### Rules

- `apps/webflow-app-form-cloud`
- `apps/webflow-dashboard-cloud`
- `packages/webflow-mcp`
- `packages/webflow-app-review-mcp`
- `packages/webflow-template-review-mcp`
- `packages/webflow-site-analyzer-mcp`
- `packages/webflow-review`
- `packages/webflow-apps-admin`
- `packages/webflow-automation`

### Policy

- intake governance and source-of-truth boundaries
- eligibility and hard-block validation rules
- reviewer escalation paths
- retry semantics and manual intervention thresholds
- allowed automation boundaries for app, template, and review workflows

## Operating Model

The Marketplace system is not one app. It is a coordinated set of surfaces:

1. Hosted apps collect and expose state to creators or submitters.
2. MCPs provide agent-native tooling for analysis, review, and support operations.
3. App-review and template-review MCPs are reviewer-safe control surfaces and should share Marketplace policy vocabulary.
4. Designer Extensions and admin tools support internal Marketplace operators.
5. Deterministic automation handles sync and workflow steps that should not depend on model reasoning.
6. Policy artifacts define what may block, warn, retry, escalate, or require human review.

## Current Hosted Surfaces

- `apps/webflow-app-form-cloud`: app submission intake for Marketplace apps
- `apps/webflow-dashboard-cloud`: creator dashboard and template-intake flow

## Source-Of-Truth Rules

- Hosted apps own user-facing collection and route behavior for their surfaces.
- Shared business vocabulary should move to `packages/webflow-marketplace-core`.
- Policy decisions belong in `docs/policies/v1/` and must be updated when hard-block rules or ownership boundaries change.
- MCPs and extensions should depend on shared Marketplace contracts rather than app-internal modules.

## Change Discipline

Before changing Marketplace behavior, determine:

1. What user or operator surface is affected
2. Which system is source-of-truth for the rule being changed
3. Whether the change belongs to Database, Rules, or Policy
4. Whether the change must be reflected in `packages/webflow-marketplace-core`
5. Whether the change must be reflected in the surface registry or policy artifacts
