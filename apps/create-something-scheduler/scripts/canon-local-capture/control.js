import { MAX_SECONDS, validMeetingURL, matchesCaptureSource, StreamingWav } from './audio.mjs';
const $ = (id) => document.getElementById(id);
let stream,
  context,
  processor,
  timer,
  handle,
  sink,
  count = 0,
  recording = false,
  stopping = false,
  starting = false,
  runVersion = 0,
  selected,
  boundURL,
  shouldSave = true,
  flushing = false,
  finishFlush;
const stoppedTracks = new WeakSet();
function stopTracks() {
  stream?.getTracks().forEach((track) => {
    if (!stoppedTracks.has(track)) {
      stoppedTracks.add(track);
      track.stop();
    }
  });
}
const status = (text) => {
  $('status').textContent = text;
};
function buttons() {
  $('start').disabled = recording || stopping || starting;
  $('configure').disabled = recording || stopping || starting;
  $('meeting').disabled = recording || stopping || starting;
  $('stop').disabled = !recording && !starting;
}
async function cleanup() {
  clearTimeout(timer);
  stopTracks();
  processor?.disconnect();
  if (context && context.state !== 'closed') await context.close();
  stream = context = processor = null;
}
async function stop(save = true, flush = false) {
  if (stopping) {
    if (!save) {
      shouldSave = false;
      flushing = false;
      finishFlush?.(false);
    }
    return;
  }
  if (starting && !recording) {
    runVersion++;
    await cleanup();
    status('Start cancelled. No recording retained.');
    return;
  }
  if (!recording) return;
  runVersion++;
  stopping = true;
  shouldSave = save;
  recording = false;
  buttons();
  const rate = context.sampleRate;
  let tailFlushed = true;
  try {
    clearTimeout(timer);
    if (save && flush && processor) {
      flushing = true;
      const pendingFlush = new Promise((resolve) => {
        finishFlush = resolve;
      });
      const timeout = setTimeout(() => finishFlush?.(false), 1000);
      processor.port.postMessage('flush');
      stopTracks();
      tailFlushed = await pendingFlush;
      clearTimeout(timeout);
      flushing = false;
      finishFlush = null;
    }
    await cleanup();
    if (shouldSave) {
      await sink.finish(() => shouldSave);
      status(
        `Saved private local WAV (${Math.round(count / rate)} seconds). ${tailFlushed ? '' : 'Final audio tail unavailable (flush timed out). '}Check file permissions before transcription.`
      );
    } else {
      await sink?.abort();
      status('Stopped; audio discarded because the source changed or capture failed.');
    }
  } catch {
    await sink?.abort();
    status('Capture stopped. Local save failed; audio discarded. No upload attempted.');
  } finally {
    sink = null;
    count = 0;
    handle = null;
    flushing = false;
    finishFlush = null;
    stopping = false;
    buttons();
  }
}
$('configure').onclick = async () => {
  const url = validMeetingURL($('meeting').value);
  if (!url) {
    status(
      'Enter an official HTTPS Zoom meeting-number URL or an exact Google Meet URL. Unknown query parameters are rejected.'
    );
    return;
  }
  await chrome.storage.local.set({ testURL: url });
  $('meeting').value = url; // Remove any embedded passcode from the visible control immediately.
  status('Meeting reference saved locally. No recording started.');
};
$('start').onclick = async () => {
  if (recording || stopping || starting) return;
  starting = true;
  const version = ++runVersion;
  buttons();
  async function verifySource() {
    if (version !== runVersion) throw new Error('Capture start cancelled.');
    const tab = await chrome.tabs.get(selected);
    const { testURL } = await chrome.storage.local.get('testURL');
    if (version !== runVersion || testURL !== boundURL || !matchesCaptureSource(tab.url, boundURL))
      throw new Error('Source changed; capture cancelled.');
  }
  try {
    if (!$('consent').checked) throw new Error('Confirm consent for this meeting recording.');
    const { testURL } = await chrome.storage.local.get('testURL');
    if (!validMeetingURL(testURL))
      throw new Error('Configure the exact authorized meeting reference first.');
    const tab = await chrome.tabs.get(Number(location.hash.slice(1)));
    boundURL = validMeetingURL(testURL);
    if (!tab?.id || !matchesCaptureSource(tab.url, boundURL))
      throw new Error(
        'Selected source must match the saved origin and meeting number. For Zoom, join audio in the browser web client first.'
      );
    selected = tab.id;
    // The user chooses a local destination before any audio stream is opened.
    status(
      'Preparing meeting capture. Choose a private local WAV destination; no audio is recording yet.'
    );
    handle = await window.showSaveFilePicker({
      suggestedName: 'canon-meeting.wav',
      types: [{ description: 'PCM WAV audio', accept: { 'audio/wav': ['.wav'] } }]
    });
    const current = await chrome.tabs.get(selected);
    if (current?.id !== selected || !matchesCaptureSource(current.url, boundURL))
      throw new Error('Selected tab changed; no capture started.');
    await verifySource();
    const consumer = await chrome.tabs.getCurrent();
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: selected,
      consumerTabId: consumer.id
    });
    await verifySource();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
      video: false
    });
    await verifySource();
    context = new AudioContext();
    sink = new StreamingWav(await handle.createWritable(), context.sampleRate);
    await sink.begin();
    await verifySource();
    await context.audioWorklet.addModule(chrome.runtime.getURL('processor.js'));
    await context.resume();
    const remote = context.createMediaStreamSource(stream);
    remote.connect(context.destination); // Preserve guest playback; headphones prevent echo.
    const mix = context.createGain();
    mix.gain.value = 1;
    remote.connect(mix);
    processor = new AudioWorkletNode(context, 'canon-pcm', {
      channelCount: 1,
      channelCountMode: 'explicit'
    });
    mix.connect(processor);
    const silent = context.createGain();
    silent.gain.value = 0;
    processor.connect(silent);
    silent.connect(context.destination);
    await verifySource();
    count = 0;
    starting = false;
    recording = true;
    shouldSave = true;
    processor.port.onmessage = ({ data }) => {
      if (!recording && !flushing) return;
      if (data.error) {
        void stop(false);
        return;
      }
      const samples = data.type === 'flushed' ? data.samples : data;
      processor.port.postMessage('ack');
      try {
        const full = sink.append(samples);
        count = sink.count;
        if (data.type === 'flushed') {
          finishFlush?.(true);
          return;
        }
        if (full && recording) void stop(true, true);
      } catch {
        void stop(false);
      }
    };
    stream.getAudioTracks()[0].onended = () => void stop(true);
    timer = setTimeout(() => void stop(true, true), MAX_SECONDS * 1000);
    $('consent').checked = false;
    buttons();
    status('RECORDING selected meeting tab only (no microphone). Stop and save when finished.');
  } catch (error) {
    await cleanup();
    await sink?.abort();
    handle = null;
    sink = null;
    count = 0;
    status(error.message || 'Capture failed.');
    buttons();
  } finally {
    starting = false;
    buttons();
  }
};
$('stop').onclick = () => void stop(true, true);
window.addEventListener('pagehide', () => {
  runVersion++;
  recording = false;
  stopTracks();
  void context?.close();
  void sink?.abort();
  sink = null;
});
// Reload/navigation remains uncertain even if an ended/removed event is also delivered.
chrome.tabs.onUpdated.addListener((id, change) => {
  if (
    (recording || starting || stopping) &&
    id === selected &&
    (change.status === 'loading' || (change.url && !matchesCaptureSource(change.url, boundURL)))
  )
    void stop(false);
});
chrome.tabs.onRemoved.addListener((id) => {
  if ((recording || starting) && id === selected) void stop(true);
});
const watch = setInterval(async () => {
  if (!recording) return;
  try {
    const tab = await chrome.tabs.get(Number(location.hash.slice(1)));
    const { testURL } = await chrome.storage.local.get('testURL');
    if (!recording) return; // An in-flight poll must not turn a normal close into a failed save.
    if (tab?.id !== selected || testURL !== boundURL || !matchesCaptureSource(tab.url, boundURL))
      void stop(false);
  } catch {
    if (!recording) return;
    try {
      // A vanished tab can precede onRemoved. Preserve it only after confirming absence.
      const tabs = await chrome.tabs.query({});
      if (recording) void stop(tabs.every((tab) => tab.id !== selected));
    } catch {
      if (recording) void stop(false);
    }
  }
}, 500);
chrome.storage.local.get('testURL').then(({ testURL }) => {
  const clean = validMeetingURL(testURL);
  $('meeting').value = clean || '';
  if (testURL && clean !== testURL) void chrome.storage.local.set({ testURL: clean || '' });
});
