import Foundation
import Speech
import AVFoundation
import CryptoKit
import Darwin

func fail(_ text: String) -> Never { FileHandle.standardError.write(Data((text + "\n").utf8)); exit(1) }
let args = Array(CommandLine.arguments.dropFirst())
if args == ["--help"] {
    print("Canon local transcript: --audio /private/test.m4a --output /private/new-transcript.json --test-id INTERNAL_TEST --host-consented [--locale en-US] [--authorize-speech] [--validate-audio]. Reads one local file. No recording or uploads. Output must not exist.")
    exit(0)
}
var values: [String:String] = [:]
var flags = Set<String>()
var i = 0
while i < args.count {
    let arg = args[i]
    if ["--host-consented", "--authorize-speech", "--validate-audio"].contains(arg) {
        if !flags.insert(arg).inserted { fail("Duplicate argument.") }; i += 1; continue
    }
    guard ["--audio", "--output", "--test-id", "--locale"].contains(arg), i+1 < args.count, values[arg] == nil else { fail("Invalid arguments; use --help.") }
    values[arg] = args[i+1]; i += 2
}
guard flags.contains("--host-consented"), let input = values["--audio"], let output = values["--output"], let testID = values["--test-id"], testID.range(of: "^[A-Za-z0-9_-]{1,80}$", options: .regularExpression) != nil else { fail("Explicit authorized meeting ID, --host-consented, --audio and --output required.") }
let fm = FileManager.default
let inputURL = URL(fileURLWithPath: input).standardizedFileURL
let outputURL = URL(fileURLWithPath: output).standardizedFileURL
func privateOwned(_ url: URL, directory: Bool) throws {
    let attrs = try fm.attributesOfItem(atPath: url.path)
    guard attrs[.type] as? FileAttributeType == (directory ? .typeDirectory : .typeRegular), (attrs[.ownerAccountID] as? NSNumber)?.uint32Value == getuid(), let mode = attrs[.posixPermissions] as? NSNumber, mode.intValue & 0o077 == 0, url.resolvingSymlinksInPath().path == url.path else { fail("Selected audio and output directory must be private, owner-owned, and contain no symlinks.") }
}
do {
    try privateOwned(inputURL, directory: false)
    try privateOwned(outputURL.deletingLastPathComponent(), directory: true)
    guard !fm.fileExists(atPath: outputURL.path) else { fail("Output exists; refusing overwrite.") }
    let audio = try AVAudioFile(forReading: inputURL)
    let duration = Double(audio.length) / audio.processingFormat.sampleRate
    guard duration > 0 && duration <= 3600 else { fail("Canon accepts audio longer than zero and at most 60 minutes.") }
    // Materialize bounded PCM requests locally, with exact frame coverage. Apple
    // Speech tasks are kept below one minute; there is no whole-meeting request.
    let chunkFrames = AVAudioFramePosition(audio.processingFormat.sampleRate * 50)
    let chunkRoot = outputURL.deletingLastPathComponent().appendingPathComponent(".canon-speech-chunks-\(UUID().uuidString)")
    try fm.createDirectory(at: chunkRoot, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
    defer { try? fm.removeItem(at: chunkRoot) }
    var chunks: [(url: URL, start: Double, duration: Double, digitallySilent: Bool)] = []
    var frame: AVAudioFramePosition = 0
    while frame < audio.length {
        let count = AVAudioFrameCount(min(chunkFrames, audio.length - frame))
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audio.processingFormat, frameCapacity: count) else { throw NSError(domain: "CanonAudioBuffer", code: 1) }
        audio.framePosition = frame
        try audio.read(into: buffer, frameCount: count)
        guard buffer.frameLength == count else { throw NSError(domain: "CanonIncompleteAudio", code: 1) }
        let url = chunkRoot.appendingPathComponent("chunk-\(chunks.count).caf")
        // Create the private file before AVFoundation opens it.
        guard fm.createFile(atPath: url.path, contents: nil, attributes: [.posixPermissions: 0o600]) else { throw NSError(domain: "CanonPrivateChunk", code: 1) }
        do {
            let part = try AVAudioFile(forWriting: url, settings: audio.processingFormat.settings)
            try part.write(from: buffer)
        }
        let verified = try AVAudioFile(forReading: url)
        guard verified.length == AVAudioFramePosition(count) else { throw NSError(domain: "CanonChunkCoverage", code: 1) }
        let digitallySilent = UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList).allSatisfy { audioBuffer in
            guard let data = audioBuffer.mData else { return audioBuffer.mDataByteSize == 0 }
            return UnsafeRawBufferPointer(start: data, count: Int(audioBuffer.mDataByteSize)).allSatisfy { $0 == 0 }
        }
        chunks.append((url, Double(frame) / audio.processingFormat.sampleRate, Double(count) / audio.processingFormat.sampleRate, digitallySilent))
        frame += AVAudioFramePosition(count)
    }
    if flags.contains("--validate-audio") {
        // This is offline segmentation evidence, never a recognized transcript.
        let manifest: [String:Any] = ["validationOnly": true, "audioDurationSeconds": duration, "coveredFrames": frame, "inputFrames": audio.length, "chunks": chunks.map { ["startSeconds": $0.start, "durationSeconds": $0.duration, "digitallySilent": $0.digitallySilent] }]
        print(String(data: try JSONSerialization.data(withJSONObject: manifest, options: [.sortedKeys]), encoding: .utf8)!)
    }
    if !flags.contains("--validate-audio") {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: values["--locale"] ?? "en-US")), recognizer.supportsOnDeviceRecognition else { throw NSError(domain: "CanonOnDeviceUnavailable", code: 1) }
        var authorization = SFSpeechRecognizer.authorizationStatus()
        if authorization == .notDetermined && flags.contains("--authorize-speech") {
            var completed = false
            SFSpeechRecognizer.requestAuthorization { status in DispatchQueue.main.async { authorization = status; completed = true } }
            let deadline = Date().addingTimeInterval(60)
            while !completed && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
        }
        guard authorization == .authorized else { throw NSError(domain: "CanonSpeechNotAuthorized", code: 1) }
        var recognized: [(start: Double, duration: Double, text: String, confidence: Float)] = []
        var texts: [String] = []
        for chunk in chunks {
            if chunk.digitallySilent { continue }
            guard recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else { throw NSError(domain: "CanonOnDeviceUnavailable", code: 1) }
            let request = SFSpeechURLRecognitionRequest(url: chunk.url)
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = false
            var done = false
            var resultValue: SFSpeechRecognitionResult?
            var failed = false
            let task = recognizer.recognitionTask(with: request) { result, error in
                if error != nil { failed = true; done = true }
                else if let result, result.isFinal { resultValue = result; done = true }
            }
            let deadline = Date().addingTimeInterval(180)
            while !done && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
            task.cancel()
            guard !failed, let result = resultValue, result.isFinal else { throw NSError(domain: "CanonRecognitionFailedOrTimedOutNoOutput", code: 1) }
            texts.append(result.bestTranscription.formattedString)
            for segment in result.bestTranscription.segments {
                guard segment.timestamp >= 0, segment.timestamp <= chunk.duration, segment.duration >= 0, segment.timestamp + segment.duration <= chunk.duration + 0.05 else { throw NSError(domain: "CanonInvalidSegmentTiming", code: 1) }
                recognized.append((chunk.start + segment.timestamp, min(segment.duration, duration - chunk.start - segment.timestamp), segment.substring, segment.confidence))
            }
        }
        guard !recognized.isEmpty else { throw NSError(domain: "CanonNoSpeechNoOutput", code: 1) }
        let inputHandle = try FileHandle(forReadingFrom: inputURL)
        defer { try? inputHandle.close() }
        var digest = SHA256()
        while let block = try inputHandle.read(upToCount: 1024 * 1024), !block.isEmpty { digest.update(data: block) }
        let hash = digest.finalize().map { String(format: "%02x", $0) }.joined()
        let segments = recognized.enumerated().map { index, s -> [String:Any] in
            ["source": "local-audio-sha256:\(hash)#segment-\(index+1)", "speaker": "Unattributed speaker", "startSeconds": s.start, "durationSeconds": s.duration, "text": s.text, "confidence": s.confidence]
        }
        let payload: [String:Any] = ["schemaVersion": 1, "audience": "host-only", "status": "private-draft-requires-human-review", "testID": testID, "provider": "macOS Speech on-device", "requiresOnDeviceRecognition": true, "audioSHA256": hash, "audioDurationSeconds": duration, "locale": recognizer.locale.identifier, "speakerAttribution": "unavailable-do-not-infer", "text": texts.filter { !$0.isEmpty }.joined(separator: " "), "segments": segments]
        let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
        let staging = outputURL.deletingLastPathComponent().appendingPathComponent(".canon-local-transcript-\(UUID().uuidString)")
        defer { try? fm.removeItem(at: staging) }
        guard fm.createFile(atPath: staging.path, contents: data, attributes: [.posixPermissions: 0o600]) else { fail("Unable to write private staging file.") }
        // Hard-link publication is atomic and fails if another writer created output.
        try fm.linkItem(at: staging, to: outputURL)
        print("Private on-device transcript created. Review recognition and speaker identity before use.")
    }
} catch { fail("Local transcription failed (\((error as NSError).domain):\((error as NSError).code)); no upload or cloud fallback attempted.") }
