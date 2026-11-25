// Opt-in internal video output only. Join and audio-capture authorization remain separate.
const ensure = (value, message) => {
  if (!value) throw Error(message);
};
export function cameraPilotPolicy(selection, config) {
  const pilot = config.camera_pilot;
  if (!pilot || pilot.enabled === false) return null;
  ensure(pilot.enabled === true, 'Camera pilot enabled must be explicitly true');
  ensure(
    !String(selection.selection_scope ?? '').startsWith('halfdozen'),
    'Half Dozen selections cannot enable the internal camera pilot'
  );
  if (selection.platform === 'zoom')
    ensure(
      selection.selection_scope === 'internal-zoom-occurrence' &&
        selection.calendar_verified === true &&
        selection.organizer_email === 'micah@createsomething.io' &&
        selection.calendar_id,
      'Zoom camera pilot requires canonical internal Calendar verification'
    );
  ensure(selection.internal_test === true, 'Camera pilot requires an explicitly internal test');
  ensure(
    selection.event_id && pilot.operator_confirmed_event_id === selection.event_id,
    'Camera pilot requires operator confirmation bound to this event'
  );
  ensure(
    ['OBS Virtual Camera', 'Canon Virtual Camera'].includes(pilot.device_label),
    'Only an explicitly named approved virtual camera is allowed'
  );
  return { device_label: pilot.device_label, event_id: selection.event_id };
}
// Runs before page scripts in every new frame. Does not open any device to discover labels.
export function installVirtualCameraGate(label) {
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia || !media.enumerateDevices) return;
  const original = media.getUserMedia.bind(media);
  const tracks = new Set();
  let armed = false;
  const deny = () =>
    new DOMException('Approved virtual camera unavailable or not armed', 'NotAllowedError');
  const devices = async () =>
    (await media.enumerateDevices()).filter(
      (d) => d.kind === 'videoinput' && d.label === label && d.deviceId && d.deviceId !== 'default'
    );
  const stop = () => {
    armed = false;
    for (const track of tracks) track.stop();
    tracks.clear();
  };
  const evidence = async () => {
    const permission = await navigator.permissions.query({ name: 'camera' }).catch(() => null);
    const found = await devices();
    return {
      gate_ready: permission?.state === 'granted' && found.length === 1,
      selected_label: found.length === 1 ? label : null,
      permission: permission?.state ?? 'unknown',
      active_labels: [...tracks].filter((t) => t.readyState === 'live').map((t) => t.label)
    };
  };
  Object.defineProperty(media, 'getUserMedia', {
    configurable: false,
    writable: false,
    value: async (constraints) => {
      if (!constraints?.video) return original(constraints);
      const found = await devices();
      if (!armed || found.length !== 1) throw deny();
      const video = typeof constraints.video === 'object' ? constraints.video : {};
      const stream = await original({
        ...constraints,
        video: { ...video, deviceId: { exact: found[0].deviceId } }
      });
      const incoming = stream.getVideoTracks();
      if (
        !armed ||
        incoming.length !== 1 ||
        incoming[0].label !== label ||
        incoming[0].getSettings().deviceId !== found[0].deviceId
      ) {
        stream.getTracks().forEach((t) => t.stop());
        throw deny();
      }
      for (const track of incoming) {
        tracks.add(track);
        track.addEventListener('ended', stop, { once: true });
      }
      return stream;
    }
  });
  media.addEventListener('devicechange', async () => {
    if ((await devices()).length !== 1) stop();
  });
  navigator.permissions
    .query({ name: 'camera' })
    .then((p) =>
      p.addEventListener('change', () => {
        if (p.state !== 'granted') stop();
      })
    )
    .catch(() => {});
  Object.defineProperty(globalThis, '__canonVirtualCamera', {
    value: Object.freeze({
      evidence,
      stop,
      arm: async () => {
        if (!(await evidence()).gate_ready) throw deny();
        armed = true;
      }
    }),
    configurable: false,
    writable: false
  });
}
export async function guardedCameraEnable(ui, platform, policy, joinResult) {
  const pause = (reason) => ({ camera_enabled: false, human_required: true, reason });
  if (!policy || joinResult?.admitted !== true)
    return pause('Camera requires verified admission and explicit internal pilot');
  const buttons = (nodes, re) =>
    nodes.filter((n) => n.role === 'button' && !n.disabled && re.test(n.name));
  const muted = platform === 'zoom' ? /^Unmute(?: .*|\s*)$/i : /^Turn on microphone(?: \(.*\))?$/;
  const off = platform === 'zoom' ? /^Start Video(?: .*|\s*)$/i : /^Turn on camera(?: \(.*\))?$/;
  const on = platform === 'zoom' ? /^Stop Video(?: .*|\s*)$/i : /^Turn off camera(?: \(.*\))?$/;
  if (!ui.confirmCamera || (await ui.confirmCamera(policy)) !== true)
    return pause(
      'Post-admission operator tile/source confirmation cancelled, unavailable or timed out; camera remains off'
    );
  const nodes = await ui.snapshot();
  const evidence = await ui.cameraEvidence(policy.device_label);
  if (!evidence.gate_ready || evidence.selected_label !== policy.device_label)
    return pause(
      'Grant browser camera permission and expose exactly one approved virtual device; no camera enabled'
    );
  if (
    buttons(nodes, muted).length !== 1 ||
    buttons(nodes, off).length !== 1 ||
    buttons(nodes, on).length
  )
    return pause(
      'Muted microphone and camera-off controls must be uniquely verified after admission'
    );
  try {
    await ui.armCamera();
    await ui.click(buttons(nodes, off)[0].name);
    let active;
    for (let attempt = 0; attempt < 20; attempt++) {
      active = await ui.cameraEvidence(policy.device_label);
      if (active.active_labels?.length) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const after = await ui.snapshot();
    if (
      buttons(after, on).length !== 1 ||
      buttons(after, muted).length !== 1 ||
      active.active_labels?.length !== 1 ||
      active.active_labels[0] !== policy.device_label
    )
      throw Error('Camera-on readback did not prove the approved virtual track');
    return {
      camera_enabled: true,
      camera_device: policy.device_label,
      microphone_off: true,
      human_required: false
    };
  } catch {
    await ui.stopCamera();
    return pause(
      'Virtual camera activation unverified; gate disarmed and managed video tracks stopped; operator must verify visible camera off'
    );
  }
}
