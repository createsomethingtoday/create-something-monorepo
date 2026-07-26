import Combine
import Foundation
import WaterSimulationCore
import simd

@MainActor
final class SimulatorController: ObservableObject {
    @Published private(set) var isPaused = false
    @Published private(set) var particleCount = 0
    @Published private(set) var status = "Loading governed workflow…"
    @Published private(set) var performanceText = "FPS WARMING · 0.0S"
    @Published private(set) var solverText = "2 SUBSTEPS · GRID —"
    @Published private(set) var rendererTone: PerformanceReceiptTone = .controlled
    @Published private(set) var scenarios: [WorkflowScenario] = []
    @Published private(set) var selectedScenarioID = ""
    @Published private(set) var playback: WorkflowPlayback?
    @Published private(set) var proofExportURL: URL?
    @Published private(set) var artifactTour: WorkflowArtifactTour?
    @Published private(set) var artifactTourProgress: WorkflowArtifactTourProgress?
    @Published private(set) var isArtifactTourPresented = false

    let catalog: WorkflowCatalog?
    let simulatorArtifacts: SimulatorArtifactCatalog?

    private weak var renderer: WaterRenderer?
    private var gridOverflowCount = 0
    private var hasTenSecondWindow = false
    private var medianFPS = 0.0
    private var pressureUntil = 0.0
    private var playbackTask: Task<Void, Never>?

    init() {
        do {
            let loadedCatalog = try WorkflowCatalog.loadBundled()
            let loadedSimulatorArtifacts = try SimulatorArtifactCatalog.loadBundled()
            let artifactTour = try WorkflowArtifactTour(manifest: loadedCatalog.manifest)
            catalog = loadedCatalog
            simulatorArtifacts = loadedSimulatorArtifacts
            self.artifactTour = artifactTour
            artifactTourProgress = WorkflowArtifactTourProgress(tour: artifactTour)
            scenarios = loadedCatalog.scenarios
            if let first = loadedCatalog.scenarios.first {
                selectedScenarioID = first.caseId
                playback = WorkflowPlayback(scenario: first)
                status = "Case loaded · boundary closed"
            }
        } catch {
            catalog = nil
            simulatorArtifacts = nil
            artifactTour = nil
            artifactTourProgress = nil
            status = error.localizedDescription
        }
    }

    var selectedScenario: WorkflowScenario? {
        scenarios.first { $0.caseId == selectedScenarioID }
    }

    var selectedScenarioNumber: Int {
        guard let index = scenarios.firstIndex(where: { $0.caseId == selectedScenarioID }) else {
            return 0
        }
        return index + 1
    }

    var workflowStage: WorkflowStage {
        playback?.stage ?? .signal
    }

    var isReservoirDrained: Bool {
        selectedScenario?.decision == .run && workflowStage == .proof
    }

    var workflowTone: PerformanceReceiptTone {
        guard let scenario = selectedScenario else { return .controlled }
        switch scenario.decision {
        case .run: return .ready
        case .wait: return .review
        case .stop: return .stop
        }
    }

    var activeBoundaryTone: PerformanceReceiptTone {
        switch workflowStage {
        case .signal: .controlled
        case .decision: .pressure
        case .action, .proof: workflowTone
        }
    }

    var workflowReceiptLabel: String {
        guard let scenario = selectedScenario else { return "BOUNDARY / UNAVAILABLE" }
        return "\(scenario.decision.rawValue.uppercased()) / \(scenario.reasonCode.shortLabel.uppercased())"
    }

    var rendererReceiptLabel: String {
        switch rendererTone {
        case .controlled:
            "RENDERER / WARMING"
        case .pressure:
            "RENDERER / IMPULSE"
        case .ready:
            "RENDERER / VERIFIED"
        case .review:
            isPaused ? "RENDERER / PAUSED" : "RENDERER / FPS"
        case .stop:
            "RENDERER / GRID OVERFLOW"
        }
    }

    var currentProof: WorkflowProofBundle? {
        guard let catalog, let selectedScenario else { return nil }
        return WorkflowProofBundle(catalog: catalog, scenario: selectedScenario)
    }

    var selectedArtifact: WorkflowArtifactTourItem? {
        guard let path = artifactTourProgress?.currentPath else { return nil }
        return artifactTour?.artifacts.first { $0.path == path }
    }

    var selectedArtifactChapter: WorkflowArtifactTourChapter? {
        guard let chapterID = selectedArtifact?.chapterID else { return nil }
        return artifactTour?.chapters.first { $0.id == chapterID }
    }

