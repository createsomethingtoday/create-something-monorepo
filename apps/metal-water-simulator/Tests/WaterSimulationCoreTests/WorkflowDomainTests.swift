import Foundation
import Testing
@testable import WaterSimulationCore

@Test("Canonical workflow replay maps all five governed outcomes")
func canonicalWorkflowReplayMapsAllFiveGovernedOutcomes() throws {
    let catalog = try WorkflowCatalog.loadBundled()

    #expect(catalog.workflowId == "webflow.marketplace.template-lifecycle")
    #expect(catalog.workflowVersion == "0.1.0")
    #expect(catalog.scenarios.count == 5)
    #expect(catalog.manifest.files.count == 18)
    #expect(catalog.acceptance.caseCount == 5)
    #expect(catalog.acceptance.allExpectationsMatched)
    #expect(catalog.acceptance.governanceComplete)

    let decisions = Dictionary(
        uniqueKeysWithValues: catalog.scenarios.map { ($0.reasonCode, $0.decision) }
    )
    #expect(decisions[.actionAllowed] == .run)
    #expect(decisions[.approvalRequired] == .wait)
    #expect(decisions[.policyBlocked] == .stop)
    #expect(decisions[.insufficientEvidence] == .stop)
    #expect(decisions[.unknownAction] == .stop)
}

@Test("Workflow proof is deterministic and traces signal through receipt")
func workflowProofIsDeterministicAndComplete() throws {
    let catalog = try WorkflowCatalog.loadBundled()
    let scenario = try #require(
        catalog.scenarios.first { $0.reasonCode == .actionAllowed }
    )

    let first = WorkflowProofBundle(catalog: catalog, scenario: scenario)
    let second = WorkflowProofBundle(catalog: catalog, scenario: scenario)

    #expect(try first.jsonData() == second.jsonData())
    #expect(first.decision == .run)
    #expect(first.trace.map(\.stage) == [.signal, .decision, .action, .proof])
    #expect(first.receipt == scenario.receipt)
    #expect(first.recovery == scenario.recovery)
    #expect(first.definitionHash == catalog.definitionHash)
}

@Test("Bundled workflow artifacts match every manifest content hash")
func bundledWorkflowArtifactsMatchManifest() throws {
    let report = try WorkflowArtifactVerifier.verifyBundled()

    #expect(report.fileCount == 18)
    #expect(report.verifiedPaths.count == 18)
    #expect(report.mismatches.isEmpty)
}

@Test("Artifact tour maps every manifest artifact once into six teaching chapters")
func artifactTourCoversBundledManifestExactlyOnce() throws {
    let catalog = try WorkflowCatalog.loadBundled()
    let tour = try WorkflowArtifactTour(manifest: catalog.manifest)

    #expect(tour.chapters.map(\.id) == [
        .topology,
        .dataContracts,
        .executionContracts,
        .governance,
        .evaluationEvidence,
        .presentationProvenance,
    ])
    #expect(tour.artifacts.count == 18)
    #expect(Set(tour.artifacts.map(\.path)).count == 18)
    #expect(
        Set(tour.artifacts.map(\.path))
            == Set(catalog.manifest.files.map(\.path))
    )
    #expect(tour.chapters.map { $0.artifacts.count } == [2, 3, 2, 3, 4, 4])
    #expect(tour.artifacts.allSatisfy { !$0.purpose.isEmpty })
    #expect(tour.artifacts.allSatisfy { !$0.owner.isEmpty })
    #expect(tour.artifacts.allSatisfy { !$0.teachingCue.isEmpty })
    #expect(tour.artifacts.allSatisfy { $0.hash.hasPrefix("sha256:") })
}

@Test("Artifact tour completes only after every artifact is explicitly visited")
func artifactTourProgressRequiresExplicitVisits() throws {
    let catalog = try WorkflowCatalog.loadBundled()
    let tour = try WorkflowArtifactTour(manifest: catalog.manifest)
    var progress = WorkflowArtifactTourProgress(tour: tour)

    #expect(progress.currentPath == tour.artifacts.first?.path)
    #expect(progress.visitedCount == 0)
    #expect(progress.totalCount == 18)
    #expect(!progress.isComplete)

    for artifact in tour.artifacts.dropLast() {
        try progress.visit(path: artifact.path)
    }
    #expect(progress.visitedCount == 17)
    #expect(!progress.isComplete)

    let last = try #require(tour.artifacts.last)
    try progress.visit(path: last.path)
    try progress.visit(path: last.path)
    #expect(progress.visitedCount == 18)
    #expect(progress.isComplete)
    #expect(progress.chapterProgress[.presentationProvenance]?.isComplete == true)

    #expect(throws: WorkflowArtifactTourProgressError.unknownPath("manifest.json")) {
        try progress.visit(path: "manifest.json")
    }
}

