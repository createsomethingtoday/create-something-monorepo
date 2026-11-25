// Actual packaged extension lifecycle with simulated capture: never opens a meeting or audio device.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const extension = fileURLToPath(
  new URL('../../apps/create-something-scheduler/scripts/canon-local-capture/', import.meta.url)
);
const browser = await puppeteer.launch({
  channel: 'chrome',
  enableExtensions: true,
  headless: !process.argv.includes('--headed')
});
try {
  const id = await browser.installExtension(extension);
  const control = await browser.newPage();
  if (process.argv.includes('--native-only')) {
    await control.evaluateOnNewDocument(() => {
      window.BroadcastChannel = class { postMessage() {} close() {} };
    });
  }
  await control.goto(`chrome-extension://${id}/control.html#41`);
  await control.evaluate(() => {
    window.fileReceipt = { writes: 0, closes: 0, aborts: 0 };
    window.processorCount = 0;
    const url = 'https://meet.google.com/abc-defg-hij';
    chrome.tabs.get = async (id) => ({ id, url });
    chrome.tabs.getCurrent = async () => ({ id: 42 });
    chrome.storage.local.get = async () => ({ testURL: url });
    chrome.tabCapture.getMediaStreamId = async () => 'synthetic';
    window.showSaveFilePicker = () =>
      new Promise((resolve) => {
        window.finishPicker = () =>
          resolve({
            createWritable: async () => ({
              write: async () => { window.fileReceipt.writes++; },
              close: async () => { window.fileReceipt.closes++; },
              abort: async () => { window.fileReceipt.aborts++; }
            })
          });
      });
    const track = { stop() {} };
    navigator.mediaDevices.getUserMedia = async () => ({
      getTracks: () => [track],
      getAudioTracks: () => [track]
    });
    const node = () => ({ connect() {}, disconnect() {}, gain: { value: 0 } });
    window.AudioContext = class {
      sampleRate = 48000;
      state = 'running';
      destination = {};
      audioWorklet = { addModule: async () => {} };
      resume = async () => {};
      close = async () => {
        this.state = 'closed';
      };
      createMediaStreamSource = node;
      createGain = node;
    };
    window.AudioWorkletNode = class {
      constructor() { window.processorCount++; }
      connect() {}
      disconnect() {}
      port = {
        postMessage: (message) => {
          if (message === 'flush')
            queueMicrotask(() =>
              this.port.onmessage({ data: { type: 'flushed', samples: new Float32Array(2400) } })
            );
        }
      };
    };
  });
  const target = browser.waitForTarget((t) => t.url().includes('/tile/tile.html#'));
  await control.click('#open-tile');
  let tile = await (await target).page();
  const errors = [];
  tile.on('pageerror', (e) => errors.push(e.message));
  const wait = { polling: 100, timeout: 9000 };
  await tile.waitForFunction(() => document.body.dataset.state === 'waiting', wait);
  await control.$eval('#consent', (e) => (e.checked = true));
  await control.click('#start');
  await control.waitForFunction(() => typeof window.finishPicker === 'function');
  if (process.argv.includes('--suspend-controller')) {
    await control.evaluate(() => {
      const end = performance.now() + 6000;
      while (performance.now() < end) {}
    });
  } else {
    await new Promise((resolve) => setTimeout(resolve, 6000));
  }
  console.log('during delayed picker', await tile.$eval('body', (e) => e.dataset.state));
  await control.bringToFront();
  await control.evaluate(() => window.finishPicker());
    await control.waitForFunction(() => document.querySelector('#status').textContent.startsWith('RECORDING'));
    console.log('during recording', await tile.$eval('body', (e) => e.dataset.state));
  await tile.waitForFunction(() => document.body.dataset.state === 'taking', wait);
  await control.click('#stop');
  await tile.waitForFunction(() => document.body.dataset.state === 'stopped', wait);
  assert.match(await control.$eval('#status', (e) => e.textContent), /^Saved private local WAV/);
  assert.deepEqual(errors, []);
  console.log('PASS: actual extension popup tracks delayed synthetic capture and stop/save.');
} finally {
  await browser.close();
}
