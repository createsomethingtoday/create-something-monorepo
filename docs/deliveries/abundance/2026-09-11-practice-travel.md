# NPG practice travel production slice

Tracking: CRE-1992. This is Phase 1 of the active NPG production goal, not completion of the full sourcing workflow.

The Healthcare MCP tool `estimate_registry_travel` accepts 1–50 unique source NPIs, 1–3 clinic street addresses, a 30/45-minute threshold, and an explicit any/all-clinic requirement. It uses a completed source snapshot and cached practice geocodes, sends only coordinates and opaque IDs to Geocodio, and retains unresolved locations/routes. The output and protected CSV include all selected practices; they are not a complete population search or home commute determination. Clinic addresses are operator-supplied, not independently role-verified.

The API reserves two credits per driving pair with a shared atomic 2,000-credit rolling 26-hour ceiling. This is a project safeguard, not a guarantee about other activity in the Geocodio account. Reservations survive uncertain failures. Saved reports are reused for identical inputs and coordinates for up to 30 days, avoiding repeat driving charges; Census clinic geocoding is still performed. CSV retrieval requires NPG/operator sign-in and the original source snapshot. If source memberships were pruned, the export fails rather than emitting an incomplete file.

## Promotion

1. Run Agency check and Abundance tests, Healthcare MCP test/typecheck, and repository PR gates.
2. Apply Agency migrations 0050_abundance_travel_quota.sql and 0051_abundance_travel_reports.sql; earlier sourcing migrations 0048 and 0049 remain prerequisites.
3. Bind GEOCODIO_API_KEY from Infisical prod /abundance to the Agency production environment. Do not expose it to the MCP client or Dify.
4. Merge through review, deploy Agency through the standard production workflow, deploy Healthcare MCP from the merged source, and verify version 1.4.0.
5. Verify service-authorized POST /api/abundance/healthcare-providers/travel with a source NPI having a matched geocode and an explicitly test-designated public center. Verify repeat cache hit, unchanged reservations, and correct route duration/labels. Verify protected /delivery/abundance/travel.csv?id=<returned-report-id> through NPG sign-in. The report ID is returned by the API; it is not a credential.
6. Refresh the NPG Hub/Dify tool inventory and run the actual recruiter workflow after the pending sign-in handoff.

Rollback: restore prior Agency deployment and Healthcare worker version ae277924-f013-4c27-90a1-e0edcfbaf47d (1.3.0). Additive quota/report tables and unused Agency secret can remain. No source memberships or recruiting evidence are modified by this slice.

## Verification at PR creation

- 93 Abundance tests pass, including SQLite quota concurrency, report reuse, unresolved origins, CSV completeness, auth denial, and secret-safe failures.
- 29 Healthcare MCP tests pass; Agency full check and Healthcare MCP typecheck pass.
- This slice has not yet been deployed or verified through Dify. National geocode backfill, broader NP taxonomy import, confirmed clinic configuration, and population-wide routing remain in the active goal.

Provider contract: https://www.geocod.io/docs/#distance-matrix (verified September 11, 2026).
