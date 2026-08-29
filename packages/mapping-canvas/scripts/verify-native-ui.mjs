import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

let baseUrl = process.env.CANVAS_URL;
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = fileURLToPath(new URL('../output/native-ui/', import.meta.url));
await mkdir(outputRoot, { recursive: true });
let preview;
if (!process.env.CANVAS_URL) {
  const port = await new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      if (!address || typeof address === 'string') { listener.close(); reject(new Error('Could not reserve a native preview port')); return; }
      listener.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
  baseUrl = `http://127.0.0.1:${port}`;
  const build = spawnSync('pnpm', ['run', 'build:native'], { cwd: packageRoot, stdio: 'inherit' });
  if (build.status !== 0) throw new Error(`Native static build failed with status ${build.status}`);
  preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: packageRoot, stdio: 'inherit' });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(baseUrl)).ok) break; } catch { /* Wait for the local preview listener. */ }
    if (attempt === 99) throw new Error(`Native preview did not start at ${baseUrl}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
if (!baseUrl) throw new Error('Native verifier URL is unavailable');
const browser = await chromium.launch({ headless: true });

const blankDocument = {
  version: 'create-something.mapping-canvas.v1',
  id: 'canvas-native-verifier',
  title: 'Untitled mapping session',
  createdAt: '2026-08-29T16:00:00Z',
  updatedAt: '2026-08-29T16:00:00Z',
  viewport: { x: 0, y: 0, zoom: 1 },
  objects: []
};

async function nativePage(role, viewport, restoredQueue = false) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ role, blankDocument, restoredQueue }) => {
    let revision = 0;
    let online = true;
    let document = structuredClone(blankDocument);
    let titleSubmission = 0;
    window.__nativeCalls = [];
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args = {}) => {
        window.__nativeCalls.push({ command, args });
        if (command === 'draw_runtime_role') return role;
        if (command === 'draw_host_status') return { sessionId: 'session-native', revision, document, pairedClients: [], transport: { endpoint: 'https://192.0.2.1:4242', certificateFingerprint: 'a'.repeat(64) } };
        if (command === 'draw_companion_status') return restoredQueue ? { status: 'paired', sessionId: 'session-native', revision, document, certificateFingerprint: 'abcdef0123456789'.repeat(4), queueDepth: 1, online: true } : { status: 'unpaired' };
        if (command === 'draw_pair_begin') return { code: '271828', expiresAt: '2099-01-01T00:00:00Z' };
        if (command === 'draw_discover_hosts') return [{ endpoint: 'https://draw-mac.local:4242', sessionId: 'session-native', protocolVersion: 'create-something.draw-pairing.v1', certificateFingerprint: 'abcdef0123456789'.repeat(4), certificateDer: 'fixture-certificate' }];
        if (command === 'draw_companion_pair') return { status: 'paired', sessionId: 'session-native', revision, document, certificateFingerprint: 'abcdef0123456789'.repeat(4), queueDepth: 0, online };
        if (command === 'draw_companion_set_online') {
          online = args.online;
          if (online) document = { ...document, title: 'Mac authoritative reconciliation' };
          return { status: online ? 'synced' : 'paired', revision, document, queueDepth: online ? 0 : 1, online };
        }
        if (command === 'draw_companion_refresh') return { status: 'paired', sessionId: 'session-native', revision, document, queueDepth: 0, online, certificateFingerprint: 'abcdef0123456789'.repeat(4) };
        if (command === 'draw_companion_forget') return { status: 'unpaired' };
        if (command === 'draw_host_apply_local' || command === 'draw_companion_submit') {
          revision += 1;
          const operation = args.operation;
          if (operation.type === 'set_title') {
            titleSubmission += 1;
            await new Promise((resolve) => setTimeout(resolve, titleSubmission === 1 ? 50 : 200));
          }
          if (operation.type === 'put_object') document = { ...document, objects: [...document.objects.filter((item) => item.id !== operation.object.id), operation.object] };
          if (operation.type === 'set_title') document = { ...document, title: operation.title };
          if (operation.type === 'set_viewport') document = { ...document, viewport: operation.viewport };
          if (operation.type === 'remove_objects') document = { ...document, objects: document.objects.filter((item) => !operation.ids.includes(item.id)) };
          if (operation.type === 'convert') {
            const sourceSnapshot = document.objects.filter((item) => operation.selectedIds.includes(item.id));
            const retained = document.objects.filter((item) => !operation.selectedIds.includes(item.id));
            document = { ...document, objects: [...retained, { id: operation.resultId, kind: 'note', text: 'New thought', x: 100, y: 100, width: 260, height: 140, createdAt: operation.createdAt, sourceIds: operation.selectedIds, sourceSnapshot }] };
          }
          return online ? { status: 'applied', revision, document, queueDepth: 0, online } : { status: 'queued', revision: revision - 1, queueDepth: 1, online };
        }
        if (command === 'draw_revoke_client') return { status: 'revoked' };
        throw new Error(`Unexpected native command: ${command}`);
      }
    };
  }, { role, blankDocument, restoredQueue });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open device pairing' }).waitFor();
  return { context, page, errors };
}

try {
  const host = await nativePage('host', { width: 1440, height: 900 });
  await host.page.getByRole('button', { name: 'Open device pairing' }).click();
  await host.page.getByText('271828').waitFor();
  if (!(await host.page.getByText(/Both devices must be on the same local network/).isVisible())) throw new Error('Mac pairing guidance is unavailable');
  if (!(await host.page.getByText(/Mac fingerprint aaaaaaaaaaaaaaaa/).isVisible())) throw new Error('Mac pairing fingerprint is unavailable beside the code');
  await host.page.screenshot({ path: `${outputRoot}mac-pairing.png`, fullPage: true });
  if (host.errors.length) throw new Error(`Mac native-shell errors: ${host.errors.join(' | ')}`);
  await host.context.close();

  const unpaired = await nativePage('companion', { width: 393, height: 852 });
  const unpairedSurface = unpaired.page.locator('svg');
  const unpairedBox = await unpairedSurface.boundingBox();
  if (!unpairedBox) throw new Error('Unpaired iPhone canvas surface unavailable');
  await unpaired.page.getByRole('button', { name: /Note tool/ }).click();
  await unpaired.page.mouse.click(unpairedBox.x + 110, unpairedBox.y + 170);
  if (await unpaired.page.getByLabel('Edit note').count()) throw new Error('Unpaired iPhone created an optimistic note');
  await unpaired.page.getByText('Pair this iPhone with a Mac before editing').waitFor();
  const unpairedCalls = await unpaired.page.evaluate(() => window.__nativeCalls);
  if (unpairedCalls.some(({ command }) => command === 'draw_companion_submit')) throw new Error('Unpaired iPhone submitted a canvas operation');
  if (unpaired.errors.length) throw new Error(`Unpaired iPhone native-shell errors: ${unpaired.errors.join(' | ')}`);
  await unpaired.context.close();

  const phone = await nativePage('companion', { width: 393, height: 852 });
  const { page } = phone;
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByText(/Fingerprint abcdef0123456789/).waitFor();
  await page.getByLabel('Pairing code').fill('271828');
  await page.getByRole('button', { name: 'Pair securely' }).click();
  await page.getByText('Paired securely with Mac over local Wi-Fi').waitFor();
  for (const action of ['Import', 'Reset']) {
    if (await page.getByRole('button', { name: action, exact: true }).count()) throw new Error(`${action} must not be exposed on the companion`);
  }

  const title = page.getByLabel('Canvas title');
  await title.fill('A');
  await title.fill('AB');
  await page.waitForTimeout(100);
  if (await title.inputValue() !== 'AB') throw new Error('Earlier native response overwrote newer optimistic title input');
  await page.waitForTimeout(200);
  if (await title.inputValue() !== 'AB') throw new Error('Final native title reconciliation lost rapid input');
  const submittedBeforeInvalidTitle = await page.evaluate(() => window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length);
  await title.fill('é'.repeat(121));
  if (await title.inputValue() !== 'AB') throw new Error('Over-limit UTF-8 title changed optimistic UI');
  const submittedAfterInvalidTitle = await page.evaluate(() => window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length);
  if (submittedAfterInvalidTitle !== submittedBeforeInvalidTitle) throw new Error('Over-limit UTF-8 title reached native transport');

  const surface = page.locator('svg');
  const box = await surface.boundingBox();
  if (!box) throw new Error('iPhone canvas surface unavailable');
  await page.getByRole('button', { name: /Note tool/ }).click();
  await page.mouse.click(box.x + 110, box.y + 170);
  const editor = page.getByLabel('Edit note');
  await editor.fill('MCP tools use spaces');
  if (await editor.inputValue() !== 'MCP tools use spaces') throw new Error('Native note lost spaces');

  await page.getByRole('button', { name: /Select tool/ }).click();
  const note = page.locator('g[aria-label^="Note:"]');
  const editorBeforePointer = await note.boundingBox();
  await editor.dispatchEvent('pointerdown', { pointerId: 11, button: 0, clientX: 130, clientY: 190 });
  const editorAfterPointer = await note.boundingBox();
  if (!editorBeforePointer || !editorAfterPointer || editorAfterPointer.x !== editorBeforePointer.x || editorAfterPointer.y !== editorBeforePointer.y) throw new Error('Note textarea pointerdown started a canvas drag');
  const before = await note.boundingBox();
  if (!before) throw new Error('Native note unavailable for movement');
  await page.mouse.move(before.x + 5, before.y + 5);
  await page.mouse.down();
  await page.mouse.move(before.x + 55, before.y + 55, { steps: 4 });
  await page.mouse.up();
  const after = await note.boundingBox();
  if (!after || after.x < before.x + 40 || after.y < before.y + 40) throw new Error('Touch movement did not reposition the note');

  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-note').click();
  if (await page.locator('.provenance').count() !== 1) throw new Error('Native conversion did not preserve its source');

  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByRole('button', { name: 'Test offline' }).click();
  await page.getByRole('button', { name: 'Close pairing' }).click();
  await page.getByRole('button', { name: /Pen tool/ }).click();
  await page.mouse.move(box.x + 50, box.y + 90);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 140, { steps: 6 });
  await page.mouse.up();
  await page.getByText(/action queued/).waitFor();
  if (await page.locator('path[aria-label="Ink stroke"]').count() < 1) throw new Error('Queued optimistic ink disappeared before reconnect');
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByLabel('Canvas title').waitFor();
  if (await page.getByLabel('Canvas title').inputValue() !== 'Mac authoritative reconciliation') throw new Error('Reconciliation did not install the Mac-authoritative document');

  await page.getByRole('button', { name: 'Forget and re-pair' }).click();
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByText(/Confirm the Mac fingerprint/).waitFor();

  const calls = await page.evaluate(() => window.__nativeCalls);
  const operations = calls.filter(({ command }) => command === 'draw_companion_submit').map(({ args }) => args.operation.type);
  for (const required of ['put_object', 'convert']) if (!operations.includes(required)) throw new Error(`iPhone native bridge omitted ${required}`);
  if (!calls.some(({ command, args }) => command === 'draw_companion_set_online' && args.online === false) || !calls.some(({ command, args }) => command === 'draw_companion_set_online' && args.online === true)) throw new Error('Offline/reconnect bridge was not exercised');
  if (!calls.some(({ command }) => command === 'draw_companion_forget')) throw new Error('Forget and re-pair bridge was not exercised');
  await page.screenshot({ path: `${outputRoot}iphone-paired.png`, fullPage: true });
  if (phone.errors.length) throw new Error(`iPhone native-shell errors: ${phone.errors.join(' | ')}`);
  await phone.context.close();

  const restored = await nativePage('companion', { width: 393, height: 852 }, true);
  await restored.page.getByLabel('Canvas title').waitFor();
  if (await restored.page.getByLabel('Canvas title').inputValue() !== 'Mac authoritative reconciliation') throw new Error('Restored companion queue did not flush during initialization');
  const restoredCalls = await restored.page.evaluate(() => window.__nativeCalls);
  if (!restoredCalls.some(({ command, args }) => command === 'draw_companion_set_online' && args.online === true)) throw new Error('Initialization did not invoke restored-queue reconciliation');
  if (restored.errors.length) throw new Error(`Restored iPhone native-shell errors: ${restored.errors.join(' | ')}`);
  await restored.context.close();
  console.log(JSON.stringify({ result: 'pass', hostCode: '271828', iPhoneOperations: operations, screenshots: [`${outputRoot}mac-pairing.png`, `${outputRoot}iphone-paired.png`] }, null, 2));
} finally {
  await browser.close();
  preview?.kill('SIGTERM');
}
