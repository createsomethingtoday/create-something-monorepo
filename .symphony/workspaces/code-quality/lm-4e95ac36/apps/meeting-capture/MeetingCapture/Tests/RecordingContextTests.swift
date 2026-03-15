import Testing
import Foundation
@testable import MeetingCapture

@Test
func uploadMetadataUsesSpecificMeetingTitleWhenAvailable() {
    let timestamp = Date(timeIntervalSince1970: 1_735_684_800)
    let context = RecordingContext(
        meetingId: "meeting_123",
        appName: "Zoom",
        meetingTitle: "Weekly Product Sync",
        startTime: timestamp,
        origin: .automatic
    )

    let metadata = context.toUploadMetadata()

    #expect(metadata.title == "Weekly Product Sync")
    #expect(metadata.recordedAt.timeIntervalSince1970 == timestamp.timeIntervalSince1970)
}

@Test
func uploadMetadataFallsBackToMeetingIdWhenTitleIsGeneric() {
    let timestamp = Date(timeIntervalSince1970: 1_735_684_800)
    let context = RecordingContext(
        meetingId: "meeting_456",
        appName: "Zoom",
        meetingTitle: "Zoom",
        startTime: timestamp,
        origin: .automatic
    )

    let metadata = context.toUploadMetadata()

    #expect(metadata.title == "Meeting meeting_456")
}
