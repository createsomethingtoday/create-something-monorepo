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
- Microphone permission (fallback capture mode only)

## Building

```bash
cd apps/meeting-capture/MeetingCapture

# Build with Swift Package Manager
swift build

# Or open in Xcode
open Package.swift
```

## Permissions

On first launch, you'll need to grant:

1. **Screen Recording** - Required for ScreenCaptureKit audio capture
   - System Preferences → Privacy & Security → Screen Recording → Meeting Capture ✓

2. **Automation** - Required to detect active meetings via AppleScript
   - System Preferences → Privacy & Security → Automation → Meeting Capture ✓

3. **Microphone** - Optional fallback if system-audio capture is unavailable
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
│  └─ Captures system audio first, microphone fallback         │
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
- Restart the app after granting permission

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
