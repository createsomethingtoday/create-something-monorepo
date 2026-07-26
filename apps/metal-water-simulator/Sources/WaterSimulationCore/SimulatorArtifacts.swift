import Foundation

public enum HydraulicGateState: String, Codable, Sendable {
    case open
    case closed
}

public enum WorkflowBoundaryPattern: String, Codable, Hashable, Sendable {
    case releaseChannel = "release_channel"
    case approvalLock = "approval_lock"
    case policyBraces = "policy_braces"
    case evidenceGaps = "evidence_gaps"
    case unknownCross = "unknown_cross"

    public static func resolve(_ reasonCode: WorkflowReasonCode) -> Self {
        switch reasonCode {
        case .actionAllowed: .releaseChannel
        case .approvalRequired: .approvalLock
        case .policyBlocked: .policyBraces
        case .insufficientEvidence: .evidenceGaps
        case .unknownAction, .invalidTransition: .unknownCross
        }
    }

    public var label: String {
        switch self {
        case .releaseChannel: "Release channel"
        case .approvalLock: "Approval lock"
        case .policyBraces: "Policy braces"
        case .evidenceGaps: "Evidence gaps"
        case .unknownCross: "Unknown-action cross"
        }
    }

    public var geometryCue: String {
        switch self {
        case .releaseChannel: "Two gate leaves tilt away from a clear center channel."
        case .approvalLock: "Twin lock pins hold the center seam."
        case .policyBraces: "Repeated diagonal braces reinforce the closed boundary."
        case .evidenceGaps: "Interrupted measurement marks show the missing proof."
        case .unknownCross: "A crossed boundary marks an undefined route."
        }
    }
}

public enum HydraulicReleaseContract {
    /// At 120 solver steps per second, this interval drains the complete
    /// representative reservoir after the two gate leaves tilt clear.
    public static let drainDurationMilliseconds = 1_500
}

public struct HydraulicProjection: Codable, Equatable, Sendable {
    public struct Region: Codable, Equatable, Sendable {
        public let minimum: [Float]
        public let maximum: [Float]
    }

    public struct Gate: Codable, Equatable, Sendable {
        public let y: Float
        public let openingCenterX: Float
        public let openingHalfWidth: Float
    }

    public struct Mapping: Codable, Equatable, Sendable {
        public let reasonCode: WorkflowReasonCode
        public let decision: WorkflowDecision
        public let gateState: HydraulicGateState
        public let visualLabel: String
    }

    public let schemaVersion: String
    public let particleCount: Int
    public let source: Region
    public let gate: Gate
    public let mappings: [Mapping]

    public func mapping(for reasonCode: WorkflowReasonCode) -> Mapping? {
        mappings.first { $0.reasonCode == reasonCode }
    }

    public func makeParticles() -> [WaterParticle] {
        precondition(source.minimum.count == 2 && source.maximum.count == 2)
        let columns = 128
        let rows = 64
        let width = source.maximum[0] - source.minimum[0]
        let height = source.maximum[1] - source.minimum[1]
        let spacing = min(
            width / (Float(columns) - 0.5),
            height / Float(rows - 1)
        )
        return ParticleScenes.damBreak(
            columns: columns,
            rows: rows,
            spacing: spacing,
            origin: SIMD2<Float>(source.minimum[0], source.minimum[1])
        )
    }

    public func makeSimulationConfiguration() -> SPHConfiguration {
        var configuration = SPHConfiguration.performanceWater
        configuration.governedGate = GovernedGateConfiguration(
            y: gate.y,
            openingCenterX: gate.openingCenterX,
            openingHalfWidth: gate.openingHalfWidth
        )
        return configuration
    }
}

public struct VisualSemantics: Codable, Equatable, Sendable {
    public struct Tokens: Codable, Equatable, Sendable {
        public let controlled: String
        public let pressure: String
        public let run: String
        public let wait: String
        public let stop: String
    }

    public let schemaVersion: String
    public let shadowOnly: Bool
    public let writes: String
    public let waterMeaning: String
    public let tracerMeaning: String
    public let boundaryMeaning: String
    public let wakeMeaning: String
    public let rendererHealthMeaning: String
    public let tokens: Tokens
}

public struct SimulatorArtifactCatalog: Equatable, Sendable {
    public let hydraulicProjection: HydraulicProjection
    public let visualSemantics: VisualSemantics

    public static func loadBundled() throws -> SimulatorArtifactCatalog {
        let decoder = JSONDecoder()
        return SimulatorArtifactCatalog(
            hydraulicProjection: try decoder.decode(
                HydraulicProjection.self,
                from: try bundledData(named: "hydraulic-projection")
            ),
            visualSemantics: try decoder.decode(
                VisualSemantics.self,
                from: try bundledData(named: "visual-semantics")
            )
        )
    }

    private static func bundledData(named name: String) throws -> Data {
        guard let url = Bundle.module.url(
            forResource: name,
            withExtension: "json",
            subdirectory: "SimulatorArtifacts"
        ) else {
            throw WorkflowCatalogError.missingArtifact("SimulatorArtifacts/\(name).json")
        }
        return try Data(contentsOf: url)
    }
}
