import Foundation
import WaterSimulationCore

public struct SPHFieldRasterizedFrame: Codable, Equatable, Sendable {
    public let values: [UInt16]
    public let downstreamParticleCount: Int

    public var maximumValue: UInt16? {
        values.max()
    }
}

public struct SPHFieldRasterizer: Sendable {
    public let width: Int
    public let height: Int
    public let bounds: SimulationBounds
    public let gateY: Float

    public init(
        width: Int,
        height: Int,
        bounds: SimulationBounds,
        gateY: Float
    ) {
        precondition(width > 0 && height > 0)
        precondition(bounds.maximum.x > bounds.minimum.x)
        precondition(bounds.maximum.y > bounds.minimum.y)
        self.width = width
        self.height = height
        self.bounds = bounds
        self.gateY = gateY
    }

    public func rasterize(_ particles: [WaterParticle]) -> SPHFieldRasterizedFrame {
        var accumulated = [UInt32](repeating: 0, count: width * height)
        let span = bounds.maximum - bounds.minimum
        let kernel: [UInt32] = [1, 2, 1]

        for particle in particles {
            let normalized = (particle.position - bounds.minimum) / span
            let centerX = Int(
                round(min(max(normalized.x, 0), 1) * Float(width - 1))
            )
            let centerY = Int(
                round(min(max(normalized.y, 0), 1) * Float(height - 1))
            )

            for offsetY in -1...1 {
                let y = centerY + offsetY
                guard y >= 0 && y < height else { continue }
                for offsetX in -1...1 {
                    let x = centerX + offsetX
                    guard x >= 0 && x < width else { continue }
                    let weight = kernel[offsetX + 1] * kernel[offsetY + 1]
                    accumulated[y * width + x] += weight
                }
            }
        }

        return SPHFieldRasterizedFrame(
            values: accumulated.map { UInt16(clamping: $0) },
            downstreamParticleCount: particles.count { $0.position.y < gateY }
        )
    }
}
