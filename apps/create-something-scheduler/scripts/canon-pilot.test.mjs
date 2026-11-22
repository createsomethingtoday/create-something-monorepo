import test from 'node:test';
import assert from 'node:assert/strict';
import { runPilot, schedulerEventId, safeInvite, validate, NOTICE } from './canon-pilot.mjs';
const options = {
  internalTest: true,
  approved: true,
  canonIdentityVerified: true,
  calendarId: 'micah@createsomething.io',
  hostEmail: 'micah@createsomething.io',
  canonEmail: 'canon@createsomething.io',
  schedulerIdempotencyKey: 'test-key',
  transcriptionMode: 'api',
  approvedPublicDescription: 'An internal test call.'
};
options.eventId = schedulerEventId(options.calendarId, options.schedulerIdempotencyKey);
function fixture() {
  return {
    id: options.eventId,
    etag: 'v1',
    description: 'Scheduled via CREATE SOMETHING.',
    status: 'confirmed',
    organizer: { email: options.hostEmail, self: true },
    creator: { self: true },
    start: { dateTime: '2099-01-01T12:00:00Z' },
    attendees: [{ email: 'micah@createsomething.io' }],
    hangoutLink: 'https://meet.google.com/abc-defg-hij',
    conferenceData: { conferenceSolution: { key: { type: 'hangoutsMeet' } } }
  };
}
test('selection rejects foreign event, recurrence and non-host identity', () => {
  assert.equal(validate(fixture(), options), 'abc-defg-hij');
  for (const change of [
    { id: 'foreign' },
    { recurrence: ['RRULE:FREQ=DAILY'] },
    { organizer: { email: options.hostEmail, self: false } }
  ])
    assert.throws(() => validate({ ...fixture(), ...change }, options));
});
test('invite sanitizes private context and preserves attendees', () => {
  const patch = safeInvite(fixture(), options);
  assert.ok(!patch.description.includes('PRIVATE'));
  assert.ok(patch.description.includes(NOTICE));
  assert.deepEqual(patch.attendees, [
    { email: 'micah@createsomething.io' },
    { email: options.canonEmail, displayName: 'Canon' }
  ]);
  assert.throws(() =>
    safeInvite(fixture(), { ...options, approvedPublicDescription: 'Warmup notes: SECRET' })
  );
});
test('notice readback precedes enabling transcription; rollback restores fields and settings', async () => {
  let event = fixture(),
    space = {
      name: 'spaces/unique',
      config: { artifactConfig: { transcriptionConfig: { autoTranscriptionGeneration: 'OFF' } } }
    },
    state,
    calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init.method]);
    if (init.method === 'PATCH') {
      const body = JSON.parse(init.body);
      if (url.includes('calendar/')) {
        assert.equal(init.headers['if-match'], 'v1');
        Object.assign(event, body);
      } else {
        assert.ok(event.description.includes(NOTICE));
        space = body;
      }
    }
    return {
      ok: true,
      json: async () => structuredClone(url.includes('calendar/') ? event : space)
    };
  };
  const invoke = (action) =>
    runPilot({
      action,
      options,
      state,
      save: (s) => (state = structuredClone(s)),
      fetcher,
      token: 'fixture'
    });
  const result = await invoke('prepare');
  assert.equal(result.phase, 'transcription_verified');
  assert.equal(result.participantPresence, 'unverified');
  assert.ok(
    calls.findIndex(([url, m]) => url.includes('calendar/') && m === 'PATCH') <
      calls.findIndex(([url, m]) => url.includes('meet.googleapis') && m === 'PATCH')
  );
  event.attendees[0].responseStatus = 'accepted';
  event.start.dateTime = '2020-01-01T12:00:00Z';
  await invoke('rollback');
  assert.equal(event.attendees[0].responseStatus, 'accepted');
  assert.equal(event.description, fixture().description);
  assert.equal(event.attendees.length, 1);
  assert.equal(space.config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration, 'OFF');
});
test('failed invite verification prevents transcription and retains rollback receipt', async () => {
  let state,
    patches = [];
  const fetcher = async (url, init) => {
    if (init.method === 'PATCH') patches.push(url);
    return {
      ok: true,
      json: async () =>
        url.includes('calendar/')
          ? fixture()
          : {
              name: 'spaces/unique',
              config: {
                artifactConfig: { transcriptionConfig: { autoTranscriptionGeneration: 'OFF' } }
              }
            }
    };
  };
  await assert.rejects(
    runPilot({ action: 'prepare', options, save: (s) => (state = s), fetcher, token: 'fixture' }),
    /readback failed/
  );
  assert.equal(state.phase, 'prepared');
  assert.equal(patches.length, 1);
});

test('internal restriction rejects clients and meaningful original content', () => {
  assert.throws(
    () => validate({ ...fixture(), attendees: [{ email: 'client@outside.example' }] }, options),
    /only the host/
  );
  assert.throws(
    () =>
      validate({ ...fixture(), attendees: [{ email: 'person@sub.createsomething.io' }] }, options),
    /only the host/
  );
  assert.throws(
    () =>
      safeInvite(
        { ...fixture(), description: 'Scheduled via CREATE SOMETHING.\nWarmup notes: private' },
        options
      ),
    /plain scheduler marker/
  );
});
test('verify after start is Calendar-only and emits fresh selected event; rollback after start remains allowed', async () => {
  const event = {
    ...fixture(),
    start: { dateTime: '2020-01-01T12:00:00Z' },
    description: safeInvite(fixture(), options).description,
    attendees: [...fixture().attendees, { email: options.canonEmail, displayName: 'Canon' }]
  };
  assert.doesNotThrow(() => validate(event, options, 'rollback'));
  let requests = 0;
  const result = await runPilot({
    action: 'verify',
    options: { ...options, transcriptionMode: 'off' },
    token: 'fixture',
    fetcher: async (url, init) => {
      assert.ok(url.includes('www.googleapis.com/calendar'));
      assert.equal(init.method, 'GET');
      requests++;
      return { ok: true, json: async () => event };
    }
  });
  assert.equal(requests, 1);
  assert.equal(result.participantSelection.event_id, options.eventId);
  assert.equal(result.participantSelection.internal_test, true);
  assert.equal(result.transcription, 'NOT_REQUESTED');
});
test('read-only verification recognizes the exact cancelled event tombstone', async () => {
  const fetcher = async (_url, init) => {
    assert.equal(init.method, 'GET');
    return { ok: true, json: async () => ({ id: options.eventId, status: 'cancelled' }) };
  };
  const result = await runPilot({ action: 'verify', options, fetcher, token: 'fixture' });
  assert.equal(result.cancelled, true);
  assert.equal(result.participantSelection, undefined);
});
