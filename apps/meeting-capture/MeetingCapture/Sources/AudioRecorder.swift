/**
 * Audio Recorder
 * System-audio first (ScreenCaptureKit), microphone fallback (AVAudioRecorder)
 */

import Foundation
@preconcurrency import AVFoundation
import ScreenCaptureKit
import CoreMedia
import CoreGraphics

enum RecordingBackend: String {
    case systemAudio = "system-audio"
    case systemAudioAndMicrophone = "system-audio+microphone"
    case microphone = "microphone"
}

struct AudioRecordingResult {
    let url: URL
    let backend: RecordingBackend
}

enum AudioRecorderStartResult {
    case started
    case missingScreenRecordingPermission
    case failed
}

private enum ScreenRecordingPermission {
    static func isGranted() -> Bool {
        CGPreflightScreenCaptureAccess()
    }

    @discardableResult
    static func requestAccess() -> Bool {
        CGRequestScreenCaptureAccess()
    }
}

@MainActor
final class AudioRecorder {
    private let systemAudioRecorder = SystemAudioRecorder()
    private let microphoneRecorder = MicrophoneAudioRecorder()

    private(set) var isRecording = false
    private(set) var activeBackend: RecordingBackend?
    private var activeMeetingId: String?
    private var isTransitioning = false

    func hasScreenRecordingPermission() -> Bool {
        ScreenRecordingPermission.isGranted()
    }

    @discardableResult
    func requestScreenRecordingAccess() -> Bool {
        ScreenRecordingPermission.requestAccess()
    }

    func requestMicrophoneAccessIfNeeded() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            return true
        case .notDetermined:
            return await AVCaptureDevice.requestAccess(for: .audio)
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }

    func startRecording(
        meetingId: String,
        promptForScreenRecordingAccessIfNeeded: Bool = false
    ) async -> AudioRecorderStartResult {
        guard !isRecording, !isTransitioning else { return .failed }
        isTransitioning = true
        defer { isTransitioning = false }

        guard ScreenRecordingPermission.isGranted() else {
            if promptForScreenRecordingAccessIfNeeded {
                _ = ScreenRecordingPermission.requestAccess()
            }

            activeBackend = nil
            return .missingScreenRecordingPermission
        }

        guard !Task.isCancelled else { return .failed }

        // Resolve permission before either source starts; a prompt may take minutes.
        let microphoneGranted = await requestMicrophoneAccessIfNeeded()
        guard !Task.isCancelled else { return .failed }

        if await systemAudioRecorder.startRecording(meetingId: "\(meetingId)-system") {
            guard !Task.isCancelled else {
                _ = await systemAudioRecorder.stopRecording()
                return .failed
            }
            let microphoneStarted = microphoneGranted && microphoneRecorder.startRecording(meetingId: "\(meetingId)-microphone")
            isRecording = true
            activeMeetingId = meetingId
            activeBackend = microphoneStarted ? .systemAudioAndMicrophone : .systemAudio
            return .started
        }

        // Fallback path for environments where ScreenCaptureKit capture is unavailable.
        if microphoneGranted && microphoneRecorder.startRecording(meetingId: meetingId) {
            isRecording = true
            activeMeetingId = meetingId
            activeBackend = .microphone
            return .started
        }

        activeBackend = nil
        return .failed
    }

    func stopRecording() async -> AudioRecordingResult? {
        guard isRecording, !isTransitioning, let backend = activeBackend else {
            return nil
        }

        isTransitioning = true
        defer { isTransitioning = false }
        let url: URL?
        switch backend {
        case .systemAudio:
            url = await systemAudioRecorder.stopRecording()
        case .systemAudioAndMicrophone:
            let microphoneURL = microphoneRecorder.stopRecording()
            let systemAudioURL = await systemAudioRecorder.stopRecording()
            url = await combineRecordings(
                systemAudioURL: systemAudioURL,
                microphoneURL: microphoneURL,
                meetingId: activeMeetingId
            )
        case .microphone:
            url = microphoneRecorder.stopRecording()
        }

        isRecording = false
        activeBackend = nil
        activeMeetingId = nil

        guard let outputURL = url else {
            return nil
        }

        return AudioRecordingResult(url: outputURL, backend: backend)
    }

    private func combineRecordings(
        systemAudioURL: URL?,
        microphoneURL: URL?,
        meetingId: String?
    ) async -> URL? {
        guard let systemAudioURL else { return microphoneURL }
        guard let microphoneURL, let meetingId else { return systemAudioURL }

        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(meetingId).m4a")
        try? FileManager.default.removeItem(at: outputURL)

        do {
            try await AudioFileMixer.mix(
                systemAudioURL: systemAudioURL,
                microphoneURL: microphoneURL,
                outputURL: outputURL,
                systemStartTime: systemAudioRecorder.firstSampleTime?.seconds ?? .nan,
                microphoneStartTime: microphoneRecorder.startHostTime?.seconds ?? .nan
            )
            try? FileManager.default.removeItem(at: systemAudioURL)
            try? FileManager.default.removeItem(at: microphoneURL)
            return outputURL
        } catch {
            print("Failed to mix system and microphone audio: \(error)")
            return systemAudioURL
        }
    }
}

