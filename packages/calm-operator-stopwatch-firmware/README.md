# Calm Operator Stopwatch Firmware

M5Stack Stopwatch is the sole supported Calm Operator hardware target. The
firmware turns its round AMOLED, touch panel, two buttons, vibration motor,
microphone, and speaker into a pocket console for live Codex and Claude work.

The device shows milestone-level agent progress and only exposes actions the
bridge has marked `remote_safe`. Every action still requires a second explicit
confirmation. Decisions requiring text use a bounded push-to-talk flow:

1. Record up to three seconds of mono 16-bit PCM at 16 kHz.
2. Upload it to the private `/operator/voice-command` queue.
3. A configured local relay transcribes it.
4. Review the transcript on the Stopwatch.
5. Confirm to enqueue the existing agent decision.

Raw audio is capped at 192 kB by the bridge and removed after transcription.
The transcript cannot bypass stale-progress, advertised-decision,
`remote_safe`, or explicit-confirmation checks. There is no BLE notification
capture, on-device model, or paid transcription dependency in this build.

## Configure

Generate the ignored local header from production Infisical values:

```bash
infisical run --env=prod --path=/ --command "pnpm --dir packages/calm-operator-stopwatch-firmware config:write"
```

Required:

- `OPERATOR_DEVICE_TOKEN` or the deployed compatibility secret `INK_DEVICE_TOKEN`

Recommended:

- `CALM_OPERATOR_WIFI_SSID`
- `CALM_OPERATOR_WIFI_PASSWORD`

Without Wi-Fi values, the ESP32 tries saved credentials. HTTPS uses the pinned
Google Trust Services root in `include/trust_roots.h` and synchronizes time
before requests.

## Build and test

```bash
pnpm --dir packages/calm-operator-stopwatch-firmware test
pnpm --dir packages/calm-operator-stopwatch-firmware build
```

The PlatformIO profile follows M5Stack's Stopwatch configuration: ESP32-S3,
16 MB flash, OPI PSRAM, USB CDC, M5Unified, M5GFX, M5PM1, and M5IOE1. Library
versions or commits are pinned in `platformio.ini`.

## Flash

The ordered unit is not yet available, so physical flashing and device-level
touch/audio/power acceptance remain pending. When it arrives:

1. Connect Stopwatch over USB.
2. Hold its reset button for about two seconds until the internal green LED
   lights, then release to enter download mode.
3. Run `pnpm --dir packages/calm-operator-stopwatch-firmware upload`.
4. Run `pnpm --dir packages/calm-operator-stopwatch-firmware monitor`.
5. Verify display, touch, both buttons, vibration, microphone capture, local
   transcription, transcript confirmation, speaker cue, heartbeat, and one
   controlled Codex or Claude steering receipt.

## Controls

- Dashboard: tap or either button opens Agents.
- Agents: Button A/B moves between agents. Tap the action card to choose the
  displayed action; tap outside the card to cycle that agent's other actions.
- Button-only action: Button A cancels; Button B confirms.
- Spoken action: hold Button B to record and release to upload.
- Transcript review: Button A cancels; Button B confirms.
- Receipt: tap or either button returns to Agents.

The AMOLED UI is intentionally glanceable: current agent count, attention
count, one agent milestone, one safe action, and clear confirmation states.
Vibration acknowledges selection and delivery; speaker tones are short status
cues. The microphone and speaker are never enabled simultaneously, matching
the M5Unified hardware contract.

## Local transcription relay

Voice leasing is disabled unless the relay has an explicit local transcriber:

```bash
export OPERATOR_TRANSCRIBE_EXECUTABLE=/absolute/path/to/transcribe
export OPERATOR_TRANSCRIBE_ARGS_JSON='["--language","en","{audio}"]'
pnpm --dir packages/calm-operator-ink-bridge agent:relay
```

The executable receives a temporary `.pcm` path and prints only the transcript
to stdout. It is invoked with `shell: false`; the temporary audio file is mode
`0600` and removed after the process exits. Until this executable is configured,
button-only steering works and voice commands remain unleased.
