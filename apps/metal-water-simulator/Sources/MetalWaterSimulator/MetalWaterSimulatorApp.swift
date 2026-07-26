import AppKit
import SwiftUI
import WaterSimulationCore

private final class MetalWaterApplicationDelegate: NSObject, NSApplicationDelegate {
    func applicationWillFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSRunningApplication.current.activate(options: [.activateAllWindows])
    }
}

@main
struct MetalWaterSimulatorApp: App {
    @NSApplicationDelegateAdaptor(MetalWaterApplicationDelegate.self)
    private var applicationDelegate
    @StateObject private var controller = SimulatorController()

    var body: some Scene {
        WindowGroup("Metal Water") {
            SimulatorScreen(controller: controller)
                .frame(minWidth: 900, minHeight: 680)
        }
        .defaultSize(width: 980, height: 760)
        .windowStyle(.hiddenTitleBar)
    }
}

private struct SimulatorScreen: View {
    @ObservedObject var controller: SimulatorController
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            header
            scenarioRail
            WorkflowStageRail(current: controller.workflowStage)

            HStack(spacing: 0) {
                ZStack {
                    MetalWaterView(controller: controller)
                    HydraulicBoundaryOverlay(controller: controller)
                    if controller.isArtifactTourPresented,
                       let artifact = controller.selectedArtifact {
                        ArtifactTeachingOverlay(artifact: artifact)
                    }
                }
                .accessibilityLabel("Governed water workflow field")
                .accessibilityValue(
                    "\(controller.workflowReceiptLabel), stage \(controller.workflowStage.rawValue), "
                        + PerformanceWorkspaceContract.gateStateLabel(
                            isOpen: controller.playback?.isGateOpen ?? false,
                            isDrained: controller.isReservoirDrained
                        )
                )

                InspectorWorkspace(controller: controller)
                    .frame(width: 340)
            }

