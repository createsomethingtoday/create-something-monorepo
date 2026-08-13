#if os(visionOS)
import RealityKit
import SwiftUI
import WorkWaySpatialContract

/// A deliberately modest first RealityKit surface. It renders a local,
/// one-to-one room guide from the validated contract; it does not pretend an
/// unissued USD/USDZ asset is available or create a global free-roam house.
@available(visionOS 1.0, *)
public struct WorkWayRoomChapterRealityView: View {
    private let chapter: WorkWaySpatialPackage.RoomChapter

    public init(chapter: WorkWaySpatialPackage.RoomChapter) {
        self.chapter = chapter
    }

    public var body: some View {
        RealityView { content in
            content.add(WorkWayRoomChapterGuide.makeEntity(for: chapter))
        }
    }
}

@available(visionOS 1.0, *)
public enum WorkWayRoomChapterGuide {
    /// RealityKit uses meters. Contract conversion occurs before entity
    /// creation so the 15 ft × 13 ft kitchen is represented as
    /// 4.572 m × 3.9624 m in the local chapter scene.
    @MainActor
    public static func makeEntity(for chapter: WorkWaySpatialPackage.RoomChapter) -> Entity {
        let root = Entity()
        let floor = ModelEntity(
            mesh: .generateBox(
                size: SIMD3(
                    Float(chapter.widthMeters),
                    0.02,
                    Float(chapter.depthMeters)
                )
            ),
            materials: [SimpleMaterial()]
        )
        floor.position.y = -0.01
        root.addChild(floor)
        return root
    }
}
#endif
