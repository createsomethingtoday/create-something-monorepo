# Threshold Dwelling Rev 0.8 native asset issuance

## Delivered representation

`native-massing-usdz` is an Apple USDZ delivery of the existing deterministic browser massing guide. It is available only as a **design-intent spatial visualization**.

| Field | Value |
| --- | --- |
| Canonical project revision | `0.7` |
| Spatial revision | `0.8` |
| Source asset | `browser-massing-glb` |
| Source SHA-256 | `1b03a571ec788492b1994792c1349d2b151860f69d01eaef36d05c4584892091` |
| Issued asset | `native-massing-usdz` |
| Client path | `experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.usdz` |
| Issued SHA-256 | `5f2b2ac1f8447ea4b4cbce90ede32de280f0b9833735e3e330fb6a2a2f83aba6` |
| Tooling | Xcode 26.6, Apple USD Tools 0.25.2 |

The package contains the converted USD crate as its sole root layer. It retains the source guide’s role-coded material names and its plan-derived metric geometry. It is not an independently authored BIM, structural, envelope, MEP, energy, or jurisdictional model.

## Native validation receipt

The asset passed both of these local checks on the issuing Mac:

```bash
xcrun usdchecker --arkit --strict \
  packages/space/static/experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.usdz

xcrun swift -e 'import Foundation; import RealityKit; let url = URL(fileURLWithPath: CommandLine.arguments[1]); _ = try Entity.load(contentsOf: url)' \
  packages/space/static/experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.usdz
```

The first command checks Apple RealityKit USDZ compatibility. The second loads the issued asset through the local macOS RealityKit runtime. Neither validates a visionOS app, a Vision Pro simulator, a physical Vision Pro, shared-world anchors, gesture comfort, or a multi-user session.

For Cloudflare Pages delivery, `packages/space/_headers` serves this specific asset as `model/vnd.usdz+zip` with `X-Content-Type-Options: nosniff`. The Vite development server does not apply Pages `_headers` rules, so its local response may not show that production MIME type.

## Truth and safety boundary

This issuance leaves all of the following unchanged:

- `clientSourceDocuments = excluded`;
- `constructionReady = false`;
- physical scene status `blocked-vertical-geometry-unissued`;
- nine outstanding evidence facts, including openings, structural support, MEP, and site datum; and
- `canGeneratePhysicalOneToOneScene = false`.

The only issued native asset is `native-massing-usdz`; plain `native-usd` remains unissued. Any future geometry change must regenerate the USDZ, update its SHA-256 across the Rust, TypeScript, and Swift package projections, and rerun the native validation receipt before release.