    var artifactCoverageLabel: String {
        let visited = artifactTourProgress?.visitedCount ?? 0
        let total = artifactTourProgress?.totalCount ?? 0
        return "\(visited) / \(total) VISITED"
    }

    var canExportProof: Bool {
        workflowStage == .proof
            && playback?.isGateOpen == false
            && rendererTone == .ready
            && artifactTourProgress?.isComplete == true
    }

    var proofExportRequirement: String {
        if workflowStage != .proof { return "Advance the case to Proof" }
        if playback?.isGateOpen != false { return "Close the governed gate" }
        if artifactTourProgress?.isComplete != true { return "Complete the 15-artifact tour" }
        if rendererTone != .ready { return "Verify the ten-second renderer window" }
        return "Semantic · artifact · renderer · capture manifest"
    }

    func attach(renderer: WaterRenderer) {
        self.renderer = renderer
        particleCount = renderer.particleCount
        status = "\(renderer.deviceName) · boundary closed"
        renderer.isPaused = isPaused
        renderer.requestGate(open: false)
        renderer.metricsHandler = { [weak self] metrics in
            self?.update(metrics: metrics)
        }
        refreshRendererTone()
    }

    func selectScenario(id: String) {
        guard let scenario = scenarios.first(where: { $0.caseId == id }) else { return }
        playbackTask?.cancel()
        selectedScenarioID = scenario.caseId
        playback = WorkflowPlayback(scenario: scenario)
        proofExportURL = nil
        renderer?.requestGate(open: false)
        renderer?.requestReset()
        renderer?.requestImpulse(at: SIMD2<Float>(0, 0.48))
        pressureUntil = 0
        status = "Case \(selectedScenarioNumber) loaded · boundary closed"
        refreshRendererTone()
    }

    func showWorkflowInspector() {
        isArtifactTourPresented = false
    }

    func showArtifactTour() {
        isArtifactTourPresented = true
        guard artifactTourProgress?.visitedCount == 0,
              let firstPath = artifactTour?.artifacts.first?.path
        else { return }
        visitArtifact(path: firstPath)
    }

    func visitArtifact(path: String) {
        guard var progress = artifactTourProgress else { return }
        do {
            try progress.visit(path: path)
            artifactTourProgress = progress
            if let item = artifactTour?.artifacts.first(where: { $0.path == path }) {
                status = "Artifact visited · \(item.title)"
            }
        } catch {
            status = error.localizedDescription
        }
    }

    func visitArtifactChapter(_ chapterID: WorkflowArtifactChapterID) {
        guard let path = artifactTour?.chapters
            .first(where: { $0.id == chapterID })?
            .artifacts.first?.path
        else { return }
        visitArtifact(path: path)
    }

    func visitNextArtifact() {
        guard let artifacts = artifactTour?.artifacts, !artifacts.isEmpty else { return }
        let currentIndex = artifacts.firstIndex { $0.path == artifactTourProgress?.currentPath } ?? -1
        visitArtifact(path: artifacts[min(currentIndex + 1, artifacts.count - 1)].path)
    }

    func visitPreviousArtifact() {
        guard let artifacts = artifactTour?.artifacts, !artifacts.isEmpty else { return }
        let currentIndex = artifacts.firstIndex { $0.path == artifactTourProgress?.currentPath } ?? 0
        visitArtifact(path: artifacts[max(currentIndex - 1, 0)].path)
    }

    func replayArtifactTour() {
        guard let artifactTour else { return }
        artifactTourProgress = WorkflowArtifactTourProgress(tour: artifactTour)
        if let firstPath = artifactTour.artifacts.first?.path {
            visitArtifact(path: firstPath)
        }
        status = "Artifact tour restarted"
    }

    func replaySelectedScenario(reducedMotion: Bool = false) {
        guard let scenario = selectedScenario else { return }
        playbackTask?.cancel()
        playback = WorkflowPlayback(scenario: scenario)
        proofExportURL = nil
        renderer?.requestGate(open: false)
        renderer?.requestReset()
        renderer?.requestImpulse(at: SIMD2<Float>(0, 0.48))
        if isPaused {
            isPaused = false
            renderer?.isPaused = false
        }
        status = "Signal received · \(scenario.caseId)"

        playbackTask = Task { [weak self] in
            guard let self else { return }
            if reducedMotion {
                self.advancePlayback()
                self.advancePlayback()
            } else {
                guard await self.wait(milliseconds: 420) else { return }
                self.advancePlayback()
                guard await self.wait(milliseconds: 560) else { return }
                self.advancePlayback()
            }
            guard await self.wait(
                milliseconds: HydraulicReleaseContract.drainDurationMilliseconds
            ) else { return }
            self.advancePlayback()
        }
    }

