import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

public struct GateReleaseExportReceipt: Equatable, Sendable, Codable {
    public let renderer: String
    public let specification: GateReleaseShotSpecification
    public let frameCount: Int
    public let framePattern: String
    public let checkpoints: [GateReleaseSample]
}

public enum GateReleaseFilmExporterError: Error, LocalizedError {
    case invalidFrameBuffer
    case imageDestinationUnavailable
    case imageWriteFailed(URL)

    public var errorDescription: String? {
        switch self {
        case .invalidFrameBuffer:
            return "The rendered RGBA frame cannot form a Core Graphics image."
        case .imageDestinationUnavailable:
            return "ImageIO could not create a PNG destination."
        case let .imageWriteFailed(url):
            return "ImageIO could not write the PNG frame to \(url.path)."
        }
    }
}

public final class GateReleaseFilmExporter {
    public let timeline: GateReleaseTimeline
    public let renderer: MetalGateReleaseRenderer

    public init(
        timeline: GateReleaseTimeline,
        renderer: MetalGateReleaseRenderer
    ) {
        precondition(timeline.specification == renderer.specification)
        self.timeline = timeline
        self.renderer = renderer
    }

    @discardableResult
    public func exportFrames(
        to directory: URL,
        progress: ((Int, Int) -> Void)? = nil
    ) throws -> GateReleaseExportReceipt {
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )

        for frameIndex in 0..<timeline.frameCount {
            let frame = try renderer.render(sample: timeline.sample(frameIndex))
            let filename = String(format: "frame-%04d.png", frameIndex)
            try Self.writePNG(frame, to: directory.appendingPathComponent(filename))
            progress?(frameIndex + 1, timeline.frameCount)
        }

        let checkpointFrames = [0, 47, 72, 73, 132, 144, 156, timeline.frameCount - 1]
        return GateReleaseExportReceipt(
            renderer: "Apple Metal deterministic compute",
            specification: timeline.specification,
            frameCount: timeline.frameCount,
            framePattern: "frame-%04d.png",
            checkpoints: checkpointFrames.map(timeline.sample)
        )
    }

    public static func writePNG(
        _ frame: RenderedGateReleaseFrame,
        to url: URL
    ) throws {
        let bytesPerRow = frame.width * 4
        let data = Data(frame.rgba8) as CFData
        guard
            let provider = CGDataProvider(data: data),
            let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
            let image = CGImage(
                width: frame.width,
                height: frame.height,
                bitsPerComponent: 8,
                bitsPerPixel: 32,
                bytesPerRow: bytesPerRow,
                space: colorSpace,
                bitmapInfo: CGBitmapInfo(
                    rawValue: CGImageAlphaInfo.premultipliedLast.rawValue
                ),
                provider: provider,
                decode: nil,
                shouldInterpolate: false,
                intent: .defaultIntent
            )
        else {
            throw GateReleaseFilmExporterError.invalidFrameBuffer
        }
        guard let destination = CGImageDestinationCreateWithURL(
            url as CFURL,
            UTType.png.identifier as CFString,
            1,
            nil
        ) else {
            throw GateReleaseFilmExporterError.imageDestinationUnavailable
        }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else {
            throw GateReleaseFilmExporterError.imageWriteFailed(url)
        }
    }
}
