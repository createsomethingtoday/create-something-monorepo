import Foundation
import Metal
import simd

public struct WaterParticle: Equatable, Sendable {
    public var position: SIMD2<Float>
    public var velocity: SIMD2<Float>

    public init(position: SIMD2<Float>, velocity: SIMD2<Float>) {
        self.position = position
        self.velocity = velocity
    }
}

public struct SimulationBounds: Equatable, Sendable {
    public var minimum: SIMD2<Float>
    public var maximum: SIMD2<Float>

    public init(minimum: SIMD2<Float>, maximum: SIMD2<Float>) {
        self.minimum = minimum
        self.maximum = maximum
    }

    public static let unit = SimulationBounds(
        minimum: SIMD2<Float>(-1, -1),
        maximum: SIMD2<Float>(1, 1)
    )
}

public struct SpatialGridConfiguration: Equatable, Sendable {
    public var columns: Int
    public var rows: Int
    public var bucketCapacity: Int

    public init(columns: Int = 64, rows: Int = 64, bucketCapacity: Int = 32) {
        precondition(columns > 0 && rows > 0 && bucketCapacity > 0)
        self.columns = columns
        self.rows = rows
        self.bucketCapacity = bucketCapacity
    }
}

public struct GridDiagnostics: Equatable, Sendable {
    public let columns: Int
    public let rows: Int
    public let bucketCapacity: Int
    public let occupiedCellCount: Int
    public let maximumBucketOccupancy: Int
    public let overflowCount: Int
    public let minimumDensity: Float
    public let averageDensity: Float
    public let maximumDensity: Float
}

public struct GovernedGateConfiguration: Equatable, Sendable {
    public var y: Float
    public var openingCenterX: Float
    public var openingHalfWidth: Float

    public init(y: Float, openingCenterX: Float, openingHalfWidth: Float) {
        precondition(openingHalfWidth > 0)
        self.y = y
        self.openingCenterX = openingCenterX
        self.openingHalfWidth = openingHalfWidth
    }
}

public struct SPHConfiguration: Equatable, Sendable {
    public var smoothingRadius: Float
    public var restDensity: Float
    public var pressureStiffness: Float
    public var negativePressureRatio: Float
    public var viscosity: Float
    public var particleMass: Float
    public var particleRadius: Float
    public var gravity: SIMD2<Float>
    public var collisionDamping: Float
    public var linearDamping: Float
    public var maximumSpeed: Float
    public var bounds: SimulationBounds
    public var spatialGrid: SpatialGridConfiguration
    public var integrationMicrosteps: Int
    public var governedGate: GovernedGateConfiguration?

    public init(
        smoothingRadius: Float = 0.065,
        restDensity: Float = 1_000,
        pressureStiffness: Float = 45,
        negativePressureRatio: Float = 0,
        viscosity: Float = 0.16,
        particleMass: Float = 0.9,
        particleRadius: Float = 0.014,
        gravity: SIMD2<Float> = SIMD2<Float>(0, -9.81),
        collisionDamping: Float = 0.42,
        linearDamping: Float = 0,
        maximumSpeed: Float = 0,
        bounds: SimulationBounds = .unit,
        spatialGrid: SpatialGridConfiguration = SpatialGridConfiguration(),
        integrationMicrosteps: Int = 1,
        governedGate: GovernedGateConfiguration? = nil
    ) {
        precondition(integrationMicrosteps > 0)
        self.smoothingRadius = smoothingRadius
        self.restDensity = restDensity
        self.pressureStiffness = pressureStiffness
        self.negativePressureRatio = negativePressureRatio
        self.viscosity = viscosity
        self.particleMass = particleMass
        self.particleRadius = particleRadius
        self.gravity = gravity
        self.collisionDamping = collisionDamping
        self.linearDamping = linearDamping
        self.maximumSpeed = maximumSpeed
        self.bounds = bounds
        self.spatialGrid = spatialGrid
        self.integrationMicrosteps = integrationMicrosteps
        self.governedGate = governedGate
    }

