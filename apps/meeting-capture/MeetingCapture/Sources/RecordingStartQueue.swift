import Foundation

/// Keeps the newest requested meeting while a canceled start waits for OS cleanup.
struct RecordingStartQueue {
    private(set) var current: RecordingContext?
    private(set) var currentCancelled = false
    private var queued: RecordingContext?

    mutating func begin(_ context: RecordingContext) -> Bool {
        guard current == nil else {
            if currentCancelled { queued = context }
            return false
        }
        current = context
        currentCancelled = false
        return true
    }

    @discardableResult
    mutating func cancel(meetingId: String? = nil) -> Bool {
        func matches(_ context: RecordingContext?) -> Bool {
            guard let context else { return false }
            guard let meetingId else { return true }
            return context.origin == .automatic && context.meetingId == meetingId
        }
        var matched = false
        if matches(queued) { queued = nil; matched = true }
        if matches(current) { currentCancelled = true; matched = true }
        return matched
    }

    mutating func finish() -> RecordingContext? {
        current = nil
        currentCancelled = false
        let next = queued
        queued = nil
        return next
    }
}
