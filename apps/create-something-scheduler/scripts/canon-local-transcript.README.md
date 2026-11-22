# Canon local transcript for consented meetings

This separate first-party utility transcribes an explicitly selected private audio file using macOS Speech on-device recognition. It does not record, monitor calls, access the microphone, upload audio, or fall back to cloud recognition. Both `supportsOnDeviceRecognition` and `requiresOnDeviceRecognition = true` are mandatory. Missing locale support, permissions, recognition failure or timeout stops the operation.

Do not use the existing Meeting Capture app for this workflow: its current stop path calls `uploadRecording`, including manual recordings. This utility neither launches nor changes that app.

## Capture a selected meeting

Use the [local tab recorder](canon-local-capture/README.md) in the dedicated Canon Chrome profile. After everyone agrees, capture up to 60 minutes from the selected Google Meet or Zoom web tab and save the WAV in a private local directory. Speech receives remote tab audio from the participants speaking through their own accounts. For a co-located microphone-only test, a consented QuickTime audio recording saved as local M4A also works.

## Build and run

Run on macOS with Apple command-line tools. Use the normal signed `.app` bundle so LaunchServices supplies macOS Speech with its usage description and application identity. Embedding an Info.plist section in a terminal-launched CLI alone did not establish a reliable TCC identity in the observed Codex launch environment.

```sh
node apps/create-something-scheduler/scripts/canon-local-transcript-app.mjs build
node apps/create-something-scheduler/scripts/canon-local-transcript-app.mjs run -- --help
node apps/create-something-scheduler/scripts/canon-local-transcript-app.mjs run -- \
  --audio "/explicit/private/path/consented-audio.wav" \
  --output "/explicit/private/path/new-transcript.json" \
  --test-id consented-run-1 --host-consented --authorize-speech
```

The default app is `~/Library/Application Support/CREATE SOMETHING/Canon Local Transcript/Canon Local Transcript.app`, with stable bundle ID `com.createsomething.canon-local-transcript`. The helper compiles a new app, ad-hoc signs it locally (no signing purchase), and verifies its signature. It refuses to replace any existing app or binary. For an upgrade, select a new `--app /private/owner-only/folder/new.app` build path and pass the same path to `run`. Keep the stable identity; macOS may request authorization again after an ad-hoc rebuild. Preserve any previously finalized binary until the new bundle is accepted.

The run helper uses `open -n -W <app> --args ...`. Because `open` does not report the transcriber's status, a private app launcher records its actual exit code and diagnostic log. The helper requires this completion record and, for transcription runs, reads back the final nonempty on-device JSON. A crash, absent completion record, timeout or native failure is an error, never a successful transcription receipt. Diagnostic logs remain in a private `.canon-transcript-run-*` directory beside the app for inspection and retention cleanup. A successful `--help` launch verifies bundling and LaunchServices only; it does not prove Speech permission or recognition. Do not invoke `--authorize-speech` until the operator has authorized the permission prompt.

`--authorize-speech` permits the macOS permission prompt only for this explicit run. It does not permit network recognition. Omit it on later runs with existing authorization. Save authorized audio in a private local folder and use `chmod 600` on the file before running. The utility does not install language assets or alter OS settings. Output parent and audio must already be private, operator-owned and contain no symlinks. Output must not exist. The transcript publishes atomically via a private staging file and hard link, refusing overwrite. Retry with a new output filename after any successful result. Delete the audio, transcript and executable when the test retention period ends; no upstream rollback is required.

Output includes audio SHA-256, elapsed segment timing, confidence and text. Speakers are deliberately marked unattributed: macOS Speech does not establish host/guest identity. Treat text, confidence, commitments and decisions as unreviewed evidence. The JSON is separate from the Google transcript and is not automatically merged or shared.

## Evidence and limitations

`node --test apps/create-something-scheduler/scripts/canon-local-transcript.test.mjs` compiles the real Swift CLI and exercises help, explicit consent, private-file checks and overwrite refusal using a locally generated silent WAV. Static checks verify on-device guards and absence of capture/transport implementations. The tests do not request Speech authorization or assert successful recognition. Actual on-device transcription and the consented live audio workflow remain untested until an operator supplies the authorized audio and grants macOS Speech permission.

Apple references: https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition and https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition

Generate the private branded review directly from the resulting file:

```sh
node apps/create-something-scheduler/scripts/canon-recap.mjs --local-transcript /private/path/new-transcript.json --output /private/reviews --host-confirmed
```

## One-hour offline qualification

The duration ceiling is exactly 3,600 seconds; even one extra audio frame is rejected. Native audio is materialized into private, contiguous PCM chunks of at most 50 seconds before Speech requests begin. Each request requires on-device recognition and a final result within 180 seconds. All chunks must succeed before the single transcript is published; a failed or timed-out chunk yields no partial transcript. Chunk files are removed on normal completion and handled errors. A process crash can leave its private `.canon-speech-chunks-*` directory in the selected output folder; remove it when recovering the run. Forced termination is not a successful cleanup receipt.

The source SHA-256 is computed in bounded 1 MiB reads. Global segment IDs use the original audio hash and one increasing sequence. Word timestamps include the chunk offset. Chunk boundaries can affect recognition quality; there is no overlap, inferred speaker identity, or guarantee of word accuracy. Verified digitally silent PCM chunks are skipped without changing later absolute timestamps. Other silent or very quiet intervals may produce a final empty result; a recognition error, including no-speech errors, fails the entire run for review/retry.

Use `--validate-audio` with the usual explicit input, output, consent and test ID arguments to exercise native chunk writing, frame coverage and cleanup without requesting Speech permission or writing a transcript. It prints a validation manifest to stdout. The test suite passes a real synthetic 16 kHz one-hour PCM WAV through this path (72 chunks, 57,600,000 frames), rejects a one-frame overflow, and verifies no transcript/chunk files remain. This is offline segmentation evidence, not live one-hour recognition evidence. Run focused checks with:

```sh
node --test apps/create-something-scheduler/scripts/canon-local-transcript.test.mjs apps/create-something-scheduler/scripts/canon-speech-source.test.mjs
```

A consented live one-hour transcription, speech quality across boundaries, macOS authorization, and the resulting recap still require an operator-authorized runtime acceptance run. Do not describe synthetic segmentation as that acceptance.
