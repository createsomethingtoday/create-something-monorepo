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

const halfOptions = {
  scope: 'halfdozen-occurrence',
  approved: true,
  selectionAttested: true,
  hostPermissionVerified: true,
  canonIdentityVerified: true,
  calendarId: 'host@halfdozen.co',
  hostEmail: 'host@halfdozen.co',
  eventId: 'google_occurrence_20990101',
  selectedEventId: 'google_occurrence_20990101',
  canonEmail: 'canon@createsomething.io',
  intendedCanonEmail: 'canon@createsomething.io',
  transcriptionMode: 'off'
};
function halfFixture() {
  return {
    ...fixture(),
    id: halfOptions.eventId,
    creator: { email: 'assistant@halfdozen.co' },
    organizer: { email: halfOptions.hostEmail, self: true },
    recurringEventId: 'series',
    originalStartTime: { dateTime: '2099-01-01T12:00:00Z' },
    description: 'Original agenda and links',
    attendees: [{ email: 'guest@example.org', responseStatus: 'needsAction' }]
  };
}
test('Half Dozen explicit normal occurrence requires exact attestations and rejects series/settings mutations', () => {
  assert.equal(validate(halfFixture(), halfOptions), 'abc-defg-hij');
  assert.equal(
    validate({ ...halfFixture(), recurringEventId: undefined }, halfOptions),
    'abc-defg-hij'
  );
  for (const change of [
    { selectionAttested: false },
    { hostPermissionVerified: false },
    { intendedCanonEmail: 'other@example.org' },
    { selectedEventId: 'other' },
    { hostEmail: 'host@sub.halfdozen.co' },
    { transcriptionMode: 'api' }
  ])
    assert.throws(() => validate(halfFixture(), { ...halfOptions, ...change }));
  for (const change of [
    { recurrence: ['RRULE:FREQ=WEEKLY'] },
    { originalStartTime: undefined },
    { id: 'series' },
    { organizer: { email: 'host@halfdozen.co.evil.test', self: true } },
    { organizer: { email: halfOptions.hostEmail, self: false } },
    { attendeesOmitted: true }
  ])
    assert.throws(() => validate({ ...halfFixture(), ...change }, halfOptions));
});
test('Half Dozen preserves original content and later RSVP, accepts synced missing displayName, touches Calendar only', async () => {
  let event = halfFixture(),
    state;
  const original = structuredClone(event);
  const fetcher = async (url, init) => {
    assert.ok(url.startsWith('https://www.googleapis.com/calendar/'));
    if (init.method === 'PATCH') {
      assert.equal(init.headers['if-match'], event.etag);
      Object.assign(event, JSON.parse(init.body));
      event.etag += 'x';
      for (const attendee of event.attendees) delete attendee.displayName;
    }
    return { ok: true, json: async () => structuredClone(event) };
  };
  const invoke = (action) =>
    runPilot({
      action,
      options: halfOptions,
      state,
      token: 'fixture',
      fetcher,
      save: (value) => {
        state = structuredClone(value);
      }
    });
  const prepared = await invoke('prepare');
  assert.equal(prepared.participantSelection.selection_scope, 'halfdozen-occurrence');
  assert.equal(prepared.participantSelection.internal_test, false);
  assert.equal(event.description, `${original.description}\n\n${NOTICE}`);
  assert.deepEqual(event.attendees[0], original.attendees[0]);
  assert.equal((await invoke('verify')).inviteVerified, true);
  event.attendees[0].responseStatus = 'accepted';
  await invoke('rollback');
  assert.equal(event.description, original.description);
  assert.deepEqual(event.attendees, [{ ...original.attendees[0], responseStatus: 'accepted' }]);
});

