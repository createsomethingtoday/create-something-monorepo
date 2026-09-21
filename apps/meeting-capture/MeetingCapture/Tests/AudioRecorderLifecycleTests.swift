import AVFoundation
import Foundation
import Testing
@testable import MeetingCapture

private final class FakeSystemRecorder: SystemAudioRecording {
    var firstSampleTime: CMTime? = CMTime(seconds: 100, preferredTimescale: 1_000)
    var starts: [String] = []
    var canStart = true
    var onStart: (() async -> Void)?
    var onStop: (() async -> Void)?
    var output = URL(fileURLWithPath: "/tmp/fixture-system.wav")
    func startRecording(meetingId: String) async -> Bool {
        starts.append(meetingId)
        if let onStart { await onStart() }
        return canStart
    }
    func stopRecording() async -> URL? {
        if let onStop { await onStop() }
        return output
    }
}

private final class FakeMicrophoneRecorder: MicrophoneAudioRecording {
    var startHostTime: CMTime? = CMTime(seconds: 100.5, preferredTimescale: 1_000)
    var starts: [String] = []
    func startRecording(meetingId: String) -> Bool { starts.append(meetingId); return true }
    func stopRecording() -> URL? { URL(fileURLWithPath: "/tmp/fixture-microphone.wav") }
}

@Test @MainActor
func nextRecordingCanStartWhilePreviousAudioExports() async {
    let system = FakeSystemRecorder()
    var signal: AsyncStream<Void>.Continuation!
    let entered = AsyncStream<Void> { signal = $0 }
    var complete: CheckedContinuation<AudioRecordingResult?, Never>?
    var captured: AudioCaptureFiles?
    let recorder = AudioRecorder(
        systemAudioRecorder: system, microphoneRecorder: FakeMicrophoneRecorder(),
        screenPermission: { true }, microphonePermission: { true },
        exportRecording: { files in
            captured = files
            return await withCheckedContinuation { continuation in
                complete = continuation
                signal.yield(())
            }
        }
    )
    #expect(await recorder.startRecording(meetingId: "first", includeMicrophone: true) == .started)
    let stopping = Task { await recorder.stopRecording() }
    for await _ in entered { break }
    #expect(await recorder.startRecording(meetingId: "second", includeMicrophone: true) == .started)
    #expect(system.starts == ["first-system", "second-system"])
    #expect(captured?.meetingId == "first")
    #expect(captured?.microphoneStartTime == 100.5)
    complete?.resume(returning: nil)
    _ = await stopping.value
    #expect(recorder.isRecording)
    #expect(recorder.activeBackend == .systemAudioAndMicrophone)
    signal.finish()
}

@Test
func failedMixDoesNotOrphanAudioAfterUploadCleanup() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let system = directory.appendingPathComponent("system.wav")
    let microphone = directory.appendingPathComponent("microphone.wav")
    try Data("system fixture".utf8).write(to: system)
    try Data("microphone fixture".utf8).write(to: microphone)
    var partialOutput: URL?
    let files = AudioCaptureFiles(systemAudioURL: system, microphoneURL: microphone,
        meetingId: UUID().uuidString, systemStartTime: 100, microphoneStartTime: 100.5)
    let result = await AudioRecordingExporter.combine(files) { _, _, output, _, _ in
        partialOutput = output
        try Data("partial export".utf8).write(to: output)
        throw CocoaError(.fileWriteUnknown)
    }
    defer { if let partialOutput { try? FileManager.default.removeItem(at: partialOutput) } }
    let recorded = try #require(result)
    #expect(recorded.backend == .systemAudio)
    #expect(recorded.additionalLocalURLs.contains(microphone))
    #expect(!FileManager.default.fileExists(atPath: try #require(partialOutput).path))
    // Upload failures retain the source files. Successful upload with deletion enabled
    // uses this method to delete every retained source, not only the uploaded fallback.
    #expect(FileManager.default.fileExists(atPath: microphone.path))
    recorded.removeLocalFiles()
    #expect(!FileManager.default.fileExists(atPath: system.path))
    #expect(!FileManager.default.fileExists(atPath: microphone.path))
}

