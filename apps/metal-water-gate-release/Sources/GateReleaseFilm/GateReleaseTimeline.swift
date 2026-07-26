import Foundation

public struct GateReleaseShotSpecification: Equatable, Sendable, Codable {
    public var width: Int
    public var height: Int
    public var framesPerSecond: Int
    public var durationSeconds: Int
    public var deterministicSeed: UInt32

    public init(
        width: Int,
        height: Int,
        framesPerSecond: Int,
        durationSeconds: Int,
        deterministicSeed: UInt32
    ) {
        precondition(width > 0 && height > 0)
        precondition(framesPerSecond > 0 && durationSeconds > 0)
        self.width = width
        self.height = height
        self.framesPerSecond = framesPerSecond
        self.durationSeconds = durationSeconds
        self.deterministicSeed = deterministicSeed
    }

    public static let performanceGateRelease = GateReleaseShotSpecification(
        width: 1_280,
        height: 720,
        framesPerSecond: 24,
        durationSeconds: 8,
        deterministicSeed: 0x4353_2026
    )
}

public struct GateReleaseSample: Equatable, Sendable, Codable {
    public let frameIndex: Int
    public let timeSeconds: Float
    public let gateOpenProgress: Float
    public let waterReleaseProgress: Float
    public let proofProgress: Float
}

public struct GateReleaseTimeline: Equatable, Sendable {
    public let specification: GateReleaseShotSpecification

    public init(specification: GateReleaseShotSpecification) {
        self.specification = specification
    }

    public var frameCount: Int {
        specification.framesPerSecond * specification.durationSeconds
    }

    public func sample(_ frameIndex: Int) -> GateReleaseSample {
        let frame = min(max(frameIndex, 0), frameCount - 1)
        let fps = Float(specification.framesPerSecond)
        let time = Float(frame) / fps

        let gate = easedProgress(frame: frame, start: 48, end: 72)
        let water = easedProgress(frame: frame, start: 72, end: 132)
        let proof = easedProgress(frame: frame, start: 120, end: 144)

        return GateReleaseSample(
            frameIndex: frame,
            timeSeconds: time,
            gateOpenProgress: gate,
            waterReleaseProgress: gate == 1 ? water : 0,
            proofProgress: water > 0 ? proof : 0
        )
    }

    private func easedProgress(frame: Int, start: Int, end: Int) -> Float {
        guard frame > start else { return 0 }
        guard frame < end else { return 1 }
        let linear = Float(frame - start) / Float(end - start)
        return linear * linear * (3 - 2 * linear)
    }
}
