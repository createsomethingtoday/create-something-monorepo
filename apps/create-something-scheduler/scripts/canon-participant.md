# Canon first-party visible participant pilot

This local operator launcher opens **installed Google Chrome**, visible, with one dedicated local profile. It uses the root's existing `puppeteer-core` to read ordinary accessibility controls and click normal Meet controls. Launch explicitly keeps operator-installed extensions enabled in this dedicated profile; Puppeteer's extra extension-debugging flag is filtered out. Any local capture extension is installed and started/stopped by the host through normal Chrome UI, never silently enabled by the launcher. It uses no third-party meeting bot, hosted browser, recording/transcription vendor, stealth flags, challenge bypass, or main Chrome profile. It enables no recording or transcript capture. Native Google Meet transcript configuration remains separate.

Set `CANON_CHROME_PROFILE_DIR` to an absolute private directory named `canon-meet-pilot`, `CANON_PARTICIPANT_EMAIL` to the dedicated invited Google account, and `CANON_PARTICIPANT_NAME` to its exact Google account display name. Initialize only an empty directory:

```sh
node apps/create-something-scheduler/scripts/canon-participant.mjs --initialize-profile
```

Sign-in, MFA and any browser/account challenge are always human. Set up the dedicated profile through ordinary visible Chrome; do not import cookies, reuse the main profile, or run another Chrome instance with this profile concurrently. A local purpose marker protects against accidentally selecting an existing profile. Initialization and launch also verify the real filesystem path and reject symlink aliases, including aliases to the main profile; use the canonical absolute path.

Extract `participantSelection` from `canon-pilot.mjs` to a private JSON file. Required fields: `event_id`, `meeting_url`, `starts_at`, `status: confirmed`, `invited_emails`, `identity_email`, `invitation_verified: true`, `internal_test: true`, `verified_at`. The invitation readback must be within 15 minutes at launch. Evidence fields are operator/readback receipts, not cryptographic verification.

```sh
# Default: no browser or network activity.
node apps/create-something-scheduler/scripts/canon-participant.mjs /private/path/selection.json /private/path/participant-ledger.json
# Authorized single internal pilot: foreground process waits for starts_at.
node apps/create-something-scheduler/scripts/canon-participant.mjs /private/path/selection.json /private/path/participant-ledger.json --execute --wait --verify-config /private/path/pilot-config.json
# Cancel a pending launch, or mark an already opened pilot stopped locally.
node apps/create-something-scheduler/scripts/canon-participant.mjs /private/path/selection.json /private/path/participant-ledger.json --execute --stop
```

With `--wait`, `--verify-config` is required and points to the same private one-event config used by `canon-pilot.mjs`. Its `eventId` and `canonEmail` must match the selected receipt. The launcher calls `runPilot` with `action: verify` only: read-only Calendar/Meet readback, no invitation or transcript-setting writes. Set `GOOGLE_PILOT_ACCESS_TOKEN` in the environment and `GOOGLE_PILOT_TOKEN_EXPIRES_AT` to the ISO expiry from OAuth token issuance. Tokens never go in the config or ledger. The wait checks expiry and stops with actionable host reauthorization if the selected/moved start is beyond token validity. Google authorization failures also stop before Join.

The foreground scheduler re-verifies the same selected booking every 60 seconds and again at launch, adapting to a moved start/link and cancelling on a verified cancelled event. Unknown readback, removed invitation/notice, changed ownership or provenance stops safely. The original source receipt remains backward compatible for a direct `--execute` invocation (fresh within 15 minutes); `--verify-config` can also strengthen that invocation. Dry-run never calls Google even when a verify config is provided.

Keep the machine awake and the foreground process running. The wait is bounded to 24 hours; this is not a durable OS service. Ctrl-C/SIGTERM cancels a pending foreground launch within the next polling tick (up to 60 seconds). While it holds its ledger lock, use Ctrl-C or a verified Calendar cancellation rather than a second process using `--stop`.

At the selected time Chrome opens the exact Meet URL. After a bounded 20-second wait for normal prejoin rendering, the guarded join attempts only when the accessibility tree exposes exactly the configured Google account name/email, normal `Ready to join?` prejoin, and a unique normal `Join now` or `Ask to join` button. It clicks `Turn off microphone` and `Turn off camera` when needed, then independently re-reads both `Turn on ...` controls before joining. Missing/ambiguous controls, another account, sign-in, challenges, permission prompts, localization changes, or changed Google markup stop for human handling. No Join is attempted without positive media-off readback. Account controls may not expose this exact information in every Google UI variant; that intentionally falls back to a human.

`join_submitted` means only the normal button was clicked. `admitted` is true only if the immediate post-click accessibility tree exposes `Leave call`; an admission request/waiting room is never treated as admitted. Later host admission is not polled automatically. The host must visually verify Canon's actual participant tile, name/account and media-off state in the real internal test. The browser stays visible after the automation disconnects.

