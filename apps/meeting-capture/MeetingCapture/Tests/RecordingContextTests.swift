import Testing
import Foundation
@testable import MeetingCapture

@Test
func uploadMetadataUsesContextTimestampAndTitle() {
    let timestamp = Date(timeIntervalSince1970: 1_735_684_800)
    let context = RecordingContext(
        meetingId: "meeting_123",
        appName: "Zoom",
        startTime: timestamp,
        origin: .automatic
    )

    let metadata = context.toUploadMetadata()

    #expect(metadata.title == "Zoom")
    #expect(metadata.recordedAt.timeIntervalSince1970 == timestamp.timeIntervalSince1970)
}
