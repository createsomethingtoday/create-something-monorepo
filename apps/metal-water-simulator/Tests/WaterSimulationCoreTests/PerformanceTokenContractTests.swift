import Foundation
import Testing
@testable import WaterSimulationCore

@Test("Native simulator tokens match the canonical Performance contract")
func nativeTokensMatchCanonicalPerformanceContract() throws {
    var repositoryRoot = URL(fileURLWithPath: #filePath)
    for _ in 0..<5 {
        repositoryRoot.deleteLastPathComponent()
    }
    let tokenURL = repositoryRoot
        .appendingPathComponent("packages/canon-tokens/tokens.json")
    let data = try Data(contentsOf: tokenURL)
    let document = try #require(
        JSONSerialization.jsonObject(with: data) as? [String: Any]
    )
    let contract = try #require(document["performanceContract"] as? [String: Any])
    let canonicalTokens = try #require(contract["tokens"] as? [String: String])

    for (name, value) in PerformanceTokens.canonicalValues {
        let canonicalValue = canonicalTokens[name]?.filter { !$0.isWhitespace }
        let nativeValue = value.filter { !$0.isWhitespace }
        #expect(canonicalValue == nativeValue, "Mismatch for \(name)")
    }
}

@Test("Native simulator exposes the required Canon polish token set")
func nativeTokensExposeRequiredCanonPolishSet() {
    let requiredNames: Set<String> = [
        "--color-performance-paper",
        "--color-performance-panel",
        "--color-performance-ink",
        "--color-performance-ink-soft",
        "--color-performance-muted",
        "--color-performance-line",
        "--color-performance-line-strong",
        "--color-performance-grid",
        "--color-performance-court",
        "--color-performance-brand-primary-border",
        "--color-performance-growth",
        "--color-performance-growth-soft",
        "--color-performance-signal",
        "--color-performance-signal-soft",
        "--color-performance-pressure",
        "--color-performance-pressure-soft",
        "--color-performance-risk",
        "--color-performance-risk-soft",
        "--color-performance-gold",
        "--color-performance-gold-soft",
        "--color-performance-active",
        "--duration-performance-instant",
    ]
    let missing = requiredNames.subtracting(PerformanceTokens.canonicalValues.keys)

    #expect(missing.isEmpty, "Missing native Canon tokens: \(missing.sorted())")
}

@Test("Native header exposes Canon hover, focus, and strong boundary tokens")
func nativeHeaderExposesCanonInteractionTokens() {
    #expect(PerformanceTokens.shellSurfaceHover.canonicalValue == "#1c1c1c")
    #expect(
        PerformanceTokens.shellBorderStrong.canonicalValue
            == "rgba(255, 255, 255, 0.2)"
    )
    #expect(
        PerformanceTokens.focus.canonicalValue
            == "rgba(255, 255, 255, 0.5)"
    )
    #expect(PerformanceTokens.radiusSmall == 0)
}

@Test("Native header recipe keeps playback mechanics neutral and precise")
func nativeHeaderRecipeMatchesCanonPerformanceActions() {
    #expect(PerformanceHeaderContract.railHeight == 64)
    #expect(PerformanceHeaderContract.actionHeight == 44)
    #expect(PerformanceHeaderContract.actionHorizontalPadding == 18)
    #expect(PerformanceHeaderContract.actionFontSize == 14)
    #expect(PerformanceHeaderContract.actionFontWeight == 700)
    #expect(PerformanceHeaderContract.actionCornerRadius == 0)
    #expect(PerformanceHeaderContract.controlGap == 8)
    #expect(PerformanceHeaderContract.provenanceGap == 16)
    #expect(PerformanceHeaderContract.safetyTagHeight == 28)
    #expect(PerformanceHeaderContract.safetyTagHorizontalPadding == 10)
    #expect(PerformanceHeaderContract.labelFontSize == 10)
    #expect(PerformanceHeaderContract.identityFontSize == 15)
    #expect(PerformanceHeaderContract.identityTracking == -0.03)

    #expect(PerformanceHeaderContract.primaryBackground == PerformanceTokens.panel)
    #expect(PerformanceHeaderContract.primaryForeground == PerformanceTokens.ink)
    #expect(
        PerformanceHeaderContract.secondaryBackground
            == PerformanceTokens.backgroundSurface
    )
    #expect(
        PerformanceHeaderContract.secondaryForeground
            == PerformanceTokens.foregroundPrimary
    )
    #expect(
        PerformanceHeaderContract.primaryBackground
            != PerformanceTokens.brandPrimary
    )
    #expect(
        PerformanceHeaderContract.primaryHoverBackground
            == PerformanceTokens.court
    )
    #expect(
        PerformanceHeaderContract.primaryPressedBackground
            == PerformanceTokens.line
    )
    #expect(
        PerformanceHeaderContract.secondaryHoverBackground
            == PerformanceTokens.shellSurfaceHover
    )
    #expect(PerformanceHeaderContract.focusRing == PerformanceTokens.focus)
}

