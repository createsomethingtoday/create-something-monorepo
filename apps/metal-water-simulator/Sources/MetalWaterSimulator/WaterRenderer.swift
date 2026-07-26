import Foundation
import MetalKit
import WaterSimulationCore
import simd

private struct ViewUniforms {
    var viewportAspectPointSize: SIMD4<Float>
    var timeParticleRadiusTexelX: SIMD4<Float>
    var deepWater: SIMD4<Float>
    var surfaceWater: SIMD4<Float>
    var highlightWater: SIMD4<Float>
    var turbulentWater: SIMD4<Float>
    var backgroundPaper: SIMD4<Float>
    var backgroundCourt: SIMD4<Float>
    var backgroundGrid: SIMD4<Float>
    var pressureAccent: SIMD4<Float>
}

struct RenderMetrics: Equatable, Sendable {
    let medianFPS: Double
    let windowDuration: Double
    let completedFrameCount: Int
    let solverSubsteps: Int
    let gridOverflowCount: Int

    var hasTenSecondWindow: Bool { windowDuration >= 9.8 }
}

private final class FramePerformanceMonitor: @unchecked Sendable {
    private let lock = NSLock()
    private var completionTimes: [CFTimeInterval] = []
    private var completedFrameCount = 0
    private var lastPublishTime: CFTimeInterval = 0

    func reset() {
        lock.lock()
        completionTimes.removeAll(keepingCapacity: true)
        completedFrameCount = 0
        lastPublishTime = 0
        lock.unlock()
    }

    func recordCompletion(at time: CFTimeInterval) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        completionTimes.append(time)
        completedFrameCount += 1
        completionTimes.removeAll { $0 < time - 10.25 }
        guard time - lastPublishTime >= 0.25 else { return false }
        lastPublishTime = time
        return true
    }

    func snapshot(solverSubsteps: Int, gridOverflowCount: Int) -> RenderMetrics {
        lock.lock()
        defer { lock.unlock() }
        let intervals = zip(completionTimes.dropFirst(), completionTimes).map { later, earlier in
            later - earlier
        }.filter { $0 > 0 }
        let sortedIntervals = intervals.sorted()
        let medianInterval: Double
        if sortedIntervals.isEmpty {
            medianInterval = 0
        } else if sortedIntervals.count.isMultiple(of: 2) {
            let upper = sortedIntervals.count / 2
            medianInterval = (sortedIntervals[upper - 1] + sortedIntervals[upper]) * 0.5
        } else {
            medianInterval = sortedIntervals[sortedIntervals.count / 2]
        }
        let duration = max(
            0,
            (completionTimes.last ?? 0) - (completionTimes.first ?? 0)
        )
        return RenderMetrics(
            medianFPS: medianInterval > 0 ? 1 / medianInterval : 0,
            windowDuration: min(duration, 10),
            completedFrameCount: completedFrameCount,
            solverSubsteps: solverSubsteps,
            gridOverflowCount: gridOverflowCount
        )
    }
}

enum WaterRendererError: Error, LocalizedError {
    case commandQueueUnavailable
    case shaderUnavailable
    case functionUnavailable(String)
    case textureAllocationFailed

    var errorDescription: String? {
        switch self {
        case .commandQueueUnavailable:
            return "Metal could not create the render command queue."
        case .shaderUnavailable:
            return "The packaged water-rendering shader is unavailable."
        case let .functionUnavailable(name):
            return "The water-rendering shader function \(name) is unavailable."
        case .textureAllocationFailed:
            return "Metal could not allocate the screen-space water textures."
        }
    }
}

@MainActor
final class WaterRenderer: NSObject, MTKViewDelegate {
    let particleCount: Int
    let deviceName: String
    var metricsHandler: ((RenderMetrics) -> Void)?
    var isPaused = false {
        didSet {
            if oldValue && !isPaused {
                performanceMonitor.reset()
            }
        }
    }