            rendererHealthRail
        }
        .background(PerformanceStyle.background)
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        HStack(spacing: PerformanceHeaderContract.provenanceGap) {
            VStack(alignment: .leading, spacing: 3) {
                Text("METAL WATER")
                    .font(
                        PerformanceStyle.displayFont(
                            size: PerformanceHeaderContract.identityFontSize
                        )
                    )
                    .tracking(
                        PerformanceHeaderContract.identityFontSize
                            * PerformanceHeaderContract.identityTracking
                    )
                    .foregroundStyle(PerformanceStyle.primary)
                    .lineLimit(1)
                Text("WORKFLOW PRESSURE LAB · APPLE GPU")
                    .font(
                        PerformanceStyle.recordFont(
                            size: PerformanceHeaderContract.labelFontSize,
                            weight: .semibold
                        )
                    )
                    .foregroundStyle(PerformanceStyle.tertiary)
                    .lineLimit(1)
            }
            .fixedSize(horizontal: true, vertical: false)

            HStack(spacing: PerformanceHeaderContract.controlGap) {
                statusTag("SHADOW ONLY")
                statusTag("WRITES NONE")
            }

            Spacer(minLength: 0)

            if let catalog = controller.catalog {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("MARKETPLACE LIFECYCLE · v\(catalog.workflowVersion)")
                    Text(catalog.definitionHash.replacingOccurrences(of: "sha256:", with: "").prefix(12))
                }
                .font(
                    PerformanceStyle.recordFont(
                        size: PerformanceHeaderContract.labelFontSize,
                        weight: .semibold
                    )
                )
                .foregroundStyle(PerformanceStyle.tertiary)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Workflow provenance")
                .accessibilityValue(
                    "Marketplace lifecycle version \(catalog.workflowVersion), definition \(catalog.definitionHash)"
                )
            }

            HStack(spacing: PerformanceHeaderContract.controlGap) {
                PerformanceHeaderButton(
                    title: controller.isPaused ? "Resume" : "Pause",
                    role: .secondary,
                    shortcut: KeyboardShortcut(.space, modifiers: []),
                    accessibilityIdentifier: "header.pause"
                ) {
                    controller.togglePaused()
                }

                PerformanceHeaderButton(
                    title: "Replay case",
                    role: .primary,
                    shortcut: KeyboardShortcut(.return, modifiers: []),
                    accessibilityIdentifier: "header.replay"
                ) {
                    controller.replaySelectedScenario(reducedMotion: reducedMotionEnabled)
                }

                PerformanceHeaderButton(
                    title: "Reset",
                    role: .secondary,
                    shortcut: KeyboardShortcut("r", modifiers: []),
                    accessibilityIdentifier: "header.reset"
                ) {
                    controller.reset()
                }
            }
        }
        .padding(.horizontal, PerformanceStyle.spaceSM)
        .frame(minHeight: PerformanceHeaderContract.railHeight)
        .background(PerformanceStyle.shell)
        .overlay(alignment: .bottom) {
            Rectangle().fill(PerformanceStyle.border).frame(height: 1)
        }
    }

    private var scenarioRail: some View {
        HStack(spacing: PerformanceWorkspaceContract.controlGap) {
            VStack(alignment: .leading, spacing: 2) {
                Text("PRESSURE CASES")
                Text("\(controller.selectedScenarioNumber) / \(controller.scenarios.count)")
                    .foregroundStyle(PerformanceStyle.muted)
            }
            .font(PerformanceStyle.recordFont(size: 9, weight: .semibold))
            .foregroundStyle(PerformanceStyle.secondary)
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .frame(width: 78, alignment: .leading)

            ForEach(controller.scenarios) { scenario in
                ScenarioButton(
                    scenario: scenario,
                    selected: controller.selectedScenarioID == scenario.caseId
                ) {
                    controller.selectScenario(id: scenario.caseId)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, PerformanceStyle.spaceSM)
        .frame(minHeight: PerformanceWorkspaceContract.scenarioRailHeight)
        .background(PerformanceStyle.shellSecondary)
        .overlay(alignment: .bottom) {
            Rectangle().fill(PerformanceStyle.border).frame(height: 1)
        }
    }

    private var rendererHealthRail: some View {
        HStack(spacing: PerformanceWorkspaceContract.controlGap) {
            Text("RENDERER HEALTH")
                .font(PerformanceStyle.recordFont(size: 9, weight: .semibold))
                .foregroundStyle(PerformanceStyle.muted)

            Text(controller.performanceText)
            Text(controller.solverText)
            Text("\(controller.particleCount) PARTICLES")
            Spacer()

            Button("Inject pressure") {
                controller.injectSignal()
            }
            .buttonStyle(PerformanceButtonStyle(emphasized: false))

            Text(controller.status)
                .foregroundStyle(PerformanceStyle.muted)
                .lineLimit(1)

            PerformanceReceipt(
                label: controller.rendererReceiptLabel,
                tone: controller.rendererTone
            )
        }
        .font(PerformanceStyle.recordFont(size: 9, weight: .medium))
        .monospacedDigit()
        .foregroundStyle(PerformanceStyle.tertiary)
        .padding(.horizontal, PerformanceStyle.spaceSM)
        .frame(minHeight: 50)
        .background(PerformanceStyle.shell)
        .overlay(alignment: .top) {
            Rectangle().fill(PerformanceStyle.border).frame(height: 1)
        }
    }

    private func statusTag(_ label: String) -> some View {
        Text(label)
            .font(
                PerformanceStyle.recordFont(
                    size: PerformanceHeaderContract.labelFontSize,
                    weight: .semibold
                )
            )
            .foregroundStyle(PerformanceStyle.secondary)
            .padding(
                .horizontal,
                PerformanceHeaderContract.safetyTagHorizontalPadding
            )
            .frame(minHeight: PerformanceHeaderContract.safetyTagHeight)
            .overlay {
                Rectangle().stroke(PerformanceStyle.border, lineWidth: 1)
            }
    }

    private var reducedMotionEnabled: Bool {
        reduceMotion
            || ProcessInfo.processInfo.environment["METAL_WATER_REDUCE_MOTION"] == "1"
    }
}

private struct InspectorWorkspace: View {
    @ObservedObject var controller: SimulatorController

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                inspectorModeButton(
                    "WORKFLOW",
                    selected: !controller.isArtifactTourPresented,
                    action: controller.showWorkflowInspector
                )
                inspectorModeButton(
                    "ARTIFACT TOUR",
                    selected: controller.isArtifactTourPresented,
                    action: controller.showArtifactTour
                )
            }
            .frame(height: 36)
            .background(PerformanceStyle.shellSecondary)
            .overlay(alignment: .bottom) {
                Rectangle().fill(PerformanceStyle.border).frame(height: 1)
            }

            if controller.isArtifactTourPresented {
                ArtifactTourInspector(controller: controller)
            } else {
                WorkflowInspector(controller: controller)
            }
        }
        .overlay(alignment: .leading) {
            Rectangle().fill(PerformanceStyle.line).frame(width: 1)
        }
    }

    private func inspectorModeButton(
        _ label: String,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                .foregroundStyle(selected ? Color.white : PerformanceStyle.tertiary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(selected ? PerformanceStyle.accent : Color.clear)
                .overlay {
                    if selected {
                        Rectangle().stroke(PerformanceStyle.focus, lineWidth: 1)
                    }
                }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

private struct ArtifactTeachingOverlay: View {
    let artifact: WorkflowArtifactTourItem

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("ARTIFACT CUE · \(artifact.chapterID.title.uppercased())")
                .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                .foregroundStyle(PerformanceStyle.documentMuted)
            Text(artifact.title)
                .font(PerformanceStyle.displayFont(size: 13))
                .foregroundStyle(PerformanceStyle.ink)
            Text(artifact.teachingCue)
                .font(PerformanceStyle.interfaceFont(size: 10, weight: .medium))
                .foregroundStyle(PerformanceStyle.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(10)
        .frame(width: 238, alignment: .leading)
        .background(PerformanceStyle.panel.opacity(0.94))
        .overlay(alignment: .leading) {
            Rectangle().fill(PerformanceStyle.accent).frame(width: 4)
        }
        .overlay { Rectangle().stroke(PerformanceStyle.lineStrong, lineWidth: 1) }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(12)
        .allowsHitTesting(false)
        .accessibilityElement(children: .combine)
    }
}

private struct ArtifactTourInspector: View {
    @ObservedObject var controller: SimulatorController

    private let columns = [
        GridItem(.flexible(), spacing: 5),
        GridItem(.flexible(), spacing: 5),
        GridItem(.flexible(), spacing: 5),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("GUIDED ARTIFACT ATLAS")
                            .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                            .foregroundStyle(PerformanceStyle.documentMuted)
                        Text("Six chapters · manifest governed")
                            .font(PerformanceStyle.displayFont(size: 14))
                            .foregroundStyle(PerformanceStyle.ink)
                    }
                    Spacer()
                    Text(controller.artifactCoverageLabel)
                        .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                        .foregroundStyle(
                            controller.artifactTourProgress?.isComplete == true
                                ? PerformanceStyle.receiptForeground(for: .ready)
                                : PerformanceStyle.accent
                        )
                }
                coverageBar
            }
            .padding(PerformanceWorkspaceContract.sectionPadding)

            Divider().overlay(PerformanceStyle.line)

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    chapterGrid
                    artifactList
                    artifactDetail
                }
                .padding(PerformanceWorkspaceContract.sectionPadding)
            }

            Divider().overlay(PerformanceStyle.line)

            HStack(spacing: 6) {
                Button("Back") { controller.visitPreviousArtifact() }
                    .buttonStyle(PerformanceButtonStyle(emphasized: false))
                    .keyboardShortcut("[", modifiers: [])
                Button("Next") { controller.visitNextArtifact() }
                    .buttonStyle(PerformanceButtonStyle(emphasized: true))
                    .keyboardShortcut("]", modifiers: [])
                Button("Replay") { controller.replayArtifactTour() }
                    .buttonStyle(PerformanceButtonStyle(emphasized: false))
            }
            .padding(PerformanceWorkspaceContract.sectionPadding)
        }
        .background(PerformanceStyle.paper)
        .foregroundStyle(PerformanceStyle.ink)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Workflow artifact tour")
    }

    private var coverageBar: some View {
        GeometryReader { geometry in
            let total = max(controller.artifactTourProgress?.totalCount ?? 0, 1)
            let visited = controller.artifactTourProgress?.visitedCount ?? 0
            ZStack(alignment: .leading) {
                Rectangle().fill(PerformanceStyle.line)
                Rectangle()
                    .fill(
                        controller.artifactTourProgress?.isComplete == true
                            ? PerformanceStyle.receiptForeground(for: .ready)
                            : PerformanceStyle.accent
                    )
                    .frame(width: geometry.size.width * CGFloat(visited) / CGFloat(total))
            }
        }
        .frame(height: 4)
        .accessibilityLabel(controller.artifactCoverageLabel)
    }

    private var chapterGrid: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("CHAPTERS")
            LazyVGrid(columns: columns, spacing: 5) {
                ForEach(controller.artifactTour?.chapters ?? []) { chapter in
                    let progress = controller.artifactTourProgress?.chapterProgress[chapter.id]
                    let chapterNumber = chapter.id.ordinal + 1
                    Button {
                        controller.visitArtifactChapter(chapter.id)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(String(chapterNumber))
                                .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                                .foregroundStyle(PerformanceStyle.accent)
                            Text(chapter.title.uppercased())
                                .font(PerformanceStyle.recordFont(size: 7, weight: .bold))
                                .foregroundStyle(PerformanceStyle.ink)
                                .lineLimit(2)
                            Text("\(progress?.visitedCount ?? 0)/\(progress?.totalCount ?? 0)")
                                .font(PerformanceStyle.recordFont(size: 7))
                                .foregroundStyle(PerformanceStyle.documentMuted)
                        }
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                        .padding(6)
                        .background(
                            controller.selectedArtifact?.chapterID == chapter.id
                                ? PerformanceStyle.court
                                : PerformanceStyle.panel
                        )
                        .overlay {
                            Rectangle().stroke(
                                progress?.isComplete == true
                                    ? PerformanceStyle.receiptForeground(for: .ready)
                                    : PerformanceStyle.lineStrong,
                                lineWidth: progress?.isComplete == true ? 2 : 1
                            )
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        "Chapter \(chapterNumber), \(chapter.title), "
                            + "\(progress?.visitedCount ?? 0) of \(progress?.totalCount ?? 0) visited"
                    )
                }
            }
        }
    }

    @ViewBuilder
    private var artifactList: some View {
        if let chapter = controller.selectedArtifactChapter {
            let chapterNumber = chapter.id.ordinal + 1
            VStack(alignment: .leading, spacing: 6) {
                sectionLabel("CHAPTER \(chapterNumber) · \(chapter.title.uppercased())")
                ForEach(chapter.artifacts) { artifact in
                    let selected = controller.selectedArtifact?.path == artifact.path
                    let visited = controller.artifactTourProgress?.visitedPaths.contains(artifact.path) == true
                    Button {
                        controller.visitArtifact(path: artifact.path)
                    } label: {
                        HStack(spacing: 8) {
                            Text(visited ? "✓" : "○")
                                .font(PerformanceStyle.recordFont(size: 9, weight: .bold))
                                .foregroundStyle(
                                    visited
                                        ? PerformanceStyle.receiptForeground(for: .ready)
                                        : PerformanceStyle.documentMuted
                                )
                            VStack(alignment: .leading, spacing: 2) {
                                Text(artifact.title)
                                    .font(PerformanceStyle.interfaceFont(size: 10, weight: .semibold))
                                Text(artifact.path)
                                    .font(PerformanceStyle.recordFont(size: 7))
                                    .foregroundStyle(PerformanceStyle.documentMuted)
                                    .lineLimit(1)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 8)
                        .frame(minHeight: 40)
                        .background(selected ? PerformanceStyle.court : PerformanceStyle.panel)
                        .overlay {
                            Rectangle().stroke(
                                selected ? PerformanceStyle.accent : PerformanceStyle.line,
                                lineWidth: selected ? 2 : 1
                            )
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        "\(artifact.title), \(visited ? "visited" : "not visited")"
                    )
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
    }

    @ViewBuilder
    private var artifactDetail: some View {
        if let artifact = controller.selectedArtifact {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("WHY THIS ARTIFACT EXISTS")
                detailRow("Purpose", artifact.purpose)
                detailRow("Owner", artifact.owner)
                detailRow("Inputs", artifact.inputs.joined(separator: " · "))
                detailRow("Outputs", artifact.outputs.joined(separator: " · "))
                detailRow("Downstream", artifact.downstream)
                detailRow("Water cue", artifact.teachingCue)
                detailRow("Hash", String(artifact.hash.prefix(19)) + "…")
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
            .foregroundStyle(PerformanceStyle.documentMuted)
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(PerformanceStyle.recordFont(size: 7, weight: .bold))
                .foregroundStyle(PerformanceStyle.documentMuted)
            Text(value)
                .font(PerformanceStyle.interfaceFont(size: 10))
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct ScenarioButton: View {
    let scenario: WorkflowScenario
    let selected: Bool
    let action: () -> Void
    @State private var isHovered = false
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(scenario.decision.rawValue.uppercased())
                    .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                    .foregroundStyle(decisionColor)
                Text(scenario.reasonCode.shortLabel)
                    .font(PerformanceStyle.interfaceFont(size: 10, weight: .medium))
                    .foregroundStyle(PerformanceStyle.primary)
                    .lineLimit(1)
            }
            .frame(width: 118, alignment: .leading)
            .padding(.horizontal, 8)
            .frame(minHeight: PerformanceWorkspaceContract.scenarioCardHeight)
            .background(
                selected || isHovered
                    ? PerformanceStyle.shellHover
                    : PerformanceStyle.shellSecondary
            )
            .overlay {
                Rectangle().stroke(
                    selected || isFocused
                        ? PerformanceStyle.borderStrong
                        : PerformanceStyle.border,
                    lineWidth: 1
                )
            }
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(decisionColor)
                    .frame(height: PerformanceWorkspaceContract.semanticRailWidth)
            }
            .overlay {
                if isFocused {
                    Rectangle()
                        .stroke(PerformanceStyle.focus, lineWidth: 2)
                        .padding(-3)
                }
            }
        }
        .buttonStyle(.plain)
        .focused($isFocused)
        .onHover { isHovered = $0 }
        .accessibilityLabel("\(scenario.decision.rawValue), \(scenario.reasonCode.shortLabel)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var decisionColor: Color {
        switch scenario.decision {
        case .run: PerformanceStyle.receiptForeground(for: .ready)
        case .wait: PerformanceStyle.receiptForeground(for: .review)
        case .stop: PerformanceStyle.receiptForeground(for: .stop)
        }
    }
}

private struct WorkflowStageRail: View {
    let current: WorkflowStage

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(WorkflowStage.allCases.enumerated()), id: \.element) { index, stage in
                HStack(spacing: 8) {
                    ZStack {
                        Rectangle()
                            .fill(
                                index <= currentIndex
                                    ? PerformanceStyle.accent
                                    : PerformanceStyle.panel
                            )
                            .frame(
                                width: PerformanceWorkspaceContract.stageMarkerSize,
                                height: PerformanceWorkspaceContract.stageMarkerSize
                            )
                            .overlay {
                                Rectangle()
                                    .stroke(
                                        index <= currentIndex
                                            ? PerformanceStyle.accent
                                            : PerformanceStyle.lineStrong,
                                        lineWidth: 1
                                    )
                            }
                        Text("\(index + 1)")
                            .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                            .foregroundStyle(index <= currentIndex ? Color.white : PerformanceStyle.ink)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(stage.rawValue.uppercased())
                            .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                        Text(stageDetail(stage))
                            .font(PerformanceStyle.interfaceFont(size: 9))
                            .foregroundStyle(PerformanceStyle.documentMuted)
                    }
                    if index < WorkflowStage.allCases.count - 1 {
                        Rectangle()
                            .fill(index < currentIndex ? PerformanceStyle.accent : PerformanceStyle.line)
                            .frame(height: index < currentIndex ? 2 : 1)
                            .padding(.horizontal, 8)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .foregroundStyle(PerformanceStyle.ink)
        .padding(.horizontal, PerformanceStyle.spaceSM)
        .frame(minHeight: PerformanceWorkspaceContract.stageRailHeight)
        .background(PerformanceStyle.paper)
        .overlay(alignment: .bottom) {
            Rectangle().fill(PerformanceStyle.line).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Workflow stage \(current.rawValue)")
    }

    private var currentIndex: Int {
        WorkflowStage.allCases.firstIndex(of: current) ?? 0
    }

    private func stageDetail(_ stage: WorkflowStage) -> String {
        switch stage {
        case .signal: "Case enters"
        case .decision: "Boundary checks"
        case .action: "Flow routes"
        case .proof: "Receipt remains"
        }
    }
}

private struct HydraulicBoundaryOverlay: View {
    @ObservedObject var controller: SimulatorController

    var body: some View {
        GeometryReader { geometry in
            if let gate = controller.simulatorArtifacts?.hydraulicProjection.gate {
                let aspect = max(geometry.size.width / geometry.size.height, 0.001)
                let gateY = geometry.size.height * CGFloat(1 - ((gate.y + 1) * 0.5))
                let center = geometry.size.width * 0.5
                    + CGFloat(gate.openingCenterX / (2 * Float(aspect))) * geometry.size.width
                let halfWidth = CGFloat(gate.openingHalfWidth / (2 * Float(aspect)))
                    * geometry.size.width
                let isOpen = controller.playback?.isGateOpen ?? false
                let maximumLeafWidth = max(center, geometry.size.width - center)
                let tiltDrop = min(
                    52,
                    maximumLeafWidth * tan(
                        CGFloat(
                            PerformanceWorkspaceContract.gateOpenTiltDegrees
                                * .pi / 180
                        )
                    )
                )

                ZStack(alignment: .topLeading) {
                    WorkflowStageHydraulicShape(
                        stage: controller.workflowStage,
                        decision: controller.selectedScenario?.decision ?? .stop,
                        gateY: gateY,
                        centerX: center,
                        openingHalfWidth: halfWidth
                    )
                    .stroke(
                        boundaryColor.opacity(0.72),
                        style: StrokeStyle(lineWidth: 1.5, lineCap: .square)
                    )
                    .animation(.easeInOut(duration: 0.28), value: controller.workflowStage)

                    GateLeavesShape(
                        gateY: gateY,
                        centerX: center,
                        openingHalfWidth: halfWidth,
                        tiltDrop: tiltDrop,
                        progress: isOpen ? 1 : 0
                    )
                    .stroke(
                        PerformanceStyle.panel.opacity(0.96),
                        style: StrokeStyle(
                            lineWidth: PerformanceWorkspaceContract.gateLineWidth + 4,
                            lineCap: .square
                        )
                    )
                    .overlay {
                        GateLeavesShape(
                            gateY: gateY,
                            centerX: center,
                            openingHalfWidth: halfWidth,
                            tiltDrop: tiltDrop,
                            progress: isOpen ? 1 : 0
                        )
                        .stroke(
                            PerformanceStyle.inkSoft,
                            style: StrokeStyle(
                                lineWidth: PerformanceWorkspaceContract.gateLineWidth,
                                lineCap: .square
                            )
                        )
                    }
                    .overlay {
                        GateLeavesShape(
                            gateY: gateY,
                            centerX: center,
                            openingHalfWidth: halfWidth,
                            tiltDrop: tiltDrop,
                            progress: isOpen ? 1 : 0
                        )
                        .stroke(
                            boundaryColor.opacity(0.86),
                            style: StrokeStyle(lineWidth: 1, dash: [10, 5])
                        )
                    }
                    .animation(
                        .easeInOut(
                            duration: PerformanceWorkspaceContract.gateTransitionDuration
                        ),
                        value: isOpen
                    )

                    if controller.workflowStage != .signal,
                       let reasonCode = controller.selectedScenario?.reasonCode {
                        let pattern = WorkflowBoundaryPattern.resolve(reasonCode)
                        WorkflowBoundaryPatternShape(
                            pattern: pattern,
                            gateY: gateY,
                            centerX: center,
                            openingHalfWidth: halfWidth
                        )
                        .stroke(
                            boundaryColor,
                            style: StrokeStyle(
                                lineWidth: 2,
                                lineCap: .square,
                                lineJoin: .miter,
                                dash: boundaryDash(pattern)
                            )
                        )
                    }

                    topologyLabel("SIGNAL RESERVOIR", x: 10, y: 10)
                    gateLabel(
                        gateLabelText(isOpen: isOpen),
                        x: max(10, center - 78),
                        y: max(10, gateY - 30)
                    )
                    topologyLabel("ACTION CHANNEL", x: 10, y: min(geometry.size.height - 48, gateY + 14))
                    topologyLabel("PROOF WAKE", x: 10, y: geometry.size.height - 28)
                }
            }
        }
        .allowsHitTesting(false)
    }

    private var boundaryColor: Color {
        PerformanceStyle.receiptForeground(for: controller.activeBoundaryTone)
    }

    private func gateLabelText(isOpen: Bool) -> String {
        if isOpen {
            return "DECISION GATE · TILTED / DRAINING"
        }
        if controller.isReservoirDrained {
            return "DECISION GATE · DRAINED / CLOSED"
        }
        if controller.workflowStage != .signal,
           let reasonCode = controller.selectedScenario?.reasonCode {
            return "\(WorkflowBoundaryPattern.resolve(reasonCode).label.uppercased()) · CLOSED"
        }
        return "DECISION GATE · CLOSED"
    }

    private func boundaryDash(_ pattern: WorkflowBoundaryPattern) -> [CGFloat] {
        switch pattern {
        case .releaseChannel, .approvalLock: []
        case .policyBraces: [7, 3]
        case .evidenceGaps: [2, 5]
        case .unknownCross: [9, 4]
        }
    }

    private func topologyLabel(_ label: String, x: CGFloat, y: CGFloat) -> some View {
        Text(label)
            .font(PerformanceStyle.recordFont(size: 9, weight: .bold))
            .foregroundStyle(PerformanceStyle.ink)
            .padding(.horizontal, PerformanceWorkspaceContract.stampHorizontalPadding)
            .frame(minHeight: PerformanceWorkspaceContract.stampHeight)
            .background(PerformanceStyle.panel.opacity(0.94))
            .overlay { Rectangle().stroke(PerformanceStyle.lineStrong, lineWidth: 1) }
            .position(x: x + 64, y: y + 14)
    }

    private func gateLabel(_ label: String, x: CGFloat, y: CGFloat) -> some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(boundaryColor)
                .frame(
                    width: PerformanceWorkspaceContract.semanticRailWidth,
                    height: PerformanceWorkspaceContract.stampHeight
                )
            Text(label)
                .font(PerformanceStyle.recordFont(size: 9, weight: .bold))
                .foregroundStyle(PerformanceStyle.ink)
                .padding(.horizontal, PerformanceWorkspaceContract.stampHorizontalPadding)
        }
        .frame(height: PerformanceWorkspaceContract.stampHeight)
        .background(PerformanceStyle.panel.opacity(0.96))
        .overlay { Rectangle().stroke(PerformanceStyle.lineStrong, lineWidth: 1) }
        .position(x: x + 78, y: y + 14)
    }
}

private struct WorkflowStageHydraulicShape: Shape {
    let stage: WorkflowStage
    let decision: WorkflowDecision
    let gateY: CGFloat
    let centerX: CGFloat
    let openingHalfWidth: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        switch stage {
        case .signal:
            for radius in [10.0, 20.0, 30.0] {
                path.addEllipse(
                    in: CGRect(
                        x: centerX - radius,
                        y: max(16, gateY - 112) - radius,
                        width: radius * 2,
                        height: radius * 2
                    )
                )
            }
        case .decision:
            let width = openingHalfWidth + 28
            path.move(to: CGPoint(x: centerX - width, y: gateY - 28))
            path.addLine(to: CGPoint(x: centerX - width, y: gateY + 18))
            path.move(to: CGPoint(x: centerX + width, y: gateY - 28))
            path.addLine(to: CGPoint(x: centerX + width, y: gateY + 18))
            path.move(to: CGPoint(x: centerX - width, y: gateY - 28))
            path.addLine(to: CGPoint(x: centerX - width + 18, y: gateY - 28))
            path.move(to: CGPoint(x: centerX + width - 18, y: gateY - 28))
            path.addLine(to: CGPoint(x: centerX + width, y: gateY - 28))
        case .action:
            if decision == .run {
                for offset in [-openingHalfWidth * 0.55, 0, openingHalfWidth * 0.55] {
                    let x = centerX + offset
                    path.move(to: CGPoint(x: x, y: gateY + 18))
                    path.addLine(to: CGPoint(x: x, y: rect.maxY - 26))
                    path.move(to: CGPoint(x: x - 5, y: rect.maxY - 36))
                    path.addLine(to: CGPoint(x: x, y: rect.maxY - 26))
                    path.addLine(to: CGPoint(x: x + 5, y: rect.maxY - 36))
                }
            } else {
                for offset in [-22.0, 0, 22.0] {
                    path.move(to: CGPoint(x: centerX + offset, y: gateY - 34))
                    path.addLine(to: CGPoint(x: centerX + offset, y: gateY - 10))
                }
            }
        case .proof:
            for index in 0..<3 {
                let y = gateY + 54 + CGFloat(index * 22)
                path.move(to: CGPoint(x: rect.minX + 26, y: y))
                path.addCurve(
                    to: CGPoint(x: rect.maxX - 26, y: y),
                    control1: CGPoint(x: rect.width * 0.34, y: y - 10),
                    control2: CGPoint(x: rect.width * 0.66, y: y + 10)
                )
            }
        }
        return path
    }
}

private struct WorkflowBoundaryPatternShape: Shape {
    let pattern: WorkflowBoundaryPattern
    let gateY: CGFloat
    let centerX: CGFloat
    let openingHalfWidth: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        switch pattern {
        case .releaseChannel:
            for x in [centerX - openingHalfWidth, centerX + openingHalfWidth] {
                path.move(to: CGPoint(x: x, y: gateY - 12))
                path.addLine(to: CGPoint(x: x, y: min(rect.maxY - 18, gateY + 72)))
            }
        case .approvalLock:
            for x in [centerX - 9, centerX + 9] {
                path.move(to: CGPoint(x: x, y: gateY - 22))
                path.addLine(to: CGPoint(x: x, y: gateY + 22))
            }
            path.move(to: CGPoint(x: centerX - 22, y: gateY - 12))
            path.addLine(to: CGPoint(x: centerX + 22, y: gateY - 12))
        case .policyBraces:
            for offset in stride(from: -42.0, through: 42.0, by: 14.0) {
                path.move(to: CGPoint(x: centerX + offset - 7, y: gateY - 15))
                path.addLine(to: CGPoint(x: centerX + offset + 7, y: gateY + 15))
            }
        case .evidenceGaps:
            for offset in [-36.0, -18.0, 0, 18.0, 36.0] {
                path.addRect(
                    CGRect(x: centerX + offset - 3, y: gateY - 22, width: 6, height: 12)
                )
            }
        case .unknownCross:
            path.move(to: CGPoint(x: centerX - 28, y: gateY - 28))
            path.addLine(to: CGPoint(x: centerX + 28, y: gateY + 28))
            path.move(to: CGPoint(x: centerX + 28, y: gateY - 28))
            path.addLine(to: CGPoint(x: centerX - 28, y: gateY + 28))
        }
        return path
    }
}

private struct GateLeavesShape: Shape {
    let gateY: CGFloat
    let centerX: CGFloat
    let openingHalfWidth: CGFloat
    let tiltDrop: CGFloat
    var progress: CGFloat

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let halfGap = openingHalfWidth * progress
        let drop = tiltDrop * progress
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: gateY))
        path.addLine(to: CGPoint(x: centerX - halfGap, y: gateY + drop))
        path.move(to: CGPoint(x: centerX + halfGap, y: gateY + drop))
        path.addLine(to: CGPoint(x: rect.maxX, y: gateY))
        return path
    }
}

