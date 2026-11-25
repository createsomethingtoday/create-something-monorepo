// Exercise the packaged extension in a disposable Chrome profile. No call or audio source.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const extension = fileURLToPath(
  new URL('../../apps/create-something-scheduler/scripts/canon-local-capture/', import.meta.url)
);
const browser = await puppeteer.launch({
  channel: 'chrome',
  enableExtensions: true,
  headless: true
});
try {
  const id = await browser.installExtension(extension);
  const prefix = 'chrome-extension://' + id;
  const views = [];
  const wait = { polling: 100, timeout: 9000 };
  for (const selectedTab of [41, 42]) {
    const control = await browser.newPage();
    await control.goto(prefix + '/control.html#' + selectedTab);
    const known = new Set(browser.targets());
    const popup = browser.waitForTarget(
      (target) => !known.has(target) && target.url().startsWith(prefix + '/tile/tile.html#'),
      { timeout: 8000 }
    );
    await control.click('#open-tile');
    const tile = await (await popup).page();
    await tile.waitForFunction(() => document.body.dataset.state === 'waiting', wait);
    assert.equal(await tile.$eval('#status', (node) => node.textContent), 'Waiting to take notes');
    assert.ok(await tile.$eval('#character', (node) => node.childElementCount > 0));
    assert.equal(
      await control.$eval('#selection', (node) => node.textContent),
      'OBS window: ' + (await tile.title())
    );
    views.push({ control, tile });
    console.log('Opened isolated tile', views.length);
  }
  const [first, second] = views;
  await first.control.bringToFront();
  await first.control.click('#start');
  await first.tile.waitForFunction(() => document.body.dataset.state === 'failed', wait);
  assert.match(
    await first.control.$eval('#status', (node) => node.textContent),
    /confirm consent/i
  );
  assert.equal(await second.tile.$eval('body', (node) => node.dataset.state), 'waiting');
  await first.control.close();
  await first.tile.waitForFunction(() => document.body.dataset.state === 'disconnected', wait);
  assert.equal(await second.tile.$eval('body', (node) => node.dataset.state), 'waiting');
  console.log(
    'PASS: two actual extension windows, correct popup path, painted character, refused capture, isolated state and controller-close readback.'
  );
} finally {
  await browser.close();
}
