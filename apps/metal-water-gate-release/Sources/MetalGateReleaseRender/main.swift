import Foundation
import GateReleaseFilm
import Metal

enum RenderCommandError: Error, LocalizedError {
    case metalUnavailable
    case missingOutputDirectory

    var errorDescription: String? {
        switch self {
        case .metalUnavailable:
            return "This Mac does not expose a Metal device."
        case .missingOutputDirectory:
            return "Usage: MetalGateReleaseRender --out-dir <frames> --receipt <receipt.json>"
        }
    }
}

func argument(after flag: String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of: flag) else { return nil }
    let valueIndex = CommandLine.arguments.index(after: index)
    guard valueIndex < CommandLine.arguments.endIndex else { return nil }
    return CommandLine.arguments[valueIndex]
}

do {
    guard let outputPath = argument(after: "--out-dir") else {
        throw RenderCommandError.missingOutputDirectory
    }
    let outputURL = URL(fileURLWithPath: outputPath, isDirectory: true)
    let receiptURL = URL(
        fileURLWithPath: argument(after: "--receipt")
            ?? outputURL.deletingLastPathComponent().appendingPathComponent("render-receipt.json").path
    )
    guard let device = MTLCreateSystemDefaultDevice() else {
        throw RenderCommandError.metalUnavailable
    }

    let specification = GateReleaseShotSpecification.performanceGateRelease
    let timeline = GateReleaseTimeline(specification: specification)
    let renderer = try MetalGateReleaseRenderer(
        device: device,
        specification: specification
    )
    let exporter = GateReleaseFilmExporter(timeline: timeline, renderer: renderer)
    let receipt = try exporter.exportFrames(to: outputURL) { completed, total in
        if completed == 1 || completed.isMultiple(of: 24) || completed == total {
            print("Rendered \(completed)/\(total) frames")
        }
    }

    try FileManager.default.createDirectory(
        at: receiptURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    try encoder.encode(receipt).write(to: receiptURL, options: .atomic)
    print("Wrote \(receipt.frameCount) deterministic frames to \(outputURL.path)")
    print("Wrote render receipt to \(receiptURL.path)")
} catch {
    FileHandle.standardError.write(Data("error: \(error.localizedDescription)\n".utf8))
    exit(1)
}
