# WorkWay Spatial Package MVP

## Outcome

Deliver a local, auditable WorkWay spatial-package MVP for the Threshold Dwelling Rev 0.8 proposal. A user on this Mac must be able to use a browser preview to move from a tabletop model into a one-to-one room chapter, use a portal to reach an adjacent chapter, and add a shared-session annotation. Every visible state must come from a versioned package derived from the canonical project revision.

The outcome is a product proof, not a construction document, a public deployment, a Vision Pro application, or an assertion that headset tracking is survey-grade.

## Baseline

- `packages/workway-core` is a Rust deterministic project/evidence kernel. It currently validates integer-inch zones and professional-review gates; it has no spatial-package contract, scene compiler, or client renderer.
- The Threshold Dwelling has a preserved Rev 0.7 candidate and a derived Rev 0.8 living-system proposal in Canon. Its deterministic 2D plan projection is available to the render pipeline.
- `packages/space` is a SvelteKit app suitable for a local preview but has no WorkWay spatial walkthrough route.
- A real local browser is available through `npx --package @playwright/cli playwright-cli`; its about:blank open/snapshot/close cycle passed on 2026-08-13.
- Vision Pro and a native Swift/RealityKit client are not available for this goal. Native spatial verification is explicitly deferred.
- The public-room image from the preceding render attempt is retained only as `threshold-dwelling-rev-0.8-public-room-hero-v1`: its SHA-256 is checked in the render-pipeline contract test, it is marked `proposed-design-visualization`, and `constructionReady` remains false.

## Constraints

- WorkWay's project graph is authoritative. Render representations, scene chunks, thumbnails, and client cache files are derived artifacts.
- Operations represent semantic changes such as `MoveWall`, `SetMaterial`, `EnterSpace`, and `CreateAnnotation`; an agent must not directly author final mesh truth.
- Private source documents, original uploads, and unrestricted extracted text must never be included in a client spatial package or browser preview.
- The browser preview must not duplicate or silently mutate Canon geometry.
- Keep one-to-one dimensional meaning within a selected room chapter. Do not simulate free walking through the entire house in a bounded physical room.
- No public route, deploy, external account change, permit submission, paid rendering call, or private-document ingestion without explicit user approval.
- Rust owns deterministic contract validation. TypeScript/Svelte owns the current preview. Swift/RealityKit and Vision Pro remain a later client implementation.

## Required MVP Package

The validated package must identify a project and source revision; declare its derived scene revision; map semantic entities to client render entities; expose room chapters, portals, and safe physical-stage guidance; carry material/asset and validation receipts; and reject private-source references from its client-safe surface.

The first concrete fixture is Threshold Dwelling Rev 0.8. It may use deterministic SVG/PNG scene projection in the browser preview. The package must explicitly declare USD/USDZ capability as unissued rather than pretending it has shipped a native spatial asset.

## Primary Verifier: Local Browser Walkthrough

Surface: `packages/space` development build at a local loopback URL, operated on this Mac through Playwright CLI from a clean browser session.

Required flow:

1. Open the walkthrough in tabletop mode and read the active package/project/revision.
2. Enter the Kitchen chapter from the tabletop.
3. Observe a one-to-one room-chapter state, its safe-stage guidance, and a clear route to Dining.
4. Traverse the Kitchen-to-Dining portal and observe revision-stable shared state.
5. Create an annotation and observe its immutable operation identifier in the session timeline.
6. Return to tabletop mode, reload, and confirm that the immutable package identity remains visible while the ephemeral local session is reset or explicitly restored according to the documented contract.

Pass evidence: fresh Playwright snapshots and screenshots under `output/playwright/workway-spatial-package-mvp/`, plus a browser console readback with no page-owned errors.

## Supporting Verification

- `cargo fmt --check`, `cargo test`, and `cargo clippy --all-targets -- -D warnings` in `packages/workway-core`.
- Schema/contract tests reject mismatched revisions, duplicate entity IDs, unsafe private-source paths, invalid portals, and a false `constructionReady` value.
- The relevant Canon/space tests, `pnpm --filter @create-something/space check`, and `pnpm --filter @create-something/space build` pass.
- `git diff --check` passes. The artifact receipt hash matches the retained image only if that exploratory image is promoted into the package.

## Iteration Loop

Inspect one failed contract or walkthrough transition, make one bounded change, run the closest verifier, record the result in `plan.md`, and choose the next action from evidence. Do not weaken a check or replace the real browser flow with a static screenshot.

## Anti-Cheating Rules

- No hard-coded room state in the Svelte route that bypasses the validated package.
- No second geometry source copied into the preview.
- No mocked success in place of the actual tabletop-to-room-to-portal interaction.
- No conversion of a package-validation pass into a claim of code compliance, build readiness, or spatial safety.
- No use of the existing generated hero image as evidence of construction detail or project completion.

## Approval Gates

- User approval is required for public deployment, a public route/link, external publishing, paid/cloud rendering, new hardware purchase, private-document upload/ingestion, or a real Apple-device test using customer/project data.
- A native Vision Pro phase requires Xcode/visionOS availability and a real-device or simulator verification plan; it is outside this goal.

## Blocker Standard

Block only on a persistent external capability or authority gap that prevents the declared local browser verifier. Record the exact failed command/capability and the smallest next action. A missing Vision Pro is not a blocker to this local preview objective.

## Completion Proof

Before marking the goal complete, all plan phases must be complete and the result must include:

- validated package/schema and fixture paths;
- Rust and TypeScript command output showing all declared checks pass;
- the local browser URL, reproducible Playwright workflow, fresh snapshot/screenshot paths, and no-page-error readback;
- a concise distinction between the locally proven web preview and deferred native Vision Pro validation;
- commit and worktree disposition evidence, without deploying publicly.

Companion plan: [plan.md](plan.md)

## Evidence Record — 2026-08-13

- Rust package contract: `packages/workway-core/src/spatial_package.rs`; schema: `packages/workway-core/schemas/spatial-package.v1.schema.json`; fixture tests reject private/PDF asset paths, revision drift, duplicate render entities, invalid portals, and construction-ready claims.
- Browser package projection: `packages/space/src/lib/workway/threshold-dwelling-spatial-package.ts`. It derives dimensions from Canon Rev 0.8, declares SVG/PNG assets by verified hash, and declares USD/USDZ as unissued.
- Local-only surface: `packages/space/src/routes/workway/threshold-dwelling/+page.svelte`. The route operates only when SvelteKit is in development mode; its production build presents an unavailable boundary rather than exposing the walkthrough.
- Browser proof: `pnpm --filter @create-something/space dev` at `http://localhost:5173/workway/threshold-dwelling`; screenshots are excluded local evidence in `output/playwright/workway-spatial-package-mvp/`. The tested transition was tabletop → Kitchen → Dining portal → annotation `threshold-dwelling-r08-spatial-package:0.8:annotation:0001` → tabletop → reload; reload retained package identity and reset session-only annotations. Playwright console readback: 0 errors, 0 warnings.
- Production-boundary proof: a local production build served at `http://127.0.0.1:4175/workway/threshold-dwelling` rendered only the unavailable boundary and produced 0 console errors/warnings. No deployment occurred.
- Native Vision Pro/RealityKit, real-device collaboration, survey-grade measurement, construction authorization, and public deployment remain outside this goal.
