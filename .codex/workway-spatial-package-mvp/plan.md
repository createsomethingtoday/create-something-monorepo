# WorkWay Spatial Package MVP Plan

Goal: [goal.md](goal.md)

## Phase 1: Establish the client-safe spatial package contract

Status: complete

Implementation

- [x] Inspect the current Rust/Canon revision boundary and retain a single authoritative geometry source.
- [x] Define a versioned spatial-package contract in `packages/workway-core` with project/revision identity, scene representations, entity mapping, room chapters, portals, safe-stage guidance, and validation receipt fields.
- [x] Add a Threshold Dwelling Rev 0.8 package fixture that declares deterministic browser representations and explicitly marks USD/USDZ as unissued.
- [x] Reject unsafe private-source references, invalid revision references, duplicate entity IDs, invalid portal endpoints, and construction-ready claims in the Rust validator.

Verification

- [x] `cargo fmt --check` passes in `packages/workway-core`.
- [x] `cargo test` passes and demonstrates both valid and rejected package cases.
- [x] `cargo clippy --all-targets -- -D warnings` passes.

Exit criteria

- [x] A client-safe package can be validated independently of any Svelte UI.
- [x] The package cannot silently claim USD/USDZ delivery, construction readiness, or access to private source data.

Evidence: 2026-08-13, `cargo fmt --check`, `cargo test` (9 tests), `cargo clippy --all-targets -- -D warnings`, and `jq empty schemas/spatial-package.v1.schema.json` passed in `packages/workway-core`. Contract: `src/spatial_package.rs`; schema: `schemas/spatial-package.v1.schema.json`; rejection cases: `tests/spatial_package.rs`.

## Phase 2: Materialize the Rev 0.8 walkthrough package

Status: complete

Implementation

- [x] Add a TypeScript projection that derives the preview package from Canon's Rev 0.8 living-system revision without copying plan geometry.
- [x] Define Kitchen, Dining, Living, Arrival, and private-room chapter records with one-to-one semantic dimensions and bounded safe-stage guidance.
- [x] Define explicit portals rather than free-roam/global locomotion.
- [x] Decide whether the parked generated public-room image meets the package receipt criteria; retain it only with a verified hash and non-construction status.

Verification

- [x] Contract tests establish revision parity between the Rust fixture and the TypeScript projection.
- [x] Relevant Canon and render-pipeline tests pass.

Exit criteria

- [x] Tabletop, room, and portal data share one package identity and revision.
- [x] No client package path can resolve a private original source document.

Evidence: `packages/space/src/lib/workway/threshold-dwelling-spatial-package.ts` derives public and private chapter dimensions from Canon's Rev 0.8 modules. Rust and TypeScript fixtures use `threshold-dwelling-r08-spatial-package`, canonical Rev 0.7, spatial Rev 0.8, three hashed local PNG/SVG assets, and unissued USD/USDZ declarations. `pnpm --filter @create-something/canon test -- ...dimensioned-project.test.ts ...interior-infill.test.ts ...living-system-revision.test.ts` passed 13 tests; `pnpm --filter @create-something/render-pipeline test:web-render` passed 7 tests and verifies the retained hero-image hash.

## Phase 3: Build the local Mac/iPad walkthrough preview

Status: complete

Implementation

- [x] Add an unlinked local Svelte route in `packages/space` that loads only the validated package.
- [x] Implement tabletop, room-chapter, portal, and annotation-timeline states.
- [x] Make the room state visibly distinguish a one-to-one chapter from global free roaming.
- [x] Keep session state ephemeral/local unless a later approved persistence policy is added.

Verification

- [x] `pnpm --filter @create-something/space check` passes.
- [x] `pnpm --filter @create-something/space build` passes.
- [x] The route presents the package/revision identity and refuses missing/invalid package state.

Exit criteria

- [x] The local app is runnable with documented start/stop commands.
- [x] UI behavior comes from the package contract rather than a manually duplicated room list.

Evidence: route `packages/space/src/routes/workway/threshold-dwelling/+page.svelte` renders only in local SvelteKit development mode; production renders the unavailable boundary. Run `pnpm --filter @create-something/space dev`, then open `http://localhost:5173/workway/threshold-dwelling`. `pnpm --filter @create-something/space check` passed with 0 Svelte errors/warnings; `pnpm --filter @create-something/space build` passed. A local production preview at `http://127.0.0.1:4175/workway/threshold-dwelling` showed only the unavailable boundary with 0 console errors/warnings.

## Phase 4: Exercise the real browser workflow

Status: complete

Implementation

- [x] Start a clean local `packages/space` server on a documented loopback port.
- [x] Use Playwright CLI to walk tabletop → kitchen → dining portal → annotation → tabletop → reload.
- [x] Capture fresh snapshots/screenshots under `output/playwright/workway-spatial-package-mvp/`.

Verification

- [x] Browser snapshots prove each state transition and visible immutable package/revision identity.
- [x] Console readback contains no page-owned errors.
- [x] Clean reload behavior matches the documented session policy.

Exit criteria

- [x] The primary verifier passes on the actual local rendered surface.
- [x] The recorded evidence lets another operator reproduce the walk-through.

Evidence: Playwright on `http://localhost:5173/workway/threshold-dwelling` captured `01-kitchen-chapter.png`, `02-dining-portal.png`, `03-annotation-timeline.png`, `04-tabletop-return.png`, and `05-reload-reset.png` under `output/playwright/workway-spatial-package-mvp/`. Snapshots show package `threshold-dwelling-r08-spatial-package`, spatial Rev 0.8, Kitchen 15 ft × 13 ft, Dining 13 ft × 13 ft, the Kitchen-to-Dining portal, annotation operation `threshold-dwelling-r08-spatial-package:0.8:annotation:0001`, and post-reload empty timeline. Playwright console: 0 errors, 0 warnings.

## Phase 5: Durable closeout

Status: complete

Implementation

- [x] Re-read this plan and `goal.md`; confirm no user steering changed the outcome.
- [x] Commit only scoped files and record validation and worktree disposition in Linear.
- [x] Do not deploy, publish, or claim native Vision Pro verification.

Verification

- [x] `git diff --check` and all declared validation commands pass.
- [x] Completion proof in `goal.md` is complete.

Exit criteria

- [x] The local preview and package contract are reviewable from a clean worktree state.
- [x] The remaining native Vision Pro phase is accurately identified as a future, separately verified extension.

Evidence: Scoped local commit created; ignored goal artifacts were intentionally force-added so the active goal and plan travel with the implementation. Worktree disposition: preserved at `/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1751-agent-worktree` on `codex/CRE-1751-agent-worktree`. No public deployment, publish, hardware purchase, private-document ingestion, or native Vision Pro claim occurred.
