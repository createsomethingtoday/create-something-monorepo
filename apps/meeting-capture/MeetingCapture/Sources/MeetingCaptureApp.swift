/**
 * Meeting Capture App
 * "Tools recede, understanding remains"
 */

import SwiftUI
import AppKit
import UserNotifications

@main
struct MeetingCaptureApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            SettingsView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, ObservableObject {
    var statusItem: NSStatusItem?
    var popover: NSPopover?

    private let resources = MeetingCaptureResources.shared
    let meetingDetector = MeetingDetector()
    let audioRecorder = AudioRecorder()
    let uploader = MeetingUploader()

    @Published var isRecording = false
    @Published var currentMeeting: DetectedMeeting?

    private var activeRecordingContext: RecordingContext?

    private var autoStartEnabled: Bool {
        UserDefaults.standard.object(forKey: "autoStart") as? Bool ?? true
    }

    private var shouldDeleteAfterUpload: Bool {
        UserDefaults.standard.object(forKey: "deleteAfterUpload") as? Bool ?? true
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenuBar()
        setupMeetingDetection()
        requestNotificationPermission()

        if let brandMarkImage = resources.brandMarkImage {
            NSApplication.shared.applicationIconImage = brandMarkImage
        }

        // Hide dock icon - menubar only
        NSApp.setActivationPolicy(.accessory)
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    private func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "waveform", accessibilityDescription: resources.branding.appName)
            button.action = #selector(togglePopover)
            button.target = self
        }

        popover = NSPopover()
        popover?.contentSize = NSSize(width: 300, height: 240)
        popover?.behavior = .transient
        popover?.contentViewController = NSHostingController(
            rootView: MenuBarView(appDelegate: self)
        )
    }

    private func setupMeetingDetection() {
        meetingDetector.onMeetingStarted = { [weak self] meeting in
            self?.handleMeetingStarted(meeting)
        }

        meetingDetector.onMeetingEnded = { [weak self] meeting in
            self?.handleMeetingEnded(meeting)
        }

        meetingDetector.startMonitoring()
    }

    private func handleMeetingStarted(_ meeting: DetectedMeeting) {
        guard autoStartEnabled else { return }

        let context = RecordingContext(
            meetingId: meeting.id,
            appName: meeting.appName,
            meetingTitle: meeting.meetingTitle,
            startTime: meeting.startTime,
            origin: .automatic
        )

        startRecording(with: context)
    }

    private func handleMeetingEnded(_ meeting: DetectedMeeting) {
        guard isRecording else { return }
        guard let context = activeRecordingContext else { return }
        guard context.origin == .automatic, context.meetingId == meeting.id else { return }

        stopRecording()
    }

    func startManualRecording() {
        let context = RecordingContext(
            meetingId: UUID().uuidString,
            appName: "Manual Recording",
            meetingTitle: nil,
            startTime: Date(),
            origin: .manual
        )

        startRecording(with: context)
    }

    private func startRecording(with context: RecordingContext) {
        guard !isRecording else { return }

        Task {
            let started = await audioRecorder.startRecording(meetingId: context.meetingId)

            await MainActor.run { [weak self] in
                guard let self else { return }

                guard started else {
                    self.showNotification(
                        title: "Recording Failed",
                        body: "Could not start audio capture. Check Screen Recording permission."
                    )
                    self.updateMenuBarIcon(recording: false)
                    return
                }

                self.activeRecordingContext = context
                self.currentMeeting = DetectedMeeting(
                    id: context.meetingId,
                    appName: context.appName,
                    meetingTitle: context.meetingTitle,
                    startTime: context.startTime
                )
                self.isRecording = true
                self.updateMenuBarIcon(recording: true)

                self.showNotification(
                    title: "Recording Started",
                    body: "Capturing audio from \(context.meetingTitle ?? context.appName)"
                )
            }
        }
    }

    func stopRecording() {
        guard isRecording, let context = activeRecordingContext else { return }

        let capturedContext = context

        isRecording = false
        activeRecordingContext = nil
        currentMeeting = nil
        updateMenuBarIcon(recording: false)

        Task {
            guard let recordingResult = await audioRecorder.stopRecording() else {
                self.showNotification(
                    title: "Recording Error",
                    body: "No audio file was produced for this meeting."
                )
                return
            }

            await self.uploadRecording(result: recordingResult, context: capturedContext)
        }
    }

    private func uploadRecording(result: AudioRecordingResult, context: RecordingContext) async {
        do {
            let meetingId = try await uploader.upload(
                audioURL: result.url,
                metadata: context.toUploadMetadata()
            )

            showNotification(
                title: "Upload Complete",
                body: "Meeting \(meetingId) uploaded (\(result.backend.rawValue))."
            )

            if shouldDeleteAfterUpload {
                try? FileManager.default.removeItem(at: result.url)
            }
        } catch {
            showNotification(
                title: "Upload Failed",
                body: error.localizedDescription
            )
        }
    }

    private func updateMenuBarIcon(recording: Bool) {
        if let button = statusItem?.button {
            let symbolName = recording ? "waveform.circle.fill" : "waveform"
            button.image = NSImage(systemSymbolName: symbolName, accessibilityDescription: resources.branding.appName)

            if recording {
                button.contentTintColor = .systemRed
            } else {
                button.contentTintColor = nil
            }
        }
    }

    private func showNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }

    @objc func togglePopover() {
        if let popover = popover, let button = statusItem?.button {
            if popover.isShown {
                popover.performClose(nil)
            } else {
                popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            }
        }
    }
}