@Test @MainActor
func defaultSystemCaptureDoesNotRequestMicrophonePermission() async {
    let system = FakeSystemRecorder(), microphone = FakeMicrophoneRecorder()
    var permissionRequests = 0
    let recorder = AudioRecorder(systemAudioRecorder: system, microphoneRecorder: microphone,
        screenPermission: { true }, microphonePermission: { permissionRequests += 1; return true })
    #expect(await recorder.startRecording(meetingId: "default") == .started)
    #expect(permissionRequests == 0)
    #expect(microphone.starts.isEmpty)
    #expect(recorder.activeBackend == .systemAudio)
}

@Test @MainActor
func deniedMicrophoneStillAllowsOptedInSystemCapture() async {
    let system = FakeSystemRecorder(), microphone = FakeMicrophoneRecorder()
    let recorder = AudioRecorder(systemAudioRecorder: system, microphoneRecorder: microphone,
        screenPermission: { true }, microphonePermission: { false })
    #expect(await recorder.startRecording(meetingId: "denied", includeMicrophone: true) == .started)
    #expect(microphone.starts.isEmpty)
    #expect(recorder.activeBackend == .systemAudio)
}

@Test @MainActor
func microphoneFallbackRequestsPermissionAndReportsItsBackend() async {
    let system = FakeSystemRecorder(), microphone = FakeMicrophoneRecorder()
    system.canStart = false
    var permissionRequests = 0
    let recorder = AudioRecorder(systemAudioRecorder: system, microphoneRecorder: microphone,
        screenPermission: { true }, microphonePermission: { permissionRequests += 1; return true })
    #expect(await recorder.startRecording(meetingId: "fallback") == .started)
    #expect(permissionRequests == 1)
    #expect(microphone.starts == ["fallback"])
    #expect(recorder.activeBackend == .microphone)
}

@Test @MainActor
func cancelledStartupDeletesFinalizedSystemAudio() async throws {
    let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".m4a")
    try Data("cancelled capture fixture".utf8).write(to: file)
    defer { try? FileManager.default.removeItem(at: file) }
    let system = FakeSystemRecorder()
    system.output = file
    var signal: AsyncStream<Void>.Continuation!
    let entered = AsyncStream<Void> { signal = $0 }
    var complete: CheckedContinuation<Void, Never>?
    system.onStart = {
        await withCheckedContinuation { continuation in
            complete = continuation
            signal.yield(())
        }
    }
    let recorder = AudioRecorder(systemAudioRecorder: system,
        microphoneRecorder: FakeMicrophoneRecorder(), screenPermission: { true })
    let starting = Task { await recorder.startRecording(meetingId: "cancelled") }
    for await _ in entered { break }
    starting.cancel()
    complete?.resume()
    #expect(await starting.value == .failed)
    #expect(!recorder.isRecording)
    #expect(!FileManager.default.fileExists(atPath: file.path))
    signal.finish()
}

@Test @MainActor
func nextStartWaitsForInputShutdownInsteadOfBeingDropped() async {
    let system = FakeSystemRecorder()
    var signal: AsyncStream<Void>.Continuation!
    let entered = AsyncStream<Void> { signal = $0 }
    var complete: CheckedContinuation<Void, Never>?
    system.onStop = {
        await withCheckedContinuation { continuation in
            complete = continuation
            signal.yield(())
        }
    }
    let recorder = AudioRecorder(systemAudioRecorder: system,
        microphoneRecorder: FakeMicrophoneRecorder(), screenPermission: { true },
        exportRecording: { _ in nil })
    #expect(await recorder.startRecording(meetingId: "first") == .started)
    let stopping = Task { await recorder.stopRecording() }
    for await _ in entered { break }
    let release = Task {
        try? await Task.sleep(nanoseconds: 10_000_000)
        complete?.resume()
    }
    #expect(await recorder.startRecording(meetingId: "second") == .started)
    _ = await release.value
    _ = await stopping.value
    #expect(recorder.isRecording)
    #expect(system.starts.count == 2)
    signal.finish()
}
