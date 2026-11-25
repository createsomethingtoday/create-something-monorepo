import { validOccurrence, createReceiver } from '../lifecycle.mjs';
import { setTileState } from './tile-art.js';
const session = location.hash.slice(1);
const render = (state) => setTileState(state);
if (!validOccurrence(session)) {
  render('disconnected');
} else {
  document.title = 'Canon meeting notes · ' + session.slice(0, 8);
  let receiver = createReceiver(session, render);
  let attempt = session;
  const channel = new BroadcastChannel(`canon-tile-${session}`);
  // Native extension ports deliver to background windows without depending on
  // BroadcastChannel or requestAnimationFrame scheduling in an occluded popup.
  const port = chrome.runtime.connect({ name: `canon-tile-${session}` });
  const receive = (data) => {
    if (data?.type === 'attempt' && data.occurrence === session && validOccurrence(data.session)) {
      if (attempt !== data.session) {
        attempt = data.session;
        receiver = createReceiver(attempt, render);
      }
      return;
    }
    if (!receiver.receive(data)) return;
    const expected = { idle: 'waiting', preparing: 'waiting', recording: 'taking' }[data.state] ?? data.state;
    if (document.body.dataset.state === expected && document.querySelector('#status').textContent ===
        ({ waiting: 'Waiting to take notes', taking: 'Taking notes', saving: 'Saving audio', stopped: 'Notes stopped', failed: 'Capture interrupted', disconnected: 'Controls disconnected' })[expected]) {
      const receipt = { version: 1, type: 'rendered', session: attempt, state: data.state, sequence: data.sequence };
      try { port.postMessage(receipt); } catch {}
      channel.postMessage(receipt);
    }
  };
  port.onMessage.addListener(receive);
  port.onDisconnect.addListener(() => render('disconnected'));
  channel.onmessage = ({ data }) => { if (data?.type !== 'attempt') receive(data); };
  const watch = setInterval(() => receiver.check(), 250);
  window.addEventListener('pagehide', () => {
    clearInterval(watch);
    port.disconnect();
    channel.close();
  });
}
