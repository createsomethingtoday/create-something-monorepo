import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, basename } from 'node:path';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import puppeteer from 'puppeteer-core';

const root = resolve('apps/create-something-scheduler/scripts/canon-local-capture/tile');
const out = resolve(process.argv[2] ?? 'cook/canon-meeting-camera/stills/r05');
const round = basename(out);
await mkdir(out, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(root + '/')) throw Error('Outside tile');
    let body;
    if (path.endsWith('/proof-bootstrap.js')) {
      body = `import {setTileState,renderAt} from './tile-art.js'; window.proof={setTileState,renderAt};`;
    } else {
      body = await readFile(path);
      // Only the proof server exposes deterministic sampling. No test hooks ship.
      if (path.endsWith('/tile.html')) body = body.toString().replace('src="tile.js"', 'src="proof-bootstrap.js"');
      if (path.endsWith('/tile-art.js')) body = body.toString().replaceAll('requestAnimationFrame(tick);', '').concat('\nexport { renderAt };');
    }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' })[extname(path)] ?? 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const runFfmpeg = args => new Promise((resolve, reject) => {
  const process = spawn('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
  process.on('error', reject);
  process.on('close', code => code === 0 ? resolve() : reject(Error('ffmpeg exit ' + code)));
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/tile.html`);
  await page.waitForFunction(() => !!window.proof);
  const sample = async (state, time = 0) => {
    await page.evaluate(({state,time}) => { window.proof.setTileState(state); window.proof.renderAt(time); }, { state, time });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  };
  await sample('taking', 2);
  assert.equal(await page.evaluate(async () => {
    let changes = 0;
    const observer = new MutationObserver(records => changes += records.length);
    observer.observe(document.querySelector('#status'), { childList: true });
    window.proof.setTileState('taking');
    await Promise.resolve();
    observer.disconnect();
    return changes;
  }), 0, 'same-state heartbeat must leave live region alone');
  const assets = [];
  for (const [state, time] of [['waiting', .9], ['taking', 2], ['stopped', 1.2], ['disconnected', 1.2], ['saving', 1.2], ['failed', 1.2]]) {
    await sample(state, time);
    assert(!await page.$eval('svg', node => /NaN|Infinity/.test(node.innerHTML)));
    assert(await page.$eval('#status', node => {
      const bounds = node.getBoundingClientRect();
      return bounds.left >= innerWidth * .125 && bounds.right <= innerWidth * .875 && bounds.bottom < innerHeight * .84;
    }), 'essential status must survive centered 4:3 crop and bottom platform overlay');
    await page.screenshot({ path: resolve(out, `${state}.png`) });
    assets.push(`${state}.png`);
    // These scale the full camera raster; they do not rerender responsive CSS.
    for (const width of [160, 320]) {
      for (const aspect of ['16x9', '4x3']) {
        const name = `${state}-camera-${aspect}-${width}.png`;
        const filter = `${aspect === '4x3' ? 'crop=960:720:160:0,' : ''}scale=${width}:-1:flags=lanczos`;
        await runFfmpeg(['-i', resolve(out, `${state}.png`), '-vf', filter, '-frames:v', '1', resolve(out, name)]);
        assets.push(name);
      }
    }
  }
  const masked = [];
  for (const state of ['waiting', 'taking', 'stopped']) {
    const name = `${state}-caption-masked-160.png`;
    await runFfmpeg(['-i', resolve(out, `${state}.png`), '-vf', 'drawbox=x=0:y=490:w=iw:h=230:color=0x090909:t=fill,scale=160:90:flags=lanczos', '-frames:v', '1', resolve(out, name)]);
    assets.push(name);
    masked.push(name);
  }
  await runFfmpeg(masked.flatMap(name => ['-i', resolve(out, name)]).concat(['-filter_complex', 'hstack=inputs=3', '-frames:v', '1', resolve(out, 'posture-caption-masked.png')]));
  assets.push('posture-caption-masked.png');
  await writeFile(resolve(out, 'motion-timing.json'), JSON.stringify({fps:12,duration:15,waiting:[0,3.5],taking:[3.5,13.5],stopped:[13.5,15],recordingBlink:12.35,arrivalSettle:4.35,stopSettle:14.35}, null, 2));
  for (const [name, time] of [['listen-arrival', .2], ['listen-held', 4], ['listen-blink', 8.85]]) {
    await sample('taking', time);
    await page.screenshot({ path: resolve(out, `${name}.png`) });
    assets.push(`${name}.png`);
  }
  for (const [width, height] of [[320, 180], [640, 480], [1920, 1080]]) {
    await page.setViewport({ width, height });
    await sample('taking', 2);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
    const name = `viewport-${width}.png`;
    await page.screenshot({ path: resolve(out, name) });
    assets.push(name);
  }
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await sample('taking', 2);
  const held = await page.$eval('svg', node => node.innerHTML);
  await sample('taking', 15);
  assert.equal(await page.$eval('svg', node => node.innerHTML), held, 'reduced motion holds the listening expression');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 960, height: 540 });
  const encoder = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '12', '-i', '-', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', resolve(out, 'tile-motion.mp4')], { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = once(encoder, 'close');
  for (let frame = 0; frame < 180; frame++) {
    const time = frame / 12;
    await sample(time < 3.5 ? 'waiting' : time < 13.5 ? 'taking' : 'stopped', time < 3.5 ? time : time < 13.5 ? time - 3.5 : time - 13.5);
    if (!encoder.stdin.write(await page.screenshot())) await once(encoder.stdin, 'drain');
  }
  encoder.stdin.end();
  assert.equal((await done)[0], 0);
  assert.deepEqual(errors, []);
  await writeFile(resolve(out, 'original-owned-avatar.png'), await readFile(resolve(root, 'art/canon-meeting-portrait.png')));
  const gallery = `<!doctype html><meta charset="utf-8"><title>Canon meeting tile · ${round}</title><style>body{font:16px Arial;background:#ddd;margin:32px}img,video{display:block;max-width:100%}section{margin:0 0 32px}video{width:960px}.samples{display:flex;flex-wrap:wrap;gap:24px}.samples section{width:max-content}h2{font-size:15px}</style><h1>Canon meeting tile · ${round}</h1><p>Motion: waiting 0–3.5s, recording 3.5–13.5s, blink 12.35s, stopped 13.5–15s. Caption-masked triptych reads waiting / taking / stopped, each at native160px.</p><p>Camera images below show actual 1280×720 raster downscaling and centered 4:3 camera cropping. View these at native size.</p><section><h2>Original owned meeting avatar · unchanged source pixels</h2><img src="original-owned-avatar.png" width="256" alt="Original woven charcoal avatar with cream yarn pom"></section><section><video controls src="tile-motion.mp4"></video></section><div class="samples">${assets.map(name => `<section><h2>${name}</h2><img src="${name}" alt="${name}" ${(name.includes('camera') || name.includes('masked')) ? '' : 'width="640"'}></section>`).join('')}</div>`;
  await writeFile(resolve(out, 'gallery.html'), gallery);
  console.log('PASS: six states; centered 4:3 safe status; actual 160/320 camera raster downscales; three viewports; duplicate heartbeat; reduced-motion hold; 180-frame motion; no runtime errors.');
} finally { await browser.close(); server.close(); }
