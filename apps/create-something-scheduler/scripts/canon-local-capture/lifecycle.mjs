// Same-extension-origin channel, unique to one control occurrence. Never carries meeting or audio data.
export const TILE_STALE_MS = 3500;
export const TILE_STATES = new Set([
  'idle',
  'preparing',
  'recording',
  'saving',
  'stopped',
  'failed',
  'disconnected'
]);
export function validOccurrence(value) {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
}
export function createPublisher(channel, session, now = () => performance.now()) {
  let state = 'idle',
    sequence = 0, receipt = null;
  const sent = new Map();
  const publish = () => {
    sent.set(++sequence, { state, time: now() });
    for (const [key, value] of sent) if (now() - value.time > TILE_STALE_MS) sent.delete(key);
    channel.postMessage({ version: 1, session, state, sequence });
  };
  return {
    publish,
    receive(data) {
      const message = sent.get(data?.sequence);
      if (data?.version !== 1 || data?.type !== 'rendered' || data.session !== session ||
          !message || message.state !== data.state || data.state !== state ||
          now() - message.time > TILE_STALE_MS || (receipt && data.sequence <= receipt.sequence)) return false;
      receipt = { state: data.state, sequence: data.sequence, time: message.time };
      return true;
    },
    acknowledged(expected) {
      return receipt?.state === expected && state === expected && now() - receipt.time <= TILE_STALE_MS;
    },
    setState(next) {
      if (!TILE_STATES.has(next)) throw new Error('Unknown tile state');
      if (state !== next) receipt = null;
      state = next;
      publish();
    }
  };
}
export function createReceiver(session, render, now = () => performance.now()) {
  let sequence = 0,
    lastSeen = null,
    disconnected = false;
  render('disconnected');
  return {
    receive(data) {
      if (lastSeen !== null && now() - lastSeen > TILE_STALE_MS) {
        disconnected = true;
        lastSeen = null;
        render('disconnected');
      }
      if (
        !data ||
        data.version !== 1 ||
        data.session !== session ||
        !TILE_STATES.has(data.state) ||
        !Number.isSafeInteger(data.sequence) ||
        data.sequence <= sequence ||
        disconnected
      )
        return false;
      sequence = data.sequence;
      lastSeen = now();
      disconnected = data.state === 'disconnected';
      render(data.state);
      return true;
    },
    check() {
      if (lastSeen !== null && now() - lastSeen > TILE_STALE_MS) {
        // An expired occurrence cannot regain a recording indication after a suspended control resumes.
        disconnected = true;
        render('disconnected');
        lastSeen = null;
      }
    }
  };
}