test('Half Dozen pins canonical identity even when arbitrary intended email agrees', () => {
  assert.throws(() =>
    validate(halfFixture(), {
      ...halfOptions,
      canonEmail: 'other@example.org',
      intendedCanonEmail: 'other@example.org'
    })
  );
});
test('guestless event resumes and rolls back; preexisting Canon is retained with current RSVP and unordered roster', async () => {
  for (const existing of [false, true]) {
    let event = {
        ...halfFixture(),
        description: undefined,
        attendees: existing
          ? [
              { email: halfOptions.canonEmail, responseStatus: 'needsAction' },
              { email: 'guest@example.org', responseStatus: 'needsAction' }
            ]
          : undefined
      },
      state;
    const fetcher = async (_url, init) => {
      if (init.method === 'PATCH') {
        Object.assign(event, JSON.parse(init.body));
        event.etag += 'x';
      }
      return { ok: true, json: async () => structuredClone(event) };
    };
    const invoke = (action) =>
      runPilot({
        action,
        options: halfOptions,
        state,
        token: 'fixture',
        fetcher,
        save: (value) => {
          state = structuredClone(value);
        }
      });
    await invoke('prepare');
    assert.equal(state.addedCanon, !existing);
    await invoke('resume');
    if (existing) {
      event.attendees.reverse();
      event.attendees.find((a) => a.email === halfOptions.canonEmail).responseStatus = 'accepted';
    }
    await invoke('rollback');
    assert.equal(event.description, '');
    assert.equal(event.attendees.length, existing ? 2 : 0);
    if (existing)
      assert.equal(
        event.attendees.find((a) => a.email === halfOptions.canonEmail).responseStatus,
        'accepted'
      );
  }
});
test('pinned internal Canon accepts its actual account name or omitted synchronized name', async () => {
  for (const displayName of ['Canon Meeting Notes', undefined]) {
    const event = {
      ...fixture(),
      description: safeInvite(fixture(), options).description,
      attendees: [...fixture().attendees, { email: options.canonEmail, displayName }]
    };
    const result = await runPilot({
      action: 'verify',
      options: { ...options, transcriptionMode: 'off' },
      token: 'fixture',
      fetcher: async () => ({ ok: true, json: async () => event })
    });
    assert.equal(result.inviteVerified, true);
  }
});

test('Zoom guest verification is read-only, strips passcodes, distinguishes invitation from recording consent', async () => {
  const guestOptions = {
    ...halfOptions,
    scope: 'halfdozen-guest-occurrence',
    guestEmail: 'micah@createsomething.io',
    organizerEmail: 'danny@halfdozen.co',
    guestAdditionPermissionVerified: true
  };
  const event = {
    ...halfFixture(),
    organizer: { email: guestOptions.organizerEmail },
    guestsCanInviteOthers: true,
    attendees: [
      { email: guestOptions.guestEmail, self: true },
      { email: halfOptions.canonEmail, responseStatus: 'accepted' }
    ],
    hangoutLink: undefined,
    description: 'Zoom https://us02web.zoom.us/j/12345678901?pwd=PRIVATE',
    conferenceData: {
      entryPoints: [
        { entryPointType: 'video', uri: 'https://us02web.zoom.us/j/12345678901?pwd=PRIVATE' }
      ]
    }
  };
  const invoke = (options = guestOptions, selected = event, action = 'verify') =>
    runPilot({
      action,
      options,
      token: 'fixture',
      fetcher: async (_url, init) => {
        assert.equal(init.method, 'GET');
        return { ok: true, json: async () => selected };
      },
      save: () => {
        throw Error('read only');
      }
    });
  const result = await invoke();
  assert.equal(result.participantSelection.canon_rsvp, 'accepted');
  for (const responseStatus of [undefined, 'declined', 'needsAction', 'tentative']) {
    await assert.rejects(
      invoke(guestOptions, {
        ...event,
        attendees: [event.attendees[0], { ...event.attendees[1], responseStatus }]
      })
    );
  }
  assert.equal(result.participantSelection.meeting_url, 'https://us02web.zoom.us/j/12345678901');
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.equal(result.captureAuthorized, false);
  const defaultPermissions = { ...event };
  delete defaultPermissions.guestsCanInviteOthers;
  assert.equal((await invoke(guestOptions, defaultPermissions)).inviteVerified, true);
  assert.equal(result.participantSelection.host_recording_consent, 'required-separately');
  for (const change of [
    { guestAdditionPermissionVerified: false },
    { canonEmail: 'other@example.org' },
    { guestEmail: 'other@example.org' },
    { selectedEventId: 'other' }
  ])
    await assert.rejects(invoke({ ...guestOptions, ...change }));
  for (const change of [
    { guestsCanInviteOthers: false },
    { attendees: [{ email: guestOptions.guestEmail, self: true }] },
    { organizer: { email: 'danny@halfdozen.co.evil.test' } },
    { description: 'https://zoom.us.evil.test/j/12345678901', conferenceData: undefined },
    { description: 'https://zoom.us/j/99999999999' }
  ])
    await assert.rejects(invoke(guestOptions, { ...event, ...change }));
  await assert.rejects(invoke(guestOptions, event, 'prepare'), /read-only/);
});
