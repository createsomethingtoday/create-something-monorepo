# One-event internal Canon pilot

This utility accepts only an explicitly approved internal test organized by `micah@createsomething.io`. The live attendee list may contain only that exact host address and the exact verified Canon identity at `createsomething.io`; client guests, other staff, external addresses and subdomains are rejected regardless of `internalTest`.

This utility changes only the selected event invite metadata and (optionally) its Meet space transcription setting. It does not create, reschedule, or cancel scheduler bookings. No live operation is part of the test suite.

Use a private configuration file outside the repository, with `approved: true`, `canonIdentityVerified: true`, `internalTest: true`, `calendarId`, `hostEmail`, `eventId`, original `schedulerIdempotencyKey`, the operator-verified dedicated `canonEmail`, `approvedPublicDescription` (explicitly public-safe replacement description), and `transcriptionMode: "off"`, `"manual"`, or `"api"`. The hash of calendar ID and original scheduler idempotency key must match the selected event. The authenticated user must be both event creator and organizer. Preparation requires a future, nonrecurring scheduler-created Meet event. Read-only verification and rollback remain available after its start.

Set `GOOGLE_PILOT_ACCESS_TOKEN` through the authorized secret environment; never put the token on the command line. Then run:

```
node apps/create-something-scheduler/scripts/canon-pilot.mjs prepare /private/path/config.json /private/path/receipt.json
node apps/create-something-scheduler/scripts/canon-pilot.mjs verify /private/path/config.json /private/path/receipt.json
```

`prepare` writes private rollback evidence before mutation, requires the original description to be exactly `Scheduled via CREATE SOMETHING.` and preserves that marker while appending the approved public description and branded notice, preserves current attendees and invites Canon with display name Canon. Existing meaningful descriptions, scheduler attribution and warmup notes are rejected; the CLI never silently replaces them. Calendar receives `sendUpdates=all`; guests are notified. An ETag precondition rejects concurrent Calendar edits. The notice and invitation must read back before transcription can be enabled. No video recording or Gemini smart notes setting is changed.

For optional native Meet transcription, API mode requires the Google Meet API enabled and the host's OAuth grant for `https://www.googleapis.com/auth/meetings.space.settings`. The older `meetings.space.created` grant alone does not authorize setting auto artifacts on Calendar-created spaces. Calendar metadata writes require `https://www.googleapis.com/auth/calendar.events` (or an applicable narrower owned-events grant). Provider authorization remains authoritative. Eligible Workspace edition, admin policy and host privileges still apply. `ON` configures automatic transcription when a privileged participant joins; it does not prove a transcript was produced.

In manual mode, the host opens this event's video-call options in Google Calendar/Meet and enables automatic transcription. Rerun `resume`; the API GET must return `ON` before transcription is reported verified. A refused PATCH leaves the invite and notice in place; do not remove disclosure while capture might remain enabled. Reauthorize the appropriate scope or use manual host settings, then `resume`. If API GET is unavailable, stop: settings remain unverified.

With `transcriptionMode: "off"`, verification makes only a Calendar GET and needs no Meet grant; it produces a fresh `participantSelection` after live invitation readback, including after the start time.

`resume` uses the same receipt, reads current state and reconciles a timed-out mutation before retry. External invite edits block automatic overwrite. `rollback` first restores and verifies the original transcription setting, then removes Canon with an ETag while keeping the public-safe description. Only after confirming removal does it restore the original description. Current host RSVP state is preserved. In manual mode restore the original host setting first. If original transcription is unknown or fields changed externally, use host review; the utility fails closed. A settings snapshot cannot prevent concurrent host changes in Meet, so coordinate with the host during this bounded operation. A rollback can run after the meeting starts or ends. Intervening attendee or description edits cause a safe refusal for host review; no external content is replaced. The rollback receipt contains private original event metadata; protect and delete it under the pilot retention policy.

The returned `participantSelection` is the selected-event readback for the visible-participant launcher. An invitation is not presence: the host must admit Canon, verify the visible Canon participant in the call, explain its purpose and confirm consent before capture. Removing Canon and turning off native transcription are separate host controls. A Meet space can be reused: keep this pilot meeting link unique, stop transcription afterward and do not use a recurring/reused link.

Official references verified 2026-11-22:

- https://developers.google.com/workspace/meet/api/guides/meeting-spaces-overview (Calendar-created spaces require settings scope)
- https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/patch (PATCH and field mask)
- https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces (artifact behavior and enum)
- https://developers.google.com/workspace/calendar/api/v3/reference/events/patch (Calendar update semantics)

Offline validation: `node --test apps/create-something-scheduler/scripts/canon-pilot.test.mjs`.
