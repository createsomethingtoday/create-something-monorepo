import Foundation
import Testing
@testable import MeetingCapture

private func meeting(_ id: String) -> RecordingContext {
    RecordingContext(meetingId: id, appName: "Fixture", meetingTitle: id,
                     startTime: Date(timeIntervalSince1970: 0), origin: .automatic)
}

@Test
func canceledStartupRetainsNewestMeetingUntilCleanup() {
    var queue = RecordingStartQueue()
    let outcome1 = queue.begin(meeting("A"))
    #expect(outcome1)
    let outcome2 = queue.cancel(meetingId: "A")
    #expect(outcome2)
    let outcome3 = !queue.begin(meeting("B"))
    #expect(outcome3)
    let outcome4 = !queue.begin(meeting("C"))
    #expect(outcome4)
    let next = queue.finish()
    #expect(next?.meetingId == "C")
    #expect(queue.current == nil)
    #expect(!queue.currentCancelled)
    let outcome5 = queue.finish() == nil
    #expect(outcome5)
}

@Test
func endedQueuedMeetingIsNotStartedAfterOldCleanup() {
    var queue = RecordingStartQueue()
    let outcome6 = queue.begin(meeting("A"))
    #expect(outcome6)
    queue.cancel(meetingId: "A")
    let outcome7 = !queue.begin(meeting("B"))
    #expect(outcome7)
    let outcome8 = queue.cancel(meetingId: "B")
    #expect(outcome8)
    let outcome9 = queue.finish() == nil
    #expect(outcome9)
}

@Test
func activeStartupIgnoresDuplicatesAndStopClearsQueuedStarts() {
    var queue = RecordingStartQueue()
    let outcome10 = queue.begin(meeting("A"))
    #expect(outcome10)
    let outcome11 = !queue.begin(meeting("duplicate"))
    #expect(outcome11)
    let outcome12 = queue.finish() == nil
    #expect(outcome12)
    let outcome13 = queue.begin(meeting("B"))
    #expect(outcome13)
    queue.cancel(meetingId: "B")
    let outcome14 = !queue.begin(meeting("C"))
    #expect(outcome14)
    queue.cancel()
    let outcome15 = queue.finish() == nil
    #expect(outcome15)
}
