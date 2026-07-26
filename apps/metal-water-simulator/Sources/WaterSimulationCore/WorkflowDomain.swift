import CryptoKit
import Foundation

public enum WorkflowDecision: String, Codable, Sendable {
    case run
    case wait
    case stop
}

public enum WorkflowStage: String, Codable, CaseIterable, Sendable {
    case signal
    case decision
    case action
    case proof
}

public struct WorkflowPlayback: Equatable, Sendable {
    public let scenario: WorkflowScenario
    public private(set) var stage: WorkflowStage

    public init(scenario: WorkflowScenario, stage: WorkflowStage = .signal) {
        self.scenario = scenario
        self.stage = stage
    }

    public var isGateOpen: Bool {
        scenario.decision == .run && stage == .action
    }

    public mutating func advance() {
        switch stage {
        case .signal: stage = .decision
        case .decision: stage = .action
        case .action: stage = .proof
        case .proof: break
        }
    }

    public mutating func reset() {
        stage = .signal
    }
}

public enum WorkflowOutcome: String, Codable, Sendable {
    case pass
    case approvalRequired = "approval_required"
    case blocked
}

public enum WorkflowReasonCode: String, Codable, CaseIterable, Hashable, Sendable {
    case actionAllowed = "ACTION_ALLOWED"
    case approvalRequired = "APPROVAL_REQUIRED"
    case policyBlocked = "POLICY_BLOCKED"
    case insufficientEvidence = "INSUFFICIENT_EVIDENCE"
    case unknownAction = "UNKNOWN_ACTION"
    case invalidTransition = "INVALID_TRANSITION"

    public var decision: WorkflowDecision {
        switch self {
        case .actionAllowed:
            .run
        case .approvalRequired:
            .wait
        case .policyBlocked, .insufficientEvidence, .unknownAction, .invalidTransition:
            .stop
        }
    }

    public var shortLabel: String {
        switch self {
        case .actionAllowed:
            "Passing"
        case .approvalRequired:
            "Approval required"
        case .policyBlocked:
            "Policy blocked"
        case .insufficientEvidence:
            "Insufficient evidence"
        case .unknownAction:
            "Unknown action"
        case .invalidTransition:
            "Invalid transition"
        }
    }

    fileprivate var presentationOrder: Int {
        switch self {
        case .actionAllowed: 0
        case .approvalRequired: 1
        case .policyBlocked: 2
        case .insufficientEvidence: 3
        case .unknownAction: 4
        case .invalidTransition: 5
        }
    }
}

public enum JSONValue: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case array([JSONValue])
    case object([String: JSONValue])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case let .string(value): try container.encode(value)
        case let .number(value): try container.encode(value)
        case let .bool(value): try container.encode(value)
        case let .array(value): try container.encode(value)
        case let .object(value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

public struct WorkflowRecovery: Codable, Equatable, Sendable {
    public let mode: String
    public let owner: String
    public let path: String
}

public struct WorkflowReplayReceipt: Codable, Equatable, Sendable {
    public let schemaVersion: String
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let caseId: String
    public let actionId: String
    public let correlationId: String
    public let outcome: WorkflowOutcome
    public let receiptFields: [String: JSONValue]
}

public struct WorkflowScenario: Codable, Equatable, Identifiable, Sendable {
    public let caseId: String
    public let title: String
    public let actionId: String
    public let stateBefore: String
    public let stateAfter: String
    public let observedOutcome: WorkflowOutcome
    public let expectedOutcome: WorkflowOutcome
    public let expectationMatched: Bool
    public let canExecute: Bool
    public let reasonCode: WorkflowReasonCode
    public let authority: String
    public let owner: String
    public let evidenceReferences: [String]
    public let missingEvidence: [String]
    public let recovery: WorkflowRecovery
    public let receipt: WorkflowReplayReceipt

    public var id: String { caseId }
    public var decision: WorkflowDecision { reasonCode.decision }
}

public struct WorkflowTraceEvent: Codable, Equatable, Sendable {
    public let sequence: Int
    public let stage: WorkflowStage
    public let label: String
    public let detail: String
}

public struct WorkflowProofBundle: Encodable, Equatable, Sendable {
    public let schemaVersion = "metal_water_workflow_proof.v0.1"
    public let simulatorVersion = "0.2.0"
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let caseId: String
    public let actionId: String
    public let decision: WorkflowDecision
    public let reasonCode: WorkflowReasonCode
    public let owner: String
    public let authority: String
    public let stateBefore: String
    public let stateAfter: String
    public let evidenceReferences: [String]
    public let missingEvidence: [String]
    public let recovery: WorkflowRecovery
    public let receipt: WorkflowReplayReceipt
    public let trace: [WorkflowTraceEvent]

    public init(catalog: WorkflowCatalog, scenario: WorkflowScenario) {
        workflowId = catalog.workflowId
        workflowVersion = catalog.workflowVersion
        definitionHash = catalog.definitionHash
        caseId = scenario.caseId
        actionId = scenario.actionId
        decision = scenario.decision
        reasonCode = scenario.reasonCode
        owner = scenario.owner
        authority = scenario.authority
        stateBefore = scenario.stateBefore
        stateAfter = scenario.stateAfter
        evidenceReferences = scenario.evidenceReferences
        missingEvidence = scenario.missingEvidence
        recovery = scenario.recovery
        receipt = scenario.receipt
        trace = [
            WorkflowTraceEvent(
                sequence: 1,
                stage: .signal,
                label: "Case received",
                detail: "\(scenario.caseId) entered from \(scenario.stateBefore)."
            ),
            WorkflowTraceEvent(
                sequence: 2,
                stage: .decision,
                label: "\(scenario.decision.rawValue.uppercased()) / \(scenario.reasonCode.shortLabel)",
                detail: "\(scenario.owner) owns \(scenario.actionId)."
            ),
            WorkflowTraceEvent(
                sequence: 3,
                stage: .action,
                label: scenario.canExecute ? "Scoped action allowed" : "Action contained",
                detail: scenario.canExecute
                    ? "State may advance to \(scenario.stateAfter)."
                    : "State remains \(scenario.stateAfter)."
            ),
            WorkflowTraceEvent(
                sequence: 4,
                stage: .proof,
                label: "Receipt preserved",
                detail: "Correlation \(scenario.receipt.correlationId); recovery owner \(scenario.recovery.owner)."
            ),
        ]
    }

    public func jsonData() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }
}

