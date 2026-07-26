import CryptoKit
import Foundation

public struct SPHFieldSource: Codable, Equatable, Sendable {
    public let renderer: String
    public let waterSimulationCorePath: String
    public let hydraulicProjectionSHA256: String
    public let simulationConfigurationSHA256: String

    public init(
        renderer: String,
        waterSimulationCorePath: String = "apps/metal-water-simulator/Sources/WaterSimulationCore",
        hydraulicProjectionSHA256: String,
        simulationConfigurationSHA256: String = ""
    ) {
        self.renderer = renderer
        self.waterSimulationCorePath = waterSimulationCorePath
        self.hydraulicProjectionSHA256 = hydraulicProjectionSHA256
        self.simulationConfigurationSHA256 = simulationConfigurationSHA256
    }
}

public struct SPHFieldBounds: Codable, Equatable, Sendable {
    public let minimumX: Float
    public let minimumY: Float
    public let maximumX: Float
    public let maximumY: Float

    public init(
        minimumX: Float,
        minimumY: Float,
        maximumX: Float,
        maximumY: Float
    ) {
        precondition(maximumX > minimumX && maximumY > minimumY)
        self.minimumX = minimumX
        self.minimumY = minimumY
        self.maximumX = maximumX
        self.maximumY = maximumY
    }
}

public struct SPHFieldFrame: Codable, Equatable, Sendable {
    public let frameIndex: Int
    public let timeSeconds: Float
    public let gateOpenProgress: Float
    public let gateOpen: Bool
    public let proofProgress: Float
    public let downstreamParticleCount: Int
    public let overflowCount: Int
    public let values: [UInt16]

    public init(
        frameIndex: Int,
        timeSeconds: Float,
        gateOpenProgress: Float,
        gateOpen: Bool,
        proofProgress: Float,
        downstreamParticleCount: Int,
        overflowCount: Int,
        values: [UInt16]
    ) {
        self.frameIndex = frameIndex
        self.timeSeconds = timeSeconds
        self.gateOpenProgress = gateOpenProgress
        self.gateOpen = gateOpen
        self.proofProgress = proofProgress
        self.downstreamParticleCount = downstreamParticleCount
        self.overflowCount = overflowCount
        self.values = values
    }
}

public struct SPHFieldDocument: Codable, Equatable, Sendable {
    public let specification: SPHFieldCaptureSpecification
    public let source: SPHFieldSource
    public let bounds: SPHFieldBounds
    public let gateY: Float
    public let gateOpeningCenterX: Float
    public let gateOpeningHalfWidth: Float
    public let particleCount: Int
    public let frames: [SPHFieldFrame]

    public init(
        specification: SPHFieldCaptureSpecification,
        source: SPHFieldSource,
        bounds: SPHFieldBounds,
        gateY: Float,
        gateOpeningCenterX: Float,
        gateOpeningHalfWidth: Float,
        particleCount: Int,
        frames: [SPHFieldFrame]
    ) {
        self.specification = specification
        self.source = source
        self.bounds = bounds
        self.gateY = gateY
        self.gateOpeningCenterX = gateOpeningCenterX
        self.gateOpeningHalfWidth = gateOpeningHalfWidth
        self.particleCount = particleCount
        self.frames = frames
    }

    public func deterministicJSONData(prettyPrinted: Bool = false) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = prettyPrinted
            ? [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
            : [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }

    public func deterministicSHA256() throws -> String {
        SHA256.hash(data: try deterministicJSONData()).map {
            String(format: "%02x", $0)
        }.joined()
    }

    public func makeReceipt() throws -> SPHFieldCaptureReceipt {
        SPHFieldCaptureReceipt(
            documentSHA256: try deterministicSHA256(),
            schemaVersion: specification.schemaVersion,
            frameCount: frames.count,
            particleCount: particleCount,
            simulationStepsPerFrame: specification.simulationStepsPerFrame,
            maximumOverflowCount: frames.map(\.overflowCount).max() ?? 0,
            frame72DownstreamParticleCount: frames.first {
                $0.frameIndex == specification.gateOpensAfterFrame
            }?.downstreamParticleCount,
            firstDownstreamFrame: frames.first {
                $0.downstreamParticleCount > 0
            }?.frameIndex,
            hydraulicProjectionSHA256: source.hydraulicProjectionSHA256,
            simulationConfigurationSHA256: source.simulationConfigurationSHA256
        )
    }
}

public struct SPHFieldCaptureReceipt: Codable, Equatable, Sendable {
    public let documentSHA256: String
    public let schemaVersion: Int
    public let frameCount: Int
    public let particleCount: Int
    public let simulationStepsPerFrame: Int
    public let maximumOverflowCount: Int
    public let frame72DownstreamParticleCount: Int?
    public let firstDownstreamFrame: Int?
    public let hydraulicProjectionSHA256: String
    public let simulationConfigurationSHA256: String
}