@Test("Native workspace recipe keeps structure neutral and semantics precise")
func nativeWorkspaceRecipeMatchesCanonPerformancePrimitives() {
    #expect(PerformanceWorkspaceContract.scenarioRailHeight == 56)
    #expect(PerformanceWorkspaceContract.scenarioCardHeight == 44)
    #expect(PerformanceWorkspaceContract.stageRailHeight == 52)
    #expect(PerformanceWorkspaceContract.stageMarkerSize == 20)
    #expect(PerformanceWorkspaceContract.inspectorHeaderRailHeight == 48)
    #expect(PerformanceWorkspaceContract.actionHeight == 44)
    #expect(PerformanceWorkspaceContract.actionHorizontalPadding == 18)
    #expect(PerformanceWorkspaceContract.actionFontSize == 14)
    #expect(PerformanceWorkspaceContract.stampHeight == 28)
    #expect(PerformanceWorkspaceContract.stampHorizontalPadding == 8)
    #expect(PerformanceWorkspaceContract.semanticRailWidth == 4)
    #expect(PerformanceWorkspaceContract.gateLineWidth == 2)
    #expect(PerformanceWorkspaceContract.gateOpenTiltDegrees == 8)
    #expect(PerformanceWorkspaceContract.gateTransitionDuration == 0.28)
    #expect(PerformanceWorkspaceContract.panelCornerRadius == 4)
    #expect(PerformanceWorkspaceContract.controlGap == 8)
    #expect(PerformanceWorkspaceContract.sectionPadding == 12)

    #expect(PerformanceWorkspaceContract.structure == PerformanceTokens.inkSoft)
    #expect(PerformanceWorkspaceContract.structureMuted == PerformanceTokens.lineStrong)
    #expect(PerformanceWorkspaceContract.panel == PerformanceTokens.panel)
    #expect(PerformanceWorkspaceContract.panelMuted == PerformanceTokens.paper)
    #expect(PerformanceWorkspaceContract.gateStateLabel(isOpen: true) == "gate open")
    #expect(PerformanceWorkspaceContract.gateStateLabel(isOpen: false) == "gate closed")
    #expect(
        PerformanceWorkspaceContract.gateStateLabel(
            isOpen: false,
            isDrained: true
        ) == "gate closed, reservoir drained"
    )
}

@Test("Operational receipts resolve to Canon semantic priorities")
func operationalReceiptsResolveToCanonSemanticPriorities() {
    #expect(PerformanceReceiptTone.resolve(
        isPaused: false,
        hasPendingImpulse: false,
        gridOverflowCount: 1,
        hasTenSecondWindow: true,
        medianFPS: 60
    ) == .stop)
    #expect(PerformanceReceiptTone.resolve(
        isPaused: true,
        hasPendingImpulse: true,
        gridOverflowCount: 0,
        hasTenSecondWindow: true,
        medianFPS: 60
    ) == .review)
    #expect(PerformanceReceiptTone.resolve(
        isPaused: false,
        hasPendingImpulse: true,
        gridOverflowCount: 0,
        hasTenSecondWindow: true,
        medianFPS: 60
    ) == .pressure)
    #expect(PerformanceReceiptTone.resolve(
        isPaused: false,
        hasPendingImpulse: false,
        gridOverflowCount: 0,
        hasTenSecondWindow: true,
        medianFPS: 60
    ) == .ready)
    #expect(PerformanceReceiptTone.resolve(
        isPaused: false,
        hasPendingImpulse: false,
        gridOverflowCount: 0,
        hasTenSecondWindow: false,
        medianFPS: 0
    ) == .controlled)
}
