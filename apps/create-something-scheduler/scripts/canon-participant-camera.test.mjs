import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraPilotPolicy, guardedCameraEnable } from './canon-participant-camera.mjs';
const selection = { internal_test: true, event_id: 'internal-1' };
const config = {
  camera_pilot: {
    enabled: true,
    device_label: 'OBS Virtual Camera',
    operator_confirmed_event_id: 'internal-1'
  }
};
test('camera pilot defaults off and requires internal event-bound operator confirmation', () => {
  assert.equal(cameraPilotPolicy(selection, {}), null);
  assert.throws(
    () => cameraPilotPolicy({ ...selection, internal_test: false }, config),
    /internal/
  );
  assert.throws(
    () =>
      cameraPilotPolicy(selection, {
        camera_pilot: { ...config.camera_pilot, operator_confirmed_event_id: 'other' }
      }),
    /confirmation/
  );
  assert.throws(
    () =>
      cameraPilotPolicy(selection, {
        camera_pilot: { ...config.camera_pilot, device_label: 'FaceTime HD Camera' }
      }),
    /virtual/
  );
});
test('does not enable camera without admission, mute, gate and selected-device readback', async () => {
  let clicks = [];
  const ui = {
    confirmCamera: async () => true,
    snapshot: async () => [
      { role: 'button', name: 'Turn on camera' },
      { role: 'button', name: 'Turn on microphone' }
    ],
    click: async (n) => clicks.push(n),
    cameraEvidence: async () => ({ selected_label: 'FaceTime HD Camera', gate_ready: true })
  };
  const policy = cameraPilotPolicy(selection, config);
  assert.equal(
    (await guardedCameraEnable(ui, 'meet', policy, { admitted: false })).camera_enabled,
    false
  );
  assert.equal(
    (await guardedCameraEnable(ui, 'meet', policy, { admitted: true })).camera_enabled,
    false
  );
  assert.deepEqual(clicks, []);
});
test('activates only after admission, verifies virtual track, and stops on ambiguous readback', async () => {
  let on = false,
    stopped = false;
  const policy = cameraPilotPolicy(selection, config);
  const ui = {
    confirmCamera: async () => true,
    snapshot: async () => [
      { role: 'button', name: on ? 'Stop Video' : 'Start Video' },
      { role: 'button', name: 'Unmute' }
    ],
    cameraEvidence: async () => ({
      gate_ready: true,
      selected_label: 'OBS Virtual Camera',
      active_labels: on ? ['OBS Virtual Camera'] : []
    }),
    armCamera: async () => {},
    stopCamera: async () => {
      stopped = true;
    },
    click: async () => {
      on = true;
    }
  };
  assert.equal(
    (await guardedCameraEnable(ui, 'zoom', policy, { admitted: true })).camera_enabled,
    true
  );
  assert.equal(stopped, false);
  on = false;
  ui.cameraEvidence = async () => ({
    gate_ready: true,
    selected_label: 'OBS Virtual Camera',
    active_labels: on ? ['FaceTime HD Camera'] : []
  });
  assert.equal(
    (await guardedCameraEnable(ui, 'zoom', policy, { admitted: true })).camera_enabled,
    false
  );
  assert.equal(stopped, true);
});
import vm from 'node:vm';
import { installVirtualCameraGate } from './canon-participant-camera.mjs';
test('browser gate denies prejoin, forces exact virtual id, never opens discovery stream and disarms on loss', async () => {
  let available = [
    { kind: 'videoinput', label: 'OBS Virtual Camera', deviceId: 'virtual-1' },
    { kind: 'videoinput', label: 'FaceTime HD Camera', deviceId: 'physical-1' }
  ];
  const requests = [],
    listeners = {},
    permissionListeners = {};
  const track = {
    label: 'OBS Virtual Camera',
    readyState: 'live',
    getSettings: () => ({ deviceId: 'virtual-1' }),
    stop() {
      this.readyState = 'ended';
    },
    addEventListener() {}
  };
  const permission = {
    state: 'granted',
    addEventListener: (name, fn) => {
      permissionListeners[name] = fn;
    }
  };
  const media = {
    enumerateDevices: async () => available,
    getUserMedia: async (c) => {
      requests.push(c);
      return { getVideoTracks: () => [track], getTracks: () => [track] };
    },
    addEventListener: (name, fn) => {
      listeners[name] = fn;
    }
  };
  const context = vm.createContext({
    navigator: { mediaDevices: media, permissions: { query: async () => permission } },
    DOMException
  });
  vm.runInContext(`(${installVirtualCameraGate.toString()})('OBS Virtual Camera')`, context);
  await assert.rejects(() => media.getUserMedia({ video: true }), /not armed/);
  assert.equal(requests.length, 0);
  await context.__canonVirtualCamera.arm();
  assert.equal(requests.length, 0);
  await media.getUserMedia({ video: { deviceId: { exact: 'physical-1' } }, audio: false });
  assert.equal(requests[0].video.deviceId.exact, 'virtual-1');
  available = available.filter((d) => d.deviceId !== 'virtual-1');
  await listeners.devicechange();
  assert.equal(track.readyState, 'ended');
  await assert.rejects(() => media.getUserMedia({ video: true }));
  assert.equal(requests.length, 1);
});
test('post-admission operator refusal or absent gesture never arms camera', async () => {
  let armed = false;
  for (const confirmCamera of [undefined, async () => false]) {
    const result = await guardedCameraEnable(
      {
        confirmCamera,
        armCamera: async () => {
          armed = true;
        }
      },
      'meet',
      cameraPilotPolicy(selection, config),
      { admitted: true }
    );
    assert.equal(result.camera_enabled, false);
    assert.equal(armed, false);
  }
});