public struct WorkflowArtifactManifest: Codable, Equatable, Sendable {
    public struct File: Codable, Equatable, Sendable {
        public let path: String
        public let hash: String
    }

    public let schemaVersion: String
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let compilerVersion: String
    public let files: [File]
}

public struct WorkflowArtifactIntegrityReport: Equatable, Sendable {
    public let fileCount: Int
    public let verifiedPaths: [String]
    public let mismatches: [String]
}

public enum WorkflowArtifactVerifier {
    public static func verifyBundled() throws -> WorkflowArtifactIntegrityReport {
        let decoder = JSONDecoder()
        let manifestURL = try artifactRoot()
            .appendingPathComponent("manifest.json", isDirectory: false)
        guard FileManager.default.fileExists(atPath: manifestURL.path) else {
            throw WorkflowCatalogError.missingArtifact("manifest.json")
        }
        let manifest = try decoder.decode(
            WorkflowArtifactManifest.self,
            from: Data(contentsOf: manifestURL)
        )
        return try verify(manifest: manifest)
    }

    static func verify(
        manifest: WorkflowArtifactManifest
    ) throws -> WorkflowArtifactIntegrityReport {
        let root = try artifactRoot()
        var verifiedPaths: [String] = []
        var mismatches: [String] = []

        for file in manifest.files {
            guard !file.path.hasPrefix("/"),
                  !file.path.split(separator: "/").contains("..")
            else {
                mismatches.append("\(file.path): invalid relative path")
                continue
            }

            let url = root.appendingPathComponent(file.path, isDirectory: false)
            guard FileManager.default.fileExists(atPath: url.path) else {
                mismatches.append("\(file.path): missing")
                continue
            }

            let digest = SHA256.hash(data: try Data(contentsOf: url))
            let actual = "sha256:" + digest.map { String(format: "%02x", $0) }.joined()
            if actual == file.hash {
                verifiedPaths.append(file.path)
            } else {
                mismatches.append("\(file.path): expected \(file.hash), got \(actual)")
            }
        }

        return WorkflowArtifactIntegrityReport(
            fileCount: manifest.files.count,
            verifiedPaths: verifiedPaths.sorted(),
            mismatches: mismatches.sorted()
        )
    }

    private static func artifactRoot() throws -> URL {
        guard let url = Bundle.module.url(
            forResource: "WorkflowArtifacts",
            withExtension: nil
        ) else {
            throw WorkflowCatalogError.missingArtifact("WorkflowArtifacts")
        }
        return url
    }
}