    private let device: MTLDevice
    private let simulation: MetalWaterSimulation
    private let accumulationPipeline: MTLRenderPipelineState
    private let blurPipeline: MTLComputePipelineState
    private let compositePipeline: MTLRenderPipelineState
    private var accumulationTexture: MTLTexture?
    private var horizontalBlurTexture: MTLTexture?
    private var surfaceTexture: MTLTexture?
    private var pendingReset = false
    private var pendingImpulse: SIMD2<Float>?
    private var pendingGateOpen: Bool?
    private var startTime = CACurrentMediaTime()
    private let performanceMonitor = FramePerformanceMonitor()

    init(view: MTKView) throws {
        guard let device = view.device else {
            throw WaterRendererError.commandQueueUnavailable
        }
        self.device = device

        let hydraulicProjection = try SimulatorArtifactCatalog.loadBundled().hydraulicProjection
        let particles = hydraulicProjection.makeParticles()
        let configuration = hydraulicProjection.makeSimulationConfiguration()
        simulation = try MetalWaterSimulation(
            device: device,
            particles: particles,
            configuration: configuration
        )

        guard
            let shaderURL = Bundle.module.url(forResource: "WaterRender", withExtension: "metal"),
            let source = try? String(contentsOf: shaderURL, encoding: .utf8)
        else {
            throw WaterRendererError.shaderUnavailable
        }
        let library = try device.makeLibrary(source: source, options: nil)
        let thicknessVertex = try Self.function(
            named: "waterThicknessVertex",
            library: library
        )
        let thicknessFragment = try Self.function(
            named: "waterThicknessFragment",
            library: library
        )
        let compositeVertex = try Self.function(
            named: "waterCompositeVertex",
            library: library
        )
        let compositeFragment = try Self.function(
            named: "waterCompositeFragment",
            library: library
        )
        let blurFunction = try Self.function(named: "blurWaterField", library: library)

        let accumulationDescriptor = MTLRenderPipelineDescriptor()
        accumulationDescriptor.label = "Water thickness accumulation"
        accumulationDescriptor.vertexFunction = thicknessVertex
        accumulationDescriptor.fragmentFunction = thicknessFragment
        accumulationDescriptor.colorAttachments[0].pixelFormat = .rgba16Float
        accumulationDescriptor.colorAttachments[0].isBlendingEnabled = true
        accumulationDescriptor.colorAttachments[0].rgbBlendOperation = .add
        accumulationDescriptor.colorAttachments[0].alphaBlendOperation = .add
        accumulationDescriptor.colorAttachments[0].sourceRGBBlendFactor = .one
        accumulationDescriptor.colorAttachments[0].sourceAlphaBlendFactor = .one
        accumulationDescriptor.colorAttachments[0].destinationRGBBlendFactor = .one
        accumulationDescriptor.colorAttachments[0].destinationAlphaBlendFactor = .one
        accumulationPipeline = try device.makeRenderPipelineState(
            descriptor: accumulationDescriptor
        )

        blurPipeline = try device.makeComputePipelineState(function: blurFunction)

        let compositeDescriptor = MTLRenderPipelineDescriptor()
        compositeDescriptor.label = "Continuous water composite"
        compositeDescriptor.vertexFunction = compositeVertex
        compositeDescriptor.fragmentFunction = compositeFragment
        compositeDescriptor.colorAttachments[0].pixelFormat = view.colorPixelFormat
        compositePipeline = try device.makeRenderPipelineState(
            descriptor: compositeDescriptor
        )

        particleCount = particles.count
        deviceName = "\(device.name) · Metal compute"
        super.init()
    }

    func requestReset() {
        pendingReset = true
        performanceMonitor.reset()
    }

    func requestImpulse(at point: SIMD2<Float>) {
        pendingImpulse = point
    }

    func requestGate(open: Bool) {
        pendingGateOpen = open
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        rebuildTextures(for: size)
    }

