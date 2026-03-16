import Testing
@testable import MeetingCapture

@Test
func bundledResourcesLoadExpectedBranding() {
    let resources = MeetingCaptureResources()

    #expect(resources.branding.appName == "Meeting Capture")
    #expect(resources.metadataPresets.properties.count == 4)
    #expect(resources.metadataPresets.suggestedTags.contains("meeting-capture"))
    #expect(resources.permissionsGuide.contains("Screen Recording"))
    #expect(resources.brandMarkImage != nil)
}

@Test
func permissionsSummaryUsesFirstBodyParagraph() {
    let resources = MeetingCaptureResources()

    #expect(resources.permissionsSummary == "Grant these permissions before relying on automatic capture:")
}
