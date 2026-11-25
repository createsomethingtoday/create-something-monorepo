# Private automatic postcall processing

The human recorder consent checkbox and Start action remain required. Before the meeting, create a new private (0700), operator-owned directory for this exact occurrence. Select **that directory / canon-meeting.wav** in the recorder's save picker. Never reuse a directory for another meeting. No microphone or meeting is automatically joined or recorded by this utility.

Run from a one-shot occurrence job after the scheduled end, or while waiting for the final recording:

```sh
node apps/create-something-scheduler/scripts/canon-postcall.mjs \
  --directory /absolute/private/occurrence-folder \
  --occurrence unique-occurrence-id
```

Optional `--app /private/path/existing.app` selects a previously qualified on-device transcript app. Optional `--wait-ms 21600000` bounds arrival waiting (default six hours, maximum one day). The existing app must already have macOS Speech permission; this command does not request permission or install language assets. Keep the source checkout and signed app available until processing finishes.

Only the exact `canon-meeting.wav` is considered. Temporary Chrome files and incomplete RIFF files are ignored. The finalized mono PCM16 header, byte length, frame count and one-hour duration ceiling must match. Two unchanged observations precede a bounded-memory private snapshot; a source change during copying fails for retry. The recorder's File System Access writable closes before its final file is atomically published. A valid WAV placed here from some other program is not proof of consent: this directory is reserved for the consented recorder workflow.

`completed-audio.wav` is the immutable private processing snapshot (0600); `transcript.json` is the final on-device transcript. `review/<audio hash and content digest>/recap.html` and `recap.md` remain private drafts requiring human review. `postcall-status.json` records waiting, transcribing, private-review-ready or failed-retryable, along with the final paths or a bounded error. Nothing is uploaded, messaged, scheduled or shared.

Run the same command to retry. A valid existing transcript must match the snapshot SHA-256 and occurrence ID, and is reused without transcription. Recaps are verified and reused by the existing recap writer. Failed native recognition leaves no successful receipt. A dead worker PID lock is reclaimed; an incomplete lock requires checking that no worker is active before removing `.postcall-lock`. A live worker prevents concurrent processing. A corrupt or mismatched finalized transcript is preserved and fails closed: inspect it, move it aside explicitly, then retry. Remove all occurrence artifacts and diagnostic logs according to the host's retention choice.

Tests inject an offline transcript fixture; this verifies orchestration, incomplete-file rejection, recovery, privacy and idempotency, not Speech accuracy or live meeting capture:

```sh
node --test apps/create-something-scheduler/scripts/canon-postcall.test.mjs
```
