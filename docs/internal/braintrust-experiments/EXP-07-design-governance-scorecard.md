# EXP-07 Design Governance Scorecard

Purpose: define the promotion scorecard for cross-property design consistency, drift reduction, and responsive coverage improvements.

## Primary Metric

- `cross_property_design_drift_rate`

Definition:

- total drift violations on governed properties divided by total design-relevant files in scope

Target:

- candidate `<` baseline on holdout properties

## Guardrails

- `responsive_review_coverage_rate` must not decrease
- `mobile_smoke_pass_rate` must not decrease on properties with smoke coverage
- `canon_token_adoption_ratio` must not decrease materially
- no new undocumented property-level design exceptions

## Search Set

- `.agency`
- one additional CREATE SOMETHING property chosen for active remediation

## Holdout Set

- remaining CREATE SOMETHING properties not used during candidate tuning

## Required Evidence

- baseline design-governance audit output
- candidate design-governance audit output
- responsive/mobile smoke evidence for covered properties
- list of reviewed drift findings
- list of explicitly accepted exceptions
- promotion or rejection decision

## Promotion Rule

Promote only when:

1. `cross_property_design_drift_rate` improves on holdout
2. `responsive_review_coverage_rate` does not regress
3. `mobile_smoke_pass_rate` does not regress on covered properties
4. any new visual language is either promoted into `Canon` or documented as an exception

## Notes

This scorecard is intentionally broader than a single screenshot diff. The goal is governed cross-property consistency, not cosmetic sameness.
