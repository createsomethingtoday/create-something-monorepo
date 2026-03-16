/**
 * MenuBar View
 * Minimal interface - the tool should recede
 */

import SwiftUI
import AppKit

struct MenuBarView: View {
    @ObservedObject var appDelegate: AppDelegate
    private let resources = MeetingCaptureResources.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(alignment: .center, spacing: 10) {
                if let image = resources.brandMarkImage {
                    Image(nsImage: image)
                        .resizable()
                        .interpolation(.high)
                        .frame(width: 24, height: 24)
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(resources.branding.appName)
                        .font(.headline)
                    Text(resources.branding.tagline)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
                Circle()
                    .fill(appDelegate.isRecording ? Color.red : Color.gray.opacity(0.3))
                    .frame(width: 8, height: 8)
            }

            Divider()

            // Status
            if appDelegate.isRecording {
                RecordingStatusView(meeting: appDelegate.currentMeeting)
            } else {
                IdleStatusView()
            }

            Divider()

            // Actions
            if appDelegate.isRecording {
                Button(action: { appDelegate.stopRecording() }) {
                    HStack {
                        Image(systemName: "stop.circle.fill")
                        Text("Stop Recording")
                    }
                }
                .buttonStyle(.plain)
                .foregroundColor(.red)
            } else {
                Button(action: { appDelegate.startManualRecording() }) {
                    HStack {
                        Image(systemName: "record.circle")
                        Text("Start Manual Recording")
                    }
                }
                .buttonStyle(.plain)
            }

            Divider()

            // Footer
            HStack {
                Button("Settings...") {
                    NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                }
                .buttonStyle(.plain)
                .font(.caption)

                Spacer()

                Button("Quit") {
                    NSApplication.shared.terminate(nil)
                }
                .buttonStyle(.plain)
                .font(.caption)
                .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(width: 260)
    }
}

struct RecordingStatusView: View {
    let meeting: DetectedMeeting?
    @State private var elapsedTime: TimeInterval = 0
    @State private var timer: Timer?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "waveform")
                    .foregroundColor(.red)
                Text("Recording")
                    .foregroundColor(.red)
                    .fontWeight(.medium)
            }

            if let meeting = meeting {
                Text(meeting.displayName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(formatDuration(elapsedTime))
                .font(.system(.title2, design: .monospaced))
                .foregroundColor(.primary)
        }
        .onAppear {
            startTimer()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }

    private func startTimer() {
        let startTime = meeting?.startTime ?? Date()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            elapsedTime = Date().timeIntervalSince(startTime)
        }
    }

    private func formatDuration(_ interval: TimeInterval) -> String {
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}

struct IdleStatusView: View {
    private let resources = MeetingCaptureResources.shared

    private var supportedAppsText: String {
        let apps = resources.metadataPresets.appTagMap.keys
            .filter { $0 != "Manual Recording" }
            .sorted()
        return apps.isEmpty ? "Zoom, Google Meet, Microsoft Teams" : apps.joined(separator: ", ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "checkmark.circle")
                    .foregroundColor(.green)
                Text("Ready")
                    .foregroundColor(.green)
            }

            Text("Monitoring for meetings...")
                .font(.caption)
                .foregroundColor(.secondary)

            Text(supportedAppsText)
                .font(.caption2)
                .foregroundColor(.gray)
        }
    }
}

struct SettingsView: View {
    private let resources = MeetingCaptureResources.shared

    @AppStorage("apiBaseURL") private var apiBaseURL = "https://create-something-meetings.createsomething.workers.dev"
    @AppStorage("autoStart") private var autoStart = true
    @AppStorage("deleteAfterUpload") private var deleteAfterUpload = true
    @AppStorage("defaultProperty") private var defaultProperty = ""
    @AppStorage("defaultProjectId") private var defaultProjectId = ""
    @AppStorage("defaultTags") private var defaultTags = ""
    @AppStorage("defaultParticipants") private var defaultParticipants = ""

    private var permissionsGuideBody: String {
        resources.permissionsGuide
            .replacingOccurrences(of: "# Meeting Capture Permission Guide\n\n", with: "")
            .replacingOccurrences(of: "# Meeting Capture Permission Guide", with: "")
    }

    var body: some View {
        Form {
            Section {
                HStack(alignment: .center, spacing: 12) {
                    if let image = resources.brandMarkImage {
                        Image(nsImage: image)
                            .resizable()
                            .interpolation(.high)
                            .frame(width: 36, height: 36)
                            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(resources.branding.appName)
                            .font(.headline)
                        Text(resources.branding.tagline)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section("Server") {
                TextField("API URL", text: $apiBaseURL)
                    .textFieldStyle(.roundedBorder)
            }

            Section("Behavior") {
                Toggle("Auto-detect meetings", isOn: $autoStart)
                Toggle("Delete local file after upload", isOn: $deleteAfterUpload)
            }

            Section("Metadata Defaults") {
                Picker("Default Property", selection: $defaultProperty) {
                    Text("None").tag("")
                    ForEach(resources.metadataPresets.properties) { property in
                        Text(property.label).tag(property.id)
                    }
                }

                TextField("Default Project ID", text: $defaultProjectId, prompt: Text("weekly-sync"))
                    .textFieldStyle(.roundedBorder)

                if !resources.metadataPresets.projectHints.isEmpty {
                    Text("Suggestions: \(resources.metadataPresets.projectHints.joined(separator: ", "))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                TextField(
                    "Default Tags",
                    text: $defaultTags,
                    prompt: Text(resources.metadataPresets.suggestedTags.joined(separator: ", "))
                )
                .textFieldStyle(.roundedBorder)

                TextField("Default Participants", text: $defaultParticipants, prompt: Text("alex, jordan"))
                    .textFieldStyle(.roundedBorder)

                Text("Tags and participants are comma-separated.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Permissions") {
                Text(resources.permissionsSummary)
                    .font(.caption)
                    .foregroundColor(.secondary)

                ScrollView {
                    Text(permissionsGuideBody)
                        .font(.caption2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .textSelection(.enabled)
                }
                .frame(minHeight: 110)

                HStack(spacing: 10) {
                    Button("Screen Recording") {
                        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")!)
                    }

                    Button("Automation") {
                        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation")!)
                    }

                    Button("Microphone (Fallback)") {
                        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")!)
                    }
                }
            }
        }
        .formStyle(.grouped)
        .frame(width: 460, height: 460)
        .padding()
    }
}