    func draw(in view: MTKView) {
        guard
            view.drawableSize.width > 0,
            view.drawableSize.height > 0,
            let drawable = view.currentDrawable,
            let finalRenderPass = view.currentRenderPassDescriptor
        else { return }

        if accumulationTexture?.width != Int(view.drawableSize.width)
            || accumulationTexture?.height != Int(view.drawableSize.height) {
            rebuildTextures(for: view.drawableSize)
        }
        guard
            let accumulationTexture,
            let horizontalBlurTexture,
            let surfaceTexture
        else { return }

        if pendingReset {
            simulation.reset()
            pendingReset = false
            pendingGateOpen = nil
            startTime = CACurrentMediaTime()
        }

        if let pendingGateOpen {
            simulation.isGovernedGateOpen = pendingGateOpen
            self.pendingGateOpen = nil
        }

        do {
            let commandBuffer = try simulation.makeCommandBuffer(label: "Metal water frame")
            let completedSolverSubsteps = isPaused ? 0 : 2
            if let impulse = pendingImpulse {
                try simulation.encodeImpulse(
                    commandBuffer: commandBuffer,
                    center: impulse,
                    direction: SIMD2<Float>(0, 1),
                    radius: 0.3,
                    strength: 4.2
                )
                pendingImpulse = nil
            }

            if !isPaused {
                try simulation.encodeStep(commandBuffer: commandBuffer, deltaTime: 1 / 120)
                try simulation.encodeStep(commandBuffer: commandBuffer, deltaTime: 1 / 120)
            }

            var uniforms = makeUniforms(for: view)
            let accumulationPass = MTLRenderPassDescriptor()
            accumulationPass.colorAttachments[0].texture = accumulationTexture
            accumulationPass.colorAttachments[0].loadAction = .clear
            accumulationPass.colorAttachments[0].storeAction = .store
            accumulationPass.colorAttachments[0].clearColor = MTLClearColorMake(0, 0, 0, 0)
            guard let thicknessEncoder = commandBuffer.makeRenderCommandEncoder(
                descriptor: accumulationPass
            ) else { return }
            thicknessEncoder.label = "Accumulate particle thickness and turbulence"
            thicknessEncoder.setRenderPipelineState(accumulationPipeline)
            thicknessEncoder.setVertexBuffer(simulation.particleBuffer, offset: 0, index: 0)
            thicknessEncoder.setVertexBytes(
                &uniforms,
                length: MemoryLayout<ViewUniforms>.stride,
                index: 1
            )
            thicknessEncoder.drawPrimitives(
                type: .point,
                vertexStart: 0,
                vertexCount: particleCount
            )
            thicknessEncoder.endEncoding()

            encodeBlur(
                commandBuffer: commandBuffer,
                source: accumulationTexture,
                destination: horizontalBlurTexture,
                direction: SIMD2<UInt32>(1, 0)
            )
            encodeBlur(
                commandBuffer: commandBuffer,
                source: horizontalBlurTexture,
                destination: surfaceTexture,
                direction: SIMD2<UInt32>(0, 1)
            )
            encodeBlur(
                commandBuffer: commandBuffer,
                source: surfaceTexture,
                destination: accumulationTexture,
                direction: SIMD2<UInt32>(1, 0)
            )
            encodeBlur(
                commandBuffer: commandBuffer,
                source: accumulationTexture,
                destination: horizontalBlurTexture,
                direction: SIMD2<UInt32>(0, 1)
            )

            guard let compositeEncoder = commandBuffer.makeRenderCommandEncoder(
                descriptor: finalRenderPass
            ) else { return }
            compositeEncoder.label = "Composite continuous refractive water"
            compositeEncoder.setRenderPipelineState(compositePipeline)
            compositeEncoder.setFragmentTexture(horizontalBlurTexture, index: 0)
            compositeEncoder.setFragmentBytes(
                &uniforms,
                length: MemoryLayout<ViewUniforms>.stride,
                index: 0
            )
            compositeEncoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
            compositeEncoder.endEncoding()

            commandBuffer.present(drawable)
            let monitor = performanceMonitor
            commandBuffer.addCompletedHandler { [weak self] _ in
                guard completedSolverSubsteps > 0 else { return }
                guard monitor.recordCompletion(at: CACurrentMediaTime()) else { return }
                DispatchQueue.main.async {
                    guard let self else { return }
                    let metrics = monitor.snapshot(
                        solverSubsteps: completedSolverSubsteps,
                        gridOverflowCount: self.simulation.currentGridOverflowCount
                    )
                    self.metricsHandler?(metrics)
                }
            }
            commandBuffer.commit()
        } catch {
            isPaused = true
        }
    }

