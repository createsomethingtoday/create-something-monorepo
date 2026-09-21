import Foundation

/// Dual-source capture remains opt-in until device synchronization acceptance.
enum RecordingPreferences {
    static let microphoneKey = "captureMicrophoneAlongsideSystemAudio"

    static func includesMicrophone(defaults: UserDefaults) -> Bool {
        defaults.object(forKey: microphoneKey) as? Bool == true
    }
}