private struct WorkflowInspector: View {
    @ObservedObject var controller: SimulatorController

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                Rectangle()
                    .fill(PerformanceStyle.receiptForeground(for: controller.workflowTone))
                    .frame(
                        width: PerformanceWorkspaceContract.semanticRailWidth,
                        height: PerformanceWorkspaceContract.inspectorHeaderRailHeight
                    )
                VStack(alignment: .leading, spacing: 3) {
                    Text("PROOF INSPECTOR")
                        .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                        .foregroundStyle(PerformanceStyle.documentMuted)
                    Text(controller.selectedScenario?.title ?? "Workflow unavailable")
                        .font(PerformanceStyle.displayFont(size: 14))
                        .foregroundStyle(PerformanceStyle.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.leading, PerformanceWorkspaceContract.sectionPadding)
                Spacer(minLength: 4)
            }
            .padding(.trailing, PerformanceWorkspaceContract.sectionPadding)
            .padding(.vertical, PerformanceWorkspaceContract.sectionPadding)

            PerformanceReceipt(
                label: controller.workflowReceiptLabel,
                tone: controller.workflowTone
            )
            .padding(.horizontal, PerformanceWorkspaceContract.sectionPadding)
            .padding(.bottom, 10)

            Divider().overlay(PerformanceStyle.line)

