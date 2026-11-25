// Sample actual extension-tab pixels in a disposable Chrome profile. Send video to
// a local WebRTC peer and save what the receiver decodes. No meeting or audio.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const out = resolve(process.argv[2] || 'cook/canon-meeting-camera/peer');
await mkdir(out, { recursive: true });
const server = createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(
    '<button>Observe local tile</button><video autoplay playsinline muted style="width:320px;display:block"></video>'
  );
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: true,
  enableExtensions: true,
  args: ['--autoplay-policy=no-user-gesture-required']
});
try {
  const extension = fileURLToPath(
    new URL('../../apps/create-something-scheduler/scripts/canon-local-capture/', import.meta.url)
  );
  const id = await browser.installExtension(extension);
  const control = await browser.newPage();
  await control.goto('chrome-extension://' + id + '/control.html#41');
  await control.click('#open-tile');
  const tile = await (
    await browser.waitForTarget((t) =>
      t.url().startsWith('chrome-extension://' + id + '/tile/tile.html#')
    )
  ).page();
  await tile.setViewport({ width: 1280, height: 720 });
  await tile.waitForFunction(() => document.body.dataset.state === 'waiting', { polling: 100 });
  const observer = await browser.newPage();
  await observer.goto('http://127.0.0.1:' + server.address().port);
  await observer.exposeFunction('readTilePixels', () =>
    tile.screenshot({ type: 'jpeg', quality: 92, encoding: 'base64' })
  );
  await observer.evaluate(() => {
    document.querySelector('button').onclick = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const context = canvas.getContext('2d');
        async function paint() {
          const frame = new Image();
          frame.src = 'data:image/jpeg;base64,' + (await window.readTilePixels());
          await frame.decode();
          context.drawImage(frame, 0, 0, canvas.width, canvas.height);
          setTimeout(
            () =>
              paint().catch((error) => {
                window.failure = error.message;
              }),
            90
          );
        }
        await paint();
        const media = canvas.captureStream(10);
        const sender = new RTCPeerConnection({ iceServers: [] });
        const receiver = new RTCPeerConnection({ iceServers: [] });
        function exchangeIce(from, to) {
          from.onicecandidate = async ({ candidate }) => {
            if (!candidate) return;
            if (!to.remoteDescription)
              await new Promise((resolve) =>
                to.addEventListener('signalingstatechange', resolve, { once: true })
              );
            await to.addIceCandidate(candidate);
          };
        }
        exchangeIce(sender, receiver);
        exchangeIce(receiver, sender);
        sender.addTrack(media.getVideoTracks()[0], media);
        receiver.ontrack = ({ streams }) => {
          document.querySelector('video').srcObject = streams[0];
        };
        await sender.setLocalDescription(await sender.createOffer());
        await receiver.setRemoteDescription(sender.localDescription);
        await receiver.setLocalDescription(await receiver.createAnswer());
        await sender.setRemoteDescription(receiver.localDescription);
        window.receiver = receiver;
      } catch (e) {
        window.failure = e.message;
      }
    };
  });
  await observer.click('button');
  await observer.waitForFunction(
    () => window.failure || document.querySelector('video').videoWidth,
    { timeout: 12000, polling: 100 }
  );
  assert.equal(await observer.evaluate(() => window.failure), undefined);
  const stats = () =>
    observer.evaluate(async () => {
      const reports = [...(await window.receiver.getStats()).values()];
      const rtp = reports.find((r) => r.type === 'inbound-rtp' && r.kind === 'video');
      return {
        frames: rtp.framesDecoded,
        width: rtp.frameWidth,
        height: rtp.frameHeight,
        codec: reports.find((r) => r.id === rtp.codecId)?.mimeType
      };
    });
  async function frame(label) {
    const before = await stats();
    await observer.waitForFunction(
      async (n) => {
        const reports = [...(await window.receiver.getStats()).values()];
        return reports.some((r) => r.type === 'inbound-rtp' && r.framesDecoded >= n + 3);
      },
      { timeout: 8000, polling: 100 },
      before.frames
    );
    await observer
      .$('video')
      .then((video) => video.screenshot({ path: resolve(out, label + '.png') }));
    console.log(label, await stats());
  }
  await frame('waiting');
  await control.bringToFront();
  await control.click('#start');
  await tile.waitForFunction(() => document.body.dataset.state === 'failed', { polling: 100 });
  await observer.bringToFront();
  await frame('refused');
  await control.close();
  await tile.waitForFunction(() => document.body.dataset.state === 'disconnected', {
    polling: 100
  });
  await frame('disconnected');
} finally {
  await browser.close();
  server.close();
}
