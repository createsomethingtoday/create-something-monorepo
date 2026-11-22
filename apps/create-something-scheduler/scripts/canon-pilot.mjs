#!/usr/bin/env node
// One explicitly approved event only. OAuth tokens are environment-only; receipts are private.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const NOTICE =
  'Canon Meeting Notes — CREATE SOMETHING\nLook for Canon in the People panel. Canon helps prepare a private draft for the host. The host will ask everyone before starting the local audio capture. You can ask the host to stop it or remove Canon at any time. If Google Meet transcription is enabled, Meet shows its own notice and the host can stop it separately.';
const mask = 'config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration';
export function schedulerEventId(calendarId, key) {
  const bytes = createHash('sha256').update(`${calendarId}:${key}`).digest().subarray(0, 20);
  let bits = 0,
    buffer = 0,
    out = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += '0123456789abcdefghijklmnopqrstuv'[(buffer >>> bits) & 31];
    }
  }
  return out;
}
export function validate(event, options, action = 'prepare') {
  if (
    options.internalTest !== true ||
    options.hostEmail !== 'micah@createsomething.io' ||
    !/^[^@\s]+@createsomething\.io$/.test(options.canonEmail ?? '')
  )
    throw Error('First-party internal pilot only');
  if (
    options.approved !== true ||
    options.canonIdentityVerified !== true ||
    !options.eventId ||
    !options.calendarId ||
    !options.hostEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.canonEmail ?? '')
  )
    throw Error('Explicit one-event approval and verified Canon identity required');
  if (options.canonEmail.toLowerCase() === options.hostEmail.toLowerCase())
    throw Error('Canon must have a dedicated identity');
  if (
    event.id !== options.eventId ||
    event.id !== schedulerEventId(options.calendarId, options.schedulerIdempotencyKey)
  )
    throw Error('Scheduler event provenance mismatch');
  if (
    event.organizer?.email?.toLowerCase() !== options.hostEmail.toLowerCase() ||
    event.organizer?.self !== true ||
    event.creator?.self !== true
  )
    throw Error('Authenticated scheduler host must own and have created this event');
  if (
    event.status === 'cancelled' ||
    event.recurringEventId ||
    event.recurrence ||
    (action === 'prepare' && Date.parse(event.start?.dateTime) <= Date.now()) ||
    !Number.isFinite(Date.parse(event.start?.dateTime))
  )
    throw Error('Select one future nonrecurring event');
  if (!event.etag || !event.description?.startsWith('Scheduled via CREATE SOMETHING.'))
    throw Error('Scheduler event and concurrency evidence required');
  const url = new URL(event.hangoutLink ?? 'https://invalid.invalid');
  if (
    url.origin !== 'https://meet.google.com' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url.pathname) ||
    event.conferenceData?.conferenceSolution?.key?.type !== 'hangoutsMeet'
  )
    throw Error('Google Meet event required');
  if (event.attendeesOmitted) throw Error('Complete attendee list required');
  if (
    !event.attendees?.length ||
    event.attendees.some(
      (a) => ![options.hostEmail, options.canonEmail].includes(a.email?.toLowerCase())
    )
  )
    throw Error('Internal test allows only the host and verified Canon attendee');
  if (event.attendees.filter((a) => a.email?.toLowerCase() === options.canonEmail).length > 1)
    throw Error('Duplicate Canon invitation');
  return url.pathname.slice(1);
}
export function safeInvite(event, options) {
  // Meaningful existing content must never be silently replaced, even for an internal test.
  if (event.description !== 'Scheduled via CREATE SOMETHING.')
    throw Error('Internal pilot requires plain scheduler marker only');
  if (
    typeof options.approvedPublicDescription !== 'string' ||
    /Booking context:|Warmup notes:|atlas_session_id=|agent_messages=/.test(
      options.approvedPublicDescription
    )
  )
    throw Error('Explicit public-safe description required');
  if (event.attendees?.some((a) => a.email?.toLowerCase() === options.canonEmail.toLowerCase()))
    throw Error('Canon already invited; use verify or resume existing receipt');
  return {
    description: `Scheduled via CREATE SOMETHING.\n\n${options.approvedPublicDescription}\n\n${NOTICE}`,
    attendees: [...(event.attendees ?? []), { email: options.canonEmail, displayName: 'Canon' }]
  };
}
export async function runPilot({ action, options, state, save, fetcher = fetch, token }) {
  if (!token) throw Error('GOOGLE_PILOT_ACCESS_TOKEN required');
  if (!['api', 'manual', 'off'].includes(options.transcriptionMode))
    throw Error('transcriptionMode must be api, manual, or off');
  const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(options.calendarId)}/events/${encodeURIComponent(options.eventId)}`;
  async function api(url, method = 'GET', body, etag) {
    const response = await fetcher(url, {
      method,
      redirect: 'error',
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(etag ? { 'if-match': etag } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok)
      throw Error(
        `Google ${method} failed (${response.status}); inspect host settings and verify before retry`
      );
    return response.json();
  }
  let event = await api(eventUrl);
  if (
    action === 'verify' &&
    event.status === 'cancelled' &&
    event.id === options.eventId &&
    event.id === schedulerEventId(options.calendarId, options.schedulerIdempotencyKey)
  ) {
    return { cancelled: true, inviteVerified: false, participantPresence: 'unverified' };
  }
  if (action === 'resume' && state?.phase === 'rolled_back')
    throw Error('Pilot already rolled back');
  const code = validate(event, options, action);
  const space =
    options.transcriptionMode === 'off'
      ? { name: null }
      : await api(`https://meet.googleapis.com/v2/spaces/${code}`);
  if (options.transcriptionMode !== 'off' && !/^spaces\/[A-Za-z0-9_-]+$/.test(space.name ?? ''))
    throw Error('Invalid canonical Meet space');
  const spaceUrl = `https://meet.googleapis.com/v2/${space.name}`;
  const transcription = (s) =>
    s.config?.artifactConfig?.transcriptionConfig?.autoTranscriptionGeneration;
  if (
    state &&
    (state.eventId !== event.id ||
      state.calendarId !== options.calendarId ||
      state.spaceName !== space.name ||
      state.canonEmail !== options.canonEmail)
  )
    throw Error('Receipt target mismatch');
  const selection = () => ({
    event_id: event.id,
    identity_email: options.canonEmail,
    invitation_verified: true,
    meeting_url: event.hangoutLink,
    starts_at: event.start.dateTime,
    status: event.status,
    invited_emails: event.attendees.map((a) => a.email),
    organizer_email: event.organizer.email,
    internal_test: true,
    verified_at: new Date().toISOString()
  });
  if (action === 'verify') {
    const inviteVerified =
      event.attendees?.some((a) => a.email === options.canonEmail && a.displayName === 'Canon') &&
      event.description?.includes(NOTICE);
    return {
      inviteVerified,
      ...(inviteVerified ? { participantSelection: selection() } : {}),
      transcription:
        options.transcriptionMode === 'off' ? 'NOT_REQUESTED' : (transcription(space) ?? 'UNKNOWN'),
      participantPresence: 'unverified'
    };
  }
  if (
    action === 'resume' &&
    state?.phase === 'transcription_verified' &&
    transcription(space) !== 'ON'
  )
    throw Error('Host changed transcription; review before resuming');
  if (action === 'prepare') {
    if (state) throw Error('Receipt already exists; use resume or rollback');
    const patch = safeInvite(event, options);
    state = {
      eventId: event.id,
      calendarId: options.calendarId,
      canonEmail: options.canonEmail,
      spaceName: space.name,
      originalDescription: event.description,
      originalAttendees: event.attendees ?? [],
      originalTranscription: transcription(space),
      patch,
      phase: 'prepared'
    };
    save(state); // Durable rollback before any provider mutation.
  } else if (!state) throw Error('Receipt required');
  if (action === 'rollback') {
    if (
      options.transcriptionMode === 'api' &&
      state.originalTranscription &&
      transcription(space) !== state.originalTranscription
    ) {
      if (transcription(space) !== 'ON')
        throw Error('Meet settings changed externally; host review required');
      await api(`${spaceUrl}?updateMask=${mask}`, 'PATCH', {
        name: space.name,
        config: {
          artifactConfig: {
            transcriptionConfig: { autoTranscriptionGeneration: state.originalTranscription }
          }
        }
      });
      if (transcription(await api(spaceUrl)) !== state.originalTranscription)
        throw Error('Meet rollback unverified; keep notice');
    } else if (transcription(space) !== state.originalTranscription)
      throw Error('Host must restore original transcription setting, then retry rollback');
    // Preserve all other edits; fail closed if our exact fields changed.
    if (
      event.description !== state.patch.description ||
      JSON.stringify(event.attendees?.map((a) => a.email)) !==
        JSON.stringify(state.patch.attendees.map((a) => a.email))
    )
      throw Error('Invite fields changed externally; manual host rollback required');
    // Remove Canon while the description remains public-safe, then verify removal before restoring private content.
    const retained = event.attendees.filter(
      (a) => a.email?.toLowerCase() !== options.canonEmail.toLowerCase()
    );
    await api(`${eventUrl}?sendUpdates=all`, 'PATCH', { attendees: retained }, event.etag);
    const removed = await api(eventUrl);
    if (
      removed.attendees?.some((a) => a.email?.toLowerCase() === options.canonEmail.toLowerCase()) ||
      removed.description !== state.patch.description
    )
      throw Error('Canon removal unverified; private description not restored');
    await api(
      `${eventUrl}?sendUpdates=all`,
      'PATCH',
      { description: state.originalDescription },
      removed.etag
    );
    const restored = await api(eventUrl);
    if (
      restored.description !== state.originalDescription ||
      restored.attendees?.some((a) => a.email === options.canonEmail)
    )
      throw Error('Invite rollback unverified');
    state.phase = 'rolled_back';
    save(state);
    return { phase: state.phase };
  }
  if (!['prepare', 'resume'].includes(action)) throw Error('Unknown action');
  // A timed-out PATCH is resolved by readback, never by blindly reinviting.
  if (
    event.description !== state.patch.description ||
    !event.attendees?.some((a) => a.email === options.canonEmail && a.displayName === 'Canon')
  ) {
    if (
      event.description !== state.originalDescription ||
      JSON.stringify(event.attendees?.map((a) => a.email)) !==
        JSON.stringify(state.originalAttendees.map((a) => a.email))
    )
      throw Error('Invite changed externally; host review required');
    state.patch.attendees = [
      ...(event.attendees ?? []),
      { email: options.canonEmail, displayName: 'Canon' }
    ];
    save(state);
    await api(`${eventUrl}?sendUpdates=all`, 'PATCH', state.patch, event.etag);
    event = await api(eventUrl);
  }
  if (
    event.description !== state.patch.description ||
    !event.attendees?.some((a) => a.email === options.canonEmail && a.displayName === 'Canon')
  )
    throw Error('Invite readback failed; transcription not enabled');
  state.phase = 'invite_verified';
  save(state);
  if (options.transcriptionMode === 'api') {
    if (!['ON', 'OFF'].includes(state.originalTranscription))
      throw Error('Original transcription unknown; host must configure manually');
    if (transcription(space) !== 'ON')
      await api(`${spaceUrl}?updateMask=${mask}`, 'PATCH', {
        name: space.name,
        config: { artifactConfig: { transcriptionConfig: { autoTranscriptionGeneration: 'ON' } } }
      });
    if (transcription(await api(spaceUrl)) !== 'ON') throw Error('Transcription readback failed');
    state.phase = 'transcription_verified';
    save(state);
  } else if (options.transcriptionMode === 'manual') {
    state.phase =
      transcription(await api(spaceUrl)) === 'ON'
        ? 'transcription_verified'
        : 'host_setting_required';
    save(state);
  } else if (options.transcriptionMode !== 'off')
    throw Error('transcriptionMode must be api, manual, or off');
  return {
    phase: state.phase,
    participantSelection: selection(),
    participantPresence: 'unverified',
    next: 'Host must admit Canon and verify the visible participant before capture. Invitation is not call presence.'
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [action, configPath, receiptPath] = process.argv.slice(2);
    if (
      !['prepare', 'resume', 'verify', 'rollback'].includes(action) ||
      !configPath ||
      !receiptPath
    )
      throw Error(
        'Usage: node canon-pilot.mjs prepare|resume|verify|rollback private-config.json private-receipt.json'
      );
    const options = JSON.parse(readFileSync(configPath, 'utf8'));
    let state;
    try {
      state = JSON.parse(readFileSync(receiptPath, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    console.log(
      JSON.stringify(
        await runPilot({
          action,
          options,
          state,
          token: process.env.GOOGLE_PILOT_ACCESS_TOKEN,
          save: (s) => {
            const tmp = `${receiptPath}.${process.pid}.tmp`;
            writeFileSync(tmp, JSON.stringify(s, null, 2), { mode: 0o600, flag: 'wx' });
            chmodSync(tmp, 0o600);
            renameSync(tmp, receiptPath);
          }
        })
      )
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