            if let scenario = controller.selectedScenario {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        inspectorRow("Source", "\(scenario.caseId) · \(scenario.stateBefore)")
                        inspectorRow("Decision", "\(scenario.decision.rawValue.uppercased()) · \(scenario.reasonCode.shortLabel)")
                        if !scenario.missingEvidence.isEmpty {
                            inspectorRow(
                                "Missing",
                                scenario.missingEvidence.joined(separator: " · "),
                                emphasis: .stop
                            )
                        }
                        inspectorRow("Action", scenario.canExecute ? "\(scenario.actionId) · allowed" : "\(scenario.actionId) · contained")
                        inspectorRow("Result", scenario.stateAfter)
                        inspectorRow("Owner", scenario.owner)
                        inspectorRow("Authority", scenario.authority)
                        inspectorRow("Version", "\(scenario.receipt.workflowVersion) · policy compiled")
                        inspectorRow(
                            "Evidence",
                            scenario.evidenceReferences.isEmpty
                                ? "None supplied"
                                : scenario.evidenceReferences.joined(separator: " · ")
                        )
                        inspectorRow("Receipt", scenario.receipt.correlationId)
                        inspectorRow("Recovery", scenario.recovery.path)
                    }
                }
            }

            Divider().overlay(PerformanceStyle.line)

            VStack(alignment: .leading, spacing: 7) {
                Button("Export proof") {
                    controller.exportProof()
                }
                .keyboardShortcut("e", modifiers: [])
                .buttonStyle(PerformanceButtonStyle(emphasized: false))
                .disabled(!controller.canExportProof)

                if let url = controller.proofExportURL {
                    Text(url.path)
                        .font(PerformanceStyle.recordFont(size: 8))
                        .foregroundStyle(PerformanceStyle.documentMuted)
                        .lineLimit(2)
                        .textSelection(.enabled)
                } else {
                    Text(controller.proofExportRequirement)
                        .font(PerformanceStyle.recordFont(size: 8))
                        .foregroundStyle(PerformanceStyle.documentMuted)
                }
            }
            .padding(PerformanceWorkspaceContract.sectionPadding)
        }
        .background(PerformanceStyle.paper)
        .overlay(alignment: .leading) {
            Rectangle().fill(PerformanceStyle.line).frame(width: 1)
        }
        .foregroundStyle(PerformanceStyle.ink)
    }

    private func inspectorRow(
        _ label: String,
        _ value: String,
        emphasis: PerformanceReceiptTone? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased())
                .font(PerformanceStyle.recordFont(size: 8, weight: .bold))
                .foregroundStyle(PerformanceStyle.documentMuted)
            Text(value)
                .font(PerformanceStyle.interfaceFont(size: 10))
                .foregroundStyle(
                    emphasis.map(PerformanceStyle.receiptForeground(for:)) ?? PerformanceStyle.ink
                )
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, PerformanceWorkspaceContract.sectionPadding)
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(PerformanceStyle.line).frame(height: 1)
        }
    }
}
