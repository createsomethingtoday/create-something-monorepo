# Canon local transcript — consented internal test only

This separate first-party utility transcribes an explicitly selected private audio file using macOS Speech on-device recognition. It does not record, monitor calls, access the microphone, upload audio, or fall back to cloud recognition. Both `supportsOnDeviceRecognition` and `requiresOnDeviceRecognition = true` are mandatory. Missing locale support, permissions, recognition failure or timeout stops the operation.

Do not use the existing Meeting Capture app for this test: its current stop path calls `uploadRecording`, including manual recordings. This utility neither launches nor changes that app.

## Capture the internal test

Use the [local tab recorder](canon-local-capture/README.md) in the dedicated Canon Chrome profile. After everyone agrees, capture up to ten minutes from the selected Meet tab and save the WAV in a private local directory. Speech receives remote tab audio from the participants speaking through their own accounts. For a co-located microphone-only test, a consented QuickTime audio recording saved as local M4A also works.

## Build and run

Run on macOS with Apple command-line tools. Build into a private local folder. Embed the supplied usage description before requesting Speech permission:

```sh
mkdir -p "$HOME/Library/Application Support/CREATE SOMETHING/Canon Local Test"
chmod 700 "$HOME/Library/Application Support/CREATE SOMETHING/Canon Local Test"
swiftc apps/create-something-scheduler/scripts/canon-local-transcript.swift \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist \
  -Xlinker apps/create-something-scheduler/scripts/canon-local-transcript.Info.plist \
  -o "$HOME/Library/Application Support/CREATE SOMETHING/Canon Local Test/canon-local-transcript"
```

Save the authorized `.m4a` in that private folder, make the audio private with `chmod 600 /explicit/path/test.m4a`, then run:

```sh
"$HOME/Library/Application Support/CREATE SOMETHING/Canon Local Test/canon-local-transcript" \
  --audio "/explicit/private/path/test.m4a" \
  --output "/explicit/private/path/new-transcript.json" \
  --test-id internal-test-1 --host-consented --authorize-speech
```

`--authorize-speech` permits the macOS permission prompt only for this explicit run. It does not permit network recognition. Omit it on later runs with existing authorization. The utility does not install language assets or alter OS settings. Output parent and audio must already be private, operator-owned and contain no symlinks. Output must not exist. The transcript publishes atomically via a private staging file and hard link, refusing overwrite. Retry with a new output filename after any successful result. Delete the audio, transcript and executable when the test retention period ends; no upstream rollback is required.

Output includes audio SHA-256, elapsed segment timing, confidence and text. Speakers are deliberately marked unattributed: macOS Speech does not establish host/guest identity. Treat text, confidence, commitments and decisions as unreviewed evidence. The JSON is separate from the Google transcript and is not automatically merged or shared.

## Evidence and limitations

`node --test apps/create-something-scheduler/scripts/canon-local-transcript.test.mjs` compiles the real Swift CLI and exercises help, explicit consent, private-file checks and overwrite refusal using a locally generated silent WAV. Static checks verify on-device guards and absence of capture/transport implementations. The tests do not request Speech authorization or assert successful recognition. Actual on-device transcription and the consented live audio workflow remain untested until an operator supplies the authorized audio and grants macOS Speech permission.

Apple references: https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition and https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition

Generate the private branded review directly from the resulting file:

```sh
node apps/create-something-scheduler/scripts/canon-recap.mjs --local-transcript /private/path/new-transcript.json --output /private/reviews --host-confirmed
```
