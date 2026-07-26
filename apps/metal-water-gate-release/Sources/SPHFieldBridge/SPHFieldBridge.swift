import Foundation

public struct SPHFieldCaptureSpecification: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let width: Int
    public let height: Int
    public let framesPerSecond: Int
    public let durationSeconds: Int
    public let simulationStepsPerFrame: Int
    public let gateOpensAfterFrame: Int

    public init(
        schemaVersion: Int = 1,
        width: Int,
        height: Int,
        framesPerSecond: Int,
        durationSeconds: Int,
        simulationStepsPerFrame: Int,
        gateOpensAfterFrame: Int
    ) {
        precondition(schemaVersion > 0)
        precondition(width > 0 && height > 0)
        precondition(framesPerSecond > 0 && durationSeconds > 0)
        precondition(simulationStepsPerFrame > 0)
        self.schemaVersion = schemaVersion
        self.width = width
        self.height = height
        self.framesPerSecond = framesPerSecond
        self.durationSeconds = durationSeconds
        self.simulationStepsPerFrame = simulationStepsPerFrame
        self.gateOpensAfterFrame = gateOpensAfterFrame
    }

    public var frameCount: Int {
        framesPerSecond * durationSeconds
    }

    public static let performanceGateRelease = SPHFieldCaptureSpecification(
        width: 96,
        height: 96,
        framesPerSecond: 24,
        durationSeconds: 8,
        simulationStepsPerFrame: 2,
        gateOpensAfterFrame: 72
    )
}
