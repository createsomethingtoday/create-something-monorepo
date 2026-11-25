# Bounded runtime qualification (2026-11-15)

Source audit baseline supplied by parent: `fb2f85cea`. Shared checkout; only native music test/fixture owned by this pass. No installed app, user records, picker, external provider or release mutation.

The old literal `synthetic media` MP4 fails real ffmpeg decode (exit 183, moov atom not found). Replaced only the recovery regression input with valid deterministic 100 ms mono PCM WAV and added exact-byte readback from the native returned preview path after same-file reconnect and fresh database dispatch. This is fixture qualification, not a demonstrated application playback defect/fix. Other arbitrary-byte identity tests remain deliberate.

Commands/results:

- `/Users/createsomething/.cargo/bin/cargo test --manifest-path apps/gigi-desktop/src-tauri/Cargo.toml --lib recovery_unchanged_reference`: exit 0, 1 passed, 166 filtered, 0.03s. `runtime-native-music.log`.
- `ffmpeg -v error -i apps/gigi-desktop/src-tauri/tests/fixtures/recovery-tone.wav -f null -`: exit 0, actual PCM decoder completed.
- `ffprobe -v error -show_entries stream=codec_name,sample_rate,channels,duration -of json apps/gigi-desktop/src-tauri/tests/fixtures/recovery-tone.wav`: pcm_s16le, 8000 Hz, 1 channel, 0.100000s.
- `node --import tsx --test packages/gigi-integrations/test/codex.test.ts`: exit 0, 196/196, 1078.6ms. `runtime-codex.log`.
- `node --import tsx --test packages/gigi-integrations/test/codex*.test.ts apps/gigi-desktop/web/source-readback.test.mjs`: exit 0, 214/214, 4957.5ms. `runtime-combined.log`. Count includes parent concurrent source-readback additions.

Earlier approximately 90-second nontermination did not reproduce in either bounded run. Inspected subprocess close/request cleanup and unreferenced login expiry timer; no demonstrated leak, so no speculative harness change. An initial attempted source*.test.ts glob resolved no files and was corrected before execution.

Functional gate: passed for native database/reference recovery and actual ffmpeg decoding of the exact shared fixture; browser/native media element playback remains untested by this agent. No sound was listened to. Native test closes/reopens DB handles; it does not launch/restart the GUI process.

Perceptual/product gate: untested by this agent. Release readiness: untested; no app bundle/provider qualification, commit, deployment, or publication. Parent owns integration, independent final retest and release gate.
