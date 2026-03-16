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

@Test
func uploadMetadataIncludesBundledDefaultsAndAppTags() {
    let timestamp = Date(timeIntervalSince1970: 1_735_684_800)
    let context = RecordingContext(
        meetingId: "meeting_789",
        appName: "Zoom",
        meetingTitle: "Client Review",
        startTime: timestamp,
        origin: .automatic
    )
    let defaults = UserMetadataDefaults(
        property: "agency",
        projectId: "weekly-sync",
        tags: ["custom-tag", "Zoom", "meeting-capture"],
        participants: ["Alex", "Jordan"]
    )

    let metadata = context.toUploadMetadata(
        resources: MeetingCaptureResources(),
        defaults: defaults
    )

    #expect(metadata.property == "agency")
    #expect(metadata.projectId == "weekly-sync")
    #expect(metadata.tags == ["meeting-capture", "auto-transcribed", "zoom", "custom-tag"])
    #expect(metadata.participants == ["Alex", "Jordan"])
}

@Test
func uploadMetadataRejectsUnknownPropertyAndBlankParticipants() {
    let timestamp = Date(timeIntervalSince1970: 1_735_684_800)
    let context = RecordingContext(
        meetingId: "meeting_manual",
        appName: "Manual Recording",
        meetingTitle: "Manual Recording",
        startTime: timestamp,
        origin: .manual
    )
    let defaults = UserMetadataDefaults(
        property: "unknown-property",
        projectId: "   ",
        tags: [],
        participants: [" ", ""]
    )

    let metadata = context.toUploadMetadata(
        resources: MeetingCaptureResources(),
        defaults: defaults
    )

    #expect(metadata.title == "Meeting meeting_manual")
    #expect(metadata.property == nil)
    #expect(metadata.projectId == nil)
    #expect(metadata.tags == ["meeting-capture", "auto-transcribed", "manual-recording"])
    #expect(metadata.participants == nil)
}
