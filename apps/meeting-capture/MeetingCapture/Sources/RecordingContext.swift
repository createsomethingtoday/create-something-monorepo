import Foundation

enum RecordingOrigin {
    case automatic
    case manual
}

struct RecordingContext {
    let meetingId: String
    let appName: String
    let startTime: Date
    let origin: RecordingOrigin

    func toUploadMetadata() -> MeetingMetadata {
        MeetingMetadata(
            recordedAt: startTime,
            title: appName,
            property: nil,
            projectId: nil,
            tags: nil,
            participants: nil
        )
    }
}
