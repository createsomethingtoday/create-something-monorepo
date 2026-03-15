import Testing
@testable import MeetingCapture

@Test
func startsAfterThresholdWithoutDuplicateStart() {
    let machine = MeetingDetectionStateMachine(startThreshold: 2, endThreshold: 2)

    #expect(machine.observe(isMeetingDetected: true) == .none)
    #expect(machine.observe(isMeetingDetected: true) == .started)
    #expect(machine.observe(isMeetingDetected: true) == .none)
}

@Test
func endsAfterThresholdWithoutDuplicateEnd() {
    let machine = MeetingDetectionStateMachine(startThreshold: 1, endThreshold: 2)

    #expect(machine.observe(isMeetingDetected: true) == .started)
    #expect(machine.observe(isMeetingDetected: false) == .none)
    #expect(machine.observe(isMeetingDetected: false) == .ended)
    #expect(machine.observe(isMeetingDetected: false) == .none)
}

@Test
func transientDropDoesNotEndMeeting() {
    let machine = MeetingDetectionStateMachine(startThreshold: 1, endThreshold: 3)

    #expect(machine.observe(isMeetingDetected: true) == .started)
    #expect(machine.observe(isMeetingDetected: false) == .none)
    #expect(machine.observe(isMeetingDetected: true) == .none)
    #expect(machine.observe(isMeetingDetected: false) == .none)
    #expect(machine.observe(isMeetingDetected: false) == .none)
    #expect(machine.observe(isMeetingDetected: false) == .ended)
}