    public static let testing = SPHConfiguration(
        pressureStiffness: 0,
        viscosity: 0,
        particleMass: 1,
        particleRadius: 0.01
    )

    public static let performanceWater = SPHConfiguration(
        smoothingRadius: 0.03,
        restDensity: 1_000,
        pressureStiffness: 20.0,
        negativePressureRatio: 0.010,
        viscosity: 0.012,
        particleMass: 0.169,
        particleRadius: 0.0062,
        collisionDamping: 0.18,
        linearDamping: 3.0,
        maximumSpeed: 2.2,
        spatialGrid: SpatialGridConfiguration(
            columns: 64,
            rows: 64,
            bucketCapacity: 512
        ),
        integrationMicrosteps: 4
    )
}

public enum ParticleScenes {
    public static func performanceDamBreak() -> [WaterParticle] {
        damBreak(
            columns: 128,
            rows: 64,
            spacing: 0.013,
            origin: SIMD2<Float>(-0.84, -0.84)
        )
    }

    public static func damBreak(
        columns: Int = 32,
        rows: Int = 28,
        spacing: Float = 0.031,
        origin: SIMD2<Float> = SIMD2<Float>(-0.82, -0.83)
    ) -> [WaterParticle] {
        precondition(columns > 0 && rows > 0 && spacing > 0)

        return (0..<rows).flatMap { row in
            (0..<columns).map { column in
                let offset = SIMD2<Float>(
                    Float(column) * spacing + (row.isMultiple(of: 2) ? 0 : spacing * 0.5),
                    Float(row) * spacing
                )
                return WaterParticle(position: origin + offset, velocity: .zero)
            }
        }
    }
}

public enum MetalWaterSimulationError: Error, LocalizedError {
    case emptyParticleSet
    case commandQueueUnavailable
    case shaderResourceUnavailable
    case shaderFunctionUnavailable(String)
    case bufferAllocationFailed
    case commandBufferUnavailable
    case gpuExecutionFailed(String)

    public var errorDescription: String? {
        switch self {
        case .emptyParticleSet:
            return "A simulation needs at least one particle."
        case .commandQueueUnavailable:
            return "Metal could not create a command queue."
        case .shaderResourceUnavailable:
            return "The packaged Metal simulation shader could not be loaded."
        case let .shaderFunctionUnavailable(name):
            return "The Metal shader function \(name) is unavailable."
        case .bufferAllocationFailed:
            return "Metal could not allocate the particle buffers."
        case .commandBufferUnavailable:
            return "Metal could not create a command buffer."
        case let .gpuExecutionFailed(message):
            return "The Metal simulation command failed: \(message)"
        }
    }
}

private struct GPUParticle {
    var positionVelocity: SIMD4<Float>
    var densityPressure: SIMD4<Float>

    init(_ particle: WaterParticle) {
        positionVelocity = SIMD4<Float>(
            particle.position.x,
            particle.position.y,
            particle.velocity.x,
            particle.velocity.y
        )
        densityPressure = .zero
    }

    var waterParticle: WaterParticle {
        WaterParticle(
            position: SIMD2<Float>(positionVelocity.x, positionVelocity.y),
            velocity: SIMD2<Float>(positionVelocity.z, positionVelocity.w)
        )
    }
}

private struct SimulationUniforms {
    var countTimeRadiusDensity: SIMD4<Float>
    var pressureViscosityMassParticleRadius: SIMD4<Float>
    var gravityDamping: SIMD4<Float>
    var bounds: SIMD4<Float>
    var gridShape: SIMD4<Float>
    var stability: SIMD4<Float>
    var governedGate: SIMD4<Float>
}

private struct ImpulseUniforms {
    var centerRadius: SIMD4<Float>
    var directionStrength: SIMD4<Float>
}

public final class MetalWaterSimulation {
    public let device: MTLDevice
    public let configuration: SPHConfiguration
    public let particleCount: Int

