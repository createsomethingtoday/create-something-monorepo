import XCTest
@testable import WorkWaySpatialContract

final class WorkWaySpatialPackageTests: XCTestCase {
    func testThresholdDwellingAdmitsOnlyIssuedDesignIntentUSDZ() throws {
        let package = try WorkWaySpatialPackage.loadBundledThresholdDwelling()

        XCTAssertTrue(package.contractIssues.isEmpty)
        XCTAssertEqual(package.clientSourceDocuments, "excluded")
        XCTAssertFalse(package.constructionReady)

        let preflight = package.realityKitPreflight(for: "kitchen")
        let chapter = try XCTUnwrap(preflight.chapter)
        XCTAssertEqual(chapter.widthIn, 180)
        XCTAssertEqual(chapter.depthIn, 156)
        XCTAssertEqual(chapter.widthMeters, 4.572, accuracy: 0.000_001)
        XCTAssertEqual(chapter.depthMeters, 3.9624, accuracy: 0.000_001)
        XCTAssertEqual(preflight.issuedNativeAssetIDs, ["native-massing-usdz"])
        XCTAssertEqual(preflight.unissuedNativeFormats, [.usd])
        XCTAssertTrue(preflight.canLoadIssuedNativeSceneAsset)
        XCTAssertTrue(preflight.canRenderPrimitiveRoomGuide)
        XCTAssertFalse(preflight.physicalOneToOneSceneEligible)
    }
}
