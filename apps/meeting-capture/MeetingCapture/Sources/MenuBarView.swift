/**
 * MenuBar View
 * Minimal interface - the tool should recede
 */

import SwiftUI

struct MenuBarView: View {
    @ObservedObject var appDelegate: AppDelegate

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("Meeting Capture")
                    .font(.headline)
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
                Text(meeting.appName)
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

            Text("Zoom, Google Meet, Teams")
                .font(.caption2)
                .foregroundColor(.gray)
        }
    }
}

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL = "https://create-something-meetings.createsomething.workers.dev"
    @AppStorage("autoStart") private var autoStart = true
    @AppStorage("deleteAfterUpload") private var deleteAfterUpload = true

    var body: some View {
        Form {
            Section("Server") {
                TextField("API URL", text: $apiBaseURL)
                    .textFieldStyle(.roundedBorder)
            }

            Section("Behavior") {
                Toggle("Auto-detect meetings", isOn: $autoStart)
                Toggle("Delete local file after upload", isOn: $deleteAfterUpload)
            }

            Section("Permissions") {
                Text("Primary capture uses Screen Recording + Automation. Microphone is only used as a fallback.")
                    .font(.caption)
                    .foregroundColor(.secondary)

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
        .frame(width: 400, height: 300)
        .padding()
    }
}
