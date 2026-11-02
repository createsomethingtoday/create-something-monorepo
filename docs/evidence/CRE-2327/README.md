# CRE-2327 workflow discovery qualification

Acceptance: discover bounded source-backed repository procedures; compile approval-required review candidates without executing scripts; optionally use sanitized local history signals; repair only owned derived artifacts; preserve last good output when sources/history fail; deploy the scheduled internal loop through normal review and verify a real Actions run and downloaded artifact.

## Local evidence

Pinned Node 22.23.4 and pnpm 9.15.0. `pnpm workflow:discover:test` builds the existing compiler and passes 26 tests. Scanner and history collector tests first failed on missing implementation, then passed. Fault tests demonstrate tamper/missing-file detection, one repair, source preservation, lock rejection, output ownership/symlink boundaries, capacity deferral, and last-good retention on invalid sources/history. CLI subprocess tests exercise actual compiler output and nonzero verification failure.

Actual repository scan: 163 manifests, 2 canonical workflow definitions, 55 GitHub workflow files. It proposed 186 procedures, emitted 64 candidates, and explicitly deferred 122. Both existing canonical workflows compiled. Source scripts were not executed; source/policy/runtime activation mutations were zero. Exact source hashes and pointers are in the generated catalog. Counts are a checkout snapshot, not a permanent inventory guarantee.

A real local CTX pass retrieved at most 12 hash-only event references across three fixed query patterns with refresh disabled. The integrated run accepted the private history file and independently verified generated artifacts. Only aggregate counts and hashes reach the catalog. Private files, identifiers, transcripts, and local artifacts are excluded from this evidence commit. CTX retrieval does not establish successful outcomes or complete history coverage.

Independent Sol 6.1 review reran all 26 tests and scanned the actual checkout into a separate output. It inspected all 100 generated actions as approval-required decisions, independently detected tampering and verified one repair, and verified invalid history preserved the last good pointer. No blocking findings. This review did not exercise live CTX or GitHub Actions.

## Gates at PR preparation

- Functional correctness: passed locally, including actual checkout scan and bounded local CTX retrieval. Customer and Control runtime execution are not exercised.
- Perceptual/product quality: passed for CLI/catalog/documentation clarity under independent review; graphical/audio quality is not applicable.
- Release readiness: pending normal PR checks/review, merge, default-branch dispatch, and downloaded-artifact verification. YAML and local tests alone do not prove deployment.

The deployment target is the repository's internal GitHub Actions workflow. Every runner starts with fresh output; repair across scheduled runs is not claimed. Candidate compiler bundles are unreviewed artifacts, not runtime registrations. Customer activation and the draft Control graph runtime remain separate. Rollback: disable the workflow schedule and retain the last verified artifact; no business/runtime activation needs reversal.

Worktree disposition: retained at `/tmp/cre-2327-workflow-discovery` on `codex/cre-2327-workflow-discovery` until deployed-run acceptance and closeout.

## PR review corrections

Both automated P2 findings were reproduced with failing regression checks, then repaired. The current pointer is now version 2 and binds the artifact-manifest digest as well as the catalog digest. Replacing a compiled candidate and recomputing the self-hashed manifest fails against the current pointer. This is an internal integrity check; replacing the entire generation and pointer still requires external Actions provenance to detect. Prior version 1 pointers fail verification and regenerate on the next discovery run.

Compiler loading is deferred to generation. A regression test copies the CLI/modules into a fresh tree without any compiler package/build and verifies actual output successfully; history path validation also runs without a compiler import. All 28 tests passed. An actual existing-output migration regenerated once and independently verified successfully with the same catalog digest. The original independent review covered the initial 26-test implementation; these two focused regression fixes and the 28-test rerun were performed by the parent.

The subsequent path-boundary P2 finding was also reproduced red in both generation and private-history collection. Containment now compares the parent path segment (`..` or `..` followed by the platform separator), so children named `..output` and `..private` remain inside the repository and are rejected. New tests cover direct/nested children, ancestor output, and history rejection before CTX access. All 30 tests pass on the pinned toolchain; `git diff --check` passes.
