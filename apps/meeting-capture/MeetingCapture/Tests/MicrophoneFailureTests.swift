import AVFoundation
import Foundation
import Testing
@testable import MeetingCapture

private final class FailedMicrophoneDevice: MicrophoneRecordingDevice {
    var delegate: AVAudioRecorderDelegate?
    var deviceCurrentTime: TimeInterval = 100
    var prepares = false
    var stops = 0
    func prepareToRecord() -> Bool { prepares }
    func record(atTime: TimeInterval) -> Bool { false }
    func stop() { stops += 1 }
}

@Test(arguments: ["prepare", "record", "create"])
func failedMicrophoneStartupCleansPartialOutput(stage: String) throws {
    let device = FailedMicrophoneDevice()
    device.prepares = stage == "record"
    var output: URL?
    let recorder = MicrophoneAudioRecorder { url, _ in
        output = url
        try Data("partial fixture".utf8).write(to: url)
        if stage == "create" { throw CocoaError(.fileWriteUnknown) }
        return device
    }
    defer { if let output { try? FileManager.default.removeItem(at: output) } }
    #expect(!recorder.startRecording(meetingId: UUID().uuidString))
    #expect(!FileManager.default.fileExists(atPath: try #require(output).path))
    #expect(recorder.startHostTime == nil)
    #expect(recorder.stopRecording() == nil)
    #expect(device.stops == (stage == "create" ? 0 : 1))
}
