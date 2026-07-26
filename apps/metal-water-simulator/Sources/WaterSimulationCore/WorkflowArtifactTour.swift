import Foundation

public enum WorkflowArtifactChapterID: String, Codable, CaseIterable, Sendable {
    case topology
    case dataContracts = "data_contracts"
    case executionContracts = "execution_contracts"
    case governance
    case evaluationEvidence = "evaluation_evidence"
    case presentationProvenance = "presentation_provenance"

    public var title: String {
        switch self {
        case .topology: "Topology"
        case .dataContracts: "Data contracts"
        case .executionContracts: "Execution contracts"
        case .governance: "Governance"
        case .evaluationEvidence: "Evaluation + evidence"
        case .presentationProvenance: "Presentation + provenance"
        }
    }

    public var ordinal: Int {
        Self.allCases.firstIndex(of: self) ?? 0
    }
}

public struct WorkflowArtifactTourItem: Codable, Equatable, Identifiable, Sendable {
    public var id: String { path }

    public let path: String
    public let hash: String
    public let title: String
    public let chapterID: WorkflowArtifactChapterID
    public let purpose: String
    public let owner: String
    public let inputs: [String]
    public let outputs: [String]
    public let downstream: String
    public let teachingCue: String
}

public struct WorkflowArtifactTourChapter: Codable, Equatable, Identifiable, Sendable {
    public var id: WorkflowArtifactChapterID { chapterID }

    public let chapterID: WorkflowArtifactChapterID
    public let title: String
    public let artifacts: [WorkflowArtifactTourItem]
}

public struct WorkflowArtifactTour: Codable, Equatable, Sendable {
    public let chapters: [WorkflowArtifactTourChapter]

    public var artifacts: [WorkflowArtifactTourItem] {
        chapters.flatMap(\.artifacts)
    }

    public init(manifest: WorkflowArtifactManifest) throws {
        var manifestFiles: [String: WorkflowArtifactManifest.File] = [:]
        var duplicatePaths: Set<String> = []
        for file in manifest.files {
            if manifestFiles.updateValue(file, forKey: file.path) != nil {
                duplicatePaths.insert(file.path)
            }
        }
        guard duplicatePaths.isEmpty else {
            throw WorkflowArtifactTourError.duplicateManifestPaths(duplicatePaths.sorted())
        }

        let blueprintPaths = Set(Self.blueprints.map(\.path))
        let manifestPaths = Set(manifestFiles.keys)
        let missingExplanations = manifestPaths.subtracting(blueprintPaths).sorted()
        let staleExplanations = blueprintPaths.subtracting(manifestPaths).sorted()
        guard missingExplanations.isEmpty, staleExplanations.isEmpty else {
            throw WorkflowArtifactTourError.manifestCoverageMismatch(
                missingExplanations: missingExplanations,
                staleExplanations: staleExplanations
            )
        }

        let items = Self.blueprints.map { blueprint in
            let file = manifestFiles[blueprint.path]!
            return WorkflowArtifactTourItem(
                path: file.path,
                hash: file.hash,
                title: blueprint.title,
                chapterID: blueprint.chapterID,
                purpose: blueprint.purpose,
                owner: blueprint.owner,
                inputs: blueprint.inputs,
                outputs: blueprint.outputs,
                downstream: blueprint.downstream,
                teachingCue: blueprint.teachingCue
            )
        }

        chapters = WorkflowArtifactChapterID.allCases.map { chapterID in
            WorkflowArtifactTourChapter(
                chapterID: chapterID,
                title: chapterID.title,
                artifacts: items.filter { $0.chapterID == chapterID }
            )
        }
    }
}

public enum WorkflowArtifactTourError: Error, LocalizedError, Equatable {
    case duplicateManifestPaths([String])
    case manifestCoverageMismatch(
        missingExplanations: [String],
        staleExplanations: [String]
    )

    public var errorDescription: String? {
        switch self {
        case let .duplicateManifestPaths(paths):
            "The workflow artifact manifest repeats: \(paths.joined(separator: ", "))."
        case let .manifestCoverageMismatch(missing, stale):
            "The artifact tour does not match the manifest. Missing explanations: "
                + "\(missing.joined(separator: ", ")); stale explanations: "
                + "\(stale.joined(separator: ", "))."
        }
    }
}

public struct WorkflowArtifactChapterProgress: Codable, Equatable, Sendable {
    public let visitedCount: Int
    public let totalCount: Int

    public var isComplete: Bool {
        totalCount > 0 && visitedCount == totalCount
    }
}

public struct WorkflowArtifactTourProgress: Codable, Equatable, Sendable {
    public private(set) var currentPath: String?
    public private(set) var visitedPaths: Set<String>
    public private(set) var visitOrder: [String]

    private let artifactPaths: [String]
    private let chapterPaths: [WorkflowArtifactChapterID: [String]]

    public init(tour: WorkflowArtifactTour) {
        artifactPaths = tour.artifacts.map(\.path)
        chapterPaths = Dictionary(
            uniqueKeysWithValues: tour.chapters.map { chapter in
                (chapter.id, chapter.artifacts.map(\.path))
            }
        )
        currentPath = artifactPaths.first
        visitedPaths = []
        visitOrder = []
    }

