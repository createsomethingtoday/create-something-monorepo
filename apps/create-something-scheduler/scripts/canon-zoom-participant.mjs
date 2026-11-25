// Ordinary visible Zoom web UI only. No capture, consent, native client or bypass.
const ensure = (ok, message) => {
  if (!ok) throw Error(message);
};
export function zoomBrowserUrl(canonical, invitation = canonical) {
  const expected = new URL(canonical);
  const url = new URL(invitation);
  const valid = (u) =>
    u.protocol === 'https:' &&
    /^(?:[a-z0-9-]+\.)?zoom\.us$/.test(u.hostname) &&
    !u.username &&
    !u.password &&
    !u.port &&
    /^\/j\/[0-9]{9,11}$/.test(u.pathname);
  ensure(
    valid(expected) &&
      !expected.search &&
      !expected.hash &&
      valid(url) &&
      url.origin === expected.origin &&
      url.pathname === expected.pathname,
    'Exact selected Zoom invitation required'
  );
  ensure(
    [...url.searchParams.keys()].every((k) => k === 'pwd') && !url.hash,
    'Unsupported Zoom invitation parameters'
  );
  url.pathname = url.pathname.replace('/j/', '/wc/join/');
  return url.href;
}
export async function guardedZoomJoin(
  ui,
  { attempts = 120, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}
) {
  let submitted = false,
    admitted = false;
  const pause = (reason) => ({
    join_submitted: submitted,
    admitted,
    audio_connected: false,
    human_required: true,
    reason
  });
  const buttons = (nodes, re) =>
    nodes.filter((n) => n.role === 'button' && !n.disabled && re.test(n.name));
  for (let i = 0; i < attempts; i++) {
    let nodes = await ui.snapshot();
    if (
      nodes.some((n) =>
        /captcha|verify (?:you|your)|sign in|passcode|recording (?:consent|disclaimer)|agree to.*record/i.test(
          n.name
        )
      )
    )
      return pause('Human challenge or consent requires operator handling');
    const leave = buttons(nodes, /^(?:Leave|Leave meeting)$/);
    if (leave.length === 1) {
      admitted = true;
      // Require a positively off video control before attaching computer audio.
      if (
        buttons(nodes, /^Start Video(?: .*|\s*)$/i).length !== 1 ||
        buttons(nodes, /^Stop Video/i).length
      )
        return pause('Admitted camera-off state not verified');
      const audio = buttons(nodes, /^Join Audio$/);
      if (audio.length === 1) {
        await ui.click(audio[0].name);
        nodes = await ui.snapshot();
      }
      const computer = buttons(nodes, /^(?:Join audio by computer|Join with Computer Audio)$/);
      // Zoom exposes a join-muted checkbox in the computer-audio dialog. Never connect without it.
      if (computer.length === 1) {
        const muted = nodes.filter(
          (n) =>
            n.role === 'checkbox' &&
            /(?:mute|microphone off).*join|join.*(?:mute|microphone off)/i.test(n.name)
        );
        if (muted.length !== 1) return pause('Join-muted audio control not verified');
        if (!muted[0].checked) await ui.setChecked(muted[0].name, true);
        nodes = await ui.snapshot();
        if (
          !nodes.some(
            (n) => n.role === 'checkbox' && n.name === muted[0].name && n.checked === true
          )
        )
          return pause('Join-muted readback failed');
        await ui.click(computer[0].name);
        nodes = await ui.snapshot();
      }
      if (
        buttons(nodes, /^Unmute(?: .*|\s*)$/i).length === 1 &&
        buttons(nodes, /^Start Video(?: .*|\s*)$/i).length === 1 &&
        !buttons(nodes, /^(?:Mute|Stop Video)(?: .*|\s*)$/i).length &&
        !buttons(nodes, /^(?:Join Audio|Join audio by computer|Join with Computer Audio)$/).length
      )
        return {
          join_submitted: submitted,
          admitted: true,
          audio_connected: true,
          microphone_off: true,
          camera_off: true,
          human_required: false
        };
      return pause('Computer audio connected and muted state not positively verified');
    }
    if (!submitted) {
      const name = nodes.filter(
        (n) =>
          n.role === 'textbox' && /^(?:Your Name|Your name|Name|Enter your name)$/i.test(n.name)
      );
      if (name.length === 1) {
        await ui.fill(name[0].name, 'Canon Meeting Notes');
        nodes = await ui.snapshot();
        for (const [on, off] of [
          [/^Mute(?: .*|\s*)$/i, /^Unmute(?: .*|\s*)$/i],
          [/^Stop Video(?: .*|\s*)$/i, /^Start Video(?: .*|\s*)$/i]
        ]) {
          if (buttons(nodes, on).length === 1) {
            await ui.click(buttons(nodes, on)[0].name);
            nodes = await ui.snapshot();
          }
          if (buttons(nodes, off).length !== 1 || buttons(nodes, on).length)
            return pause('Prejoin microphone/camera off state ambiguous');
        }
        nodes = await ui.snapshot();
        if (
          !nodes.some(
            (n) =>
              n.role === 'textbox' && n.name === name[0].name && n.value === 'Canon Meeting Notes'
          ) ||
          buttons(nodes, /^Unmute(?: .*|\s*)$/i).length !== 1 ||
          buttons(nodes, /^Start Video(?: .*|\s*)$/i).length !== 1
        )
          return pause('Final name/media readback failed');
        const join = buttons(nodes, /^(?:Join|Join Meeting)$/);
        if (join.length !== 1) return pause('Zoom Join control ambiguous');
        await ui.click(join[0].name);
        submitted = true;
      }
    }
    if (i + 1 < attempts) await sleep(1000);
  }
  return pause(
    submitted
      ? 'Host admission wait expired; visible browser remains open'
      : 'Zoom prejoin did not render'
  );
}
