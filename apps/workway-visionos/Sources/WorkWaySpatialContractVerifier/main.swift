import Foundation
import WorkWaySpatialContract

private struct VerificationReceipt: Codable {
    let packageID: String
    let canonicalRevision: String
    let spatialRevision: String
    let clientSourceDocuments: String
    let materialScheduleID: String
    let materialBindingStatus: String
    let renderedMaterialIDs: [String]
    let physicalSceneStatus: String
    let physicalOneToOneSceneEligible: Bool
    let constructionReady: Bool
    let contractIssues: [String]
    let kitchenDimensionsMeters: [Double]
    let primitiveRoomGuideEligible: Bool
    let issuedNativeAssetIDs: [String]
    let unissuedNativeFormats: [String]
}

private enum VerificationError: Error {
    case kitchenMissing
    case contractIssues([WorkWayNativeContractIssue])
    case unexpectedNativeAssetReadiness
}

@main
struct WorkWaySpatialContractVerifier {
    static func main() {
        do {
            let package = try WorkWaySpatialPackage.loadBundledThresholdDwelling()
            guard let kitchen = package.roomChapter(id: "kitchen") else {
                throw VerificationError.kitchenMissing
            }
            let preflight = package.realityKitPreflight(for: kitchen.id)

            guard package.contractIssues.isEmpty else {
                throw VerificationError.contractIssues(package.contractIssues)
            }
            guard preflight.canRenderPrimitiveRoomGuide,
                  !preflight.canLoadIssuedNativeSceneAsset,
                  !preflight.physicalOneToOneSceneEligible,
                  preflight.issuedNativeAssetIDs.isEmpty,
                  preflight.unissuedNativeFormats == [.usd, .usdz]
            else {
                throw VerificationError.unexpectedNativeAssetReadiness
            }

            let receipt = VerificationReceipt(
                packageID: package.id,
                canonicalRevision: package.canonicalProject.projectRevision,
                spatialRevision: package.spatialRevision,
                clientSourceDocuments: package.clientSourceDocuments,
                materialScheduleID: package.materialContract.scheduleId,
                materialBindingStatus: package.materialContract.materialBindingStatus,
                renderedMaterialIDs: package.materialContract.renderedMaterialIds,
                physicalSceneStatus: preflight.physicalSceneStatus,
                physicalOneToOneSceneEligible: preflight.physicalOneToOneSceneEligible,
                constructionReady: package.constructionReady,
                contractIssues: package.contractIssues.map(\.rawValue),
                kitchenDimensionsMeters: [kitchen.widthMeters, kitchen.depthMeters],
                primitiveRoomGuideEligible: preflight.canRenderPrimitiveRoomGuide,
                issuedNativeAssetIDs: preflight.issuedNativeAssetIDs,
                unissuedNativeFormats: preflight.unissuedNativeFormats.map(\.rawValue)
            )
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            print(String(decoding: try encoder.encode(receipt), as: UTF8.self))
        } catch {
            FileHandle.standardError.write(Data("WorkWay native contract verification failed: \(error)\n".utf8))
            Foundation.exit(1)
        }
    }
}