    public var visitedCount: Int { visitedPaths.count }
    public var totalCount: Int { artifactPaths.count }
    public var isComplete: Bool { totalCount > 0 && visitedCount == totalCount }

    public var chapterProgress: [WorkflowArtifactChapterID: WorkflowArtifactChapterProgress] {
        chapterPaths.mapValues { paths in
            WorkflowArtifactChapterProgress(
                visitedCount: paths.reduce(into: 0) { count, path in
                    if visitedPaths.contains(path) {
                        count += 1
                    }
                },
                totalCount: paths.count
            )
        }
    }

    public mutating func visit(path: String) throws {
        guard artifactPaths.contains(path) else {
            throw WorkflowArtifactTourProgressError.unknownPath(path)
        }
        currentPath = path
        if visitedPaths.insert(path).inserted {
            visitOrder.append(path)
        }
    }
}

public enum WorkflowArtifactTourProgressError: Error, LocalizedError, Equatable {
    case unknownPath(String)

    public var errorDescription: String? {
        switch self {
        case let .unknownPath(path):
            "The workflow artifact tour cannot visit unknown path \(path)."
        }
    }
}

public struct WorkflowArtifactTourEvidence: Codable, Equatable, Sendable {
    public let schemaVersion: String
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let complete: Bool
    public let visitedCount: Int
    public let totalCount: Int
    public let visitOrder: [String]
    public let artifacts: [WorkflowArtifactTourItem]

    public init(
        catalog: WorkflowCatalog,
        tour: WorkflowArtifactTour,
        progress: WorkflowArtifactTourProgress
    ) throws {
        guard progress.isComplete else {
            throw WorkflowArtifactTourEvidenceError.incompleteCoverage(
                progress.visitedCount,
                progress.totalCount
            )
        }
        guard Set(progress.visitOrder) == Set(tour.artifacts.map(\.path)),
              progress.visitOrder.count == tour.artifacts.count
        else {
            throw WorkflowArtifactTourEvidenceError.invalidVisitOrder
        }

        workflowId = catalog.workflowId
        schemaVersion = "metal_water_artifact_tour.v0.1"
        workflowVersion = catalog.workflowVersion
        definitionHash = catalog.definitionHash
        complete = true
        visitedCount = progress.visitedCount
        totalCount = progress.totalCount
        visitOrder = progress.visitOrder
        artifacts = tour.artifacts
    }

    public func jsonData() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }
}

public enum WorkflowArtifactTourEvidenceError: Error, LocalizedError, Equatable {
    case incompleteCoverage(Int, Int)
    case invalidVisitOrder

    public var errorDescription: String? {
        switch self {
        case let .incompleteCoverage(visited, total):
            "Artifact tour proof requires complete coverage; \(visited) of \(total) visited."
        case .invalidVisitOrder:
            "Artifact tour proof requires one explicit visit for every manifest artifact."
        }
    }
}

private extension WorkflowArtifactTour {
    struct Blueprint {
        let path: String
        let title: String
        let chapterID: WorkflowArtifactChapterID
        let purpose: String
        let owner: String
        let inputs: [String]
        let outputs: [String]
        let downstream: String
        let teachingCue: String
    }

