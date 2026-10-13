# Ground typeof-import and completion follow-up — CRE-2250

Ground0.5.0 rejected valid generic-call typeof-import syntax in an unchanged
package test. The native result correctly reported INCOMPLETE, but the advisory
review adapter recognized only legacy lowercase completion states and could
label uppercase native FAIL as completed. This bounded follow-up prepares0.5.1.

## Repair and compatibility

- Recover only complete single-string import operands beneath typeof, and only
  when a tentative byte-preserving projection reparses into a type query within
  a complete generic call. Original source spans remain the extraction evidence.
  Other syntax errors remain errors; runtime expressions are not rewritten.
  Import options remain outside this narrow recovery, not declared invalid TS.
- Normalize per-check completion from explicit completion and execution evidence.
  Completed FAIL-with-findings stays completed. Missing, unknown, incomplete,
  timed-out or unsupported coverage cannot imply clean analysis. Legacy explicit
  lowercase completion states remain supported; legacy missing evidence becomes
  partial. Advisory process exit behavior and native0/1/2/3 exits are unchanged.
- Preserve raw native outcome/status and diagnostics. A contradictory global
  INCOMPLETE with all-complete checks, or an unknown native contract, downgrades
  the affected target instead of producing clear; other targets retain evidence.
- Add a real native-to-wrapper integration test to existing PR/release checks.
  Existing release provenance, calibration policy and thresholds are unchanged.

## Validation and independent review

Regression-first failures reproduced both the parser and completion defect.
Rust:221 passed,0 failed,2 pre-existing ignored doc examples. Relevant Node
suites including native integration:112 passed,0 failed/skipped. CLI consumer
and release-workflow contracts passed. Seeded, execution, incremental and native
release smoke receipts all ready. Action-pin validation and diff checks passed.

Independent skeptical review exercised runtime-import and malformed-source
negatives and found a contradictory-outcome edge case. The additional regression
and safeguard passed; independent wrapper/native tests53/53 passed. Final review
approved the bounded change with no remaining blockers.

A read-only candidate scan against the unchanged field source now checks184/184
files for duplicates, compared with0/184 before. Two test-fixture duplicate
findings remain review-only. Changed-scope duplicate coverage checks18/18 with
PASS; the two previously reported orphan findings remain present and advisory.
The owning application's source, acceptance and required CI were not altered.
Local receipts are retained by the task rather than uploaded to the blocked
external tracker destination.

## Release and installation plan

This PR prepares0.5.1. After normal required CI and merge, tag the exact merged
source and run the existing governed five-platform release/consumer pipeline.
Verify checksums, npm integrity/source SHA and exact installed behavior in a
separate versioned runtime. Coordinate active users before moving the current
symlink, retaining0.5.0 and0.4.3 rollback installations. No installation/cutover
occurs in this source-review checkpoint. The existing stale enableTelemetry
adoption baseline remains a separate disclosed limitation; it is not weakened
or reclassified by these repairs.

Worktree disposition: retained on codex/ground-typeof-coverage-followup for PR
review and the separately coordinated release checkpoint.
