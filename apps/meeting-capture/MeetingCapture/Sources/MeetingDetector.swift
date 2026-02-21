/**
 * Meeting Detector
 * Monitors for video meeting applications and detects active calls
 */

import Foundation
import AppKit

struct DetectedMeeting {
    let id: String
    let appName: String
    let startTime: Date
}

final class MeetingDetectionStateMachine {
    private let startThreshold: Int
    private let endThreshold: Int

    private(set) var inMeeting = false
    private var positiveChecks = 0
    private var negativeChecks = 0

    init(startThreshold: Int = 2, endThreshold: Int = 2) {
        self.startThreshold = max(1, startThreshold)
        self.endThreshold = max(1, endThreshold)
    }

    func observe(isMeetingDetected: Bool) -> DetectionTransition {
        if isMeetingDetected {
            positiveChecks += 1
            negativeChecks = 0

            if !inMeeting, positiveChecks >= startThreshold {
                inMeeting = true
                return .started
            }
            return .none
        }

        negativeChecks += 1
        positiveChecks = 0

        if inMeeting, negativeChecks >= endThreshold {
            inMeeting = false
            return .ended
        }

        return .none
    }
}

enum DetectionTransition: Equatable {
    case started
    case ended
    case none
}

enum ZoomMeetingHeuristics {
    static func isInMeeting(windowCount: Int?, hasZoomHelper: Bool, hasZoomClips: Bool) -> Bool {
        // If we can inspect Zoom windows, prefer that as the authoritative signal.
        // Helper processes can linger briefly after meetings end.
        if let windowCount {
            return windowCount > 1
        }

        // If AppleScript/Automation is unavailable, fall back to helper processes.
        return hasZoomHelper || hasZoomClips
    }
}

class MeetingDetector {
    // Meeting app bundle identifiers
    private let meetingApps: [String: String] = [
        "us.zoom.xos": "Zoom",
        "com.google.Chrome": "Google Meet",  // Meet runs in Chrome
        "com.microsoft.teams": "Microsoft Teams",
        "com.microsoft.teams2": "Microsoft Teams",
        "com.cisco.webexmeetingsapp": "Webex",
        "com.apple.FaceTime": "FaceTime",
        "com.slack.Slack": "Slack Huddle"
    ]

    var onMeetingStarted: ((DetectedMeeting) -> Void)?
    var onMeetingEnded: ((DetectedMeeting) -> Void)?

    private var monitoringTimer: Timer?
    private var activeMeeting: DetectedMeeting?
    private let stateMachine = MeetingDetectionStateMachine(startThreshold: 2, endThreshold: 2)

    func startMonitoring() {
        // Check every 5 seconds
        monitoringTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.checkForMeetings()
        }

        // Also observe app launches/quits
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(appDidLaunch(_:)),
            name: NSWorkspace.didLaunchApplicationNotification,
            object: nil
        )

        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(appDidTerminate(_:)),
            name: NSWorkspace.didTerminateApplicationNotification,
            object: nil
        )

        // Initial check
        checkForMeetings()
    }

    func stopMonitoring() {
        monitoringTimer?.invalidate()
        monitoringTimer = nil

        NSWorkspace.shared.notificationCenter.removeObserver(self)
    }

    @objc private func appDidLaunch(_ notification: Notification) {
        checkForMeetings()
    }

    @objc private func appDidTerminate(_ notification: Notification) {
        // Small delay to let state settle
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.checkForMeetings()
        }
    }

    private func checkForMeetings() {
        let detectedAppName = detectActiveMeetingAppName()
        let transition = stateMachine.observe(isMeetingDetected: detectedAppName != nil)

        switch transition {
        case .started:
            guard let appName = detectedAppName else { return }
            let meeting = DetectedMeeting(
                id: UUID().uuidString,
                appName: appName,
                startTime: Date()
            )
            activeMeeting = meeting
            onMeetingStarted?(meeting)

        case .ended:
            if let meeting = activeMeeting {
                onMeetingEnded?(meeting)
            }
            activeMeeting = nil

        case .none:
            break
        }
    }

    private func detectActiveMeetingAppName() -> String? {
        let runningApps = NSWorkspace.shared.runningApplications

        for app in runningApps {
            guard let bundleId = app.bundleIdentifier else { continue }

            if let appName = meetingApps[bundleId] {
                if bundleId == "us.zoom.xos" {
                    if isZoomInMeeting() { return appName }
                } else if bundleId.contains("microsoft.teams") {
                    if isTeamsInMeeting() { return appName }
                } else if bundleId == "com.google.Chrome" {
                    if isChromeInMeet() { return "Google Meet" }
                } else if app.isActive {
                    return appName
                }
            }
        }

        return nil
    }

    private func isZoomInMeeting() -> Bool {
        // Check for Zoom meeting using native APIs.
        let runningApps = NSWorkspace.shared.runningApplications

        // CptHost and caphost are Zoom meeting helper processes.
        let hasZoomHelper = runningApps.contains { app in
            let name = app.localizedName ?? ""
            return name.contains("CptHost") || name.contains("caphost")
        }

        // ZoomClips is another Zoom meeting helper.
        let hasZoomClips = runningApps.contains { app in
            app.bundleIdentifier?.contains("ZoomClips") == true
        }

        // Prefer deterministic window count when Automation is permitted.
        let script = """
        tell application "System Events"
            if exists (process "zoom.us") then
                tell process "zoom.us"
                    return count of every window
                end tell
            end if
            return 0
        end tell
        """

        let windowCount = runAppleScript(script).flatMap(Int.init)

        return ZoomMeetingHeuristics.isInMeeting(
            windowCount: windowCount,
            hasZoomHelper: hasZoomHelper,
            hasZoomClips: hasZoomClips
        )
    }

    private func isTeamsInMeeting() -> Bool {
        // Check for Teams call window
        let script = """
        tell application "System Events"
            if exists (process "Microsoft Teams") then
                tell process "Microsoft Teams"
                    set windowNames to name of every window
                    repeat with wName in windowNames
                        if wName contains "Meeting" or wName contains "Call" then
                            return true
                        end if
                    end repeat
                end tell
            end if
            return false
        end tell
        """

        return runAppleScript(script) == "true"
    }

    private func isChromeInMeet() -> Bool {
        // Check Chrome window titles for Google Meet
        let script = """
        tell application "System Events"
            if exists (process "Google Chrome") then
                tell process "Google Chrome"
                    set windowNames to name of every window
                    repeat with wName in windowNames
                        if wName contains "Meet -" or wName contains "Google Meet" then
                            return true
                        end if
                    end repeat
                end tell
            end if
            return false
        end tell
        """

        return runAppleScript(script) == "true"
    }

    private func runAppleScript(_ source: String) -> String? {
        var error: NSDictionary?
        if let script = NSAppleScript(source: source) {
            let result = script.executeAndReturnError(&error)
            if error == nil {
                return result.stringValue
            }
        }
        return nil
    }
}
