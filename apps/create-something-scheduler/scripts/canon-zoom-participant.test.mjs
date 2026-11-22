import test from 'node:test';
import assert from 'node:assert/strict';
import { guardedZoomJoin, zoomBrowserUrl } from './canon-zoom-participant.mjs';
const button = (name) => ({ role: 'button', name });
function fixture({ challenge = false, missingMuted = false } = {}) {
  let stage = 'prejoin',
    value = '',
    mic = true,
    camera = true,
    checked = false;
  const clicks = [];
  return {
    clicks,
    snapshot: async () =>
      challenge
        ? [{ role: 'heading', name: 'Verify your identity' }]
        : stage === 'prejoin'
          ? [
              { role: 'textbox', name: 'Your Name', value },
              button(mic ? 'Mute' : 'Unmute'),
              button(camera ? 'Stop Video' : 'Start Video'),
              button('Join')
            ]
          : stage === 'waiting'
            ? ((stage = 'admitted'),
              [{ role: 'heading', name: 'Please wait, the meeting host will let you in soon' }])
            : stage === 'admitted'
              ? [button('Leave'), button('Start Video'), button('Join Audio')]
              : stage === 'dialog'
                ? [
                    button('Leave'),
                    button('Start Video'),
                    button('Join with Computer Audio'),
                    ...(missingMuted
                      ? []
                      : [{ role: 'checkbox', name: 'Mute my microphone when joining', checked }])
                  ]
                : [button('Leave'), button('Start Video'), button('Unmute')],
    fill: async (name, v) => {
      value = v;
    },
    setChecked: async () => {
      checked = true;
    },
    click: async (name) => {
      clicks.push(name);
      if (name === 'Mute') mic = false;
      else if (name === 'Stop Video') camera = false;
      else if (name === 'Join') {
        assert.equal(value, 'Canon Meeting Notes');
        assert.equal(mic, false);
        assert.equal(camera, false);
        stage = 'waiting';
      } else if (name === 'Join Audio') stage = 'dialog';
      else if (name === 'Join with Computer Audio') {
        assert.equal(checked, true);
        stage = 'connected';
      }
    }
  };
}
test('normal guest UI sets name, disables media, waits for admission and connects muted audio', async () => {
  const ui = fixture();
  const r = await guardedZoomJoin(ui, { attempts: 5, sleep: async () => {} });
  assert.equal(r.admitted, true);
  assert.equal(r.audio_connected, true);
  assert.deepEqual(ui.clicks, [
    'Mute',
    'Stop Video',
    'Join',
    'Join Audio',
    'Join with Computer Audio'
  ]);
});
test('challenge pauses without joining; missing join-muted control never connects audio', async () => {
  const challenge = fixture({ challenge: true });
  assert.equal((await guardedZoomJoin(challenge)).human_required, true);
  assert.deepEqual(challenge.clicks, []);
  const ui = fixture({ missingMuted: true });
  assert.equal(
    (await guardedZoomJoin(ui, { attempts: 5, sleep: async () => {} })).audio_connected,
    false
  );
  assert.ok(!ui.clicks.includes('Join with Computer Audio'));
});
test('passcoded URL preserved ephemerally and exact meeting, origin and query validated', () => {
  const canonical = 'https://us06web.zoom.us/j/12345678901';
  assert.equal(
    zoomBrowserUrl(canonical, canonical + '?pwd=secret'),
    'https://us06web.zoom.us/wc/join/12345678901?pwd=secret'
  );
  for (const url of [
    canonical.replace('12345678901', '12345678902'),
    canonical.replace('zoom.us', 'zoom.us.evil'),
    canonical + '?token=secret'
  ])
    assert.throws(() => zoomBrowserUrl(canonical, url));
});
test('scheduled and opened participant results/ledger never retain invitation passcode', async () => {
  const { runParticipant } = await import('./canon-participant.mjs');
  const now = Date.now();
  const saved = [];
  const selection = {
    event_id: 'zoom-selected',
    calendar_id: 'private-calendar',
    selection_scope: 'halfdozen-guest-occurrence',
    platform: 'zoom',
    identity_email: 'canon@createsomething.io',
    organizer_email: 'host@halfdozen.co',
    canon_rsvp: 'accepted',
    invitation_verified: true,
    invited_emails: ['canon@createsomething.io'],
    status: 'confirmed',
    verified_at: new Date(now).toISOString(),
    starts_at: new Date(now).toISOString(),
    meeting_url: 'https://zoom.us/j/12345678901'
  };
  const result = await runParticipant({
    selection,
    config: {
      profile_dir: '/private/tmp/canon-meet-pilot',
      identity_email: selection.identity_email,
      zoom_invitation_url: selection.meeting_url + '?pwd=private-secret'
    },
    now,
    execute: true,
    save: async (s) => saved.push(s),
    launch: async () => ({ join_submitted: true, admitted: true, audio_connected: true })
  });
  assert.ok(!JSON.stringify({ result, saved }).includes('private-secret'));
  assert.equal(result.admitted, true);
});
