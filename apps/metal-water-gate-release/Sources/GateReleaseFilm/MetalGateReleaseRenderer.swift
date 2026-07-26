import Foundation
import Metal

private struct GateReleaseRenderUniforms {
    var dimensionsFrameSeed: SIMD4<UInt32>
    var timeline: SIMD4<Float>
}

public struct RenderedGateReleaseFrame: Equatable, Sendable {
    public let width: Int
    public let height: Int
    public let rgba8: [UInt8]
}

public enum MetalGateReleaseRendererError: Error, LocalizedError {
    case commandQueueUnavailable
    case shaderUnavailable
    case functionUnavailable
    case textureAllocationFailed
    case commandBufferUnavailable
    case encoderUnavailable
    case gpuExecutionFailed(String)

    public var errorDescription: String? {
        switch self {
        case .commandQueueUnavailable:
            return "Metal could not create the gate-release command queue."
        case .shaderUnavailable:
            return "The packaged gate-release Metal shader is unavailable."
        case .functionUnavailable:
            return "The gate-release Metal kernel is unavailable."
        case .textureAllocationFailed:
            return "Metal could not allocate the gate-release output texture."
        case .commandBufferUnavailable:
            return "Metal could not create a gate-release command buffer."
        case .encoderUnavailable:
            return "Metal could not create a gate-release compute encoder."
        case let .gpuExecutionFailed(message):
            return "The gate-release GPU render failed: \(message)"
        }
    }
}

public final class MetalGateReleaseRenderer {
    public let specification: GateReleaseShotSpecification

    private let commandQueue: MTLCommandQueue
    private let pipeline: MTLComputePipelineState
    private let outputTexture: MTLTexture

    public init(
        device: MTLDevice,
        specification: GateReleaseShotSpecification
    ) throws {
        guard let commandQueue = device.makeCommandQueue() else {
            throw MetalGateReleaseRendererError.commandQueueUnavailable
        }
        guard
            let shaderURL = Bundle.module.url(
                forResource: "GateRelease",
                withExtension: "metal"
            ),
            let source = try? String(contentsOf: shaderURL, encoding: .utf8)
        else {
            throw MetalGateReleaseRendererError.shaderUnavailable
        }
        let library = try device.makeLibrary(source: source, options: nil)
        guard let function = library.makeFunction(name: "renderGateReleaseFrame") else {
            throw MetalGateReleaseRendererError.functionUnavailable
        }
        pipeline = try device.makeComputePipelineState(function: function)

        let descriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .rgba8Unorm,
            width: specification.width,
            height: specification.height,
            mipmapped: false
        )
        descriptor.usage = [.shaderWrite]
        descriptor.storageMode = .shared
        guard let outputTexture = device.makeTexture(descriptor: descriptor) else {
            throw MetalGateReleaseRendererError.textureAllocationFailed
        }
        outputTexture.label = "Deterministic Performance gate-release frame"

        self.specification = specification
        self.commandQueue = commandQueue
        self.outputTexture = outputTexture
    }

    public func render(sample: GateReleaseSample) throws -> RenderedGateReleaseFrame {
        guard let commandBuffer = commandQueue.makeCommandBuffer() else {
            throw MetalGateReleaseRendererError.commandBufferUnavailable
        }
        commandBuffer.label = "Gate release frame \(sample.frameIndex)"
        guard let encoder = commandBuffer.makeComputeCommandEncoder() else {
            throw MetalGateReleaseRendererError.encoderUnavailable
        }

        var uniforms = GateReleaseRenderUniforms(
            dimensionsFrameSeed: SIMD4<UInt32>(
                UInt32(specification.width),
                UInt32(specification.height),
                UInt32(sample.frameIndex),
                specification.deterministicSeed
            ),
            timeline: SIMD4<Float>(
                sample.timeSeconds,
                sample.gateOpenProgress,
                sample.waterReleaseProgress,
                sample.proofProgress
            )
        )
        encoder.label = "Render deterministic Performance gate release"
        encoder.setComputePipelineState(pipeline)
        encoder.setTexture(outputTexture, index: 0)
        encoder.setBytes(
            &uniforms,
            length: MemoryLayout<GateReleaseRenderUniforms>.stride,
            index: 0
        )

        let width = pipeline.threadExecutionWidth
        let height = max(1, pipeline.maxTotalThreadsPerThreadgroup / width)
        encoder.dispatchThreads(
            MTLSize(
                width: specification.width,
                height: specification.height,
                depth: 1
            ),
            threadsPerThreadgroup: MTLSize(width: width, height: height, depth: 1)
        )
        encoder.endEncoding()
        commandBuffer.commit()
        commandBuffer.waitUntilCompleted()

        if commandBuffer.status == .error {
            throw MetalGateReleaseRendererError.gpuExecutionFailed(
                commandBuffer.error?.localizedDescription ?? "Unknown Metal error"
            )
        }

        let bytesPerRow = specification.width * 4
        var bytes = [UInt8](
            repeating: 0,
            count: bytesPerRow * specification.height
        )
        bytes.withUnsafeMutableBytes { destination in
            outputTexture.getBytes(
                destination.baseAddress!,
                bytesPerRow: bytesPerRow,
                from: MTLRegionMake2D(
                    0,
                    0,
                    specification.width,
                    specification.height
                ),
                mipmapLevel: 0
            )
        }

        return RenderedGateReleaseFrame(
            width: specification.width,
            height: specification.height,
            rgba8: bytes
        )
    }
}
