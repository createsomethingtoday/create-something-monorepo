import CryptoKit
import Foundation

public struct NativeCaptureManifest: Codable, Equatable, Sendable {
    public struct Capture: Codable, Equatable, Sendable {
        public let name: String
        public let path: String
        public let sha256: String
        public let byteCount: Int
    }

    public let schemaVersion: String
    public let workflowId: String
    public let workflowVersion: String
    public let definitionHash: String
    public let caseId: String
    public let requiredCaptures: [String]
    public let captures: [Capture]

    public init(
        workflowId: String,
        workflowVersion: String,
        definitionHash: String,
        caseId: String,
        requiredCaptures: [String] = [
            "native-window.png",
            "workflow-inspector.png",
            "renderer-health.png",
            "artifact-tour.png",
        ],
        captures: [Capture] = []
    ) {
        schemaVersion = "metal_water_capture_manifest.v0.2"
        self.workflowId = workflowId
        self.workflowVersion = workflowVersion
        self.definitionHash = definitionHash
        self.caseId = caseId
        self.requiredCaptures = requiredCaptures
        self.captures = captures
    }

    public func finalized(in directory: URL) throws -> NativeCaptureManifest {
        let captures = try requiredCaptures.map { name in
            let url = directory.appendingPathComponent(name, isDirectory: false)
            guard FileManager.default.fileExists(atPath: url.path) else {
                throw NativeCaptureManifestError.missingCapture(name)
            }
            let data = try Data(contentsOf: url)
            guard !data.isEmpty else {
                throw NativeCaptureManifestError.emptyCapture(name)
            }
            return Capture(
                name: name,
                path: url.path,
                sha256: Self.sha256(data),
                byteCount: data.count
            )
        }
        return NativeCaptureManifest(
            workflowId: workflowId,
            workflowVersion: workflowVersion,
            definitionHash: definitionHash,
            caseId: caseId,
            requiredCaptures: requiredCaptures,
            captures: captures
        )
    }

    public func verify(in directory: URL) throws {
        let required = Set(requiredCaptures)
        let captured = Set(captures.map(\.name))
        guard required == captured, captures.count == requiredCaptures.count else {
            throw NativeCaptureManifestError.incompleteManifest(
                required.subtracting(captured).sorted()
            )
        }
        for capture in captures {
            let url = directory.appendingPathComponent(capture.name, isDirectory: false)
            guard FileManager.default.fileExists(atPath: url.path) else {
                throw NativeCaptureManifestError.missingCapture(capture.name)
            }
            let data = try Data(contentsOf: url)
            guard data.count == capture.byteCount else {
                throw NativeCaptureManifestError.byteCountMismatch(capture.name)
            }
            let actual = Self.sha256(data)
            guard actual == capture.sha256 else {
                throw NativeCaptureManifestError.hashMismatch(capture.name)
            }
        }
    }

    public func jsonData() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }

    private static func sha256(_ data: Data) -> String {
        "sha256:" + SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}

public enum NativeCaptureManifestError: Error, LocalizedError, Equatable {
    case missingCapture(String)
    case emptyCapture(String)
    case incompleteManifest([String])
    case byteCountMismatch(String)
    case hashMismatch(String)

    public var errorDescription: String? {
        switch self {
        case let .missingCapture(name):
            "Required native capture \(name) is missing."
        case let .emptyCapture(name):
            "Required native capture \(name) is empty."
        case let .incompleteManifest(names):
            "Native capture manifest is incomplete: \(names.joined(separator: ", "))."
        case let .byteCountMismatch(name):
            "Native capture \(name) no longer matches its recorded byte count."
        case let .hashMismatch(name):
            "Native capture \(name) no longer matches its recorded SHA-256."
        }
    }
}
