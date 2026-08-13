import Foundation

/// Swift's client-safe projection of `workway.spatial-package.v1`.
///
/// It preserves delivery identity and dimensional meaning but never owns the
/// authoritative project graph, source documents, or construction authority.
public struct WorkWaySpatialPackage: Codable, Equatable, Sendable {
    public static let schemaVersion = "workway.spatial-package.v1"
    public static let metersPerInch = 0.0254

    public struct CanonicalProject: Codable, Equatable, Sendable {
        public let projectId: String
        public let projectRevision: String
    }

    public struct Asset: Codable, Equatable, Sendable {
        public let id: String
        public let clientPath: String
        public let sha256: String
    }

    /// Deliberately contains role identity only, never product or performance claims.
    public struct MaterialContract: Codable, Equatable, Sendable {
        public let scheduleId: String
        public let materialBindingStatus: String
        public let renderedMaterialIds: [String]
        public let constructionReady: Bool
    }

    /// A renderer-facing truth gate for physical 1:1 vertical scene geometry.
    /// It can make a scene eligible for visualization, never construction.
    public struct PhysicalSceneContract: Codable, Equatable, Sendable {
        public let issuanceId: String
        public let status: String
        public let coordinateTruth: String
        public let clientSourceDocuments: String
        public let unissuedFactIds: [String]
        public let canGeneratePhysicalOneToOneScene: Bool
        public let constructionReady: Bool
    }

    public enum SceneFormat: String, Codable, CaseIterable, Sendable {
        case svg
        case png
        case glb
        case usd
        case usdz
    }

    public enum SceneStatus: String, Codable, Sendable {
        case available
        case unissued
    }

    public struct SceneRepresentation: Codable, Equatable, Sendable {
        public let id: String
        public let format: SceneFormat
        public let status: SceneStatus
        public let canonicalRevision: String
        public let spatialRevision: String
        public let assetId: String?
    }

    public struct SafeStage: Codable, Equatable, Sendable {
        public let minimumWidthIn: Int
        public let minimumDepthIn: Int
        public let locomotion: String
        public let statement: String
    }

    public struct RoomChapter: Codable, Equatable, Sendable {
        public let id: String
        public let entityId: String
        public let widthIn: Int
        public let depthIn: Int
        public let scale: String
        public let safeStage: SafeStage

        public var widthMeters: Double { Double(widthIn) * WorkWaySpatialPackage.metersPerInch }
        public var depthMeters: Double { Double(depthIn) * WorkWaySpatialPackage.metersPerInch }
        public var minimumStageWidthMeters: Double {
            Double(safeStage.minimumWidthIn) * WorkWaySpatialPackage.metersPerInch
        }
        public var minimumStageDepthMeters: Double {
            Double(safeStage.minimumDepthIn) * WorkWaySpatialPackage.metersPerInch
        }
    }

    public struct EntityRenderBinding: Codable, Equatable, Sendable {
        public let entityId: String
        public let renderEntityId: String
    }

    public struct Portal: Codable, Equatable, Sendable {
        public let id: String
        public let fromChapterId: String
        public let toChapterId: String
        public let traversal: String
    }

    public struct ValidationReceipt: Codable, Equatable, Sendable {
        public let id: String
        public let assessment: String
        public let sourceRevision: String
    }

    public let schemaVersionValue: String
    public let id: String
    public let canonicalProject: CanonicalProject
    public let spatialRevision: String
    public let clientSourceDocuments: String
    public let materialContract: MaterialContract
    public let physicalSceneContract: PhysicalSceneContract
    public let assets: [Asset]
    public let sceneRepresentations: [SceneRepresentation]
    public let entityRenderBindings: [EntityRenderBinding]
    public let roomChapters: [RoomChapter]
    public let portals: [Portal]
    public let validationReceipts: [ValidationReceipt]
    public let constructionReady: Bool

    private enum CodingKeys: String, CodingKey {
        case schemaVersionValue = "schemaVersion"
        case id
        case canonicalProject
        case spatialRevision
        case clientSourceDocuments
        case materialContract
        case physicalSceneContract
        case assets
        case sceneRepresentations
        case entityRenderBindings
        case roomChapters
        case portals
        case validationReceipts
        case constructionReady
    }

