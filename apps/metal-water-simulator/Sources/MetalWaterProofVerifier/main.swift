import Foundation
import WaterSimulationCore

enum ProofVerifierError: Error, LocalizedError {
    case usage
    case missingManifest(String)
    case unknownCommand(String)

    var errorDescription: String? {
        switch self {
        case .usage:
            "Usage: MetalWaterProofVerifier <finalize|verify> <proof-directory>"
        case let .missingManifest(path):
            "Capture manifest is missing at \(path)."
        case let .unknownCommand(command):
            "Unknown proof-verifier command \(command)."
        }
    }
}

@main
struct MetalWaterProofVerifier {
    static func main() throws {
        guard CommandLine.arguments.count == 3 else {
            throw ProofVerifierError.usage
        }
        let command = CommandLine.arguments[1]
        let directory = URL(
            fileURLWithPath: CommandLine.arguments[2],
            isDirectory: true
        ).standardizedFileURL
        let manifestURL = directory.appendingPathComponent(
            "capture-manifest.json",
            isDirectory: false
        )
        guard FileManager.default.fileExists(atPath: manifestURL.path) else {
            throw ProofVerifierError.missingManifest(manifestURL.path)
        }

        let manifest = try JSONDecoder().decode(
            NativeCaptureManifest.self,
            from: Data(contentsOf: manifestURL)
        )
        switch command {
        case "finalize":
            let finalized = try manifest.finalized(in: directory)
            try finalized.jsonData().write(to: manifestURL, options: .atomic)
            try finalized.verify(in: directory)
            print("FINALIZED \(finalized.captures.count)/\(finalized.requiredCaptures.count)")
            for capture in finalized.captures {
                print("\(capture.name) \(capture.sha256) \(capture.byteCount)")
            }
        case "verify":
            try manifest.verify(in: directory)
            print("VERIFIED \(manifest.captures.count)/\(manifest.requiredCaptures.count)")
            for capture in manifest.captures {
                print("\(capture.name) \(capture.sha256) \(capture.byteCount)")
            }
        default:
            throw ProofVerifierError.unknownCommand(command)
        }
    }
}
