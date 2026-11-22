import Foundation
import Speech
import AVFoundation
import CryptoKit
import Darwin

func fail(_ text: String) -> Never { FileHandle.standardError.write(Data((text + "\n").utf8)); exit(1) }
let args = Array(CommandLine.arguments.dropFirst())
if args == ["--help"] {
    print("Canon local transcript: --audio /private/test.m4a --output /private/new-transcript.json --test-id INTERNAL_TEST --host-consented [--locale en-US] [--authorize-speech]. Reads one local file. No recording or uploads. Output must not exist.")
    exit(0)
}
var values: [String:String] = [:]
var flags = Set<String>()
var i = 0
while i < args.count {
    let arg = args[i]
    if ["--host-consented", "--authorize-speech"].contains(arg) {
        if !flags.insert(arg).inserted { fail("Duplicate argument.") }; i += 1; continue
    }
    guard ["--audio", "--output", "--test-id", "--locale"].contains(arg), i+1 < args.count, values[arg] == nil else { fail("Invalid arguments; use --help.") }
    values[arg] = args[i+1]; i += 2
}
guard flags.contains("--host-consented"), let input = values["--audio"], let output = values["--output"], let testID = values["--test-id"], testID.range(of: "^[A-Za-z0-9_-]{1,80}$", options: .regularExpression) != nil else { fail("Explicit authorized internal test ID, --host-consented, --audio and --output required.") }
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
    guard duration > 0 && duration <= 600 else { fail("This bounded internal test accepts audio longer than zero and at most 10 minutes.") }
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: values["--locale"] ?? "en-US")), recognizer.supportsOnDeviceRecognition else { fail("On-device recognition unavailable for this locale. No cloud fallback permitted.") }
    var authorization = SFSpeechRecognizer.authorizationStatus()
    if authorization == .notDetermined && flags.contains("--authorize-speech") {
        var completed = false
        SFSpeechRecognizer.requestAuthorization { status in DispatchQueue.main.async { authorization = status; completed = true } }
        let deadline = Date().addingTimeInterval(60)
        while !completed && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
    }
    guard authorization == .authorized else { fail("Speech access is not authorized. Run explicitly with --authorize-speech using the bundled-usage-description build, then approve the macOS prompt. No audio processed.") }
    guard recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else { fail("On-device recognizer is unavailable; no fallback permitted.") }
    let request = SFSpeechURLRecognitionRequest(url: inputURL)
    request.requiresOnDeviceRecognition = true
    request.shouldReportPartialResults = false
    var done = false
    var resultValue: SFSpeechRecognitionResult?
    var failed = false
    let task = recognizer.recognitionTask(with: request) { result, error in
        if let result, result.isFinal { resultValue = result; done = true }
        else if error != nil { failed = true; done = true }
    }
    let deadline = Date().addingTimeInterval(180)
    while !done && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
    task.cancel()
    guard !failed, let result = resultValue, result.isFinal, !result.bestTranscription.formattedString.isEmpty else { fail("Local recognition failed or timed out; no output published and no fallback attempted.") }
    let hash = SHA256.hash(data: try Data(contentsOf: inputURL)).map { String(format: "%02x", $0) }.joined()
    let segments = result.bestTranscription.segments.enumerated().map { index, s -> [String:Any] in
        ["source": "local-audio-sha256:\(hash)#segment-\(index+1)", "speaker": "Unattributed speaker", "startSeconds": s.timestamp, "durationSeconds": s.duration, "text": s.substring, "confidence": s.confidence]
    }
    let payload: [String:Any] = ["schemaVersion": 1, "audience": "host-only", "status": "private-draft-requires-human-review", "testID": testID, "provider": "macOS Speech on-device", "requiresOnDeviceRecognition": true, "audioSHA256": hash, "audioDurationSeconds": duration, "locale": recognizer.locale.identifier, "speakerAttribution": "unavailable-do-not-infer", "text": result.bestTranscription.formattedString, "segments": segments]
    let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
    let staging = outputURL.deletingLastPathComponent().appendingPathComponent(".canon-local-transcript-\(UUID().uuidString)")
    defer { try? fm.removeItem(at: staging) }
    guard fm.createFile(atPath: staging.path, contents: data, attributes: [.posixPermissions: 0o600]) else { fail("Unable to write private staging file.") }
    // Hard-link publication is atomic and fails if another writer created output.
    try fm.linkItem(at: staging, to: outputURL)
    print("Private on-device transcript created. Review recognition and speaker identity before use.")
} catch { fail("Local transcription failed (\((error as NSError).domain):\((error as NSError).code)); no upload or cloud fallback attempted.") }