enum AudioFileMixer {
    static func mix(
        systemAudioURL: URL,
        microphoneURL: URL,
        outputURL: URL,
        systemStartTime: TimeInterval = 0,
        microphoneStartTime: TimeInterval = 0
    ) async throws {
        guard systemStartTime.isFinite, microphoneStartTime.isFinite else {
            throw CocoaError(.fileReadCorruptFile)
        }
        let origin = min(systemStartTime, microphoneStartTime)
        let composition = AVMutableComposition()
        let systemAsset = AVURLAsset(url: systemAudioURL)
        let microphoneAsset = AVURLAsset(url: microphoneURL)

        let systemTrack = try await insertAudio(from: systemAsset, into: composition, offset: systemStartTime - origin)
        let microphoneTrack = try await insertAudio(from: microphoneAsset, into: composition, offset: microphoneStartTime - origin)

        let audioMix = AVMutableAudioMix()
        audioMix.inputParameters = [systemTrack, microphoneTrack].map { track in
            let parameters = AVMutableAudioMixInputParameters(track: track)
            parameters.setVolume(1.0, at: .zero)
            return parameters
        }

        let reader = try AVAssetReader(asset: composition)
        let readerOutput = AVAssetReaderAudioMixOutput(
            audioTracks: [systemTrack, microphoneTrack],
            audioSettings: [
                AVFormatIDKey: Int(kAudioFormatLinearPCM),
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 2,
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsFloatKey: false,
                AVLinearPCMIsNonInterleaved: false,
            ]
        )
        readerOutput.audioMix = audioMix
        guard reader.canAdd(readerOutput) else { throw CocoaError(.fileReadCorruptFile) }
        reader.add(readerOutput)

        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .m4a)
        let writerInput = AVAssetWriterInput(
            mediaType: .audio,
            outputSettings: [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 128_000,
            ]
        )
        guard writer.canAdd(writerInput) else { throw CocoaError(.fileWriteUnknown) }
        writer.add(writerInput)

        guard writer.startWriting(), reader.startReading() else {
            throw writer.error ?? reader.error ?? CocoaError(.fileWriteUnknown)
        }
        writer.startSession(atSourceTime: .zero)

        await withCheckedContinuation { continuation in
            writerInput.requestMediaDataWhenReady(on: DispatchQueue(label: "com.createsomething.meeting-capture.audio-mix")) {
                while writerInput.isReadyForMoreMediaData {
                    if let sample = readerOutput.copyNextSampleBuffer() {
                        if !writerInput.append(sample) {
                            writerInput.markAsFinished()
                            writer.cancelWriting()
                            reader.cancelReading()
                            continuation.resume()
                            return
                        }
                    } else {
                        writerInput.markAsFinished()
                        writer.finishWriting {
                            continuation.resume()
                        }
                        return
                    }
                }
            }
        }

        guard reader.status == .completed, writer.status == .completed else {
            throw writer.error ?? reader.error ?? CocoaError(.fileWriteUnknown)
        }
    }

    private static func insertAudio(
        from asset: AVURLAsset,
        into composition: AVMutableComposition,
        offset: TimeInterval
    ) async throws -> AVMutableCompositionTrack {
        guard let sourceTrack = try await asset.loadTracks(withMediaType: .audio).first,
              let destinationTrack = composition.addMutableTrack(
                withMediaType: .audio,
                preferredTrackID: kCMPersistentTrackID_Invalid
              ) else {
            throw CocoaError(.fileReadCorruptFile)
        }

        let duration = try await asset.load(.duration)
        try destinationTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: duration),
            of: sourceTrack,
            at: CMTime(seconds: offset, preferredTimescale: 1_000_000_000)
        )
        return destinationTrack
    }
}

private final class MicrophoneAudioRecorder: NSObject, AVAudioRecorderDelegate {
    private var recorder: AVAudioRecorder?
    private var outputURL: URL?
    private(set) var startHostTime: CMTime?

    func startRecording(meetingId: String) -> Bool {
        startHostTime = nil
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

            guard audioRecorder.prepareToRecord() else { return false }
            let hostBefore = CMClockGetTime(CMClockGetHostTimeClock()).seconds
            let deviceNow = audioRecorder.deviceCurrentTime
            let hostAfter = CMClockGetTime(CMClockGetHostTimeClock()).seconds
            let leadTime = 0.1
            if audioRecorder.record(atTime: deviceNow + leadTime) {
                startHostTime = CMTime(seconds: (hostBefore + hostAfter) / 2 + leadTime, preferredTimescale: 1_000_000_000)
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

    private(set) var firstSampleTime: CMTime?
    private var didReceiveAudioSample = false
    private var isCapturing = false

    func startRecording(meetingId: String) async -> Bool {
        guard !isCapturing else { return false }
        firstSampleTime = nil
        didReceiveAudioSample = false

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

        // stopCapture completes before draining callbacks queued on the writer queue.
        await withCheckedContinuation { continuation in
            outputQueue.async { continuation.resume() }
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
            guard startTime.isNumeric, writer.startWriting() else { return }
            firstSampleTime = startTime
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
