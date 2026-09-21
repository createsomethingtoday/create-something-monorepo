# Meeting Capture

A macOS menubar app that automatically captures and transcribes video meetings.

**"Tools recede, understanding remains."**

## Philosophy

Meetings are ephemeral—understanding should persist. This app silently monitors for video meetings, captures the audio, and uploads to CREATE SOMETHING infrastructure for transcription and summarization.

The tool recedes: a small icon in your menubar, invisible during normal use. When you end a meeting, your transcript appears in the knowledge graph.

## Features

- **Auto-detection**: Monitors for Zoom, Google Meet, Microsoft Teams, Webex, FaceTime, Slack Huddles
- **Silent capture**: Records system audio via ScreenCaptureKit
- **Automatic upload**: Sends to Cloudflare Worker when meeting ends
- **Minimal UI**: Menubar-only presence, no dock icon

## Requirements

- macOS 13.0 (Ventura) or later
- Screen Recording permission (primary system-audio capture)
- Automation permission (for meeting detection)
- Microphone permission (local speech and fallback capture)

## Building

```bash
cd apps/meeting-capture/MeetingCapture

# Build and install a bundled macOS app in /Applications with a stable signing identity when available
pnpm meeting-capture:install
```

For local iteration you can still use `swift build` or open `Package.swift` in Xcode, but macOS privacy permissions may not persist reliably for those development builds. Use the bundled `.app` from `dist/` or `/Applications/Meeting Capture.app` when testing Screen Recording behavior. If you prefer a user-local install, run `pnpm meeting-capture:install:user`.

## Permissions

On first launch, you'll need to grant:

1. **Screen Recording** - Required for ScreenCaptureKit audio capture
   - System Preferences → Privacy & Security → Screen Recording → Meeting Capture ✓

2. **Automation** - Required to detect active meetings via AppleScript
   - System Preferences → Privacy & Security → Automation → Meeting Capture ✓

3. **Microphone** - Optional local speech alongside system audio, or fallback when system capture fails
   - System Preferences → Privacy & Security → Microphone → Meeting Capture ✓

## Configuration

Click the menubar icon → Settings to configure:

- **API URL**: Your deployed Cloudflare Worker endpoint (default: `https://create-something-meetings.createsomething.workers.dev`)
- **Auto-detect meetings**: Enable/disable automatic recording
- **Delete after upload**: Remove local audio files after successful upload

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Meeting Detection                                           │
│  └─ Monitors running processes for meeting apps             │
│  └─ Checks window titles for active call indicators         │
│  └─ Triggers on: "Zoom Meeting", "Meet -", "Call" windows   │
├─────────────────────────────────────────────────────────────┤
│  Audio Capture                                               │
│  └─ Uses ScreenCaptureKit (macOS 13+)                       │
│  └─ Captures system audio plus microphone when permitted         │
│  └─ Saves to temp directory as .m4a                         │
├─────────────────────────────────────────────────────────────┤
│  Upload                                                      │
│  └─ Multipart form POST to /upload endpoint                 │
│  └─ Includes metadata: timestamp, detected app, etc.        │
│  └─ Deletes local file after successful upload              │
└─────────────────────────────────────────────────────────────┘
```

## Supported Meeting Apps

| App | Detection Method |
|-----|------------------|
| Zoom | Window title contains "Zoom Meeting" |
| Google Meet | Chrome window title contains "Meet -" |
| Microsoft Teams | Window title contains "Meeting" or "Call" |
| Webex | App is running and active |
| FaceTime | App is running and active |
| Slack Huddle | App is running and active |

## Manual Recording

For meetings in unsupported apps or browser-only calls:

1. Click the menubar icon
2. Click "Start Manual Recording"
3. When done, click "Stop Recording"

## Privacy

- Audio is captured locally and stored temporarily
- Files are deleted after successful upload to your infrastructure
- No data is sent to third parties
- You control the entire pipeline (your Mac → your Cloudflare account)

## Troubleshooting

**"Recording not starting"**
- Check Screen Recording permission is granted
- Re-launch the bundled app after granting permission
- If you launched from `.build/` or Xcode, rebuild and install with `pnpm meeting-capture:install`

**"Screen Recording prompt keeps coming back"**
- Fully quit Meeting Capture after granting access, then reopen it from `/Applications/Meeting Capture.app` or the bundled copy in `dist/`
- Replacing the app bundle or executable can invalidate macOS TCC approval when the app is ad hoc signed
- For stable installs, sign the app with a persistent Apple Development or Developer ID identity before copying it into `/Applications`
- If macOS is stuck on an old grant, reset it and re-grant: `tccutil reset ScreenCapture com.createsomething.meeting-capture`
- If you are running from the raw SwiftPM or Xcode executable, install and launch `Meeting Capture.app` with `pnpm meeting-capture:install` instead

**"Meeting not detected"**
- Check Automation permission is granted
- Ensure the meeting app is in the supported list
- Use Manual Recording as fallback

**"Upload failed"**
- Verify the API URL in Settings
- Check your Cloudflare Worker is deployed and accessible
- Check network connectivity

## Architecture

This app is the local capture component of the CREATE SOMETHING meeting system:

```
Meeting Capture (this app)
       ↓ POST /upload
Cloudflare Worker (packages/meetings)
       ↓
R2 (audio storage)
       ↓
Queue → Workers AI Whisper → Claude → D1
       ↓
createsomething.io/admin/meetings (future)
```

## Audio synchronization acceptance

The mixer preserves relative track starts rather than placing both sources at zero.
System audio uses its first sample presentation timestamp. The microphone is scheduled
against `AVAudioRecorder.deviceCurrentTime`; paired host-clock readings map that start
to the system timeline. Permission is resolved before either source starts. This avoids
permission-dialog delays in the recording. Hardware latency and clock drift still require
measurement on the actual capture devices; decoded synthetic fixtures do not prove them.

Run `swift test --package-path apps/meeting-capture/MeetingCapture` from the repository
root. The regression decodes the exported M4A and verifies silence before the delayed
track, audible content afterward, and the full delayed tail in both start orders.

Before installing/promoting this recovery, supervise a short recording with headphones:

1. Start with microphone permission undecided and wait before granting it. Verify capture
   starts afterward, and a denied microphone still permits system-only recording.
2. Capture known timed sounds from both system output and the microphone. Check their
   relative positions in the exported audio against the observed source timing.
3. Repeat with microphone input changing and a longer recording to check drift.
4. Verify stopping produces a playable file, and upload/transcript completion separately.

Do not launch or record unattended as part of the test suite. Keep the installed app and
its privacy grants unchanged until the operator supervises this acceptance.
