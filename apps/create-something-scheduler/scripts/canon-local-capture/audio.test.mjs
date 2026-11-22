import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validMeetingURL, encodeWav, MAX_SECONDS } from './audio.mjs';
test('exact room selection rejects ambiguous and credential-bearing URLs', () => {
  assert.equal(
    validMeetingURL('https://meet.google.com/abc-defg-hij'),
    'https://meet.google.com/abc-defg-hij'
  );
  for (const s of [
    'http://example.test/meet/one',
    'https://u:p@example.test/meet/one',
    'https://example.test/meet/one?token=secret',
    'https://example.test/meet/one#guest',
    'https://example.test/meet/',
    'https://example.test/other/one',
    'https://evil.test/abc-defg-hij',
    'https://meet.google.com/abc-defg-hij?x=y'
  ])
    assert.equal(validMeetingURL(s), null);
});
test('PCM WAV has exact rate, mono samples, clipping, bounded duration', () => {
  const view = new DataView(encodeWav([new Float32Array([-2, -1, 0, 1, 2, NaN])], 16000));
  assert.equal(view.byteLength, 56);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getInt16(44, true), -32768);
  assert.equal(view.getInt16(50, true), 32767);
  assert.equal(view.getInt16(54, true), 0);
  assert.throws(() => encodeWav([new Float32Array(8000 * MAX_SECONDS + 1)], 8000), /excessive/);
});
test('extension has no host or upload permissions and no background capture', async () => {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.permissions, ['activeTab', 'tabCapture', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  const worker = await readFile(new URL('./launch.js', import.meta.url), 'utf8');
  assert.ok(!worker.includes('getUserMedia'));
  assert.ok(!worker.includes('tabCapture'));
  const code = await readFile(new URL('./control.js', import.meta.url), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(code));
  assert.match(code, /tab.url\s*!==\s*testURL/);
  assert.match(code, /MAX_SECONDS\s*\*\s*1000/);
  assert.match(code, /pagehide/);
});
test('controller state rejects consent/source mismatch before opening audio; explicit Stop writes WAV and stops tracks', async () => {
  const code = (await readFile(new URL('./control.js', import.meta.url), 'utf8')).replace(
    /^import .*;\n/,
    ''
  );
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id))
      elements.set(id, { value: '', checked: false, disabled: false, textContent: '' });
    return elements.get(id);
  };
  const selectedURL = 'https://meet.google.com/abc-defg-hij';
  let url = selectedURL,
    captures = 0,
    ended = 0,
    written;
  const track = {
    stop() {
      ended++;
    }
  };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  let onUpdate;
  const chrome = {
    storage: { local: { get: async () => ({ testURL: selectedURL }), set: async () => {} } },
    tabs: {
      get: async () => ({ id: 7, url }),
      getCurrent: async () => ({ id: 8 }),
      onUpdated: {
        addListener(fn) {
          onUpdate = fn;
        }
      },
      onRemoved: { addListener() {} }
    },
    runtime: { getURL: (x) => x },
    tabCapture: {
      getMediaStreamId: async () => {
        captures++;
        return 'id';
      }
    }
  };
  class Context {
    constructor() {
      this.sampleRate = 16000;
      this.state = 'running';
      this.audioWorklet = { addModule: async () => {} };
      this.destination = {};
    }
    async resume() {}
    async close() {
      this.state = 'closed';
    }
    createMediaStreamSource() {
      return { connect() {} };
    }
    createGain() {
      return { gain: { value: 0 }, connect() {} };
    }
  }
  let node;
  class Worklet {
    constructor() {
      node = this;
      this.port = {};
    }
    connect() {}
    disconnect() {}
  }
  const window = {
    showSaveFilePicker: async () => ({
      createWritable: async () => ({
        write: async (data) => {
          written = data;
        },
        close: async () => {},
        abort: async () => {}
      })
    }),
    addEventListener() {}
  };
  const init = new Function(
    'document',
    'chrome',
    'window',
    'location',
    'navigator',
    'AudioContext',
    'AudioWorkletNode',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'MAX_SECONDS',
    'validMeetingURL',
    'encodeWav',
    code
  );
  init(
    { getElementById: get },
    chrome,
    window,
    { hash: '#7' },
    { mediaDevices: { getUserMedia: async () => stream } },
    Context,
    Worklet,
    () => 1,
    () => {},
    () => 1,
    MAX_SECONDS,
    validMeetingURL,
    encodeWav
  );
  await get('start').onclick();
  assert.equal(captures, 0);
  assert.match(get('status').textContent, /Confirm consent/);
  get('consent').checked = true;
  url = 'https://meet.google.com/zzz-zzzz-zzz';
  await get('start').onclick();
  assert.equal(captures, 0);
  assert.match(get('status').textContent, /exactly match/);
  url = selectedURL;
  await get('start').onclick();
  assert.equal(captures, 1);
  assert.equal(get('stop').disabled, false);
  node.port.onmessage({ data: new Float32Array([0, 0.5, -0.5]) });
  get('stop').onclick();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ended, 1);
  assert.equal(written.byteLength, 50);
  assert.equal(get('stop').disabled, true);
  assert.match(get('status').textContent, /Saved private local WAV/);
  let finishPicker;
  let pickers = 0;
  window.showSaveFilePicker = () => {
    pickers++;
    return new Promise((resolve) => {
      finishPicker = resolve;
    });
  };
  const pending = get('start').onclick();
  await new Promise((resolve) => setImmediate(resolve));
  await get('start').onclick();
  assert.equal(pickers, 1, 'second start is ignored while picker awaits');
  onUpdate(7, { status: 'loading' });
  finishPicker({
    createWritable: async () => {
      throw new Error('must not save');
    }
  });
  await pending;
  assert.equal(captures, 1, 'navigation during picker prevents a new stream');
  assert.equal(get('stop').disabled, true);
  assert.match(get('status').textContent, /cancelled/);
});
