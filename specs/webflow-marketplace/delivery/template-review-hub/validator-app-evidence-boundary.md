# Validator App Evidence Boundary And Submission Contract

**Status:** Draft
**Date:** 2026-05-27
**Related artifacts:** `review-lane-contracts.md`, `review-orchestration-model.md`, `ai-native-review-standardization-spec.md`, `published-site-sandbox-lane.md`

## Decision

Make the Webflow Validation app a required submission-contract step for new
templates. The submitted asset should include the injected Validator script, and
the review system should verify that script on submission.

Script presence is first-class requirement evidence once the requirement is
active. Detailed Validator findings are first-class review evidence only when
the app run writes a stable, policy-versioned artifact to the review ledger or
R2.

The current app already requests the review bridge and can inject the script.
Marketplace enforcement now has a first implementation path: the template
submission form checks the published review surface for the bridge and confirms a
latest persisted Validator result before allowing submission when the policy is
enabled.

## Current Role

The Validator app can be used for:

- submission-contract enforcement through injected script presence
- creator self-service guidance
- reviewer-assisted inspection inside Designer
- corroborating screenshots or reports when already available
- debugging rule coverage and false positives
- explaining objective issues in a creator-facing way

The Validator app must not be used for:

- automatic rejection
- final rating
- app-result hard-blocker evidence when no persisted result artifact exists
- penalizing legacy submissions before the requirement is active
- assuming Designer metadata is available for all submissions

## First-Class Evidence Levels

### 1. Script Presence Requirement

When the Validator requirement is active for a submission, the review system may
emit a first-class submission requirement finding if the script is missing.

The checker should validate:

- expected marker/config object presence
- allowed script source or script hash
- script version when available
- submitted asset or published review URL inspected
- timestamp and policy snapshot

Do not store or expose raw bridge tokens. A token may be required for runtime
connectivity, but the review artifact should only record token presence,
redacted hash, or equivalent non-secret provenance.

### 2. Validator Result Findings

Promote Validator app output only after all of the following are true:

1. The script presence requirement is active and validated for the submitted
   asset.
2. Validation runs in the background or through the enforced submission step,
   without relying on manual reviewer or creator action.
3. Output is written to the review ledger or R2 with a stable artifact ID,
   timestamp, template URL, site/project identifier when available, rule catalog
   version, and provenance.
4. Rule IDs map to the same policy snapshot used by the coordinator.
5. Missing output is represented as `validator_app_unavailable`, not as a
   template defect.
6. Findings are calibrated against approved, rejected, and changes-requested
   outcomes before they can create first-class blockers.

## Access Contract Shape

The intended promotion path is to make validation part of the submitted asset
flow, likely through the Webflow Cloud App template form. In that model, the
creator or submission system validates the exact submitted asset before review,
and the review agent receives either:

- script-presence evidence, which proves the app requirement was followed
- a persisted validation-result artifact, which can support objective findings

Current implementation details:

- the Webflow Cloud template submission form owns the preflight gate
- the first enforced surface is the submitted `*.webflow.io` published URL
- the form checks both bridge presence and `/app-validator/submission/latest`
- latest Validator status can be looked up by `siteId` when the bridge includes
  it, or by SHA-256 bridge-token hash for older snippets
- missing bridge, missing result, failed result, and validator-unavailable states
  are returned separately
- creators are sent to the Asset Dashboard Validator to install/run the app,
  publish, and validate again

Details still to codify:

- how the latest Validator artifact is linked to the Airtable Asset Version
- which rule catalog version and policy snapshot the form should expose in the
  persisted review ledger
- when warnings should become blocking versus allowed under a 100% category-pass
  result

## Current First-Class Lanes

Before the Validator requirement is enabled for a submission, first-class review
evidence should come from:

- Airtable Assets and Asset Versions for operational status and historical
  feedback context
- agent-controlled published-site sandbox runs
- raw published HTML, CSS, JS, network, and asset evidence
- screenshot and visual proxy artifacts captured by the review system
- future Designer metadata only when access is guaranteed by the submission
  workflow or a server-side integration

After the Validator requirement is enabled, add:

- Validator script-presence requirement checks on the submitted asset or
  published review surface
- persisted Validator result artifacts when available through the required
  submission flow

## Result Artifact Normalization

Persisted Validator app results should be normalized before they reach the
coordinator. The current normalizer accepts direct app output,
`/app-validator/submit` payloads, review-status responses with `result`, or
enhanced worker analysis, then writes:

- `validator-app-results-normalized.json`
- `validator-app-results-findings.jsonl`
- `validator-app-results-ledger-import.sql`
- `validator-app-results-artifact-manifest.json`

Normalized findings may support objective issue review, but they still must not
emit approval, rejection, quality bands, or creator-facing feedback. Script
presence and result findings remain separate artifacts.

The validation worker supports optional R2 persistence for `/app-validator/submit`
through the `VALIDATOR_RESULT_ARTIFACTS` bucket binding, with
`VALIDATION_RESULT_ARTIFACTS` as a compatibility alias. If neither binding is
configured, submission still succeeds and the response marks
`artifact.persisted: false` with `reason: "r2_not_configured"`.

## Handling Validator App Artifacts

When script presence is checked, store it as a submission-contract artifact:

```json
{
  "source": "validator_app_submission_contract",
  "policy_state": "enabled_for_new_submission",
  "script_presence": "present",
  "decision_weight": "submission_requirement",
  "raw_bridge_token_stored": false
}
```

When the script is missing after the policy is active, store:

```json
{
  "source": "validator_app_submission_contract",
  "policy_state": "enabled_for_new_submission",
  "script_presence": "missing",
  "status": "requirement_finding",
  "template_penalty": true,
  "final_decision_owner": "human_reviewer"
}
```

When only a manual Validator report or screenshot is available, store it as a
supplemental artifact:

```json
{
  "source": "validator_app_supplemental_results",
  "availability": "manual_report_available",
  "decision_weight": "supporting_only",
  "may_support": ["creator_guidance", "manual_review_focus"],
  "must_not_support": ["automatic_rejection", "final_rating"]
}
```

## Product Implication

The product work is an access contract, not more reviewer prompting. The
submission flow should require the Validator app script and should ideally write
the validation result artifact through a stable API or storage convention.
