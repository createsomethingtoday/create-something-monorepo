import Foundation
import WaterSimulationCore

struct RenderProofContext: Codable, Equatable {
    let particleCount: Int
    let medianFPS: Double
    let solverSubsteps: Int
    let gridOverflowCount: Int
    let device: String
    let gateOpen: Bool
}

private struct RenderReceipt: Encodable {
    let schemaVersion = "metal_water_render_receipt.v0.1"
    let generatedAt: String
    let mode = "shadow_only"
    let writes = "none"
    let proof: WorkflowProofBundle
    let renderer: RenderProofContext
}

enum ProofArtifactWriter {
    static func write(
        proof: WorkflowProofBundle,
        renderer: RenderProofContext,
        artifactTour: WorkflowArtifactTourEvidence
    ) throws -> URL {
        let fileManager = FileManager.default
        let applicationSupport = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let directory = applicationSupport
            .appendingPathComponent("CREATE SOMETHING", isDirectory: true)
            .appendingPathComponent("Metal Water Workflow Simulator", isDirectory: true)
            .appendingPathComponent("receipts", isDirectory: true)
            .appendingPathComponent(proof.caseId, isDirectory: true)
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)

        try proof.jsonData().write(
            to: directory.appendingPathComponent("proof-receipt.json"),
            options: .atomic
        )

        let traceEncoder = JSONEncoder()
        traceEncoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let traceData = try proof.trace.reduce(into: Data()) { output, event in
            output.append(try traceEncoder.encode(event))
            output.append(0x0A)
        }
        try traceData.write(
            to: directory.appendingPathComponent("event-trace.jsonl"),
            options: .atomic
        )

        try artifactTour.jsonData().write(
            to: directory.appendingPathComponent("artifact-tour.json"),
            options: .atomic
        )

        let timestamp = ISO8601DateFormatter().string(from: Date())
        try encoded(
            RenderReceipt(generatedAt: timestamp, proof: proof, renderer: renderer)
        ).write(
            to: directory.appendingPathComponent("render-receipt.json"),
            options: .atomic
        )
        try encoded(
            NativeCaptureManifest(
                workflowId: proof.workflowId,
                workflowVersion: proof.workflowVersion,
                definitionHash: proof.definitionHash,
                caseId: proof.caseId
            )
        ).write(
            to: directory.appendingPathComponent("capture-manifest.json"),
            options: .atomic
        )
        return directory
    }

    private static func encoded<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(value)
    }
}