    public func roomChapter(id: String) -> RoomChapter? {
        roomChapters.first { $0.id == id }
    }

    /// Only performs local contract checks. A valid result is never a survey,
    /// code-compliance finding, permit, or construction release.
    public var contractIssues: [WorkWayNativeContractIssue] {
        var issues: [WorkWayNativeContractIssue] = []
        if schemaVersionValue != Self.schemaVersion { issues.append(.schemaVersionMismatch) }
        if id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            canonicalProject.projectId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            canonicalProject.projectRevision.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            spatialRevision.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        {
            issues.append(.identityMissing)
        }
        if clientSourceDocuments != "excluded" { issues.append(.sourceDocumentsNotExcluded) }
        if constructionReady { issues.append(.constructionReadyMustBeFalse) }
        if materialContract.scheduleId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            materialContract.materialBindingStatus != "role-codified-product-unselected" ||
            materialContract.renderedMaterialIds.isEmpty ||
            Set(materialContract.renderedMaterialIds).count != materialContract.renderedMaterialIds.count ||
            materialContract.constructionReady
        {
            issues.append(.materialContractInvalid)
        }
        let expectedPhysicalSceneStatus = physicalSceneContract.canGeneratePhysicalOneToOneScene
            ? "eligible-with-professional-review"
            : "blocked-vertical-geometry-unissued"
        if physicalSceneContract.issuanceId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            physicalSceneContract.coordinateTruth != "revised-plan-horizontal-only" ||
            physicalSceneContract.clientSourceDocuments != "excluded" ||
            Set(physicalSceneContract.unissuedFactIds).count != physicalSceneContract.unissuedFactIds.count ||
            physicalSceneContract.status != expectedPhysicalSceneStatus ||
            (physicalSceneContract.canGeneratePhysicalOneToOneScene && !physicalSceneContract.unissuedFactIds.isEmpty) ||
            (!physicalSceneContract.canGeneratePhysicalOneToOneScene && physicalSceneContract.unissuedFactIds.isEmpty) ||
            physicalSceneContract.constructionReady
        {
            issues.append(.physicalSceneContractInvalid)
        }
        if assets.contains(where: { !Self.isSafeClientPath($0.clientPath) }) {
            issues.append(.unsafeClientAssetPath)
        }
        if assets.contains(where: { !Self.isSHA256($0.sha256) }) {
            issues.append(.invalidClientAssetHash)
        }
        if roomChapters.contains(where: { $0.widthIn <= 0 || $0.depthIn <= 0 }) {
            issues.append(.roomDimensionsInvalid)
        }
        if roomChapters.contains(where: {
            $0.scale != "one-to-one" ||
                $0.safeStage.locomotion != "room-chapter-rebase" ||
                $0.safeStage.minimumWidthIn <= 0 ||
                $0.safeStage.minimumDepthIn <= 0 ||
                $0.safeStage.statement.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }) {
            issues.append(.roomStageContractMismatch)
        }
        if sceneRepresentations.contains(where: {
            $0.canonicalRevision != canonicalProject.projectRevision ||
                $0.spatialRevision != spatialRevision
        }) {
            issues.append(.representationRevisionMismatch)
        }
        if !sceneRepresentations.contains(where: { $0.format == .usd }) ||
            !sceneRepresentations.contains(where: { $0.format == .usdz })
        {
            issues.append(.nativeFormatsNotDeclared)
        }
        let assetIDs = Set(assets.map(\.id))
        if sceneRepresentations.contains(where: {
            $0.status == .available && ($0.assetId == nil || !assetIDs.contains($0.assetId!))
        }) {
            issues.append(.availableSceneMissingClientAsset)
        }
        if sceneRepresentations.contains(where: { $0.status == .unissued && $0.assetId != nil }) {
            issues.append(.unissuedSceneNamesClientAsset)
        }
        return issues.sorted()
    }

