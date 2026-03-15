import Testing
import Foundation
@testable import MeetingCapture

@Test
func validateAudioRejectsTinyFiles() async throws {
    let uploader = MeetingUploader()
    let url = makeTempURL(ext: "m4a")
    defer { try? FileManager.default.removeItem(at: url) }

    let tinyPayload = Data(repeating: 0x00, count: 128)
    try tinyPayload.write(to: url)

    do {
        _ = try await uploader.validateAudioForUpload(audioURL: url)
        Issue.record("Expected tiny file validation failure")
    } catch let error as UploadError {
        guard case .invalidAudioFile(let reason) = error else {
            Issue.record("Expected invalidAudioFile, got \(error)")
            return
        }

        #expect(reason.contains("File too small"))
    } catch {
        Issue.record("Unexpected error type: \(error)")
    }
}

@Test
func validateAudioRejectsCorruptContainers() async throws {
    let uploader = MeetingUploader()
    let url = makeTempURL(ext: "m4a")
    defer { try? FileManager.default.removeItem(at: url) }

    // Make it large enough to pass size checks but not a valid audio container.
    let invalidPayload = Data(repeating: 0x41, count: 64 * 1024)
    try invalidPayload.write(to: url)

    do {
        _ = try await uploader.validateAudioForUpload(audioURL: url)
        Issue.record("Expected corrupt container validation failure")
    } catch let error as UploadError {
        guard case .invalidAudioFile(let reason) = error else {
            Issue.record("Expected invalidAudioFile, got \(error)")
            return
        }

        #expect(
            reason.contains("not playable") ||
            reason.contains("No audio track found") ||
            reason.contains("Unreadable audio container")
        )
    } catch {
        Issue.record("Unexpected error type: \(error)")
    }
}

private func makeTempURL(ext: String) -> URL {
    FileManager.default.temporaryDirectory
        .appendingPathComponent("meeting-uploader-validation-\(UUID().uuidString).\(ext)")
}
