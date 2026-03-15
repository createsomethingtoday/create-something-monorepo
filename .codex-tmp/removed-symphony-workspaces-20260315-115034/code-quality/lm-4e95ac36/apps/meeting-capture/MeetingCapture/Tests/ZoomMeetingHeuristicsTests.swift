import Testing
@testable import MeetingCapture

@Test
func zoomWindowSignalTakesPrecedenceOverLingeringHelpers() {
    let inMeeting = ZoomMeetingHeuristics.isInMeeting(
        windowCount: 1,
        hasZoomHelper: true,
        hasZoomClips: true
    )

    #expect(inMeeting == false)
}

@Test
func zoomDetectsMeetingWithMultipleWindows() {
    let inMeeting = ZoomMeetingHeuristics.isInMeeting(
        windowCount: 2,
        hasZoomHelper: false,
        hasZoomClips: false
    )

    #expect(inMeeting == true)
}

@Test
func zoomFallsBackToHelpersWhenAutomationUnavailable() {
    let inMeeting = ZoomMeetingHeuristics.isInMeeting(
        windowCount: nil,
        hasZoomHelper: true,
        hasZoomClips: false
    )

    #expect(inMeeting == true)
}
