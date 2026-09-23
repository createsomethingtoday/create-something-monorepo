# WorkWay visionOS validation package

This is the native-client boundary for WorkWay’s Threshold Dwelling spatial package. It is deliberately a Swift package, not a claim that a Vision Pro client has shipped.

## What is proved locally

- Swift decodes a bundled `workway.spatial-package.v1` fixture with source documents excluded and `constructionReady: false`.
- The kitchen contract retains its exact 180 in × 156 in dimensions, converting to 4.572 m × 3.9624 m only at the Apple-rendering edge.
- The bundled fixture carries 58 review-only openings, furnishings, plumbing, HVAC, electrical, life-safety, and shading markers. They are nominal experience proxies, never an equipment schedule, routing model, or construction release.
- A RealityKit primitive room guide can be eligible from that verified contract.
- A content-addressed USDZ of the same design-intent massing is issued after strict Apple RealityKit validation and a local macOS RealityKit load. Plain USD remains unissued.
- The issued USDZ does not alter the blocked physical-scene gate, the horizontal-only truth boundary, or `constructionReady: false`.

Run the portable contract proof:

```bash
cd apps/workway-visionos
swift run WorkWaySpatialContractVerifier
```

When the Canon outfitting contract changes, regenerate the client-safe Swift fixture before running that proof:

```bash
pnpm --filter @create-something/space generate:threshold-spatial-fixture
```

The Space contract test enforces exact JSON contract parity between that generated fixture and the native projection.

## RealityKit adapter

`WorkWayRealityKitAdapter` contains `WorkWayRoomChapterRealityView`, a visionOS-only `RealityView` adapter. It makes a thin floor footprint from the room’s deterministic dimensions in meters. It intentionally does not load an asset, track a room, or expose global free walking.

## Launchable simulator app

`WorkWayVisionOSApp` is the smallest native app bundle that proves the issued
design-intent asset can be admitted by a real visionOS window:

- It starts in a normal SwiftUI window, not an immersive space.
- It accepts only the issued `native-massing-usdz` representation for the
  selected kitchen chapter.
- It requires the package contract to be valid, source documents excluded,
  construction readiness false, physical 1:1 eligibility false, plain USD
  unissued, and the bundled USDZ SHA-256 to match the spatial package.
- It loads the entity asynchronously into `RealityView` and applies a
  deterministic **1:50 tabletop display transform**. That transform is only
  how the native client frames this design-intent massing; it never changes the
  canonical geometry or makes a physical 1:1 claim.

Run it against a booted Apple Vision Pro Simulator:

```bash
cd apps/workway-visionos
./scripts/run-visionos-app.sh
```

The simulator app bundle uses the local `WorkWaySpatialContract` package
directly and copies the issued USDZ into the app bundle. It does not fetch
private files, source documents, a cloud model, or an unissued USD asset.

The intended Vision Pro launch sequence is:

1. Begin in a normal SwiftUI window with the tabletop/project controls.
2. Open one selected room chapter in a `RealityView` volume or immersive space.
3. Render the contract-driven primitive guide first.
4. Permit only the matching, explicitly issued USDZ design-intent asset to load.
5. Keep project decisions, proposals, and construction determinations in WorkWay’s revisioned graph, not in the headset.

Apple describes `RealityView` as the SwiftUI container for RealityKit content and supports adding entities directly to it. Apple also recommends starting with familiar windows and adding volumes or immersive spaces as the experience earns them. See [RealityView](https://developer.apple.com/documentation/realitykit/realityview) and [visionOS app construction](https://developer.apple.com/documentation/visionos).

## Current native-validation gate

This Mac has Xcode 26.6, the visionOS 26.5 Simulator runtime, and full local
Apple USD/RealityKit tooling. The issued USDZ passes `usdchecker --arkit
--strict` and loads through local macOS RealityKit.

Run the reproducible Simulator SDK compile check:

```bash
cd apps/workway-visionos
./scripts/check-visionos-simulator.sh
```

It compiles the public `WorkWayRealityKitAdapter` target against the installed
`xrsimulator` SDK. The launchable app performs the rendering proof separately.
The macOS-only `WorkWaySpatialContractVerifier` remains the portable
fixture/contract proof; the app target owns simulator rendering.

The remaining gates are intentionally **not claimed**:

| Gate | Evidence required |
| --- | --- |
| RealityKit compile | Passed locally: both `WorkWayRealityKitAdapter` and `WorkWayVisionOSApp` compile against the installed visionOS Simulator SDK. |
| Simulator render | Passed locally: a booted Apple Vision Pro Simulator installed and launched `WorkWayVisionOSApp`; RealityKit recorded a successful asynchronous USDZ entity load after SHA-256 and contract gates. |
| Device interaction | Physical Vision Pro: inspect scale, gestures, comfort, occlusion, and session recovery. |
| Shared spatial alignment | Two Vision Pros with the selected Apple collaboration approach; verify state/anchor consistency and failure recovery. |

The local result was built with Xcode 26.6 and visionOS 26.5 Simulator. A
simulator result remains separate from physical-device evidence.
