import Metal
import Testing
@testable import WaterSimulationCore

@Test("Gravity moves a particle downward on the GPU")
func gravityMovesParticleDownwardOnGPU() throws {
        let device = try #require(MTLCreateSystemDefaultDevice())
        let particle = WaterParticle(
            position: SIMD2<Float>(0, 0.5),
            velocity: .zero
        )
        let configuration = SPHConfiguration.testing
        let simulation = try MetalWaterSimulation(
            device: device,
            particles: [particle],
            configuration: configuration
        )

        try simulation.step(deltaTime: 1.0 / 60.0)
        let result = try #require(simulation.snapshot().first)

        #expect(abs(result.position.x - particle.position.x) < 0.0001)
        #expect(result.position.y < particle.position.y)
}

@Test("A radial impulse changes particle velocity on the GPU")
func radialImpulseChangesParticleVelocityOnGPU() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: [WaterParticle(position: .zero, velocity: .zero)],
        configuration: .testing
    )
    let commandBuffer = try simulation.makeCommandBuffer(label: "Impulse test")

    try simulation.encodeImpulse(
        commandBuffer: commandBuffer,
        center: .zero,
        direction: SIMD2<Float>(0, 1),
        radius: 0.5,
        strength: 2
    )
    commandBuffer.commit()
    commandBuffer.waitUntilCompleted()

    let result = try #require(simulation.snapshot().first)
    #expect(result.velocity.y > 0)
}

@Test("A closed governed gate physically contains downward flow")
func closedGovernedGateContainsDownwardFlow() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let configuration = SPHConfiguration(
        pressureStiffness: 0,
        viscosity: 0,
        particleMass: 1,
        particleRadius: 0.001,
        gravity: .zero,
        collisionDamping: 0.2,
        governedGate: GovernedGateConfiguration(
            y: 0,
            openingCenterX: 0,
            openingHalfWidth: 0.25
        )
    )
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: [
            WaterParticle(
                position: SIMD2<Float>(0, 0.005),
                velocity: SIMD2<Float>(0, -1)
            ),
        ],
        configuration: configuration
    )

    try simulation.step(deltaTime: 1 / 60)
    let particle = try #require(simulation.snapshot().first)

    #expect(particle.position.y >= configuration.particleRadius)
    #expect(particle.velocity.y >= 0)
}

@Test("An open governed gate tilts fully clear of the water")
func openGovernedGateTiltsFullyClearOfTheWater() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let configuration = SPHConfiguration(
        pressureStiffness: 0,
        viscosity: 0,
        particleMass: 1,
        particleRadius: 0.001,
        gravity: .zero,
        collisionDamping: 0.2,
        governedGate: GovernedGateConfiguration(
            y: 0,
            openingCenterX: 0,
            openingHalfWidth: 0.25
        )
    )
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: [
            WaterParticle(
                position: SIMD2<Float>(0, 0.005),
                velocity: SIMD2<Float>(0, -1)
            ),
            WaterParticle(
                position: SIMD2<Float>(0.5, 0.005),
                velocity: SIMD2<Float>(0, -1)
            ),
        ],
        configuration: configuration
    )
    simulation.isGovernedGateOpen = true

    try simulation.step(deltaTime: 1 / 60)
    let particles = simulation.snapshot()

    #expect(particles[0].position.y < 0)
    #expect(particles[0].velocity.y < 0)
    #expect(particles[1].position.y < 0)
    #expect(particles[1].velocity.y < 0)
}

@Test("The workflow reservoir resets all 8,192 particles behind a closed gate")
func workflowReservoirResetRestoresClosedBoundary() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let projection = try SimulatorArtifactCatalog.loadBundled().hydraulicProjection
    let initialParticles = projection.makeParticles()
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: initialParticles,
        configuration: projection.makeSimulationConfiguration()
    )
    simulation.isGovernedGateOpen = true

    for _ in 0..<24 {
        try simulation.step(deltaTime: 1 / 120)
    }
    simulation.reset()

    #expect(initialParticles.count == 8_192)
    #expect(initialParticles.allSatisfy { $0.position.y > projection.gate.y })
    #expect(simulation.snapshot() == initialParticles)
    #expect(!simulation.isGovernedGateOpen)
    #expect(simulation.currentGridOverflowCount == 0)
}

@Test("The representative gate contains Wait and fully drains Run")
func representativeWorkflowGateContainsWaitAndFullyDrainsRun() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let projection = try SimulatorArtifactCatalog.loadBundled().hydraulicProjection
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: projection.makeParticles(),
        configuration: projection.makeSimulationConfiguration()
    )

    for _ in 0..<360 {
        try simulation.step(deltaTime: 1 / 120)
    }
    let containedCount = simulation.snapshot().count {
        $0.position.y < projection.gate.y
    }

    simulation.reset()
    simulation.isGovernedGateOpen = true
    let drainStepCount = HydraulicReleaseContract.drainDurationMilliseconds * 120 / 1_000
    for _ in 0..<drainStepCount {
        try simulation.step(deltaTime: 1 / 120)
    }
    let releasedCount = simulation.snapshot().count {
        $0.position.y < projection.gate.y
    }

    #expect(containedCount == 0, "Closed gate leaked \(containedCount) particles")
    #expect(
        releasedCount == projection.particleCount,
        "Open gate left \(projection.particleCount - releasedCount) particles upstream"
    )
    #expect(simulation.currentGridOverflowCount == 0)
}

