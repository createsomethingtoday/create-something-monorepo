import Foundation
import Metal
import SPHFieldBridge

enum CaptureCommandError: Error, LocalizedError {
    case metalUnavailable
    case missingOutput

    var errorDescription: String? {
        switch self {
        case .metalUnavailable:
            return "This Mac does not expose a Metal device."
        case .missingOutput:
            return "Usage: SPHFieldCapture --output <field.json> --receipt <receipt.json>"
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
    guard let outputPath = argument(after: "--output") else {
        throw CaptureCommandError.missingOutput
    }
    let outputURL = URL(fileURLWithPath: outputPath)
    let receiptURL = URL(
        fileURLWithPath: argument(after: "--receipt")
            ?? outputURL.deletingPathExtension().appendingPathExtension("receipt.json").path
    )
    guard let device = MTLCreateSystemDefaultDevice() else {
        throw CaptureCommandError.metalUnavailable
    }

    let engine = SPHFieldCaptureEngine(
        device: device,
        specification: .performanceGateRelease
    )
    let document = try engine.capture { completed, total in
        if completed == 1 || completed.isMultiple(of: 24) || completed == total {
            print("Captured \(completed)/\(total) SPH field frames")
        }
    }
    let documentData = try document.deterministicJSONData()
    let receiptData = try JSONEncoder.receiptEncoder.encode(document.makeReceipt())

    try FileManager.default.createDirectory(
        at: outputURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try FileManager.default.createDirectory(
        at: receiptURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    try documentData.write(to: outputURL, options: .atomic)
    try receiptData.write(to: receiptURL, options: .atomic)
    print("Wrote deterministic SPH field to \(outputURL.path)")
    print("Wrote capture receipt to \(receiptURL.path)")
} catch {
    FileHandle.standardError.write(Data("error: \(error.localizedDescription)\n".utf8))
    exit(1)
}

private extension JSONEncoder {
    static var receiptEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return encoder
    }
}
