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

- `CRE-1756`, `/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1756-agent-worktree`, `codex/CRE-1756-agent-worktree`; integrated the verified spatial baseline as merge commit `7b170449e`.
- Added `packages/workway-core/src/project_graph.rs` and `tests/project_graph.rs`. The fixture carries nine semantic entities and nine intentionally missing evidence records. The final Rust verifier set has 18 passing tests.

## Phase 2: Deterministic Composer operations and validation

Status: complete

Implementation

- [x] Define typed fixture/clearance and material-role operations; exclude direct mesh edits.
- [x] Add deterministic preconditions, deltas, validation findings, proposal identity, decision state, and lineage.
- [x] Add a bounded intent adapter; unsupported/ambiguous/unissued intent blocks.
- [x] Emit the bounded, client-safe Composer contract from Rust and protect the checked-in browser projection with an exact-parity test.

Verification

- [x] Rust tests prove valid operation → stable consequences; invalid/unissued → stable blocked result; proposed cannot mutate truth or become accepted without a receipt.

Exit criteria

- [x] The Composer can explain intent, operation, validation, and tradeoffs without probabilistic geometry.

Evidence

- Added `packages/workway-core/src/composer.rs`, `src/bin/emit_threshold_dwelling_composer_contract.rs`, and `tests/composer.rs`. The kernel recognizes the exact kitchen-island and exterior-concrete-role requests; it returns typed operations and deterministic measurements, while unsupported intent and exterior floor-to-ceiling glass remain blocked. The JSON contract contains no raw geometry, private evidence, or construction authority. `cargo fmt --check`, Clippy, and `cargo test` pass with 18 tests, including the checked-in browser-contract parity test.

## Phase 3: Browser integration

Status: complete

Implementation

- [x] Project the Rust-generated Composer contract into Space without proposal or policy duplication.
- [x] Add Composer review, accept/reject receipts, and blocked distinction while retaining current tabletop/3D/chapters.

Verification

- [x] Relevant tests and `pnpm --filter @create-something/space check` pass without publicly exposing the local route.

Exit criteria

- [x] UI only presents a contract-backed proposal; local decisions still do not mutate canonical geometry.

Evidence

- `packages/space/src/lib/workway/threshold-dwelling-composer-contract.json` is emitted by the Rust binary, and its freshness is enforced by `workway-core/tests/composer.rs`.
- The Space adapter maps only the generated `moveEntity` and `setMaterialRole` operations to its client projection. It verifies revision/package identity, deterministic validation, professional-review requirement, and `constructionReady: false` before showing a proposal. `pnpm --filter @create-something/space check` passed with 19 WorkWay tests.

## Phase 4: Derived delivery artifacts

Status: complete

Implementation

- [x] Keep SVG/PNG/GLB content-addressed to graph revision.
- [x] Evaluate locally available OpenUSD tooling; preserve explicit unissued state rather than generate an unsupported delivery claim.
- [x] Keep Swift parity declarative unless a native runtime is actually verified.

Verification

- [x] Package/hash/preflight tests distinguish shipped assets from capability declarations.

Exit criteria

- [x] Delivery artifacts never outrun their evidence.

Evidence

- `pnpm --filter @create-something/render-pipeline test:threshold-massing-glb` passed two checks for the deterministic GLB and its checked-in artifact parity.
- `usdcat` and `usdzip` are installed locally, but no USD/USDZ was issued because vertical/opening/site/structure/MEP evidence remains missing. `swift run --package-path apps/workway-visionos WorkWaySpatialContractVerifier` passed and reported the same unissued native formats; no simulator/device claim is made.

## Phase 5: Real local interaction verifier

Status: complete

Implementation

- [x] Run clean route → proposed/accepted → reload → blocked flow and capture browser evidence.

Verification

- [x] Snapshot/readback, receipt boundary, and no page-owned console errors.

Exit criteria

- [x] The rendered experience proves the same review authority as the contracts.

Evidence

- Local browser route `http://localhost:5175/workway/threshold-dwelling` showed the Rust-contract-backed kitchen proposal, `kitchen-island → 4 in south`, 38 → 42 inch target clearance, deterministic zero-issue validation, and local acceptance. The receipt ID was `threshold-dwelling-r08-spatial-package:0.8:proposal-decision:accepted:0001`.
- Reload preserved package identity but reset local session operations as declared. The exterior floor-to-ceiling glass request returned `window-and-glass-opening-geometry-unissued` without creating a proposal. Browser console errors: `[]`. Capture SHA-256: `9007028ef13e7d80f26c5f396561f20d76dfc785430593fef9e82fb1a324b4c7`.

## Phase 6: Truthful closeout

Status: complete

Implementation

- [x] Preserve proof and list remaining authority/hardware/collaboration/release gates.
- [x] Commit scoped implementation; preserve worktree disposition and record Linear evidence.

Verification

- [x] `git diff --check` plus the declared Rust, Space, GLB, and Swift checks pass; goal completion proof is populated.

Exit criteria

- [x] Local pilot reproducible; limits clearer than claims.

Evidence

- Scoped implementation commit: `3439fd5b4 feat(workway): derive browser composer contract from rust`.
- Worktree disposition: preserved at `/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1756-agent-worktree` on `codex/CRE-1756-agent-worktree` pending normal review/promotion. No push, PR, deployment, private-document ingestion, cloud call, or external project-data mutation occurred.
- Remaining gates: accepted revision-specific site/vertical/opening/structure/MEP/energy/jurisdiction evidence plus qualified review; issued USD/USDZ and Xcode visionOS simulator/device validation; authenticated multi-participant collaboration verification; and explicit user approval for any public release, project-data ingestion, paid/cloud processing, or external write.