    private let commandQueue: MTLCommandQueue
    private let densityPipeline: MTLComputePipelineState
    private let integrationPipeline: MTLComputePipelineState
    private let impulsePipeline: MTLComputePipelineState
    private let clearGridPipeline: MTLComputePipelineState
    private let populateGridPipeline: MTLComputePipelineState
    private let particleBuffers: [MTLBuffer]
    private let densityBuffer: MTLBuffer
    private let gridCountsBuffer: MTLBuffer
    private let gridParticleIndicesBuffer: MTLBuffer
    private let gridOverflowBuffer: MTLBuffer
    private let initialParticles: [GPUParticle]
    private var currentBufferIndex = 0

    public var isGovernedGateOpen = false

    public var particleBuffer: MTLBuffer {
        particleBuffers[currentBufferIndex]
    }

    public var currentGridOverflowCount: Int {
        Int(
            gridOverflowBuffer.contents()
                .bindMemory(to: UInt32.self, capacity: 1)
                .pointee
        )
    }

    public init(
        device: MTLDevice,
        particles: [WaterParticle],
        configuration: SPHConfiguration = SPHConfiguration()
    ) throws {
        guard !particles.isEmpty else {
            throw MetalWaterSimulationError.emptyParticleSet
        }
        guard let commandQueue = device.makeCommandQueue() else {
            throw MetalWaterSimulationError.commandQueueUnavailable
        }
        guard
            let shaderURL = Bundle.module.url(
                forResource: "WaterSimulation",
                withExtension: "metal"
            ),
            let source = try? String(contentsOf: shaderURL, encoding: .utf8)
        else {
            throw MetalWaterSimulationError.shaderResourceUnavailable
        }

        let library = try device.makeLibrary(source: source, options: nil)
        densityPipeline = try Self.makePipeline(
            named: "calculateDensityPressure",
            library: library,
            device: device
        )
        integrationPipeline = try Self.makePipeline(
            named: "integrateSPH",
            library: library,
            device: device
        )
        impulsePipeline = try Self.makePipeline(
            named: "applyRadialImpulse",
            library: library,
            device: device
        )
        clearGridPipeline = try Self.makePipeline(
            named: "clearSpatialGrid",
            library: library,
            device: device
        )
        populateGridPipeline = try Self.makePipeline(
            named: "populateSpatialGrid",
            library: library,
            device: device
        )

        self.device = device
        self.configuration = configuration
        self.commandQueue = commandQueue
        particleCount = particles.count
        initialParticles = particles.map(GPUParticle.init)

        let byteCount = MemoryLayout<GPUParticle>.stride * particles.count
        let gridCellCount = configuration.spatialGrid.columns
            * configuration.spatialGrid.rows
        let gridCountsByteCount = MemoryLayout<UInt32>.stride * gridCellCount
        let gridIndicesByteCount = MemoryLayout<UInt32>.stride
            * gridCellCount
            * configuration.spatialGrid.bucketCapacity
        guard
            let first = device.makeBuffer(length: byteCount, options: .storageModeShared),
            let second = device.makeBuffer(length: byteCount, options: .storageModeShared),
            let density = device.makeBuffer(length: byteCount, options: .storageModeShared),
            let gridCounts = device.makeBuffer(
                length: gridCountsByteCount,
                options: .storageModeShared
            ),
            let gridParticleIndices = device.makeBuffer(
                length: gridIndicesByteCount,
                options: .storageModeShared
            ),
            let gridOverflow = device.makeBuffer(
                length: MemoryLayout<UInt32>.stride,
                options: .storageModeShared
            )
        else {
            throw MetalWaterSimulationError.bufferAllocationFailed
        }
        first.label = "Water particles A"
        second.label = "Water particles B"
        density.label = "Water density and pressure"
        gridCounts.label = "Water spatial-grid counts"
        gridParticleIndices.label = "Water spatial-grid particle indices"
        gridOverflow.label = "Water spatial-grid overflow"
        particleBuffers = [first, second]
        densityBuffer = density
        gridCountsBuffer = gridCounts
        gridParticleIndicesBuffer = gridParticleIndices
        gridOverflowBuffer = gridOverflow
        writeInitialParticles()
    }