    static let blueprints: [Blueprint] = [
        Blueprint(
            path: "compiled-workflow.json",
            title: "Compiled workflow",
            chapterID: .topology,
            purpose: "Assembles the governed workflow into one versioned runtime contract.",
            owner: "Workflow compiler",
            inputs: ["workflow definition", "policy references"],
            outputs: ["compiled transitions", "linked governance"],
            downstream: "Every generated contract agrees with this definition hash.",
            teachingCue: "The reservoir: one bounded body of workflow state."
        ),
        Blueprint(
            path: "workflow-map.json",
            title: "Workflow map",
            chapterID: .topology,
            purpose: "Shows actors, states, actions, and authority relationships.",
            owner: "Workflow owner",
            inputs: ["compiled workflow"],
            outputs: ["navigable operating topology"],
            downstream: "Contracts and approvals attach to named map elements.",
            teachingCue: "The watershed: where every channel begins and ends."
        ),
        Blueprint(
            path: "object-schemas.json",
            title: "Object schemas",
            chapterID: .dataContracts,
            purpose: "Defines the records that may enter, change, and leave the workflow.",
            owner: "Data owners",
            inputs: ["workflow objects"],
            outputs: ["validated record shapes"],
            downstream: "Tools and evidence share the same object vocabulary.",
            teachingCue: "The vessel shape: what the water is allowed to occupy."
        ),
        Blueprint(
            path: "event-schemas.json",
            title: "Event schemas",
            chapterID: .dataContracts,
            purpose: "Defines observable signals and state-transition events.",
            owner: "Automation owners",
            inputs: ["workflow transitions"],
            outputs: ["validated event envelopes"],
            downstream: "Replay and evidence can order the same events.",
            teachingCue: "The pressure pulse: a named signal entering the system."
        ),
        Blueprint(
            path: "runtime-targets.json",
            title: "Runtime targets",
            chapterID: .dataContracts,
            purpose: "Points each responsibility to the system that actually owns it.",
            owner: "Runtime owners",
            inputs: ["workflow map", "system inventory"],
            outputs: ["owned runtime bindings"],
            downstream: "Execution contracts route to existing systems instead of replacing them.",
            teachingCue: "The destination basin: where governed flow is allowed to land."
        ),
        Blueprint(
            path: "tool-contracts.json",
            title: "Tool contracts",
            chapterID: .executionContracts,
            purpose: "Defines bounded machine actions, inputs, outputs, and receipts.",
            owner: "Tool owners",
            inputs: ["runtime targets", "object schemas"],
            outputs: ["callable action boundaries"],
            downstream: "Decisions can permit only known, typed actions.",
            teachingCue: "The pipe: a constrained route for one action."
        ),
        Blueprint(
            path: "agent-contracts.json",
            title: "Agent contracts",
            chapterID: .executionContracts,
            purpose: "Defines agent roles, context, tools, escalation, and evidence duties.",
            owner: "Agent operators",
            inputs: ["tool contracts", "governance policy"],
            outputs: ["bounded agent responsibilities"],
            downstream: "Operators can distinguish delegated work from retained authority.",
            teachingCue: "The pump operator: movement without ownership of the gate."
        ),
        Blueprint(
            path: "decision-inventory.json",
            title: "Decision inventory",
            chapterID: .governance,
            purpose: "Classifies which decisions may run, wait, or must stop.",
            owner: "Policy owner",
            inputs: ["actions", "authority policy"],
            outputs: ["autonomy classifications", "reason codes"],
            downstream: "The governed gate resolves every known action fail-closed.",
            teachingCue: "The gate controller: RUN, WAIT, or STOP."
        ),
        Blueprint(
            path: "approval-surfaces.json",
            title: "Approval surfaces",
            chapterID: .governance,
            purpose: "Names consequential checkpoints, approvers, evidence, and recovery.",
            owner: "Approval owners",
            inputs: ["decision inventory", "evidence requirements"],
            outputs: ["human review boundaries"],
            downstream: "WAIT remains contained until the named owner acts.",
            teachingCue: "The lock: pressure waits for explicit human authority."
        ),
        Blueprint(
            path: "evaluation-manifest.json",
            title: "Evaluation manifest",
            chapterID: .evaluationEvidence,
            purpose: "Declares the checks that distinguish a safe workflow from a plausible one.",
            owner: "Evaluation owner",
            inputs: ["workflow expectations", "governance requirements"],
            outputs: ["named evaluation suite"],
            downstream: "Acceptance cannot silently omit consequential behavior.",
            teachingCue: "The gauges: measurements that can fail the run."
        ),
        Blueprint(
            path: "replay-report.json",
            title: "Replay report",
            chapterID: .evaluationEvidence,
            purpose: "Replays representative history and records observed decisions.",
            owner: "Workflow compiler",
            inputs: ["historical cases", "compiled decisions"],
            outputs: ["ordered replay outcomes", "receipts"],
            downstream: "The simulator's five pressure cases come from this evidence.",
            teachingCue: "The test release: known pressure applied to the gate."
        ),
        Blueprint(
            path: "evidence-ledger.json",
            title: "Evidence ledger",
            chapterID: .evaluationEvidence,
            purpose: "Accounts for evidence present, missing, and required for recovery.",
            owner: "Evidence owner",
            inputs: ["replay receipts", "evidence references"],
            outputs: ["case-level evidence accounting"],
            downstream: "Missing evidence becomes a visible STOP rather than an assumption.",
            teachingCue: "The level marks: what is present and what is still missing."
        ),
        Blueprint(
            path: "acceptance-summary.json",
            title: "Acceptance summary",
            chapterID: .evaluationEvidence,
            purpose: "Proves required outcomes and consequential governance are covered.",
            owner: "Release reviewer",
            inputs: ["evaluation results", "replay coverage"],
            outputs: ["acceptance verdict"],
            downstream: "The bundle fails closed when required coverage is incomplete.",
            teachingCue: "The spillway inspection: release only after every boundary holds."
        ),
        Blueprint(
            path: "operator-console/data.json",
            title: "Operator console data",
            chapterID: .presentationProvenance,
            purpose: "Packages governed workflow evidence for an operator-readable surface.",
            owner: "Operator experience",
            inputs: ["compiled contracts", "replay evidence"],
            outputs: ["read-only console projection"],
            downstream: "People inspect one coherent view without gaining execution authority.",
            teachingCue: "The observation window: see the system without opening the gate."
        ),
        Blueprint(
            path: "operator-console/index.html",
            title: "Operator console view",
            chapterID: .presentationProvenance,
            purpose: "Renders the read-only operating view from generated data.",
            owner: "Operator experience",
            inputs: ["operator console data"],
            outputs: ["inspectable generated interface"],
            downstream: "Reviewers can verify the same bundle outside the simulator.",
            teachingCue: "The final viewing deck: an explanation, not a control surface."
        ),
    ]
}
