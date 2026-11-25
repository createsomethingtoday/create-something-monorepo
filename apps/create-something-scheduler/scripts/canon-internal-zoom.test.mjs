import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { NOTICE, runPilot, verifyInternalZoomOccurrence } from './canon-pilot.mjs';
import { cameraPilotPolicy } from './canon-participant-camera.mjs';
const options = {
  scope: 'internal-zoom-occurrence',
  internalTest: true,
  approved: true,
  selectionAttested: true,
  canonIdentityVerified: true,
  hostEmail: 'micah@createsomething.io',
  canonEmail: 'canon@createsomething.io',
  selectedEventId: 'internalzoom1',
  eventId: 'internalzoom1',
  calendarId: 'primary',
  transcriptionMode: 'off',
  selectedMeetingUrl: 'https://zoom.us/j/12345678901'
};
const event = {
  id: options.eventId,
  etag: 'v1',
  status: 'confirmed',
  organizer: { email: options.hostEmail, self: true },
  creator: { self: true },
  start: { dateTime: '2027-01-01T12:00:00Z' },
  attendees: [
    { email: options.hostEmail },
    { email: options.canonEmail, responseStatus: 'accepted' }
  ],
  description: NOTICE,
  location: options.selectedMeetingUrl
};
test('internal Zoom requires canonical host, roster, invitation and exact selected link', () => {
  const selection = verifyInternalZoomOccurrence(event, options).participantSelection;
  assert.equal(selection.selection_scope, 'internal-zoom-occurrence');
  const camera = {
    camera_pilot: {
      enabled: true,
      device_label: 'OBS Virtual Camera',
      operator_confirmed_event_id: event.id
    }
  };
  assert.equal(cameraPilotPolicy(selection, camera).event_id, event.id);
  assert.throws(
    () =>
      cameraPilotPolicy(
        { ...selection, selection_scope: 'halfdozen-guest-occurrence', internal_test: true },
        camera
      ),
    /Half Dozen/
  );
  for (const patch of [
    { organizer: { email: 'someone@halfdozen.co', self: true } },
    { attendees: [...event.attendees, { email: 'outside@example.com' }] },
    { description: '' },
    { creator: { self: false } }
  ])
    assert.throws(() => verifyInternalZoomOccurrence({ ...event, ...patch }, options));
  assert.throws(() =>
    verifyInternalZoomOccurrence(event, {
      ...options,
      selectedMeetingUrl: 'https://zoom.us/j/99999999999'
    })
  );
});
test('internal Zoom canonical readback is GET only and rejects mutation actions', async () => {
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, json: async () => event };
  };
  const result = await runPilot({ action: 'verify', options, token: 'fixture', fetcher });
  assert.equal(result.participantSelection.platform, 'zoom');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, 'GET');
  assert.match(requests[0].url, /calendar\/v3\/calendars\/primary\/events\/internalzoom1$/);
  await assert.rejects(
    runPilot({ action: 'prepare', options, token: 'fixture', fetcher }),
    /read-only/
  );
});
test('actual verification CLI emits internal Zoom selection from Calendar fixture without writes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'canon-internal-zoom-'));
  try {
    await writeFile(join(dir, 'config.json'), JSON.stringify(options), { mode: 0o600 });
    await writeFile(
      join(dir, 'fixture.mjs'),
      `globalThis.fetch = async (url, init) => { if(init.method !== 'GET' || !url.includes('/calendar/v3/')) throw Error('Unexpected request'); return {ok:true,json:async()=>(${JSON.stringify(event)})}; };`
    );
    const output = execFileSync(
      process.execPath,
      [
        '--import',
        join(dir, 'fixture.mjs'),
        new URL('./canon-pilot.mjs', import.meta.url).pathname,
        'verify',
        join(dir, 'config.json'),
        join(dir, 'receipt.json')
      ],
      { env: { ...process.env, GOOGLE_PILOT_ACCESS_TOKEN: 'offline-fixture' }, encoding: 'utf8' }
    );
    const result = JSON.parse(output);
    assert.equal(result.participantSelection.selection_scope, 'internal-zoom-occurrence');
    assert.equal(result.participantSelection.meeting_url, options.selectedMeetingUrl);
    assert.equal(result.captureAuthorized, false);
    await writeFile(join(dir, 'selection.json'), JSON.stringify(result.participantSelection));
    const participant = JSON.parse(
      execFileSync(
        process.execPath,
        [
          new URL('./canon-participant.mjs', import.meta.url).pathname,
          join(dir, 'selection.json'),
          join(dir, 'participant-ledger.json')
        ],
        {
          env: {
            ...process.env,
            CANON_CHROME_PROFILE_DIR: join(dir, 'canon-meet-pilot'),
            CANON_PARTICIPANT_EMAIL: options.canonEmail,
            CANON_PARTICIPANT_NAME: 'Canon'
          },
          encoding: 'utf8'
        }
      )
    );
    assert.equal(participant.dry_run, true);
    assert.equal(participant.platform, 'zoom');
    assert.equal(participant.meeting_url, options.selectedMeetingUrl);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