    public func step(deltaTime: Float) throws {
        let commandBuffer = try makeCommandBuffer(label: "Water simulation step")
        try encodeStep(commandBuffer: commandBuffer, deltaTime: deltaTime)
        commandBuffer.commit()
        commandBuffer.waitUntilCompleted()

        if commandBuffer.status == .error {
            throw MetalWaterSimulationError.gpuExecutionFailed(
                commandBuffer.error?.localizedDescription ?? "Unknown error"
            )
        }
    }

    public func makeCommandBuffer(label: String? = nil) throws -> MTLCommandBuffer {
        guard let commandBuffer = commandQueue.makeCommandBuffer() else {
            throw MetalWaterSimulationError.commandBufferUnavailable
        }
        commandBuffer.label = label
        return commandBuffer
    }

    public func encodeStep(
        commandBuffer: MTLCommandBuffer,
        deltaTime: Float
    ) throws {
        let microstepDelta = deltaTime / Float(configuration.integrationMicrosteps)
        for _ in 0..<configuration.integrationMicrosteps {
            try encodeMicrostep(
                commandBuffer: commandBuffer,
                deltaTime: microstepDelta
            )
        }
    }

    private func encodeMicrostep(
        commandBuffer: MTLCommandBuffer,
        deltaTime: Float
    ) throws {
        let targetIndex = (currentBufferIndex + 1) % particleBuffers.count
        var uniforms = makeUniforms(deltaTime: min(max(deltaTime, 1 / 240), 1 / 60))

        guard let clearGridEncoder = commandBuffer.makeComputeCommandEncoder() else {
            throw MetalWaterSimulationError.commandBufferUnavailable
        }
        clearGridEncoder.label = "Clear water spatial grid"
        clearGridEncoder.setComputePipelineState(clearGridPipeline)
        clearGridEncoder.setBuffer(gridCountsBuffer, offset: 0, index: 0)
        clearGridEncoder.setBuffer(gridOverflowBuffer, offset: 0, index: 1)
        clearGridEncoder.setBytes(
            &uniforms,
            length: MemoryLayout<SimulationUniforms>.stride,
            index: 2
        )
        dispatch(
            count: configuration.spatialGrid.columns * configuration.spatialGrid.rows,
            encoder: clearGridEncoder,
            pipeline: clearGridPipeline
        )
        clearGridEncoder.endEncoding()

        guard let populateGridEncoder = commandBuffer.makeComputeCommandEncoder() else {
            throw MetalWaterSimulationError.commandBufferUnavailable
        }
        populateGridEncoder.label = "Populate water spatial grid"
        populateGridEncoder.setComputePipelineState(populateGridPipeline)
        populateGridEncoder.setBuffer(
            particleBuffers[currentBufferIndex],
            offset: 0,
            index: 0
        )
        populateGridEncoder.setBuffer(gridCountsBuffer, offset: 0, index: 1)
        populateGridEncoder.setBuffer(gridParticleIndicesBuffer, offset: 0, index: 2)
        populateGridEncoder.setBuffer(gridOverflowBuffer, offset: 0, index: 3)
        populateGridEncoder.setBytes(
            &uniforms,
            length: MemoryLayout<SimulationUniforms>.stride,
            index: 4
        )
        dispatch(
            count: particleCount,
            encoder: populateGridEncoder,
            pipeline: populateGridPipeline
        )
        populateGridEncoder.endEncoding()

        guard let densityEncoder = commandBuffer.makeComputeCommandEncoder() else {
            throw MetalWaterSimulationError.commandBufferUnavailable
        }
        densityEncoder.label = "SPH density and pressure"
        densityEncoder.setComputePipelineState(densityPipeline)
        densityEncoder.setBuffer(particleBuffers[currentBufferIndex], offset: 0, index: 0)
        densityEncoder.setBuffer(densityBuffer, offset: 0, index: 1)
        densityEncoder.setBuffer(gridCountsBuffer, offset: 0, index: 2)
        densityEncoder.setBuffer(gridParticleIndicesBuffer, offset: 0, index: 3)
        densityEncoder.setBytes(
            &uniforms,
            length: MemoryLayout<SimulationUniforms>.stride,
            index: 4
        )
        dispatch(count: particleCount, encoder: densityEncoder, pipeline: densityPipeline)
        densityEncoder.endEncoding()

        guard let integrationEncoder = commandBuffer.makeComputeCommandEncoder() else {
            throw MetalWaterSimulationError.commandBufferUnavailable
        }
        integrationEncoder.label = "SPH forces and integration"
        integrationEncoder.setComputePipelineState(integrationPipeline)
        integrationEncoder.setBuffer(densityBuffer, offset: 0, index: 0)
        integrationEncoder.setBuffer(particleBuffers[targetIndex], offset: 0, index: 1)
        integrationEncoder.setBuffer(gridCountsBuffer, offset: 0, index: 2)
        integrationEncoder.setBuffer(gridParticleIndicesBuffer, offset: 0, index: 3)
        integrationEncoder.setBytes(
            &uniforms,
            length: MemoryLayout<SimulationUniforms>.stride,
            index: 4
        )
        dispatch(
            count: particleCount,
            encoder: integrationEncoder,
            pipeline: integrationPipeline
        )
        integrationEncoder.endEncoding()

        currentBufferIndex = targetIndex
    }

