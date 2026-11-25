import { createPublisher } from './lifecycle.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validMeetingURL,
  matchesCaptureSource,
  encodeWav,
  StreamingWav,
  MAX_SECONDS
} from './audio.mjs';
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
  assert.match(code, /matchesCaptureSource\(tab.url, boundURL\)/);
  assert.match(code, /MAX_SECONDS\s*\*\s*1000/);
  assert.match(code, /pagehide/);
});
test('controller state rejects consent/source mismatch before opening audio; explicit Stop writes WAV and stops tracks', async () => {
  const code = (await readFile(new URL('./control.js', import.meta.url), 'utf8')).replace(
    /^import .*;\n/gm,
    ''
  );
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id))
      elements.set(id, { value: '', checked: false, disabled: false, textContent: '' });
    return elements.get(id);
  };
  const selectedURL = 'https://us02web.zoom.us/j/12345678901';
  const sourceURL = 'https://us02web.zoom.us/wc/join/12345678901?pwd=synthetic';
  let stored;
  let url = sourceURL,
    captures = 0,
    ended = 0,
    written,
    aborted = 0;
  const track = {
    stop() {
      ended++;
    }
  };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  let onUpdate,
    onRemoved,
    poll,
    missingTab = false;
  const chrome = {
    windows: { create: () => new Promise(() => {}) },
    storage: {
      local: {
        get: async () => ({ testURL: selectedURL }),
        set: async (value) => {
          stored = value;
        }
      }
    },
    tabs: {
      get: async () => {
        if (missingTab) throw new Error('No tab');
        return { id: 7, url };
      },
      query: async () => (missingTab ? [] : [{ id: 7, url }]),
      getCurrent: async () => ({ id: 8 }),
      onUpdated: {
        addListener(fn) {
          onUpdate = fn;
        }
      },
      onRemoved: {
        addListener(fn) {
          onRemoved = fn;
        }
      }
    },
    runtime: { getURL: (x) => x, onConnect: { addListener() {} } },
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
  let node,
    flushTimeout,
    acknowledgeFlush = true;
  class Worklet {
    constructor() {
      node = this;
      this.port = {
        postMessage: (value) => {
          if (value === 'flush' && acknowledgeFlush)
            queueMicrotask(() =>
              this.port.onmessage({ data: { type: 'flushed', samples: new Float32Array([0.125]) } })
            );
        }
      };
    }
    connect() {}
    disconnect() {}
  }
  const window = {
    showSaveFilePicker: async () => ({
      createWritable: async () => ({
        write: async (data) => {
          if (data.type === 'write')
            new Uint8Array(written).set(new Uint8Array(data.data), data.position);
          else {
            const previous = written ? new Uint8Array(written) : new Uint8Array();
            const next = new Uint8Array(previous.length + data.byteLength);
            next.set(previous);
            next.set(new Uint8Array(data), previous.length);
            written = next.buffer;
          }
        },
        close: async () => {},
        abort: async () => {
          aborted++;
        }
      })
    }),
    addEventListener() {}
  };
  const tileMessages = [];
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
    'matchesCaptureSource',
    'StreamingWav',
    'createPublisher',
    'BroadcastChannel',
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
    (fn, delay) => {
      if (delay === 1000) flushTimeout = fn;
      return 1;
    },
    () => {},
    (fn) => {
      poll = fn;
      return 1;
    },
    MAX_SECONDS,
    validMeetingURL,
    matchesCaptureSource,
    StreamingWav,
    createPublisher,
    class { postMessage(message) { tileMessages.push(message); } close() {} }
  );
  get('meeting').value = sourceURL;
  await get('configure').onclick();
  assert.deepEqual(stored, { testURL: selectedURL });
  assert.equal(get('meeting').value, selectedURL);
  assert.ok(!get('status').textContent.includes('synthetic'));
  await get('start').onclick();
  assert.equal(captures, 0);
  assert.match(get('status').textContent, /Confirm consent/);
  get('consent').checked = true;
  url = 'https://meet.google.com/zzz-zzzz-zzz';
  await get('start').onclick();
  assert.equal(captures, 0);
  assert.match(get('status').textContent, /must match/);
  url = sourceURL;
  await get('start').onclick();
  assert.equal(captures, 1);
  assert.equal(get('stop').disabled, false);
  assert.equal(tileMessages.at(-1).state, 'recording');
  onUpdate(7, { url: 'https://us02web.zoom.us/wc/12345678901/join?pwd=changed-synthetic' });
  assert.equal(
    get('stop').disabled,
    false,
    'same-origin same-meeting ephemeral update keeps capture'
  );
  node.port.onmessage({ data: new Float32Array([0, 0.5, -0.5]) });
  get('open-tile').onclick();
  await poll();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(aborted, 0, 'opening a tile cannot discard an audio-only capture');
  assert.equal(get('open-tile').disabled, true);
  get('stop').onclick();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ended, 1);
  assert.equal(get('open-tile').disabled, false);
  assert.equal(written.byteLength, 52, 'explicit Stop includes the last partial worklet block');
  assert.equal(get('stop').disabled, true);
  assert.match(get('status').textContent, /Saved private local WAV/);
  get('consent').checked = true;
  await get('start').onclick();
  node.port.onmessage({ data: new Float32Array([0.25]) });
  onUpdate(7, { url: 'https://meet.google.com/zzz-zzzz-zzz' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(aborted, 1, 'source navigation aborts the uncommitted file');
  assert.match(get('status').textContent, /discarded/);
  for (const ending of [() => track.onended(), () => onRemoved(7)]) {
    get('consent').checked = true;
    written = undefined;
    await get('start').onclick();
    node.port.onmessage({ data: new Float32Array([0.25, -0.25]) });
    ending();
    // New frames after source end must not enter the saved recording.
    node.port.onmessage({ data: new Float32Array([1, 1, 1]) });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(written.byteLength, 48);
    assert.equal(new DataView(written).getUint32(40, true), 4);
    assert.match(get('status').textContent, /Saved private local WAV/);
  }
  get('consent').checked = true;
  await get('start').onclick();
  node.port.onmessage({ data: new Float32Array([0.25]) });
  onRemoved(7);
  onUpdate(7, { status: 'loading' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(
    get('status').textContent,
    /discarded/,
    'uncertain navigation overrides a simultaneous close save'
  );
  get('consent').checked = true;
  written = undefined;
  acknowledgeFlush = false;
  await get('start').onclick();
  node.port.onmessage({ data: new Float32Array([0.5]) });
  get('stop').onclick();
  assert.equal(typeof flushTimeout, 'function');
  flushTimeout();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(written.byteLength, 46, 'flush timeout still saves accepted audio');
  assert.match(get('status').textContent, /Final audio tail unavailable/);
  acknowledgeFlush = true;
  get('consent').checked = true;
  written = undefined;
  await get('start').onclick();
  node.port.onmessage({ data: new Float32Array([0.5]) });
  missingTab = true;
  await poll();
  onRemoved(7);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(written.byteLength, 46, 'confirmed missing tab saves even before onRemoved arrives');
  assert.match(get('status').textContent, /Saved private local WAV/);
  missingTab = false;
  let finishPicker;
  let pickers = 0;
  window.showSaveFilePicker = () => {
    pickers++;
    return new Promise((resolve) => {
      finishPicker = resolve;
    });
  };
  get('consent').checked = true;
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
  assert.equal(captures, 7, 'navigation during picker prevents a new stream');
  assert.equal(get('stop').disabled, true);
  assert.match(get('status').textContent, /cancelled/);
});

test('streamed 59 and 60 minute boundaries finalize exact Swift-readable PCM lengths with bounded queue', async () => {
  assert.equal(MAX_SECONDS, 3600);
  for (const seconds of [3540, 3600]) {
    let bytes = 0,
      header,
      closed = false;
    const sink = new StreamingWav(
      {
        async write(value) {
          if (value.type === 'write') header = new DataView(value.data);
          else bytes += value.byteLength;
        },
        async close() {
          closed = true;
        },
        async abort() {}
      },
      8000
    );
    await sink.begin();
    const second = new Float32Array(8000).fill(0.25);
    for (let i = 0; i < seconds; i++) {
      assert.equal(sink.append(second), i === 3599);
      await sink.queue;
      assert.equal(sink.pending, 0);
    }
    if (seconds === 3600) assert.equal(sink.append(second), true);
    await sink.finish();
    assert.ok(closed);
    assert.equal(bytes, 44 + seconds * 8000 * 2);
    assert.equal(header.getUint32(40, true), seconds * 8000 * 2);
    assert.equal(header.getUint16(20, true), 1);
    assert.equal(header.getUint16(22, true), 1);
    assert.equal(header.getUint16(34, true), 16);
  }
});
test('slow local storage fails closed rather than retaining an hour in memory', async () => {
  const sink = new StreamingWav({ async write() {}, async abort() {} }, 8000);
  sink.append(new Float32Array(8000));
  assert.throws(() => sink.append(new Float32Array(1)), /cannot keep up/);
  await sink.abort();
});

test('Zoom binds exact official origin and meeting number, strips documented embedded passcode, and requires web client source', () => {
  const reference = 'https://us02web.zoom.us/j/12345678901';
  for (const route of ['/j/12345678901', '/wc/12345678901/join', '/wc/join/12345678901']) {
    assert.equal(validMeetingURL(`https://us02web.zoom.us${route}`), reference);
    assert.equal(validMeetingURL(`https://us02web.zoom.us${route}?pwd=synthetic`), reference);
  }
  assert.ok(
    matchesCaptureSource('https://us02web.zoom.us/wc/join/12345678901?pwd=synthetic', reference)
  );
  assert.ok(matchesCaptureSource('https://us02web.zoom.us/wc/12345678901/join', reference));
  assert.equal(
    matchesCaptureSource(reference, reference),
    false,
    'native launch URL is not remote tab audio'
  );
  for (const url of [
    'https://zoom.us/wc/join/12345678901',
    'https://us02web.zoom.us/wc/join/12345678902',
    'https://us02web.zoom.us/wc/join/12345678901?redirect=https://evil.test',
    'https://us02web.zoom.us/wc/join/12345678901#leave',
    'https://us02web.zoom.us/leave'
  ])
    assert.equal(matchesCaptureSource(url, reference), false);
  for (const url of [
    'https://zoom.us.evil.test/j/12345678901',
    'https://evilzoom.us/j/12345678901',
    'https://-bad.zoom.us/j/12345678901',
    'https://zoom.us./j/12345678901',
    'http://zoom.us/j/12345678901',
    'https://u:p@zoom.us/j/12345678901',
    'https://zoom.us:444/j/12345678901',
    'https://zoom.us/j/12345678',
    'https://zoom.us/j/123456789012',
    'https://zoom.us/wc/12345678901/start',
    'https://zoom.us/j/12345678901?pwd=a&pwd=b',
    'https://zoom.us/j/12345678901?token=synthetic'
  ])
    assert.equal(validMeetingURL(url), null);
});

test('real worklet flush preserves a tail smaller than 4096 samples and freezes capture', async () => {
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('./processor.js', import.meta.url), 'utf8');
  let Processor;
  class Base {
    constructor() {
      this.port = { postMessage: (data) => messages.push(data) };
    }
  }
  const messages = [];
  runInNewContext(source, {
    AudioWorkletProcessor: Base,
    registerProcessor: (_, type) => {
      Processor = type;
    },
    Float32Array
  });
  const processor = new Processor();
  const samples = new Float32Array(127).fill(0.25);
  processor.process([[samples]]);
  assert.equal(messages.length, 0);
  processor.port.onmessage({ data: 'flush' });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'flushed');
  assert.deepEqual(messages[0].samples, samples);
  processor.process([[samples]]);
  assert.equal(messages.length, 1, 'new frames are blocked after the flush acknowledgement');
});

test('disk write failure cannot finalize a seemingly valid WAV', async () => {
  let closed = false,
    aborted = false;
  const sink = new StreamingWav(
    {
      async write() {
        throw new Error('disk full');
      },
      async close() {
        closed = true;
      },
      async abort() {
        aborted = true;
      }
    },
    8000
  );
  sink.append(new Float32Array([0.5]));
  await assert.rejects(sink.finish(), /disk full/);
  await sink.abort();
  assert.equal(closed, false);
  assert.equal(aborted, true);
});

test('signed-in Meet tab matches only its saved room with a numeric account selector', () => {
  const room = 'https://meet.google.com/abc-defg-hij';
  assert.equal(matchesCaptureSource(room + '?authuser=0', room), true);
  for (const suffix of ['?authuser=0&other=x', '?authuser=0&authuser=1', '?authuser=name', '?authuser=1#other']) {
    assert.equal(matchesCaptureSource(room + suffix, room), false);
  }
  assert.equal(matchesCaptureSource(room + '?authuser=1', 'https://meet.google.com/xyz-defg-hij'), false);
  assert.equal(validMeetingURL(room + '?authuser=0'), null);
});