    func togglePaused() {
        isPaused.toggle()
        renderer?.isPaused = isPaused
        refreshRendererTone()
    }

    func reset() {
        playbackTask?.cancel()
        if let scenario = selectedScenario {
            playback = WorkflowPlayback(scenario: scenario)
        }
        renderer?.requestGate(open: false)
        renderer?.requestReset()
        proofExportURL = nil
        status = "Case reset · boundary closed"
        pressureUntil = 0
        refreshRendererTone()
    }

    func injectSignal(at point: SIMD2<Float> = SIMD2<Float>(0, 0.42)) {
        renderer?.requestImpulse(at: point)
        status = "Representative pressure injected"
        pressureUntil = ProcessInfo.processInfo.systemUptime + 0.8
        refreshRendererTone()
    }

    func setProofExportURL(_ url: URL?) {
        proofExportURL = url
        if let url {
            status = "Proof exported · \(url.lastPathComponent)"
        }
    }

    func exportProof() {
        guard workflowStage == .proof else {
            status = "Proof export requires the Proof stage"
            return
        }
        guard playback?.isGateOpen == false else {
            status = "Proof export requires a closed governed gate"
            return
        }
        guard rendererTone == .ready else {
            status = "Proof export requires a verified ten-second renderer window"
            return
        }
        guard let proof = currentProof,
              let catalog,
              let artifactTour,
              let artifactTourProgress
        else { return }
        do {
            let tourEvidence = try WorkflowArtifactTourEvidence(
                catalog: catalog,
                tour: artifactTour,
                progress: artifactTourProgress
            )
            let url = try ProofArtifactWriter.write(
                proof: proof,
                renderer: RenderProofContext(
                    particleCount: particleCount,
                    medianFPS: medianFPS,
                    solverSubsteps: isPaused ? 0 : 2,
                    gridOverflowCount: gridOverflowCount,
                    device: renderer?.deviceName ?? "Metal device unavailable",
                    gateOpen: false
                ),
                artifactTour: tourEvidence
            )
            setProofExportURL(url)
        } catch {
            status = "Proof export failed · \(error.localizedDescription)"
        }
    }

    private func advancePlayback() {
        guard var playback else { return }
        playback.advance()
        self.playback = playback
        renderer?.requestGate(open: playback.isGateOpen)

        switch playback.stage {
        case .signal:
            status = "Signal received"
        case .decision:
            renderer?.requestImpulse(at: SIMD2<Float>(0, 0.12))
            status = "Boundary evaluated · \(playback.scenario.reasonCode.shortLabel)"
        case .action:
            status = playback.isGateOpen
                ? "Scoped action running · tilted gate draining"
                : "Action contained · gate closed"
        case .proof:
            status = isReservoirDrained
                ? "Reservoir drained · gate closed · proof attached"
                : "Proof attached · \(playback.scenario.receipt.correlationId)"
        }
    }

    private func wait(milliseconds: Int) async -> Bool {
        do {
            try await Task.sleep(for: .milliseconds(milliseconds))
            return !Task.isCancelled
        } catch {
            return false
        }
    }

    private func update(metrics: RenderMetrics) {
        gridOverflowCount = metrics.gridOverflowCount
        hasTenSecondWindow = metrics.hasTenSecondWindow
        medianFPS = metrics.medianFPS
        if metrics.hasTenSecondWindow {
            performanceText = String(format: "%.1f FPS MEDIAN · 10.0S", metrics.medianFPS)
        } else {
            performanceText = String(
                format: "FPS WARMING · %.1fS",
                metrics.windowDuration
            )
        }
        solverText = "\(metrics.solverSubsteps) SUBSTEPS · GRID \(metrics.gridOverflowCount)"
        refreshRendererTone()
    }

    private func refreshRendererTone() {
        rendererTone = PerformanceReceiptTone.resolve(
            isPaused: isPaused,
            hasPendingImpulse: ProcessInfo.processInfo.systemUptime < pressureUntil,
            gridOverflowCount: gridOverflowCount,
            hasTenSecondWindow: hasTenSecondWindow,
            medianFPS: medianFPS
        )
    }
}
