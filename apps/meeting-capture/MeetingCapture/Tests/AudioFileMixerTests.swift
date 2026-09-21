import AVFoundation
import Foundation
import Testing
@testable import MeetingCapture

@Test
func mixesSystemAndMicrophoneAudioIntoOnePlayableFile() async throws {
    let testDirectory = FileManager.default.temporaryDirectory
        .appendingPathComponent("meeting-capture-mixer-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: testDirectory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: testDirectory) }

    let systemURL = testDirectory.appendingPathComponent("system.wav")
    let microphoneURL = testDirectory.appendingPathComponent("microphone.wav")
    let outputURL = testDirectory.appendingPathComponent("combined.m4a")

    try await writeTone(to: systemURL, frequency: 440)
    try await writeTone(to: microphoneURL, frequency: 660)

    try await AudioFileMixer.mix(
        systemAudioURL: systemURL,
        microphoneURL: microphoneURL,
        outputURL: outputURL
    )

    let asset = AVURLAsset(url: outputURL)
    let tracks = try await asset.loadTracks(withMediaType: .audio)
    let duration = CMTimeGetSeconds(try await asset.load(.duration))

    #expect(FileManager.default.fileExists(atPath: outputURL.path))
    #expect(tracks.count == 1)
    #expect(duration >= 0.9)
}

private func writeTone(to url: URL, frequency: Double) async throws {
    let sampleRate = 44_100.0
    let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
    let frames = AVAudioFrameCount(sampleRate)
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)!
    buffer.frameLength = frames

    let samples = buffer.floatChannelData![0]
    for frame in 0..<Int(frames) {
        samples[frame] = Float(sin(2.0 * .pi * frequency * Double(frame) / sampleRate) * 0.15)
    }

    let audioFile = try AVAudioFile(forWriting: url, settings: format.settings)
    try audioFile.write(from: buffer)
}

// Decode the result: a duration-only check misses tracks shifted to time zero.
@Test(arguments: [false, true])
func preservesRelativeTrackStart(lateSystem: Bool) async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let system = directory.appendingPathComponent("system.wav")
    let microphone = directory.appendingPathComponent("microphone.wav")
    let output = directory.appendingPathComponent("mixed.m4a")
    // The early track is silent. All audible energy must start at +0.5 seconds.
    try await writeTone(to: system, frequency: lateSystem ? 440 : 0)
    try await writeTone(to: microphone, frequency: lateSystem ? 0 : 660)
    try await AudioFileMixer.mix(
        systemAudioURL: system, microphoneURL: microphone, outputURL: output,
        systemStartTime: lateSystem ? 100.5 : 100,
        microphoneStartTime: lateSystem ? 100 : 100.5
    )
    let file = try AVAudioFile(forReading: output)
    let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))!
    try file.read(into: buffer)
    let rate = file.processingFormat.sampleRate
    let samples = buffer.floatChannelData![0]
    func rms(_ from: Double, _ to: Double) -> Double {
        let start = Int(from * rate), end = min(Int(to * rate), Int(buffer.frameLength))
        guard end > start else { return 0 }
        return sqrt((start..<end).reduce(0.0) { $0 + pow(Double(samples[$1]), 2) } / Double(end - start))
    }
    #expect(rms(0.1, 0.4) < 0.001)
    #expect(rms(0.65, 0.85) > 0.05)
    #expect(rms(1.15, 1.35) > 0.05)
    #expect(Double(buffer.frameLength) / rate >= 1.49)
}
