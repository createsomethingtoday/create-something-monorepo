# Canon per-occurrence runner

Automation tier. This runner does not grant capture permission or create live triggers. It invokes explicit adapters and requires a fresh canonical Calendar selection immediately before join. Parent owns the actual Calendar adapter, participant capture authorization, and launchd installation.

Private config fields: `occurrenceId` (letters/digits/underscore/hyphen), absolute `stateDirectory`, `event_id`, `identity_email`, `organizer_email`, exact ISO `starts_at`/`ends_at`, canonical `meeting_url` (HTTPS zoom.us, no query or fragment), and `verifyCommand`, `joinCommand`, `postcallCommand` as argv arrays. Optional `postcallDelayMinutes` defaults to 10. Never place passcodes or credentials in argv, plist, logs or canonical URL.

Verifier writes only JSON to stdout: matching identity fields above plus `status:"confirmed"`, `platform:"zoom"`, `selection_scope:"halfdozen-guest-occurrence"`, `invitation_verified:true`, `invited_emails` including the selected identity, and `verified_at` no older than 60 seconds. Cancellation, reschedule, mismatched account/event/organizer/URL/end or removed invitation blocks join. Adapter failures block subsequent commands. The signed-in browser verifier is an adapter, not a Google-token requirement.

The join adapter receives `CANON_OCCURRENCE_CONFIG` and `CANON_OCCURRENCE_SELECTION` file paths. The latter points to a private verified selection receipt. Retrieve any passcode link through the dedicated private config/file path inside the join adapter; do not print it. Capture authorization remains enforced by the participant adapter.

Run once:

```sh
node scripts/canon-occurrence-runner.mjs run /absolute/private/config.json join
node scripts/canon-occurrence-runner.mjs run /absolute/private/config.json postcall
```

Generate two launchd definitions (generation only; installation remains parent-owned):

```sh
node scripts/canon-occurrence-runner.mjs plist /absolute/private/config.json join
node scripts/canon-occurrence-runner.mjs plist /absolute/private/config.json postcall
```

Plists use local wall-clock `StartCalendarInterval`, so generate on the same Mac/timezone where installed. Join starts at the selected start; postcall starts at end plus delay. Each is bounded to its selected date window, preventing annual calendar recurrence and stale missed-wakeup execution. There is no KeepAlive, polling loop or automatic retry. Mac must be awake, logged into the browser profile, and have required capture permissions. Removing both launch agents is rollback; preserve private receipts for review.

Success receipts make each stage idempotent; concurrent starts fail on a directory lock. Postcall requires the original verified selection or a successful join receipt. A verified selection still permits postcall if the automated join encountered an admission/audio blocker that the operator resolves; capture continues to require the human consent/start/save flow. A crash can leave a lock or an uncertain external effect; inspect actual participant/capture state before manually clearing a lock or retrying. Join is bounded to 180 seconds and verification to 45 seconds. Postcall receives a seven-hour process budget so its six-hour finalized-WAV wait plus local transcription can complete. It does not start capture: the human must consent, start, stop and save the exact occurrence WAV.

Validation: `node --test scripts/canon-occurrence-runner.test.mjs`. These are offline fixture checks; live Calendar, actual join/capture, signed app transcription, installed launchd wake behavior, and future occurrence behavior require parent verification.

## Durable local installation

From the worktree, prepare only (no activation):

```sh
node scripts/canon-occurrence-install.mjs "/absolute/private/occurrence-config.json" "$HOME/Library/Application Support/CREATE SOMETHING/Canon/occurrences/UNIQUE-ID"
```

Parent may add `--activate` to the same command to prepare and bootstrap both launch agents. Use a new destination; existing snapshots and launch agents are never replaced. The private snapshot includes canon scripts, local capture extension assets, avatar/docs, the review font, and a dereferenced dependency closure for puppeteer-core. It remaps script argv beneath the worktree to the durable runtime. Private profile, invitation file, occurrence WAV directory, and signed app paths remain explicit external private config paths; ensure they are durable before installation. Use occurrence directories beneath `~/Library/Application Support`, not temporary folders. The snapshot takes the current source files; prepare only after all adapters are final.

The config supports `participant:{profile_dir,identity_email,identity_name}`, `zoomInvitationFile` (private ephemeral URL file), plus core fields listed above. `postcallCommand` should be `[NODE, ABSOLUTE_CANON_POSTCALL_SCRIPT, "--directory", PRIVATE_OCCURRENCE_DIRECTORY, "--occurrence", UNIQUE_ID, "--app", SIGNED_APP_PATH]`. No recording starts automatically.

After activation inspect `launchctl print gui/$(id -u)/com.createsomething.canon.UNIQUE-ID.join` and corresponding `.postcall`; do not run `kickstart` (it would execute the actual stage). Activation rolls back copied plist files and attempts to unload any partially bootstrapped jobs if either bootstrap fails. Inspect any explicit rollback error before retrying. Rollback is `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.createsomething.canon.UNIQUE-ID.join.plist` and the analogous postcall agent, then remove those two plist files. Preserve the private snapshot and occurrence receipts until review.
