import CryptoKit
import Foundation
import RealityKit
import simd
import SwiftUI
import WorkWaySpatialContract

/// A deliberately small, window-first proof that the native client can admit
/// exactly one issued design-intent asset. It is not an immersive walkthrough,
/// a construction view, or a physical 1:1 scene.
@main
struct WorkWayVisionOSApp: SwiftUI.App {
    var body: some SwiftUI.Scene {
        WindowGroup("WorkWay Spatial") {
            WorkWayKitchenDesignIntentWindow()
        }
        .defaultSize(width: 980, height: 760)
    }
}

@available(visionOS 1.0, *)
private struct WorkWayKitchenDesignIntentWindow: View {
    @State private var scene: WorkWayKitchenDesignIntentScene?
    @State private var loadError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Threshold Dwelling")
                    .font(.largeTitle)
                Text("Kitchen chapter · design-intent tabletop asset")
                    .foregroundStyle(.secondary)
            }

            Group {
                if let scene {
                    RealityView { content in
                        content.add(scene.entity)
                    }
                    .accessibilityLabel("Issued Threshold Dwelling design-intent model")
                    .overlay(alignment: .bottomLeading) {
                        WorkWayDesignIntentBoundaryLabel(scene: scene)
                    }
                } else if let loadError {
                    ContentUnavailableView(
                        "Native asset unavailable",
                        systemImage: "exclamationmark.triangle",
                        description: Text(loadError)
                    )
                } else {
                    ProgressView("Verifying issued design-intent asset…")
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(24)
        .task {
            guard scene == nil, loadError == nil else { return }
            do {
                scene = try await WorkWayKitchenDesignIntentLoader.load()
            } catch {
                loadError = "The local WorkWay package did not admit a spatial asset."
            }
        }
    }
}

@available(visionOS 1.0, *)
private struct WorkWayDesignIntentBoundaryLabel: View {
    let scene: WorkWayKitchenDesignIntentScene

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("\(scene.chapter.widthIn / 12) ft × \(scene.chapter.depthIn / 12) ft kitchen chapter")
                .font(.headline)
            Text("1:50 visualization scale · Revision \(scene.spatialRevision)")
            Text("Source documents excluded")
            Text("Design intent only · not construction or physical 1:1 authorization")
        }
        .font(.caption)
        .padding(12)
        .glassBackgroundEffect()
        .padding(12)
        .accessibilityElement(children: .combine)
    }
}

@available(visionOS 1.0, *)
private struct WorkWayKitchenDesignIntentScene {
    let chapter: WorkWaySpatialPackage.RoomChapter
    let spatialRevision: String
    let entity: Entity
}

@available(visionOS 1.0, *)
@MainActor
private enum WorkWayKitchenDesignIntentLoader {
    private static let issuedAssetID = "native-massing-usdz"
    private static let issuedRepresentationID = "native-usdz"
    private static let issuedAssetFilename = "threshold-dwelling-r08-massing-guide"
    private static let tabletopScale: Float = 1 / 50

    static func load() async throws -> WorkWayKitchenDesignIntentScene {
        let package = try WorkWaySpatialPackage.loadBundledThresholdDwelling()
        guard package.contractIssues.isEmpty,
              package.clientSourceDocuments == "excluded",
              !package.constructionReady
        else {
            throw WorkWayDesignIntentLoadError.invalidSpatialContract
        }

        let preflight = package.realityKitPreflight(for: "kitchen")
        guard let chapter = preflight.chapter,
              preflight.contractIssues.isEmpty,
              preflight.issuedNativeAssetIDs == [issuedAssetID],
              preflight.unissuedNativeFormats == [.usd],
              !preflight.physicalOneToOneSceneEligible
        else {
            throw WorkWayDesignIntentLoadError.assetNotAdmitted
        }

        guard let representation = package.sceneRepresentations.first(where: {
            $0.id == issuedRepresentationID &&
                $0.format == .usdz &&
                $0.status == .available &&
                $0.assetId == issuedAssetID &&
                $0.canonicalRevision == package.canonicalProject.projectRevision &&
                $0.spatialRevision == package.spatialRevision
        }),
        let assetID = representation.assetId,
        let asset = package.assets.first(where: { $0.id == assetID }),
        asset.clientPath.hasSuffix("/\(issuedAssetFilename).usdz"),
        let assetURL = Bundle.main.url(
            forResource: issuedAssetFilename,
            withExtension: "usdz"
        )
        else {
            throw WorkWayDesignIntentLoadError.assetNotAdmitted
        }

        let data = try Data(contentsOf: assetURL)
        let actualHash = SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }
            .joined()
        guard actualHash == asset.sha256.lowercased() else {
            throw WorkWayDesignIntentLoadError.assetHashMismatch
        }

        let model = try await Entity(contentsOf: assetURL)
        let bounds = model.visualBounds(relativeTo: model)
        model.scale = SIMD3(repeating: tabletopScale)
        model.position = SIMD3(
            x: -bounds.center.x * tabletopScale,
            y: -bounds.center.y * tabletopScale,
            z: -bounds.center.z * tabletopScale
        )

        let entity = Entity()
        entity.addChild(model)
        entity.orientation = simd_quatf(
            angle: -.pi / 5,
            axis: SIMD3<Float>(1, 0, 0)
        )
        return WorkWayKitchenDesignIntentScene(
            chapter: chapter,
            spatialRevision: package.spatialRevision,
            entity: entity
        )
    }
}

private enum WorkWayDesignIntentLoadError: Error {
    case invalidSpatialContract
    case assetNotAdmitted
    case assetHashMismatch
}
