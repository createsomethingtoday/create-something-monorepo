# WorkWay Authoritative Pilot Plan

Goal: [goal.md](goal.md)

## Phase 1: Authoritative graph and private-evidence boundary

Status: complete

Implementation

- [x] Preserve the Rust/Canon ownership boundary and claim scoped Linear/worktree `CRE-1756`.
- [x] Add Project Graph v1: semantic entities, revision lineage, dimensional truth scope, and immutable evidence references.
- [x] Add a private evidence manifest: opaque IDs, hashes, source class, review status, and safe client projection only.
- [x] Generate a client-safe readiness projection for the Threshold Dwelling fixture.

Verification

- [x] Rust accepts valid graph and rejects duplicate entities, unsafe locators, revision drift, client leakage, and construction-readiness mutation.
- [x] `cargo fmt --check`, `cargo test`, and `cargo clippy --all-targets -- -D warnings` pass.

Exit criteria

- [x] The graph is the authority for semantic entities/evidence/delivery state; a client can determine reviewability without source-file access.

Evidence

- `CRE-1756`, `/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1756-agent-worktree`, `codex/CRE-1756-agent-worktree`; integrated the verified spatial baseline as merge commit `1d54f5f5e`.
- Added `packages/workway-core/src/project_graph.rs` and `tests/project_graph.rs`. The fixture carries nine semantic entities and nine intentionally missing evidence records. `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test` passed: 14 tests total.

## Phase 2: Deterministic Composer operations and validation

Status: in progress

Implementation

- [ ] Define typed fixture/clearance and material-role operations; exclude direct mesh edits.
- [ ] Add deterministic preconditions, deltas, validation findings, proposal identity, decision state, and lineage.
- [ ] Add a bounded intent adapter; unsupported/ambiguous/unissued intent blocks.

Verification

- [ ] Rust tests prove valid operation → stable consequences; invalid/unissued → stable blocked result; proposed cannot mutate truth or become accepted without a receipt.

Exit criteria

- [ ] The Composer can explain intent, operation, validation, and tradeoffs without probabilistic geometry.

Evidence

- Added `packages/workway-core/src/composer.rs` plus `tests/composer.rs`. The reference interpreter accepts one exact island-clearance request, returns the existing typed `MoveEntity` proposal and its deterministic measurements, and records a local-review-only accepted/rejected receipt. Ambiguous intent and an exterior floor-to-ceiling-glass request return blocked results; the latter names the unissued glass-opening fact. `cargo fmt --check`, Clippy, and all 16 Rust tests passed. Material-role operations remain the next Phase 2 slice.

## Phase 3: Browser integration

Status: pending

Implementation

- [ ] Project validated contract into Space without duplicated truth.
- [ ] Add Composer review, accept/reject receipts, and blocked distinction while retaining current tabletop/3D/chapters.

Verification

- [ ] Relevant tests, `pnpm --filter @create-something/space check`, and production build pass without publicly exposing the local route.

Exit criteria

- [ ] UI only presents contract-backed state.

## Phase 4: Derived delivery artifacts

Status: pending

Implementation

- [ ] Keep SVG/PNG/GLB content-addressed to graph revision.
- [ ] Evaluate locally available OpenUSD tooling. Generate only locally validated outputs; otherwise preserve explicit unissued state.
- [ ] Keep Swift parity declarative unless a native runtime is actually verified.

Verification

- [ ] Package/hash/preflight tests distinguish shipped assets from capability declarations.

Exit criteria

- [ ] Delivery artifacts never outrun their evidence.

## Phase 5: Real local interaction verifier

Status: pending

Implementation

- [ ] Run clean route → proposed/accepted/rejected → reload → blocked flow and capture evidence in `output/playwright/workway-authoritative-pilot/`.

Verification

- [ ] Snapshots, screenshots, revision/receipt readback, and no page-owned console errors.

Exit criteria

- [ ] The rendered experience proves the same authority as the contracts.

## Phase 6: Truthful closeout

Status: pending

Implementation

- [ ] Preserve proof, list remaining authority/hardware/collaboration/release gates, commit scope, and record Linear evidence.

Verification

- [ ] `git diff --check` plus all declared checks pass; goal completion proof is fully populated.

Exit criteria

- [ ] Local pilot reproducible; limits clearer than claims.