@Test("Artifact tour evidence is deterministic and rejects incomplete coverage")
func artifactTourEvidenceRequiresCompleteCoverage() throws {
    let catalog = try WorkflowCatalog.loadBundled()
    let tour = try WorkflowArtifactTour(manifest: catalog.manifest)
    var progress = WorkflowArtifactTourProgress(tour: tour)

    try progress.visit(path: tour.artifacts[0].path)
    #expect(throws: WorkflowArtifactTourEvidenceError.incompleteCoverage(1, 18)) {
        _ = try WorkflowArtifactTourEvidence(
            catalog: catalog,
            tour: tour,
            progress: progress
        )
    }

    for artifact in tour.artifacts.dropFirst() {
        try progress.visit(path: artifact.path)
    }
    let first = try WorkflowArtifactTourEvidence(
        catalog: catalog,
        tour: tour,
        progress: progress
    )
    let second = try WorkflowArtifactTourEvidence(
        catalog: catalog,
        tour: tour,
        progress: progress
    )

    #expect(first.complete)
    #expect(first.visitedCount == 18)
    #expect(first.artifacts.count == 18)
    #expect(first.visitOrder == tour.artifacts.map(\.path))
    #expect(try first.jsonData() == second.jsonData())
}

@Test("Native capture manifest finalizes and detects pixel evidence drift")
func nativeCaptureManifestFinalizesAndVerifiesHashes() throws {
    let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }

    let manifest = NativeCaptureManifest(
        workflowId: "workflow",
        workflowVersion: "1.0.0",
        definitionHash: "sha256:definition",
        caseId: "case"
    )
    #expect(throws: NativeCaptureManifestError.missingCapture("native-window.png")) {
        _ = try manifest.finalized(in: directory)
    }

    for (index, name) in manifest.requiredCaptures.enumerated() {
        try Data("capture-\(index)".utf8).write(
            to: directory.appendingPathComponent(name),
            options: .atomic
        )
    }
    let finalized = try manifest.finalized(in: directory)
    try finalized.verify(in: directory)
    #expect(finalized.captures.count == 4)
    #expect(finalized.captures.allSatisfy { $0.sha256.hasPrefix("sha256:") })

    try Data("changed pixels".utf8).write(
        to: directory.appendingPathComponent("artifact-tour.png"),
        options: .atomic
    )
    #expect(throws: NativeCaptureManifestError.byteCountMismatch("artifact-tour.png")) {
        try finalized.verify(in: directory)
    }
}

@Test("Artifact tour fails closed when manifest identity or hashes drift")
func artifactTourRejectsManifestDrift() throws {
    let manifest = try WorkflowCatalog.loadBundled().manifest
    let first = try #require(manifest.files.first)

    let duplicate = WorkflowArtifactManifest(
        schemaVersion: manifest.schemaVersion,
        workflowId: manifest.workflowId,
        workflowVersion: manifest.workflowVersion,
        definitionHash: manifest.definitionHash,
        compilerVersion: manifest.compilerVersion,
        files: manifest.files + [first]
    )
    #expect(
        throws: WorkflowArtifactTourError.duplicateManifestPaths([first.path])
    ) {
        _ = try WorkflowArtifactTour(manifest: duplicate)
    }

    var unknownFiles = manifest.files.dropFirst().map { $0 }
    unknownFiles.append(
        WorkflowArtifactManifest.File(
            path: "unexpected-artifact.json",
            hash: String(repeating: "0", count: 64)
        )
    )
    let unknown = WorkflowArtifactManifest(
        schemaVersion: manifest.schemaVersion,
        workflowId: manifest.workflowId,
        workflowVersion: manifest.workflowVersion,
        definitionHash: manifest.definitionHash,
        compilerVersion: manifest.compilerVersion,
        files: unknownFiles
    )
    #expect(throws: WorkflowArtifactTourError.self) {
        _ = try WorkflowArtifactTour(manifest: unknown)
    }

    var divergentFiles = manifest.files
    divergentFiles[0] = WorkflowArtifactManifest.File(
        path: first.path,
        hash: "sha256:" + String(repeating: "0", count: 64)
    )
    let divergent = WorkflowArtifactManifest(
        schemaVersion: manifest.schemaVersion,
        workflowId: manifest.workflowId,
        workflowVersion: manifest.workflowVersion,
        definitionHash: manifest.definitionHash,
        compilerVersion: manifest.compilerVersion,
        files: divergentFiles
    )
    let report = try WorkflowArtifactVerifier.verify(manifest: divergent)
    #expect(report.verifiedPaths.count == 17)
    #expect(report.mismatches.count == 1)
    #expect(report.mismatches[0].hasPrefix("\(first.path): expected"))
}