@Test("The GPU grid reports explicit particle occupancy without overflow")
func gpuGridReportsExplicitOccupancyWithoutOverflow() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let particles = [
        WaterParticle(position: SIMD2<Float>(-0.75, -0.75), velocity: .zero),
        WaterParticle(position: SIMD2<Float>(-0.70, -0.70), velocity: .zero),
        WaterParticle(position: SIMD2<Float>(0.75, 0.75), velocity: .zero),
    ]
    let configuration = SPHConfiguration(
        pressureStiffness: 0,
        viscosity: 0,
        gravity: .zero,
        spatialGrid: SpatialGridConfiguration(
            columns: 4,
            rows: 4,
            bucketCapacity: 4
        )
    )
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: particles,
        configuration: configuration
    )

    try simulation.step(deltaTime: 1 / 240)
    let diagnostics = simulation.gridDiagnostics()

    #expect(diagnostics.occupiedCellCount == 2)
    #expect(diagnostics.maximumBucketOccupancy == 2)
    #expect(diagnostics.overflowCount == 0)
}

@Test("The representative 8,192-particle grid stays bounded")
func representativeGridStaysBounded() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let particles = ParticleScenes.performanceDamBreak()
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: particles,
        configuration: .performanceWater
    )

    for _ in 0..<4 {
        try simulation.step(deltaTime: 1 / 120)
    }

    let diagnostics = simulation.gridDiagnostics()
    let snapshot = simulation.snapshot()
    #expect(particles.count == 8_192)
    #expect(diagnostics.columns == 64)
    #expect(diagnostics.rows == 64)
    #expect(diagnostics.bucketCapacity == 512)
    #expect(diagnostics.overflowCount == 0)
    #expect(
        diagnostics.averageDensity >= 900
            && diagnostics.averageDensity <= 1_100,
        "Average density was \(diagnostics.averageDensity)"
    )
    #expect(snapshot.allSatisfy { particle in
        particle.position.x.isFinite
            && particle.position.y.isFinite
            && particle.position.x >= -1
            && particle.position.x <= 1
            && particle.position.y >= -1
            && particle.position.y <= 1
    })
}

@Test("The representative water mass settles in the lower half")
func representativeWaterMassSettlesInLowerHalf() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: ParticleScenes.performanceDamBreak(),
        configuration: .performanceWater
    )

    for _ in 0..<480 {
        try simulation.step(deltaTime: 1 / 120)
    }

    let snapshot = simulation.snapshot()
    let centroidY = snapshot.reduce(Float.zero) { partial, particle in
        partial + particle.position.y
    } / Float(snapshot.count)
    let upperParticleFraction = Float(
        snapshot.count { $0.position.y > 0.75 }
    ) / Float(snapshot.count)
    let diagnostics = simulation.gridDiagnostics()

    #expect(centroidY < -0.25, "Vertical centroid was \(centroidY)")
    #expect(
        upperParticleFraction < 0.04,
        "Upper-particle fraction was \(upperParticleFraction)"
    )
    #expect(
        diagnostics.averageDensity >= 850
            && diagnostics.averageDensity <= 1_800,
        "Settled average density was \(diagnostics.averageDensity)"
    )
    #expect(diagnostics.overflowCount == 0)
}

@Test("A ten-second representative splash has zero grid overflow")
func representativeSplashHasZeroGridOverflow() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: ParticleScenes.performanceDamBreak(),
        configuration: .performanceWater
    )

    for step in 0..<1_200 {
        if step == 120 {
            let commandBuffer = try simulation.makeCommandBuffer(label: "Splash fixture")
            try simulation.encodeImpulse(
                commandBuffer: commandBuffer,
                center: SIMD2<Float>(0, -0.65),
                direction: SIMD2<Float>(0, 1),
                radius: 0.3,
                strength: 4.2
            )
            commandBuffer.commit()
            commandBuffer.waitUntilCompleted()
        }
        try simulation.step(deltaTime: 1 / 120)
    }

    let diagnostics = simulation.gridDiagnostics()
    let snapshot = simulation.snapshot()
    let centroidY = snapshot.reduce(Float.zero) { partial, particle in
        partial + particle.position.y
    } / Float(snapshot.count)
    let escapedFraction = Float(
        snapshot.count { $0.position.y > 0.75 }
    ) / Float(snapshot.count)
    #expect(diagnostics.overflowCount == 0)
    #expect(diagnostics.maximumBucketOccupancy <= diagnostics.bucketCapacity)
    #expect(centroidY < -0.20, "Ten-second centroid was \(centroidY)")
    #expect(
        escapedFraction < 0.04,
        "Ten-second escaped fraction was \(escapedFraction)"
    )
    #expect(
        diagnostics.averageDensity <= 1_800,
        "Ten-second average density was \(diagnostics.averageDensity)"
    )
}

@Test("Reset restores the deterministic particle scene")
func resetRestoresDeterministicParticleScene() throws {
    let device = try #require(MTLCreateSystemDefaultDevice())
    let initialParticles = ParticleScenes.performanceDamBreak()
    let simulation = try MetalWaterSimulation(
        device: device,
        particles: initialParticles,
        configuration: .performanceWater
    )

    for _ in 0..<12 {
        try simulation.step(deltaTime: 1 / 120)
    }
    simulation.reset()

    #expect(simulation.snapshot() == initialParticles)
    #expect(simulation.currentGridOverflowCount == 0)
}
