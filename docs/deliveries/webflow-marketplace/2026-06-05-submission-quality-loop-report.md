# Submission Quality Loop Report

**Prepared:** 2026-06-05
**Tier focus:** Automation and Judgment
**Surfaces:** Template submission form, Webflow Way Validator, Asset Dashboard

## Summary

The submission flow now pushes quality checks earlier. Instead of letting creators submit and relying on reviewers to discover preventable issues, the template form requires a Webflow Way Validator pass by default and gives creators a clear recovery path when validation is missing or failing.

After submission, creators are routed to the Asset Dashboard, which becomes the workspace for review status, assets, validation, and marketplace insights.

## Template Form Enforcement

The submission Cloud app documents Validator app preflight as an explicit runtime contract:

- `VALIDATOR_APP_PREFLIGHT_POLICY` defaults to `enforce`.
- `warn` can collect bridge/result evidence without blocking the form.
- `disabled` is the rollback path.
- `VALIDATOR_APP_WORKER_URL` checks the published bridge and latest persisted Validator result.
- `VALIDATOR_APP_INSTALL_URL` routes creators directly to the Webflow Way Validator install action.

Repo links:

- [Submission Cloud README](../../../apps/marketplace-template-submission-cloud/README.md)
- [validator-app.ts](../../../apps/marketplace-template-submission-cloud/lib/intake/validator-app.ts)
- [validate-published-url route](../../../apps/marketplace-template-submission-cloud/app/api/intake/validate-published-url/route.ts)

## Gate Logic

The published URL validation route now runs in this order:

1. Normalize and validate the published URL.
2. Run published-site validation.
3. If that passes, run Validator app submission preflight.
4. Only allow pass if Validator preflight is not required or has passed.
5. Only run analyzer autofill when the published URL and enforced Validator checks pass.

The Validator app preflight confirms:

- bridge config object exists
- expected marker is present
- allowed review script URL is present
- bridge token exists
- latest persisted Validator result exists
- latest result has `score === 100`
- total errors are zero
- failed categories are zero
- at least one category was checked

This is a strong creator-quality gate and a cleaner reviewer intake path.

## Creator Recovery UX

The form shows a Validator recovery panel when the gate fails. The creator-facing steps are:

1. Install the Webflow Way Validator app.
2. Run validation inside Designer.
3. Publish the site after fixes.
4. Return to the submission form and validate again.

Repo link:

- [template-intake.tsx](../../../apps/marketplace-template-submission-cloud/components/template-intake.tsx)

## Asset Dashboard Handoff

After successful submission, the form directs creators to the Asset Dashboard with the following promise:

- review activity
- asset status
- next-submission preparation
- quality tools used by the review team
- marketplace signals where available

Repo link:

- [TemplateSubmissionSuccessPanel](../../../apps/marketplace-template-submission-cloud/components/template-intake.tsx)

## Asset Dashboard Scope

The dashboard app covers:

- public creator intake and template submission flow
- magic-link login and verification
- protected dashboard and marketplace routes
- asset list, detail, edit, and archive flows
- primary, secondary, and carousel image uploads through R2
- profile and API key management
- submission tracking
- marketplace analytics

Repo links:

- [Webflow Dashboard Cloud README](../../../apps/webflow-dashboard-cloud/README.md)
- [Asset list](../../../apps/webflow-dashboard-cloud/components/asset-list.tsx)
- [Marketplace insights page](../../../apps/webflow-dashboard-cloud/app/marketplace/page.tsx)

## Marketplace Insights

The dashboard marketplace route surfaces:

- leaderboard rows
- creator-ranked templates
- category rows
- freshness metadata
- opportunity watchlist
- top templates leaderboard
- category performance
- 30-day sales and revenue fields

This is important for PMs because it makes the creator loop visible after submission. Creators are not only waiting for review; they can see status and market signals.

## Quality Impact

Expected impact:

- fewer preventable review failures entering the queue
- clearer creator instructions before review
- fewer reviewer cycles spent on missing Validator setup
- better traceability from published site to Validator artifact
- stronger creator habit around quality checks before future submissions

## Open Questions

- What percent of submissions currently fail at each preflight status: `bridge_missing`, `result_missing`, `result_failed`, and `validator_app_unavailable`?
- What percent of failed preflights return and later submit successfully?
- How much reviewer time is saved per submission after enforcement?
- Does the Validator app reduce request-changes cycles or time-to-approval?

## PM Recommendation

Treat Validator enforcement plus Dashboard handoff as the strongest near-term quality win. Add a dashboard or report for the preflight funnel so PMs can quantify creator compliance and reviewer-time savings.