    public func encodeImpulse(
        commandBuffer: MTLCommandBuffer,
        center: SIMD2<Float>,
        direction: SIMD2<Float> = SIMD2<Float>(0, 1),
        radius: Float = 0.28,
        strength: Float = 3.5
    ) throws {
        guard let encoder = commandBuffer.makeComputeCommandEncoder() else {
            throw MetalWaterSimulationError.commandBufferUnavailable
        }
        var uniforms = ImpulseUniforms(
            centerRadius: SIMD4<Float>(center.x, center.y, radius, 0),
            directionStrength: SIMD4<Float>(direction.x, direction.y, strength, 0)
        )
        encoder.label = "Water radial impulse"
        encoder.setComputePipelineState(impulsePipeline)
        encoder.setBuffer(particleBuffers[currentBufferIndex], offset: 0, index: 0)
        encoder.setBytes(
            &uniforms,
            length: MemoryLayout<ImpulseUniforms>.stride,
            index: 1
        )
        dispatch(count: particleCount, encoder: encoder, pipeline: impulsePipeline)
        encoder.endEncoding()
    }

    public func reset() {
        if let fence = commandQueue.makeCommandBuffer() {
            fence.commit()
            fence.waitUntilCompleted()
        }
        currentBufferIndex = 0
        isGovernedGateOpen = false
        writeInitialParticles()
    }

    public func snapshot() -> [WaterParticle] {
        let pointer = particleBuffer.contents().bindMemory(
            to: GPUParticle.self,
            capacity: particleCount
        )
        return (0..<particleCount).map { pointer[$0].waterParticle }
    }

