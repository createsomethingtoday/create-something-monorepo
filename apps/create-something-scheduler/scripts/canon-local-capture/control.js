import { MAX_SECONDS, validMeetingURL, encodeWav } from './audio.mjs';
const $ = (id) => document.getElementById(id);
let stream,
  context,
  processor,
  timer,
  handle,
  chunks = [],
  count = 0,
  recording = false,
  stopping = false,
  starting = false,
  runVersion = 0,
  selected;
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
  stream?.getTracks().forEach((t) => t.stop());
  processor?.disconnect();
  if (context && context.state !== 'closed') await context.close();
  stream = context = processor = null;
}
async function stop(save = true) {
  if (starting && !recording) {
    runVersion++;
    await cleanup();
    status('Start cancelled. No recording retained.');
    return;
  }
  if (!recording || stopping) return;
  runVersion++;
  stopping = true;
  recording = false;
  buttons();
  const rate = context.sampleRate;
  try {
    await cleanup();
    if (save) {
      const wav = encodeWav(chunks, rate);
      const writer = await handle.createWritable();
      try {
        await writer.write(wav);
        await writer.close();
      } catch (e) {
        await writer.abort().catch(() => {});
        throw e;
      }
      status(
        `Saved private local WAV (${Math.round(count / rate)} seconds). Check file permissions before transcription.`
      );
    } else status('Stopped; audio discarded.');
  } catch {
    status('Capture stopped. Local save failed; audio discarded. No upload attempted.');
  } finally {
    chunks = [];
    count = 0;
    handle = null;
    stopping = false;
    buttons();
  }
}
$('configure').onclick = async () => {
  const url = validMeetingURL($('meeting').value);
  if (!url) {
    status('Enter one exact https://meet.google.com/abc-defg-hij URL without query or fragment.');
    return;
  }
  await chrome.storage.local.set({ testURL: url });
  status('Selected test URL saved locally. No recording started.');
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
    if (version !== runVersion || tab.url !== testURL)
      throw new Error('Source changed; capture cancelled.');
  }
  try {
    if (!$('consent').checked)
      throw new Error('Confirm consent for this dedicated participant-profile test.');
    const { testURL } = await chrome.storage.local.get('testURL');
    if (!validMeetingURL(testURL))
      throw new Error('Configure the exact authorized test URL first.');
    const tab = await chrome.tabs.get(Number(location.hash.slice(1)));
    if (!tab?.id || tab.url !== testURL)
      throw new Error('Selected source tab must exactly match the configured Canon test URL.');
    selected = tab.id;
    // The user chooses a local destination before any audio stream is opened.
    status(
      'Preparing selected test capture. Choose a private local WAV destination; no audio is recording yet.'
    );
    handle = await window.showSaveFilePicker({
      suggestedName: 'canon-internal-test.wav',
      types: [{ description: 'PCM WAV audio', accept: { 'audio/wav': ['.wav'] } }]
    });
    const current = await chrome.tabs.get(selected);
    if (current?.id !== selected || current.url !== testURL)
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
    chunks = [];
    count = 0;
    starting = false;
    recording = true;
    processor.port.onmessage = ({ data }) => {
      if (!recording) return;
      const remaining = Math.floor(context.sampleRate * MAX_SECONDS) - count;
      const samples = data.slice(0, remaining);
      chunks.push(samples);
      count += samples.length;
      if (samples.length < data.length) void stop();
    };
    stream.getAudioTracks()[0].onended = () => void stop();
    timer = setTimeout(() => void stop(), MAX_SECONDS * 1000);
    buttons();
    status('RECORDING selected test tab only (no microphone). Stop and save when finished.');
  } catch (error) {
    await cleanup();
    handle = null;
    chunks = [];
    count = 0;
    status(error.message || 'Capture failed.');
    buttons();
  } finally {
    starting = false;
    buttons();
  }
};
$('stop').onclick = () => void stop();
window.addEventListener('pagehide', () => {
  runVersion++;
  recording = false;
  stream?.getTracks().forEach((t) => t.stop());
  void context?.close();
  chunks = [];
});
// Navigation or tab changes invalidate this bounded test session, including same-tab room changes.
chrome.tabs.onUpdated.addListener((id, change) => {
  if ((recording || starting) && id === selected && (change.url || change.status === 'loading'))
    void stop();
});
chrome.tabs.onRemoved.addListener((id) => {
  if ((recording || starting) && id === selected) void stop();
});
const watch = setInterval(async () => {
  if (!recording) return;
  try {
    const tab = await chrome.tabs.get(Number(location.hash.slice(1)));
    const { testURL } = await chrome.storage.local.get('testURL');
    if (tab?.id !== selected || tab.url !== testURL) void stop();
  } catch {
    void stop();
  }
}, 500);
chrome.storage.local.get('testURL').then(({ testURL }) => {
  $('meeting').value = testURL || '';
});