    public func realityKitPreflight(for chapterID: String) -> WorkWayRealityKitPreflight {
        let contractIssues = contractIssues
        let issuedNativeAssetIDs = sceneRepresentations.compactMap { representation -> String? in
            guard representation.status == .available,
                  representation.format == .usd || representation.format == .usdz,
                  let assetID = representation.assetId
            else { return nil }
            return assetID
        }
        let unissuedNativeFormats = sceneRepresentations.compactMap { representation -> SceneFormat? in
            guard representation.status == .unissued,
                  representation.format == .usd || representation.format == .usdz
            else { return nil }
            return representation.format
        }

        return WorkWayRealityKitPreflight(
            chapter: roomChapter(id: chapterID),
            contractIssues: contractIssues,
            issuedNativeAssetIDs: issuedNativeAssetIDs.sorted(),
            unissuedNativeFormats: unissuedNativeFormats.sorted { $0.rawValue < $1.rawValue },
            physicalSceneStatus: physicalSceneContract.status,
            physicalOneToOneSceneEligible: contractIssues.isEmpty &&
                physicalSceneContract.canGeneratePhysicalOneToOneScene
        )
    }

    public static func loadBundledThresholdDwelling() throws -> WorkWaySpatialPackage {
        guard let url = Bundle.module.url(
            forResource: "threshold-dwelling-r08-spatial-package",
            withExtension: "json"
        ) else {
            throw WorkWaySpatialPackageLoadError.missingBundledPackage
        }
        return try JSONDecoder().decode(WorkWaySpatialPackage.self, from: Data(contentsOf: url))
    }

    private static func isSafeClientPath(_ path: String) -> Bool {
        let normalized = path.trimmingCharacters(in: .whitespacesAndNewlines)
        let lowercased = normalized.lowercased()
        return !normalized.isEmpty &&
            normalized == path &&
            !normalized.hasPrefix("/") &&
            !normalized.contains("\\") &&
            !normalized.contains("..") &&
            !normalized.contains("://") &&
            !lowercased.contains("private") &&
            !lowercased.contains("source") &&
            !lowercased.contains("upload") &&
            !lowercased.hasSuffix(".pdf")
    }

    private static func isSHA256(_ value: String) -> Bool {
        value.count == 64 && value.allSatisfy { $0.isHexDigit }
    }
}

public enum WorkWayNativeContractIssue: String, CaseIterable, Comparable, Sendable {
    case schemaVersionMismatch = "schema-version-mismatch"
    case identityMissing = "identity-missing"
    case sourceDocumentsNotExcluded = "source-documents-not-excluded"
    case constructionReadyMustBeFalse = "construction-ready-must-be-false"
    case materialContractInvalid = "material-contract-invalid"
    case physicalSceneContractInvalid = "physical-scene-contract-invalid"
    case unsafeClientAssetPath = "unsafe-client-asset-path"
    case invalidClientAssetHash = "invalid-client-asset-hash"
    case roomDimensionsInvalid = "room-dimensions-invalid"
    case roomStageContractMismatch = "room-stage-contract-mismatch"
    case representationRevisionMismatch = "representation-revision-mismatch"
    case nativeFormatsNotDeclared = "native-formats-not-declared"
    case availableSceneMissingClientAsset = "available-scene-missing-client-asset"
    case unissuedSceneNamesClientAsset = "unissued-scene-names-client-asset"

    public static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }
}

public struct WorkWayRealityKitPreflight: Equatable, Sendable {
    public let chapter: WorkWaySpatialPackage.RoomChapter?
    public let contractIssues: [WorkWayNativeContractIssue]
    public let issuedNativeAssetIDs: [String]
    public let unissuedNativeFormats: [WorkWaySpatialPackage.SceneFormat]
    public let physicalSceneStatus: String
    public let physicalOneToOneSceneEligible: Bool

    /// A primitive room guide uses verified dimensions and does not need a
    /// USD/USDZ asset. RealityKit device execution remains a separate gate.
    public var canRenderPrimitiveRoomGuide: Bool {
        chapter != nil && contractIssues.isEmpty
    }

    /// A true scene asset becomes eligible only after a version-matched native
    /// asset is deliberately issued into the client package.
    public var canLoadIssuedNativeSceneAsset: Bool {
        contractIssues.isEmpty && !issuedNativeAssetIDs.isEmpty
    }
}

public enum WorkWaySpatialPackageLoadError: Error, Equatable {
    case missingBundledPackage
}