    public func gridDiagnostics() -> GridDiagnostics {
        if let fence = commandQueue.makeCommandBuffer() {
            fence.commit()
            fence.waitUntilCompleted()
        }

        let cellCount = configuration.spatialGrid.columns
            * configuration.spatialGrid.rows
        let counts = gridCountsBuffer.contents().bindMemory(
            to: UInt32.self,
            capacity: cellCount
        )
        var occupiedCellCount = 0
        var maximumBucketOccupancy = 0
        for index in 0..<cellCount {
            let count = Int(counts[index])
            if count > 0 {
                occupiedCellCount += 1
                maximumBucketOccupancy = max(maximumBucketOccupancy, count)
            }
        }
        let overflow = gridOverflowBuffer.contents()
            .bindMemory(to: UInt32.self, capacity: 1)
            .pointee
        let densityParticles = densityBuffer.contents().bindMemory(
            to: GPUParticle.self,
            capacity: particleCount
        )
        var minimumDensity = Float.greatestFiniteMagnitude
        var maximumDensity: Float = 0
        var densitySum: Float = 0
        for index in 0..<particleCount {
            let density = densityParticles[index].densityPressure.x
            minimumDensity = min(minimumDensity, density)
            maximumDensity = max(maximumDensity, density)
            densitySum += density
        }

        return GridDiagnostics(
            columns: configuration.spatialGrid.columns,
            rows: configuration.spatialGrid.rows,
            bucketCapacity: configuration.spatialGrid.bucketCapacity,
            occupiedCellCount: occupiedCellCount,
            maximumBucketOccupancy: maximumBucketOccupancy,
            overflowCount: Int(overflow),
            minimumDensity: minimumDensity,
            averageDensity: densitySum / Float(particleCount),
            maximumDensity: maximumDensity
        )
    }

    private static func makePipeline(
        named name: String,
        library: MTLLibrary,
        device: MTLDevice
    ) throws -> MTLComputePipelineState {
        guard let function = library.makeFunction(name: name) else {
            throw MetalWaterSimulationError.shaderFunctionUnavailable(name)
        }
        return try device.makeComputePipelineState(function: function)
    }

    private func dispatch(
        count: Int,
        encoder: MTLComputeCommandEncoder,
        pipeline: MTLComputePipelineState
    ) {
        let width = min(pipeline.maxTotalThreadsPerThreadgroup, 256)
        encoder.dispatchThreads(
            MTLSize(width: count, height: 1, depth: 1),
            threadsPerThreadgroup: MTLSize(width: width, height: 1, depth: 1)
        )
    }

    private func makeUniforms(deltaTime: Float) -> SimulationUniforms {
        let gate = configuration.governedGate
        return SimulationUniforms(
            countTimeRadiusDensity: SIMD4<Float>(
                Float(particleCount),
                deltaTime,
                configuration.smoothingRadius,
                configuration.restDensity
            ),
            pressureViscosityMassParticleRadius: SIMD4<Float>(
                configuration.pressureStiffness,
                configuration.viscosity,
                configuration.particleMass,
                configuration.particleRadius
            ),
            gravityDamping: SIMD4<Float>(
                configuration.gravity.x,
                configuration.gravity.y,
                configuration.collisionDamping,
                configuration.linearDamping
            ),
            bounds: SIMD4<Float>(
                configuration.bounds.minimum.x,
                configuration.bounds.minimum.y,
                configuration.bounds.maximum.x,
                configuration.bounds.maximum.y
            ),
            gridShape: SIMD4<Float>(
                Float(configuration.spatialGrid.columns),
                Float(configuration.spatialGrid.rows),
                Float(configuration.spatialGrid.bucketCapacity),
                configuration.negativePressureRatio
            ),
            stability: SIMD4<Float>(configuration.maximumSpeed, 0, 0, 0),
            governedGate: SIMD4<Float>(
                gate?.y ?? 0,
                gate?.openingCenterX ?? 0,
                gate?.openingHalfWidth ?? -1,
                isGovernedGateOpen ? 1 : 0
            )
        )
    }

    private func writeInitialParticles() {
        let byteCount = MemoryLayout<GPUParticle>.stride * particleCount
        initialParticles.withUnsafeBytes { source in
            for buffer in particleBuffers + [densityBuffer] {
                memcpy(buffer.contents(), source.baseAddress!, byteCount)
            }
        }
        let gridCellCount = configuration.spatialGrid.columns
            * configuration.spatialGrid.rows
        memset(
            gridCountsBuffer.contents(),
            0,
            MemoryLayout<UInt32>.stride * gridCellCount
        )
        memset(gridOverflowBuffer.contents(), 0, MemoryLayout<UInt32>.stride)
    }
}