One operator must retain one ledger per pilot. It writes `opening` before Chrome launch and blocks repeated opens after success or an ambiguous failure. Do not reset/copy the ledger to retry; reconcile the dedicated window first. This protects the same ledger, not other independently created ledgers. If Google requires manual sign-in, complete it normally and finish the guarded steps manually; the script deliberately does not open another window on retry.

Before launch, cancellation prevents opening. **After launch, local stop does not remove the participant**: the human must click normal Meet Leave and close the dedicated Chrome window. The script never closes unrelated Chrome windows or claims a participant was removed merely because local state changed. This is the precise graceful-stop limitation of the bounded disconnected-browser pilot.

Offline tests: `node --test apps/create-something-scheduler/scripts/canon-participant.test.mjs`. Fixtures exercise scheduling, fresh one-event Google verification, expiry and reschedule/cancellation handling, profile alias rejection, bounded prejoin retries, dedupe, positive account/media-guarded Join and negative paths. They do not launch Chrome, access Google, change meetings or use paid services. Live Google markup, installed Chrome/profile behavior, account sign-in, admission, media state and end-to-end participant visibility remain unverified. Independent transcription is not supplied by this presence-only launcher; a strictly first-party transcription path requires a separate verified implementation.

Puppeteer interaction reference: https://pptr.dev/guides/page-interactions

### Zoom browser participant (no capture)

`runParticipant` now accepts verified `halfdozen-guest-occurrence` Zoom selections.
It opens the exact selected meeting in visible Chrome at occurrence start, fills
`Canon Meeting Notes`, positively checks camera and microphone off before Join,
waits up to two minutes for host admission, and connects computer audio only
when the UI provides a verified join-muted setting. It reports admission/audio
only after positive `Leave`, `Start Video`, and `Unmute` readback. Missing or
ambiguous controls, authentication, passcode entry, CAPTCHA and recording-consent
challenges pause for the operator; the ordinary browser stays open. Invitation
is never recording consent. This path does not capture or start recording.

Passcodes are separate from the saved selection: supply `CANON_ZOOM_INVITATION_URL`
in the launching process's private environment (or `config.zoom_invitation_url`
for the imported runner). It must match the selected canonical Zoom origin and
meeting ID exactly and permits only `pwd`. Never put this value in CLI arguments,
logs, selection JSON or ledger. The plan and ledger retain only the canonical
secret-free `/j/<id>` URL. The browser receives the private `/wc/join/<id>?pwd=...`
URL in memory. Browser profile/history are private credential material; the
existing dedicated `canon-meet-pilot` profile requirement still applies.

Validation uses offline synthetic accessible UI states; these establish guard
behavior, not compatibility with a current live Zoom deployment or actual host
admission. A host-supervised live acceptance remains separate.

Scheduled runner adapter: `node scripts/canon-zoom-join.mjs` reads
`CANON_OCCURRENCE_SELECTION` and `CANON_OCCURRENCE_CONFIG`. Configure
`participant: {profile_dir, identity_email, identity_name}` and optionally
`zoomInvitationFile` with the private 0600 temporary invitation URL file. The
adapter removes that file when the launch settles; use a disposable copy, never
a canonical credential source. It journals beside the selection with a lock,
returns exit 2 for a human blocker, and leaves capture disabled. Runner timeout
must exceed the two-minute admission wait plus browser launch (180 seconds).

Rendered offline validation (2026-11-22): served
`fixtures/zoom-participant.html` on loopback and ran `guardedZoomJoin` against
actual Chromium accessibility snapshots and visible DOM controls. The sequence
reached `Meeting connected`, with Canon Meeting Notes, Leave, Start Video and
Unmute visibly present; the final screenshot was directly reviewed. This
validates the browser adapter's state transitions against the fixture, not
Zoom's current proprietary UI. Installed Puppeteer's generated launch arguments
were also inspected: visible mode, extensions enabled, no disable-extensions,
no fake-media flags, and unsafe extension debugging excluded. No Google Chrome
process was present during the process inventory, so an active dedicated-profile
lock could not be exercised. Never bypass a Chrome profile lock or kill an
operator's running browser to make a scheduled launch succeed.

### Opt-in internal virtual-camera pilot

Default Join still verifies microphone and camera off. To request virtual video **after verified admission**, use a private participant config:

```json
{
  "camera_pilot": {
    "enabled": true,
    "device_label": "OBS Virtual Camera",
    "operator_confirmed_event_id": "EXACT_INTERNAL_EVENT_ID"
  }
}
```