public struct WorkflowAcceptanceSummary: Codable, Equatable, Sendable {
    public struct RequiredCoverage: Codable, Equatable, Sendable {
        public let pass: Bool
        public let approvalRequired: Bool
        public let blocked: Bool
        public let insufficientEvidence: Bool
        public let unknownAction: Bool
    }

    public let schemaVersion: String
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let compilerVersion: String
    public let caseCount: Int
    public let counts: [String: Int]
    public let allExpectationsMatched: Bool
    public let governanceComplete: Bool
    public let requiredCoverage: RequiredCoverage
}

public struct WorkflowCatalog: Equatable, Sendable {
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let title: String
    public let businessObjective: String
    public let workflowOwner: String
    public let policyOwner: String
    public let scenarios: [WorkflowScenario]
    public let manifest: WorkflowArtifactManifest
    public let acceptance: WorkflowAcceptanceSummary

    public static func loadBundled() throws -> WorkflowCatalog {
        let decoder = JSONDecoder()
        let replay: ReplayReport = try decoder.decode(
            ReplayReport.self,
            from: try bundledData(named: "replay-report")
        )
        let compiled: CompiledWorkflowHeader = try decoder.decode(
            CompiledWorkflowHeader.self,
            from: try bundledData(named: "compiled-workflow")
        )
        let manifest: WorkflowArtifactManifest = try decoder.decode(
            WorkflowArtifactManifest.self,
            from: try bundledData(named: "manifest")
        )
        let acceptance: WorkflowAcceptanceSummary = try decoder.decode(
            WorkflowAcceptanceSummary.self,
            from: try bundledData(named: "acceptance-summary")
        )

        guard replay.workflowId == manifest.workflowId,
              replay.workflowVersion == manifest.workflowVersion,
              replay.definitionHash == manifest.definitionHash,
              compiled.workflowId == manifest.workflowId,
              compiled.workflowVersion == manifest.workflowVersion,
              compiled.definitionHash == manifest.definitionHash,
              acceptance.workflowId == manifest.workflowId,
              acceptance.definitionHash == manifest.definitionHash
        else {
            throw WorkflowCatalogError.inconsistentArtifactHeaders
        }
        guard replay.allExpectationsMatched,
              acceptance.allExpectationsMatched,
              acceptance.governanceComplete,
              acceptance.caseCount == replay.cases.count
        else {
            throw WorkflowCatalogError.acceptanceFailed
        }
        let integrity = try WorkflowArtifactVerifier.verify(manifest: manifest)
        guard integrity.mismatches.isEmpty else {
            throw WorkflowCatalogError.contentHashMismatch(integrity.mismatches)
        }

        return WorkflowCatalog(
            workflowId: replay.workflowId,
            workflowVersion: replay.workflowVersion,
            definitionHash: replay.definitionHash,
            title: compiled.title,
            businessObjective: compiled.businessObjective,
            workflowOwner: compiled.owners.workflow,
            policyOwner: compiled.owners.policy,
            scenarios: replay.cases.sorted {
                $0.reasonCode.presentationOrder < $1.reasonCode.presentationOrder
            },
            manifest: manifest,
            acceptance: acceptance
        )
    }

    private static func bundledData(named name: String) throws -> Data {
        guard let url = Bundle.module.url(
            forResource: name,
            withExtension: "json",
            subdirectory: "WorkflowArtifacts"
        ) else {
            throw WorkflowCatalogError.missingArtifact("\(name).json")
        }
        return try Data(contentsOf: url)
    }
}

public enum WorkflowCatalogError: Error, LocalizedError, Equatable {
    case missingArtifact(String)
    case inconsistentArtifactHeaders
    case acceptanceFailed
    case contentHashMismatch([String])

    public var errorDescription: String? {
        switch self {
        case let .missingArtifact(path):
            "The compiled workflow artifact \(path) is missing."
        case .inconsistentArtifactHeaders:
            "The compiled workflow artifacts do not share one definition hash."
        case .acceptanceFailed:
            "The compiled workflow replay did not pass its acceptance boundary."
        case let .contentHashMismatch(mismatches):
            "The compiled workflow artifact package failed integrity verification: \(mismatches.joined(separator: "; "))."
        }
    }
}

private struct ReplayReport: Decodable {
    let workflowId: String
    let workflowVersion: String
    let definitionHash: String
    let cases: [WorkflowScenario]
    let allExpectationsMatched: Bool
}

private struct CompiledWorkflowHeader: Decodable {
    struct Owners: Decodable {
        let workflow: String
        let policy: String
    }

    let workflowId: String
    let workflowVersion: String
    let definitionHash: String
    let title: String
    let businessObjective: String
    let owners: Owners
}
