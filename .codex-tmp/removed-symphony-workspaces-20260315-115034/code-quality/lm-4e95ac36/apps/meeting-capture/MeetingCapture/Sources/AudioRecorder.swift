/**
 * Audio Recorder
 * System-audio first (ScreenCaptureKit), microphone fallback (AVAudioRecorder)
 */

import Foundation
import AVFoundation
import ScreenCaptureKit
import CoreMedia

enum RecordingBackend: String {
    case systemAudio = "system-audio"
    case microphone = "microphone"
}

struct AudioRecordingResult {
    let url: URL
    let backend: RecordingBackend
}

final class AudioRecorder {
    private let systemAudioRecorder = SystemAudioRecorder()
    private let microphoneRecorder = MicrophoneAudioRecorder()

    private(set) var isRecording = false
    private(set) var activeBackend: RecordingBackend?

    func startRecording(meetingId: String) async -> Bool {
        guard !isRecording else { return false }

        if await systemAudioRecorder.startRecording(meetingId: meetingId) {
            isRecording = true
            activeBackend = .systemAudio
            return true
        }

        // Fallback path for environments where ScreenCaptureKit capture is unavailable.
        if microphoneRecorder.startRecording(meetingId: meetingId) {
            isRecording = true
            activeBackend = .microphone
            return true
        }

        activeBackend = nil
        return false
    }

    func stopRecording() async -> AudioRecordingResult? {
        guard isRecording, let backend = activeBackend else {
            return nil
        }

        let url: URL?
        switch backend {
        case .systemAudio:
            url = await systemAudioRecorder.stopRecording()
        case .microphone:
            url = microphoneRecorder.stopRecording()
        }

        isRecording = false
        activeBackend = nil

        guard let outputURL = url else {
            return nil
        }

        return AudioRecordingResult(url: outputURL, backend: backend)
    }
}

private final class MicrophoneAudioRecorder: NSObject, AVAudioRecorderDelegate {
    private var recorder: AVAudioRecorder?
    private var outputURL: URL?

    func startRecording(meetingId: String) -> Bool {
        let tempDir = FileManager.default.temporaryDirectory
        let filename = "\(meetingId).m4a"
        let url = tempDir.appendingPathComponent(filename)
        outputURL = url

        try? FileManager.default.removeItem(at: url)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]

        do {
            let audioRecorder = try AVAudioRecorder(url: url, settings: settings)
            audioRecorder.delegate = self
            recorder = audioRecorder

            if audioRecorder.record() {
                print("Microphone recording started: \(url.path)")
                return true
            }

            print("Failed to start microphone recording")
            recorder = nil
            return false
        } catch {
            print("Failed to create microphone recorder: \(error)")
            recorder = nil
            return false
        }
    }

    func stopRecording() -> URL? {
        guard let recorder else { return nil }

        recorder.stop()
        self.recorder = nil

        guard let url = outputURL, FileManager.default.fileExists(atPath: url.path) else {
            return nil
        }

        return url
    }
}

private final class SystemAudioRecorder: NSObject, SCStreamOutput, SCStreamDelegate {
    private var stream: SCStream?
    private var writer: AVAssetWriter?
    private var writerInput: AVAssetWriterInput?
    private var outputURL: URL?

    private let outputQueue = DispatchQueue(label: "com.createsomething.meeting-capture.system-audio")

    private var didReceiveAudioSample = false
    private var isCapturing = false

    func startRecording(meetingId: String) async -> Bool {
        guard !isCapturing else { return false }

        let tempDir = FileManager.default.temporaryDirectory
        let filename = "\(meetingId).m4a"
        let url = tempDir.appendingPathComponent(filename)
        outputURL = url
        try? FileManager.default.removeItem(at: url)

        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            guard let display = content.displays.first else {
                print("No shareable display available for system audio capture")
                outputURL = nil
                return false
            }

            let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
            let config = SCStreamConfiguration()
            config.capturesAudio = true
            config.excludesCurrentProcessAudio = true
            config.queueDepth = 5
            config.width = max(Int(display.width), 2)
            config.height = max(Int(display.height), 2)

            let stream = SCStream(filter: filter, configuration: config, delegate: self)
            try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: outputQueue)

            self.stream = stream
            try await startCapture(stream)
            isCapturing = true
            didReceiveAudioSample = false
            print("System-audio recording started: \(url.path)")
            return true
        } catch {
            print("Failed to start system-audio recording: \(error)")
            await cleanupAfterStop()
            return false
        }
    }

    func stopRecording() async -> URL? {
        guard isCapturing else { return nil }

        isCapturing = false

        if let stream {
            do {
                try await stopCapture(stream)
            } catch {
                print("Failed stopping system-audio capture: \(error)")
            }
        }

        let finalizedURL = await finalizeWriter()
        await cleanupAfterStop()
        return finalizedURL
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of outputType: SCStreamOutputType) {
        guard outputType == .audio else { return }
        guard CMSampleBufferIsValid(sampleBuffer) else { return }

        didReceiveAudioSample = true

        if writer == nil {
            setupWriterIfNeeded(from: sampleBuffer)
        }

        guard let writer, let writerInput else { return }

        if writer.status == .unknown {
            let startTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            writer.startWriting()
            writer.startSession(atSourceTime: startTime)
        }

        if writerInput.isReadyForMoreMediaData {
            if !writerInput.append(sampleBuffer), let err = writer.error {
                print("System-audio append failed: \(err)")
            }
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        print("System-audio stream stopped with error: \(error)")
    }

    private func setupWriterIfNeeded(from sampleBuffer: CMSampleBuffer) {
        guard writer == nil, let outputURL else { return }

        do {
            let assetWriter = try AVAssetWriter(url: outputURL, fileType: .m4a)
            guard let formatDescription = CMSampleBufferGetFormatDescription(sampleBuffer) else {
                return
            }

            let input = AVAssetWriterInput(
                mediaType: .audio,
                outputSettings: nil,
                sourceFormatHint: formatDescription
            )
            input.expectsMediaDataInRealTime = true

            guard assetWriter.canAdd(input) else { return }

            assetWriter.add(input)
            writer = assetWriter
            writerInput = input
        } catch {
            print("Failed to create system-audio writer: \(error)")
        }
    }

    private func finalizeWriter() async -> URL? {
        guard didReceiveAudioSample, let writer, let writerInput, let outputURL else {
            return nil
        }

        writerInput.markAsFinished()

        await withCheckedContinuation { continuation in
            writer.finishWriting {
                continuation.resume()
            }
        }

        guard writer.status == .completed else {
            if let err = writer.error {
                print("System-audio writer failed: \(err)")
            }
            return nil
        }

        guard FileManager.default.fileExists(atPath: outputURL.path) else {
            return nil
        }

        return outputURL
    }

    private func cleanupAfterStop() async {
        writerInput = nil
        writer = nil
        stream = nil
        outputURL = nil
        didReceiveAudioSample = false
    }

    private func startCapture(_ stream: SCStream) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            stream.startCapture { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
            }
        }
    }

    private func stopCapture(_ stream: SCStream) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            stream.stopCapture { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
            }
        }
    }
}