@Test("Hydraulic projection gives every workflow reason one physical boundary state")
func hydraulicProjectionCoversEveryCanonicalCase() throws {
    let artifacts = try SimulatorArtifactCatalog.loadBundled()

    #expect(artifacts.hydraulicProjection.particleCount == 8_192)
    #expect(artifacts.hydraulicProjection.gate.openingHalfWidth > 0)
    #expect(artifacts.hydraulicProjection.mappings.count == 5)
    #expect(
        artifacts.hydraulicProjection.mapping(for: .actionAllowed)?.gateState == .open
    )
    #expect(
        artifacts.hydraulicProjection.mapping(for: .approvalRequired)?.gateState == .closed
    )
    #expect(
        artifacts.hydraulicProjection.mapping(for: .unknownAction)?.decision == .stop
    )
    #expect(artifacts.visualSemantics.shadowOnly)
    #expect(artifacts.visualSemantics.writes == "none")
}

@Test("Every governed outcome has a distinct non-color boundary pattern")
func governedOutcomesHaveDistinctBoundaryPatterns() {
    let canonicalReasons: [WorkflowReasonCode] = [
        .actionAllowed,
        .approvalRequired,
        .policyBlocked,
        .insufficientEvidence,
        .unknownAction,
    ]
    let patterns = canonicalReasons.map(WorkflowBoundaryPattern.resolve)

    #expect(Set(patterns).count == canonicalReasons.count)
    #expect(patterns.allSatisfy { !$0.label.isEmpty })
    #expect(patterns.allSatisfy { !$0.geometryCue.isEmpty })
    #expect(WorkflowBoundaryPattern.resolve(.actionAllowed) == .releaseChannel)
    #expect(WorkflowBoundaryPattern.resolve(.approvalRequired) == .approvalLock)
    #expect(WorkflowBoundaryPattern.resolve(.policyBlocked) == .policyBraces)
    #expect(WorkflowBoundaryPattern.resolve(.insufficientEvidence) == .evidenceGaps)
    #expect(WorkflowBoundaryPattern.resolve(.unknownAction) == .unknownCross)
}

@Test("Workflow playback closes a Run gate before proof and the next signal")
func workflowPlaybackClosesRunGateBeforeProofAndNextSignal() throws {
    let catalog = try WorkflowCatalog.loadBundled()
    let runScenario = try #require(catalog.scenarios.first { $0.decision == .run })
    let waitScenario = try #require(catalog.scenarios.first { $0.decision == .wait })

    var run = WorkflowPlayback(scenario: runScenario)
    #expect(run.stage == .signal)
    #expect(!run.isGateOpen)
    run.advance()
    #expect(run.stage == .decision)
    #expect(!run.isGateOpen)
    run.advance()
    #expect(run.stage == .action)
    #expect(run.isGateOpen)
    run.advance()
    #expect(run.stage == .proof)
    #expect(!run.isGateOpen)
    run.reset()
    #expect(run.stage == .signal)
    #expect(!run.isGateOpen)

    var wait = WorkflowPlayback(scenario: waitScenario)
    wait.advance()
    wait.advance()
    #expect(wait.stage == .action)
    #expect(!wait.isGateOpen)
}