For the Meet CLI, pass `--camera-pilot-config /private/path/camera.json`; this 0600 file contains the inner `camera_pilot` object above. The scheduled Zoom adapter reads `participant.camera_pilot` from its existing occurrence config.

Camera-enabled execution requires fresh canonical Calendar verification, not an edited `internal_test` field. Any `halfdozen-*` selection is rejected for camera use even if that field is injected. This does not extend video to Half Dozen guest occurrences. The operator must confirm the actual internal call, start the approved Canon scene in OBS, check its preview, start Virtual Camera, and grant browser camera permission for the dedicated meeting origin. Permission must already be granted: device discovery uses `enumerateDevices`, never a temporary physical-camera stream. Supported exact labels are `OBS Virtual Camera` and `Canon Virtual Camera`; zero or duplicate matches stop activation.

After admission, a visible terminal prompt gives the operator 60 seconds to open the capture controller and intended Canon tile from the admitted meeting tab, bind OBS to that exact tile, verify the approved scene and virtual-camera preview, then type `ENABLE CANON <event-id>`. This is a new post-admission gesture; the config attestation alone cannot enable video. Cancellation, timeout or a noninteractive scheduled runner leaves the camera off. The browser and controller remain usable during the prompt. Local capture still requires its own explicit consent/action.

The pre-navigation guard applies in page frames and rejects video until admission. After admission, the adapter selects the unique approved device with `deviceId: {exact: ...}` on every video request, regardless of the platform's dropdown default. It verifies the actual returned video track label and device ID, then verifies camera-on and muted-microphone UI. Missing admission, permission, device, or readback leaves the pilot paused. Source removal or camera-permission revocation stops managed video tracks and disarms the gate. Video activation cannot start recording or meeting-audio capture, and Join never starts capture.

This is an internal browser pilot, not production qualification. No live call was joined during implementation. Platform UI labels can change; a delayed camera transition or unavailable permission causes a conservative stop. A running OBS virtual device does not prove that OBS is rendering the approved scene or fresh frames; the operator must inspect the scene and the participant's received video. Browser device loss is guarded, but an OBS scene that goes black/frozen while the same device stays alive requires operator intervention. An interrupted/opened ledger still blocks duplicate Join: use normal camera-off/Leave controls, reconcile the ledger, and prepare a new explicitly confirmed internal attempt rather than auto-rejoining.

### Internal Zoom selection and live verification

Create the dedicated nonrecurring test in Micah's calendar, invite Canon, accept its invitation, and include the existing `NOTICE` from `canon-pilot.mjs` in the visible event description. This adapter makes no calendar changes. Set this private verification config to the exact selected event and canonical passcode-free meeting link:

```json
{
  "scope": "internal-zoom-occurrence",
  "internalTest": true,
  "approved": true,
  "selectionAttested": true,
  "canonIdentityVerified": true,
  "hostEmail": "micah@createsomething.io",
  "canonEmail": "canon@createsomething.io",
  "calendarId": "primary",
  "eventId": "EXACT_CALENDAR_EVENT_ID",
  "selectedEventId": "EXACT_CALENDAR_EVENT_ID",
  "selectedMeetingUrl": "https://zoom.us/j/12345678901",
  "transcriptionMode": "off"
}
```

Run `node scripts/canon-pilot.mjs verify /private/verification.json /private/receipt.json` with `GOOGLE_PILOT_ACCESS_TOKEN` for Micah's calendar. Save the returned `participantSelection` as the private selection file. Readback requires the exact event, authenticated organizer/creator ownership, a complete Micah-and-Canon-only roster, Canon's accepted invitation, the visible notice, and one unambiguous matching Zoom link. It emits `selection_scope: internal-zoom-occurrence`; guest verification retains its existing separate contract. `prepare`, `resume` and `rollback` are refused for this read-only Zoom scope.

For camera-enabled `canon-zoom-join.mjs`, place the same verification object under `cameraVerification` beside `participant` in the occurrence config; set `GOOGLE_PILOT_TOKEN_EXPIRES_AT` from OAuth issuance as well as the access token. The adapter re-fetches Calendar before launch. For the participant CLI, camera execution requires `--verify-config /private/verification.json`. Browser navigation still accepts passcodes only through the existing private invitation environment/file path. A scheduled process without an interactive terminal cannot enable the camera; run the internal launch in an operator-owned terminal for the final source attestation.

The media guard is installed before navigation in page frames and inspected across current frames. A newly created frame starts unarmed. UI interaction still requires uniquely exposed accessible controls in the primary page; unsupported subframe UI or a changed Zoom/Meet structure pauses rather than broadening selectors or enabling a device. Gate tests use a browser-like media fixture, and the CLI test executes the real verification CLI followed by the real participant dry-run CLI with a mocked Calendar response. Neither establishes current live Zoom/Meet compatibility or received-video quality.