    private func makeUniforms(for view: MTKView) -> ViewUniforms {
        ViewUniforms(
            viewportAspectPointSize: SIMD4<Float>(
                Float(view.drawableSize.width),
                Float(view.drawableSize.height),
                Float(view.drawableSize.width / view.drawableSize.height),
                5.5
            ),
            timeParticleRadiusTexelX: SIMD4<Float>(
                Float(CACurrentMediaTime() - startTime),
                simulation.configuration.particleRadius,
                1 / Float(view.drawableSize.width),
                1 / Float(view.drawableSize.height)
            ),
            deepWater: PerformanceTokens.brandPrimary.rgba,
            surfaceWater: PerformanceTokens.dataOne.rgba,
            highlightWater: PerformanceTokens.brandInk.rgba,
            turbulentWater: PerformanceTokens.liquidGlassCyan.rgba,
            backgroundPaper: PerformanceTokens.paper.rgba,
            backgroundCourt: PerformanceTokens.court.rgba,
            backgroundGrid: PerformanceTokens.grid.rgba,
            pressureAccent: PerformanceTokens.pressure.rgba
        )
    }

    private func rebuildTextures(for size: CGSize) {
        let width = max(Int(size.width), 1)
        let height = max(Int(size.height), 1)
        let descriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .rgba16Float,
            width: width,
            height: height,
            mipmapped: false
        )
        descriptor.usage = [.renderTarget, .shaderRead, .shaderWrite]
        descriptor.storageMode = .private
        accumulationTexture = device.makeTexture(descriptor: descriptor)
        horizontalBlurTexture = device.makeTexture(descriptor: descriptor)
        surfaceTexture = device.makeTexture(descriptor: descriptor)
        accumulationTexture?.label = "Raw particle thickness"
        horizontalBlurTexture?.label = "Horizontal water blur"
        surfaceTexture?.label = "Reconstructed water field"
    }

    private func encodeBlur(
        commandBuffer: MTLCommandBuffer,
        source: MTLTexture,
        destination: MTLTexture,
        direction: SIMD2<UInt32>
    ) {
        guard let encoder = commandBuffer.makeComputeCommandEncoder() else { return }
        var direction = direction
        encoder.label = direction.x == 1 ? "Horizontal thickness blur" : "Vertical thickness blur"
        encoder.setComputePipelineState(blurPipeline)
        encoder.setTexture(source, index: 0)
        encoder.setTexture(destination, index: 1)
        encoder.setBytes(
            &direction,
            length: MemoryLayout<SIMD2<UInt32>>.stride,
            index: 0
        )
        let width = blurPipeline.threadExecutionWidth
        let height = max(1, blurPipeline.maxTotalThreadsPerThreadgroup / width)
        encoder.dispatchThreads(
            MTLSize(width: source.width, height: source.height, depth: 1),
            threadsPerThreadgroup: MTLSize(width: width, height: height, depth: 1)
        )
        encoder.endEncoding()
    }

    private static func function(
        named name: String,
        library: MTLLibrary
    ) throws -> MTLFunction {
        guard let function = library.makeFunction(name: name) else {
            throw WaterRendererError.functionUnavailable(name)
        }
        return function
    }
}
