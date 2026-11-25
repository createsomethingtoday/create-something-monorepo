import test from 'node:test';
import assert from 'node:assert/strict';
import { planParticipant, runParticipant, validateProfile } from './canon-participant.mjs';
const now = Date.parse('2026-11-22T12:00:00Z');
const config = {
  profile_dir: '/private/tmp/canon-meet-pilot',
  identity_email: 'canon@example.com'
};
const selection = {
  event_id: 'internal',
  internal_test: true,
  identity_email: config.identity_email,
  invitation_verified: true,
  invited_emails: [config.identity_email],
  verified_at: new Date(now).toISOString(),
  starts_at: new Date(now).toISOString(),
  status: 'confirmed',
  meeting_url: 'https://meet.google.com/abc-defg-hij'
};
test('dry-run never launches a browser and does not claim admission or media verification', async () => {
  const result = await runParticipant({
    selection,
    config,
    now,
    launch: () => {
      throw Error('forbidden');
    }
  });
  assert.equal(result.dry_run, true);
  assert.equal(result.admitted, false);
  assert.match(result.media_state, /unverified/);
  assert.deepEqual(result.chrome_args, [
    `--user-data-dir=${config.profile_dir}`,
    '--new-window',
    selection.meeting_url
  ]);
});
test('reject main/non-dedicated profiles, wrong invitation, stale readback, and unsafe URL', () => {
  assert.throws(() =>
    validateProfile('/Users/test/Library/Application Support/Google/Chrome/Default')
  );
  for (const patch of [
    { invitation_verified: false },
    { invited_emails: [] },
    { identity_email: 'other@example.com' },
    { verified_at: '2020-01-01' },
    { meeting_url: 'https://meet.google.com.evil/abc-defg-hij' },
    { internal_test: false }
  ])
    assert.throws(() => planParticipant({ ...selection, ...patch }, config, {}, now));
});
test('future meeting schedules only; fresh reschedule changes plan without opening', async () => {
  let opened = 0;
  let state;
  const result = await runParticipant({
    selection: { ...selection, starts_at: '2026-11-22T13:00:00Z' },
    config,
    now,
    execute: true,
    save: async (v) => {
      state = v;
    },
    launch: () => {
      opened++;
    }
  });
  assert.equal(result.action, 'scheduled');
  assert.equal(opened, 0);
  const updated = planParticipant(
    { ...selection, starts_at: '2026-11-22T14:00:00Z' },
    config,
    state,
    now
  );
  assert.equal(updated.starts_at, '2026-11-22T14:00:00.000Z');
});
test('launch journals first and repeated invocation never opens a duplicate', async () => {
  let state;
  let launches = 0;
  const save = async (v) => {
    state = v;
  };
  const launch = async () => {
    assert.equal(state.opening, true);
    launches++;
  };
  const result = await runParticipant({ selection, config, now, execute: true, save, launch });
  assert.equal(result.action, 'prejoin-opened');
  assert.equal(result.admitted, false);
  assert.equal(
    (await runParticipant({ selection, config, state, now, execute: true, save, launch })).action,
    'manual-check'
  );
  assert.equal(launches, 1);
});
test('ambiguous opening stays blocked for human reconciliation', async () => {
  let state;
  await assert.rejects(
    runParticipant({
      selection,
      config,
      now,
      execute: true,
      save: async (v) => {
        state = v;
      },
      launch: async () => {
        throw Error('uncertain');
      }
    })
  );
  assert.equal(planParticipant(selection, config, state, now).action, 'manual-check');
});
test('cancellation never opens and never claims actual participant removal', async () => {
  let state;
  const result = await runParticipant({
    selection: { ...selection, status: 'cancelled' },
    config,
    now,
    execute: true,
    save: async (v) => {
      state = v;
    },
    launch: () => {
      throw Error('forbidden');
    }
  });
  assert.equal(result.action, 'cancel');
  assert.equal(result.participant_removed, false);
  assert.equal(state.cancelled, true);
  assert.throws(() => planParticipant(selection, config, state, now));
});
import { guardedJoin } from './canon-participant.mjs';
function fixture({
  account = 'Google Account: Canon (canon@example.com)',
  microphone = true,
  camera = true,
  challenge = false,
  ambiguous = false,
  admit = false
} = {}) {
  const clicks = [];
  let joined = false;
  const ui = {
    snapshot: async () => [
      { role: 'button', name: account },
      { role: 'heading', name: challenge ? 'Sign in' : 'Ready to join?' },
      { role: 'button', name: microphone ? 'Turn off microphone' : 'Turn on microphone' },
      { role: 'button', name: camera ? 'Turn off camera' : 'Turn on camera' },
      { role: 'button', name: joined && admit ? 'Leave call' : 'Join now' },
      ...(ambiguous ? [{ role: 'button', name: 'Ask to join' }] : [])
    ],
    click: async (name) => {
      clicks.push(name);
      if (name === 'Turn off microphone') microphone = false;
      else if (name === 'Turn off camera') camera = false;
      else if (name === 'Join now') joined = true;
    }
  };
  return { ui, clicks };
}
test('guarded normal Join verifies identity, disables both media devices and distinguishes submission from admission', async () => {
  const f = fixture();
  const result = await guardedJoin(f.ui, { email: config.identity_email, name: 'Canon' });
  assert.deepEqual(f.clicks, ['Turn off microphone', 'Turn off camera', 'Join now']);
  assert.equal(result.join_submitted, true);
  assert.equal(result.admitted, false);
  const admitted = fixture({ microphone: false, camera: false, admit: true });
  assert.equal(
    (await guardedJoin(admitted.ui, { email: config.identity_email, name: 'Canon' })).admitted,
    true
  );
});
test('guarded Join stops for wrong identity, challenges, ambiguous controls or missing media state', async () => {
  for (const options of [
    { account: 'Google Account: Other (other@example.com)' },
    { challenge: true },
    { ambiguous: true }
  ]) {
    const f = fixture(options);
    assert.equal(
      (await guardedJoin(f.ui, { email: config.identity_email, name: 'Canon' })).join_submitted,
      false
    );
    assert.ok(!f.clicks.includes('Join now'));
  }
  const f = fixture();
  const snapshot = f.ui.snapshot;
  f.ui.snapshot = async () => (await snapshot()).filter((n) => !n.name.includes('camera'));
  assert.equal(
    (await guardedJoin(f.ui, { email: config.identity_email, name: 'Canon' })).join_submitted,
    false
  );
  assert.ok(!f.clicks.includes('Join now'));
});
test('stopping a known pilot remains possible after invitation readback ages out', () => {
  assert.equal(
    planParticipant(
      { ...selection, status: 'cancelled', verified_at: '2020-01-01' },
      config,
      {},
      now
    ).action,
    'cancel'
  );
});
import {
  verifyScheduledSelection,
  waitForPrejoin,
  assertCanonicalProfile,
  initializeProfile
} from './canon-participant.mjs';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
test('scheduled verifier is read-only, bound to selected event, handles move/cancel and rejects expired tokens', async () => {
  const options = { eventId: selection.event_id, canonEmail: selection.identity_email };
  const auth = { token: 'fixture-only', expires_at: '2026-11-22T14:00:00Z', now };
  let called = 0;
  const verify = async (input) => {
    called++;
    assert.equal(input.action, 'verify');
    assert.equal(input.token, 'fixture-only');
    return {
      inviteVerified: true,
      participantSelection: { ...selection, starts_at: '2026-11-22T13:00:00Z' }
    };
  };
  assert.equal(
    (await verifyScheduledSelection(selection, options, { ...auth, verify })).starts_at,
    '2026-11-22T13:00:00Z'
  );
  assert.equal(
    (
      await verifyScheduledSelection(selection, options, {
        ...auth,
        verify: async () => ({ cancelled: true })
      })
    ).status,
    'cancelled'
  );
  await assert.rejects(
    verifyScheduledSelection(selection, options, {
      ...auth,
      expires_at: '2026-11-22T11:00:00Z',
      verify
    })
  );
  assert.equal(called, 1);
  await assert.rejects(
    verifyScheduledSelection(selection, { ...options, eventId: 'other' }, { ...auth, verify })
  );
  await assert.rejects(
    verifyScheduledSelection(selection, options, {
      ...auth,
      verify: async () => ({ inviteVerified: false })
    })
  );
  await assert.rejects(
    verifyScheduledSelection(selection, options, {
      ...auth,
      verify: async () => ({
        inviteVerified: true,
        participantSelection: { ...selection, starts_at: '2026-11-22T15:00:00Z' }
      })
    })
  );
});
test('normal prejoin gets bounded render retries; sign-in never bypassed', async () => {
  let snapshots = 0,
    sleeps = 0;
  assert.equal(
    await waitForPrejoin(
      { snapshot: async () => (++snapshots === 3 ? [{ name: 'Ready to join?' }] : []) },
      {
        attempts: 4,
        sleep: async () => {
          sleeps++;
        }
      }
    ),
    true
  );
  assert.equal(sleeps, 2);
  assert.equal(
    await waitForPrejoin(
      { snapshot: async () => [{ name: 'Sign in' }] },
      {
        sleep: async () => {
          throw Error('must stop');
        }
      }
    ),
    false
  );
  snapshots = 0;
  assert.equal(
    await waitForPrejoin(
      {
        snapshot: async () => {
          snapshots++;
          return [];
        }
      },
      { attempts: 3, sleep: async () => {} }
    ),
    false
  );
  assert.equal(snapshots, 3);
});
test('dedicated profile initialization rejects canonical-path aliases', async () => {
  const root = await mkdtemp('/private/tmp/canon-profile-fixture-');
  try {
    const profile = `${root}/canon-meet-pilot`;
    await initializeProfile(profile);
    assert.equal(await assertCanonicalProfile(profile), profile);
    const aliases = `${root}/aliases`;
    await symlink(root, aliases);
    await assert.rejects(assertCanonicalProfile(`${aliases}/canon-meet-pilot`));
    await assert.rejects(initializeProfile(profile));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
import { chromeLaunchOptions } from './canon-participant.mjs';
test('installed Puppeteer keeps operator extensions enabled without extension debugging or changing main profile', async () => {
  const { default: puppeteer } = await import('puppeteer-core');
  const options = chromeLaunchOptions(config.profile_dir);
  assert.equal(options.enableExtensions, true);
  assert.equal(options.userDataDir, config.profile_dir);
  assert.equal(options.headless, false);
  const args = puppeteer
    .defaultArgs(options)
    .filter((arg) => !options.ignoreDefaultArgs.includes(arg));
  assert.ok(!args.includes('--disable-extensions'));
  assert.ok(!args.includes('--enable-unsafe-extension-debugging'));
  assert.ok(args.includes(`--user-data-dir=${config.profile_dir}`));
});

test('launcher accepts tagged verified Half Dozen occurrence and rejects incomplete or foreign tags', () => {
  const halfConfig = { ...config, identity_email: 'canon@createsomething.io' };
  const selected = {
    ...selection,
    identity_email: halfConfig.identity_email,
    invited_emails: [halfConfig.identity_email],
    internal_test: false,
    selection_scope: 'halfdozen-occurrence',
    host_permission_verified: true,
    organizer_email: 'host@halfdozen.co',
    calendar_id: 'host@halfdozen.co'
  };
  assert.equal(planParticipant(selected, halfConfig, {}, now).action, 'open-prejoin');
  for (const change of [
    { host_permission_verified: false },
    { calendar_id: undefined },
    { organizer_email: 'host@sub.halfdozen.co' },
    { selection_scope: 'client' }
  ])
    assert.throws(() => planParticipant({ ...selected, ...change }, halfConfig, {}, now));
});

test('Zoom cannot reuse a Google Meet meeting URL', () => {
  assert.throws(
    () =>
      planParticipant(
        {
          ...selection,
          platform: 'zoom',
          selection_scope: 'internal-zoom-occurrence',
          calendar_verified: true,
          organizer_email: 'micah@createsomething.io',
          calendar_id: 'primary'
        },
        config,
        {},
        now
      ),
    /Exact selected Zoom invitation required/
  );
});
