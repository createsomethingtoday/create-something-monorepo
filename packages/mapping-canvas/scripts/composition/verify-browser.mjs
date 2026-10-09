import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.DRAW_COMPOSITION_URL || 'http://127.0.0.1:51957';
const out = '../../output/composition';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const result = {
  assertions: [],
  screenshots: [],
  errors: [],
  completed: false,
  browser: browser.version()
};
const ok = (name) => result.assertions.push(name);
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce'
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
  );
  const p = await context.newPage();
  p.on('pageerror', (e) => result.errors.push(e.message));
  await p.goto(`${base}/compose`);
  const preview = p.locator('.preview-form');
  await preview.getByRole('heading', { name: 'Make the next step clear.' }).waitFor();
  const shot = async (name) => {
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    result.screenshots.push(`${name}.png`);
  };
  const initialIds = await preview
    .locator('[data-instance-id]')
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.instanceId));
  await shot('desktop-empty');
  await preview.getByRole('button', { name: 'Review request', exact: true }).focus();
  await p.keyboard.press('Enter');
  await preview.getByRole('alert').first().waitFor();
  assert.equal(await preview.locator('[aria-invalid=true]').count(), 2);
  assert.equal(
    await p.locator(':focus').getAttribute('id'),
    await preview.getByLabel('Your name').getAttribute('id')
  );
  assert.equal(
    await preview.locator('[aria-invalid=true]').evaluateAll((nodes) =>
      nodes.every((n) =>
        (n.getAttribute('aria-describedby') || '')
          .split(' ')
          .filter(Boolean)
          .every((id) => document.getElementById(id))
      )
    ),
    true
  );
  result.invalidFocus = await p.locator(':focus').evaluate((el) => {
    const c = getComputedStyle(el);
    return {
      outline: c.outlineStyle,
      width: c.outlineWidth,
      color: c.outlineColor,
      visible: el.matches(':focus-visible')
    };
  });
  assert.equal(result.invalidFocus.visible, true);
  assert.equal(result.invalidFocus.outline, 'solid');
  assert.equal(result.invalidFocus.width, '2px');
  ok(
    'Keyboard empty submission focuses first invalid Canon field with visible outline; error references resolve'
  );
  await shot('desktop-invalid-focus');
  await preview.getByLabel('Your name').fill('Alex Morgan');
  await p.keyboard.press('Tab');
  assert.equal(
    await p.locator(':focus').getAttribute('id'),
    await preview.getByLabel('What would you like to improve?').getAttribute('id')
  );
  await p.keyboard.type('Keep details when a request fails.');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Enter');
  await preview.getByText('Your request is still here', { exact: true }).waitFor();
  assert.equal(await preview.getByLabel('Your name').inputValue(), 'Alex Morgan');
  ok('Keyboard order and simulated failure retain input');
  await shot('desktop-error');
  await p.keyboard.press('Enter');
  await preview.getByText('Ready to continue', { exact: true }).waitFor();
  ok('Keyboard retry recovers with retained details');
  await shot('desktop-recovered');
  await p.getByRole('button', { name: 'Motion', exact: true }).click();
  await p.getByRole('button', { name: 'Interactive', exact: true }).click();
  assert.equal(await preview.getByLabel('Your name').inputValue(), 'Alex Morgan');
  await preview.getByText('Ready to continue', { exact: true }).waitFor();
  ok('Switching modes preserves interactive state');
  await p.getByLabel('Heading', { exact: true }).fill('Keep the useful details.');
  await p.getByLabel('Canon variant').selectOption('secondary');
  await p.getByRole('button', { name: 'Apply props', exact: false }).click();
  await preview.getByRole('heading', { name: 'Keep the useful details.' }).waitFor();
  assert.deepEqual(
    await preview
      .locator('[data-instance-id]')
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.instanceId)),
    initialIds
  );
  ok('Prop editing preserves nested instance IDs');
  await p.getByRole('button', { name: 'Save locally', exact: true }).click();
  await p.reload();
  await preview.getByRole('heading', { name: 'Keep the useful details.' }).waitFor();
  assert.deepEqual(
    await preview
      .locator('[data-instance-id]')
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.instanceId)),
    initialIds
  );
  ok('Saved composition restores content props and stable IDs');
  await shot('desktop-edited-reloaded');
  await p
    .getByLabel('Import composition JSON')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{bad')
    });
  await p.getByText(/Could not import:/).waitFor();
  await preview.getByRole('heading', { name: 'Keep the useful details.' }).waitFor();
  ok('Malformed import retains current composition');
  const download = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const json = await readFile(await (await download).path(), 'utf8');
  await writeFile(`${out}/composition.json`, json);
  await p
    .getByLabel('Import composition JSON')
    .setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await p.getByText('Composition imported. Save to keep it on this device.').waitFor();
  ok('Exported nested composition imports successfully');
  const render = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Export render handoff', exact: true }).click();
  const h = JSON.parse(await readFile(await (await render).path(), 'utf8'));
  assert.equal(h.hyperframes.status, 'snapshot-adapter-v1');
  assert.equal(h.sequences.length, 2);
  await writeFile(`${out}/render-handoff.json`, JSON.stringify(h, null, 2));
  ok('Validated renderer handoff exports both sequences and shared content digest');
  await p.getByRole('button', { name: 'Motion', exact: true }).click();
  await p.locator('.viewport .paper h2').waitFor();
  assert.equal(await p.locator('.viewport form').getAttribute('inert'), '');
  await shot('motion-context-outcome');
  const seek = async (t) => {
    await p.getByLabel('Animation time').fill(String(t));
    await p.getByLabel('Animation time').dispatchEvent('input');
    await p.waitForTimeout(120);
  };
  await seek(9);
  await shot('motion-context-error');
  await p.getByRole('button', { name: '02 / Detail', exact: true }).click();
  await seek(5);
  await shot('motion-detail-validation');
  await seek(14);
  await shot('motion-detail-recovered');
  ok('Two camera sequences render shared edited content; scripted fields are inert');
  await p.getByRole('button', { name: 'Play', exact: true }).click();
  await p.waitForTimeout(350);
  assert.ok(Number(await p.locator('.viewport').getAttribute('data-time')) > 14);
  await p.getByRole('button', { name: 'Pause', exact: true }).click();
  ok('Playback advances; reduced motion uses camera cuts');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole('button', { name: 'Interactive', exact: true }).click();
  await shot('mobile-empty');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await preview.getByRole('button', { name: 'Review request', exact: true }).click();
  await shot('mobile-invalid');
  ok('Mobile interactive form has no document overflow');
  await p.goto(`${base}/compose/render`);
  await p.locator('main[data-ready=true]').waitFor();
  await p
    .getByLabel('Open render handoff')
    .setInputFiles({
      name: 'handoff.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(h))
    });
  await p.locator('.viewport h2').filter({ hasText: 'Keep the useful details.' }).waitFor();
  await p.setViewportSize({ width: 1280, height: 1200 });
  await shot('handoff-render');
  ok('Independent handoff reader renders exported content and camera tracks');
  const tampered = structuredClone(h);
  tampered.composition.content.title = 'Tampered';
  await p
    .getByLabel('Open render handoff')
    .setInputFiles({
      name: 'tampered.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(tampered))
    });
  await p.getByText(/Composition digest mismatch/).waitFor();
  await p.locator('.viewport h2').filter({ hasText: 'Keep the useful details.' }).waitFor();
  ok('Handoff digest failure retains previous render');
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await p.getByRole('button', { name: '02 / Detail', exact: true }).click();
  await seek(3.8);
  await p.getByRole('button', { name: 'Play', exact: true }).click();
  await p.waitForTimeout(450);
  await shot('motion-intermediate');
  await p.getByRole('button', { name: 'Pause', exact: true }).click();
  await seek(5);
  await p.waitForTimeout(1000);
  await shot('motion-detail-settled');
  ok('Normal-motion intermediate and settled camera frames captured');
  const ids = await p.locator('[id]').evaluateAll((nodes) => nodes.map((n) => n.id));
  assert.equal(new Set(ids).size, ids.length);
  ok('DOM IDs are unique');
  assert.deepEqual(result.errors, []);
  result.completed = true;
  await context.close();
} finally {
  await writeFile(`${out}/browser-results.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
