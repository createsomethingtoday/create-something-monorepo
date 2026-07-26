import CryptoKit
import Foundation
import GateReleaseFilm
import Metal
import WaterSimulationCore

public final class SPHFieldCaptureEngine {
    public let device: MTLDevice
    public let specification: SPHFieldCaptureSpecification

    public init(
        device: MTLDevice,
        specification: SPHFieldCaptureSpecification
    ) {
        self.device = device
        self.specification = specification
    }

    public func capture(
        progress: ((Int, Int) -> Void)? = nil
    ) throws -> SPHFieldDocument {
        let catalog = try SimulatorArtifactCatalog.loadBundled()
        let projection = catalog.hydraulicProjection
        let configuration = projection.makeSimulationConfiguration()
        let initialParticles = projection.makeParticles()
        let simulation = try MetalWaterSimulation(
            device: device,
            particles: initialParticles,
            configuration: configuration
        )
        let gate = projection.gate
        let rasterizer = SPHFieldRasterizer(
            width: specification.width,
            height: specification.height,
            bounds: configuration.bounds,
            gateY: gate.y
        )
        let filmSpecification = GateReleaseShotSpecification(
            width: 1_280,
            height: 720,
            framesPerSecond: specification.framesPerSecond,
            durationSeconds: specification.durationSeconds,
            deterministicSeed: GateReleaseShotSpecification
                .performanceGateRelease
                .deterministicSeed
        )
        let timeline = GateReleaseTimeline(specification: filmSpecification)
        precondition(timeline.frameCount == specification.frameCount)

        var frames: [SPHFieldFrame] = []
        frames.reserveCapacity(specification.frameCount)

        for frameIndex in 0..<specification.frameCount {
            let isGateOpen = frameIndex > specification.gateOpensAfterFrame
            simulation.isGovernedGateOpen = isGateOpen
            for _ in 0..<specification.simulationStepsPerFrame {
                try simulation.step(deltaTime: 1 / 120)
            }

            let sample = timeline.sample(frameIndex)
            let field = rasterizer.rasterize(simulation.snapshot())
            frames.append(
                SPHFieldFrame(
                    frameIndex: frameIndex,
                    timeSeconds: sample.timeSeconds,
                    gateOpenProgress: sample.gateOpenProgress,
                    gateOpen: isGateOpen,
                    proofProgress: sample.proofProgress,
                    downstreamParticleCount: field.downstreamParticleCount,
                    overflowCount: simulation.currentGridOverflowCount,
                    values: field.values
                )
            )
            progress?(frameIndex + 1, specification.frameCount)
        }

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let projectionData = try encoder.encode(projection)
        let configurationData = try encoder.encode(
            SimulationConfigurationProvenance(configuration)
        )

        return SPHFieldDocument(
            specification: specification,
            source: SPHFieldSource(
                renderer: "Apple Metal SPH / \(device.name)",
                hydraulicProjectionSHA256: sha256(projectionData),
                simulationConfigurationSHA256: sha256(configurationData)
            ),
            bounds: SPHFieldBounds(
                minimumX: configuration.bounds.minimum.x,
                minimumY: configuration.bounds.minimum.y,
                maximumX: configuration.bounds.maximum.x,
                maximumY: configuration.bounds.maximum.y
            ),
            gateY: gate.y,
            gateOpeningCenterX: gate.openingCenterX,
            gateOpeningHalfWidth: gate.openingHalfWidth,
            particleCount: simulation.particleCount,
            frames: frames
        )
    }
}

private struct SimulationConfigurationProvenance: Codable {
    let scalars: [Float]
    let grid: [Int]

    init(_ configuration: SPHConfiguration) {
        let gate = configuration.governedGate
        scalars = [
            configuration.smoothingRadius,
            configuration.restDensity,
            configuration.pressureStiffness,
            configuration.negativePressureRatio,
            configuration.viscosity,
            configuration.particleMass,
            configuration.particleRadius,
            configuration.gravity.x,
            configuration.gravity.y,
            configuration.collisionDamping,
            configuration.linearDamping,
            configuration.maximumSpeed,
            configuration.bounds.minimum.x,
            configuration.bounds.minimum.y,
            configuration.bounds.maximum.x,
            configuration.bounds.maximum.y,
            gate?.y ?? .nan,
            gate?.openingCenterX ?? .nan,
            gate?.openingHalfWidth ?? .nan,
        ]
        grid = [
            configuration.spatialGrid.columns,
            configuration.spatialGrid.rows,
            configuration.spatialGrid.bucketCapacity,
            configuration.integrationMicrosteps,
        ]
    }
}

private func sha256(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}
