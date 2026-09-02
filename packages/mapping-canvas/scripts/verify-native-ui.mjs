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
    window.__nativeConflictNextReplace = false;
    window.__nativeConflictInFlight = false;
    window.__nativeQueueFullNextReplace = false;
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args = {}) => {
        window.__nativeCalls.push({ command, args });
        if (command === 'draw_runtime_role') return role;
        if (command === 'draw_host_status') return { sessionId: 'session-native', revision, document, pairedClients: [{ clientId: 'iphone-d5794285-1d79-4609-9d08-6a5adab8bd56', revokedAt: null }], transport: { endpoint: 'https://192.0.2.1:4242', certificateFingerprint: 'a'.repeat(64) } };
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
          const operation = args.operation;
          if (operation.type === 'replace_objects' && window.__nativeQueueFullNextReplace) {
            window.__nativeQueueFullNextReplace = false;
            return { status: 'queue_full', error: 'Offline queue is full', revision, document, queueDepth: 500, online: false };
          }
          if (operation.type === 'replace_objects' && window.__nativeConflictNextReplace) {
            window.__nativeConflictInFlight = true;
            await new Promise((resolve) => setTimeout(resolve, 100));
            window.__nativeConflictNextReplace = false;
            window.__nativeConflictInFlight = false;
            const authoritative = { ...structuredClone(document), title: 'Conflict authoritative canvas' };
            document = authoritative;
            return { status: 'conflict', code: 'STALE_REVISION', revision, document: authoritative, queueDepth: 0, online };
          }
          revision += 1;
          if (operation.type === 'set_title') {
            titleSubmission += 1;
            await new Promise((resolve) => setTimeout(resolve, titleSubmission === 1 ? 50 : 200));
          }
          if (operation.type === 'put_object') document = { ...document, objects: [...document.objects.filter((item) => item.id !== operation.object.id), operation.object] };
          if (operation.type === 'set_title') document = { ...document, title: operation.title };
          if (operation.type === 'set_viewport') document = { ...document, viewport: operation.viewport };
          if (operation.type === 'remove_objects') document = { ...document, objects: document.objects.filter((item) => !operation.ids.includes(item.id)) };
          if (operation.type === 'replace_objects') document = { ...document, objects: operation.objects };
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
  await host.page.getByText(/Both devices must be on the same local network/).waitFor();
  if (!(await host.page.getByText(/Mac fingerprint aaaaaaaaaaaaaaaa/).isVisible())) throw new Error('Mac pairing fingerprint is unavailable beside the code');
  const revoke = host.page.getByRole('button', { name: 'Revoke', exact: true });
  if (await revoke.evaluate((button) => getComputedStyle(button).whiteSpace !== 'nowrap')) throw new Error('Mac pairing Revoke action can wrap inside the paired-device row');
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
  for (const action of ['Import']) {
    if (await page.getByRole('button', { name: action, exact: true }).count()) throw new Error(`${action} must not be exposed on the companion`);
  }
  if (!(await page.getByRole('button', { name: 'Reset', exact: true }).isVisible())) throw new Error('Companion reset control is unavailable');

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
  const notesBeforePinch = await page.locator('g[aria-label^="Note:"]').count();
  const putsBeforePinch = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'put_object').length);
  await surface.dispatchEvent('pointerdown', { pointerId: 21, pointerType: 'touch', button: 0, clientX: box.x + 90, clientY: box.y + 180 });
  await surface.dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch', button: 0, clientX: box.x + 220, clientY: box.y + 180 });
  await surface.dispatchEvent('pointermove', { pointerId: 22, pointerType: 'touch', button: 0, clientX: box.x + 300, clientY: box.y + 230 });
  await surface.dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch', button: 0, clientX: box.x + 300, clientY: box.y + 230 });
  await surface.dispatchEvent('pointerup', { pointerId: 21, pointerType: 'touch', button: 0, clientX: box.x + 90, clientY: box.y + 180 });
  if (await page.getByText('100%').count()) throw new Error('Two-finger pinch did not change companion zoom');
  if (await page.locator('g[aria-label^="Note:"]').count() !== notesBeforePinch) throw new Error('Pinch while the Note tool was active created a stray note');
  const putsAfterPinch = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'put_object').length);
  if (putsAfterPinch !== putsBeforePinch) throw new Error('Pinch while the Note tool was active submitted a stray object');
  const zoomBeforeCancelledPinch = await page.locator('.history span').textContent();
  const viewportSubmitsBeforeCancel = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'set_viewport').length);
  await surface.dispatchEvent('pointerdown', { pointerId: 25, pointerType: 'touch', button: 0, clientX: box.x + 90, clientY: box.y + 180 });
  await surface.dispatchEvent('pointerdown', { pointerId: 26, pointerType: 'touch', button: 0, clientX: box.x + 220, clientY: box.y + 180 });
  await surface.dispatchEvent('pointermove', { pointerId: 26, pointerType: 'touch', button: 0, clientX: box.x + 340, clientY: box.y + 250 });
  await surface.dispatchEvent('pointercancel', { pointerId: 26, pointerType: 'touch', button: 0, clientX: box.x + 340, clientY: box.y + 250 });
  await surface.dispatchEvent('pointerup', { pointerId: 25, pointerType: 'touch', button: 0, clientX: box.x + 90, clientY: box.y + 180 });
  if (await page.locator('.history span').textContent() !== zoomBeforeCancelledPinch) throw new Error('Cancelled pinch did not restore its starting viewport');
  const viewportSubmitsAfterCancel = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'set_viewport').length);
  if (viewportSubmitsAfterCancel !== viewportSubmitsBeforeCancel) throw new Error('Cancelled pinch submitted a tentative viewport');
  await surface.dispatchEvent('pointerdown', { pointerId: 24, pointerType: 'touch', button: 0, clientX: box.x + 130, clientY: box.y + 190 });
  await surface.dispatchEvent('pointercancel', { pointerId: 24, pointerType: 'touch', button: 0, clientX: box.x + 130, clientY: box.y + 190 });
  if (await page.locator('g[aria-label^="Note:"]').count() !== notesBeforePinch) throw new Error('A cancelled touch created a stray note');
  await surface.dispatchEvent('pointerdown', { pointerId: 23, pointerType: 'touch', button: 0, clientX: box.x + 110, clientY: box.y + 170 });
  await surface.dispatchEvent('pointerup', { pointerId: 23, pointerType: 'touch', button: 0, clientX: box.x + 110, clientY: box.y + 170 });
  const editor = page.getByLabel('Edit note');
  await editor.fill('MCP tools use spaces');
  if (await editor.inputValue() !== 'MCP tools use spaces') throw new Error('Native note lost spaces');
  await page.waitForTimeout(250);
  const callsBeforeQueueFullReset = await page.evaluate(() => {
    window.__nativeQueueFullNextReplace = true;
    return window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length;
  });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await page.waitForFunction((before) => window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length > before, callsBeforeQueueFullReset);
  await page.waitForTimeout(100);
  const callsAfterQueueFullReset = await page.evaluate(() => window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length);
  if (callsAfterQueueFullReset !== callsBeforeQueueFullReset + 1) throw new Error('Queue-full history replacement did not abort its trailing operations');
  if (await page.getByLabel('Edit note').inputValue() !== 'MCP tools use spaces') throw new Error('Queue-full history replacement did not restore the authoritative document');

  await page.getByRole('button', { name: /Select tool/ }).click();
  const note = page.locator('g[aria-label^="Note:"]');
  const beforeObjectPinch = await note.boundingBox();
  if (!beforeObjectPinch) throw new Error('Native note unavailable for object pinch');
  const putsBeforeObjectPinch = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'put_object').length);
  await note.dispatchEvent('pointerdown', { pointerId: 31, pointerType: 'touch', button: 0, clientX: beforeObjectPinch.x + 8, clientY: beforeObjectPinch.y + 8 });
  await surface.dispatchEvent('pointerdown', { pointerId: 32, pointerType: 'touch', button: 0, clientX: box.x + 300, clientY: box.y + 300 });
  await surface.dispatchEvent('pointermove', { pointerId: 32, pointerType: 'touch', button: 0, clientX: box.x + 350, clientY: box.y + 350 });
  await surface.dispatchEvent('pointerup', { pointerId: 32, pointerType: 'touch', button: 0, clientX: box.x + 350, clientY: box.y + 350 });
  await note.dispatchEvent('pointerup', { pointerId: 31, pointerType: 'touch', button: 0, clientX: beforeObjectPinch.x + 8, clientY: beforeObjectPinch.y + 8 });
  const putsAfterObjectPinch = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'put_object').length);
  if (putsAfterObjectPinch !== putsBeforeObjectPinch) throw new Error('Pinch beginning on a canvas object committed an object drag');
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
  await page.getByRole('button', { name: 'Undo' }).click();
  if (await page.getByRole('button', { name: 'Redo' }).isDisabled()) throw new Error('Companion undo did not preserve redo history');
  await page.getByRole('button', { name: 'Redo' }).click();

  await page.getByRole('button', { name: /Group tool/ }).click();
  await surface.dispatchEvent('pointerdown', { pointerId: 40, pointerType: 'touch', button: 0, clientX: box.x + 45, clientY: box.y + 430 });
  await surface.dispatchEvent('pointerup', { pointerId: 40, pointerType: 'touch', button: 0, clientX: box.x + 45, clientY: box.y + 430 });
  await page.getByRole('button', { name: /Select tool/ }).click();
  const group = page.getByRole('button', { name: /^Group:/ });
  await group.click();
  const resize = page.getByRole('button', { name: 'Resize group' });
  const groupGeometry = (locator) => locator.locator('rect').first().evaluate((rect) => ({ width: rect.getAttribute('width'), height: rect.getAttribute('height') }));
  const groupBeforeCancel = await groupGeometry(group);
  const resizeBox = await resize.boundingBox();
  if (!resizeBox) throw new Error('Native group resize affordance unavailable');
  const replacementsBeforeCancel = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'replace_objects').length);
  await resize.dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch', button: 0, clientX: resizeBox.x + 5, clientY: resizeBox.y + 5 });
  await surface.dispatchEvent('pointermove', { pointerId: 41, pointerType: 'touch', button: 0, clientX: resizeBox.x + 50, clientY: resizeBox.y + 50 });
  await surface.dispatchEvent('pointercancel', { pointerId: 41, pointerType: 'touch', button: 0, clientX: resizeBox.x + 50, clientY: resizeBox.y + 50 });
  const groupAfterCancel = await groupGeometry(group);
  const replacementsAfterCancel = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'replace_objects').length);
  if (groupAfterCancel.width !== groupBeforeCancel.width || groupAfterCancel.height !== groupBeforeCancel.height) throw new Error('Cancelled group resize changed group geometry');
  if (replacementsAfterCancel !== replacementsBeforeCancel) throw new Error('Cancelled group resize submitted a replacement');

  const resizeForPinch = await resize.boundingBox();
  if (!resizeForPinch) throw new Error('Native group resize affordance disappeared');
  await resize.dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', button: 0, clientX: resizeForPinch.x + 5, clientY: resizeForPinch.y + 5 });
  await surface.dispatchEvent('pointermove', { pointerId: 42, pointerType: 'touch', button: 0, clientX: resizeForPinch.x + 45, clientY: resizeForPinch.y + 45 });
  await resize.dispatchEvent('pointerdown', { pointerId: 43, pointerType: 'touch', button: 0, clientX: resizeForPinch.x + 7, clientY: resizeForPinch.y + 7 });
  await surface.dispatchEvent('pointermove', { pointerId: 43, pointerType: 'touch', button: 0, clientX: box.x + 340, clientY: box.y + 390 });
  await surface.dispatchEvent('pointerup', { pointerId: 43, pointerType: 'touch', button: 0, clientX: box.x + 340, clientY: box.y + 390 });
  await resize.dispatchEvent('pointerup', { pointerId: 42, pointerType: 'touch', button: 0, clientX: resizeForPinch.x + 45, clientY: resizeForPinch.y + 45 });
  const groupAfterPinch = await groupGeometry(group);
  if (groupAfterPinch.width !== groupBeforeCancel.width || groupAfterPinch.height !== groupBeforeCancel.height) throw new Error('Pinch takeover committed an in-progress group resize');

  await note.focus();
  await note.press('Enter');
  await page.getByTestId('convert-menu').click();
  await page.getByTestId('convert-note').click();
  if (await page.locator('.provenance').count() !== 1) throw new Error('Native conversion did not preserve its source');

  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByRole('button', { name: 'Test offline' }).click();
  await page.getByRole('button', { name: 'Close pairing' }).click();
  await page.getByRole('button', { name: /Pen tool/ }).click();
  const currentBox = await surface.boundingBox();
  if (!currentBox) throw new Error('iPhone canvas surface disappeared after pinch verification');
  await surface.dispatchEvent('pointerdown', { pointerId: 60, pointerType: 'mouse', button: 0, clientX: currentBox.x + 50, clientY: currentBox.y + 90 });
  await surface.dispatchEvent('pointermove', { pointerId: 60, pointerType: 'mouse', button: 0, clientX: currentBox.x + 180, clientY: currentBox.y + 140 });
  await surface.dispatchEvent('pointerup', { pointerId: 60, pointerType: 'mouse', button: 0, clientX: currentBox.x + 180, clientY: currentBox.y + 140 });
  await page.locator('path[aria-label="Ink stroke"]').last().waitFor();
  const queuedInk = await page.evaluate(() => window.__nativeCalls.some(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'put_object' && args.operation.object?.kind === 'stroke'));
  if (!queuedInk) throw new Error('Offline ink did not reach the durable companion queue');
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByLabel('Canvas title').waitFor();
  if (await page.getByLabel('Canvas title').inputValue() !== 'Mac authoritative reconciliation') throw new Error('Reconciliation did not install the Mac-authoritative document');
  await page.getByRole('button', { name: 'Close pairing' }).click();

  await page.getByRole('button', { name: /Note tool/ }).click();
  await surface.dispatchEvent('pointerdown', { pointerId: 50, pointerType: 'touch', button: 0, clientX: box.x + 180, clientY: box.y + 260 });
  await surface.dispatchEvent('pointerup', { pointerId: 50, pointerType: 'touch', button: 0, clientX: box.x + 180, clientY: box.y + 260 });
  await page.waitForTimeout(1000);

  const submitsBeforeConflict = await page.evaluate(() => window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length);
  await page.evaluate(() => { window.__nativeConflictNextReplace = true; });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await page.waitForFunction(() => window.__nativeConflictNextReplace === false);
  await page.waitForTimeout(500);
  const submitsAfterConflict = await page.evaluate(() => window.__nativeCalls.filter(({ command }) => command === 'draw_companion_submit').length);
  if (submitsAfterConflict !== submitsBeforeConflict + 1) throw new Error('Rejected replacement did not abort the remaining reset operation batch');

  const replacementsBeforeSuccessfulReset = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'replace_objects').length);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  const confirmReset = page.getByRole('button', { name: 'Confirm reset', exact: true });
  if (!await confirmReset.evaluate((button) => button.classList.contains('reset-confirm'))) throw new Error('Companion reset confirmation is not visually distinguished as a risk action');
  await confirmReset.click();
  await page.waitForFunction((before) => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'replace_objects').length > before, replacementsBeforeSuccessfulReset);
  await page.waitForTimeout(100);
  if (await page.locator('[aria-label="Ink stroke"], [aria-label^="Note:"]').count()) throw new Error('Companion reset did not clear the authoritative canvas');
  await page.waitForTimeout(250);
  const emptyReplacementsBeforeReset = await page.evaluate(() => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'replace_objects').length);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await page.waitForFunction((before) => window.__nativeCalls.filter(({ command, args }) => command === 'draw_companion_submit' && args?.operation?.type === 'replace_objects').length > before, emptyReplacementsBeforeReset);

  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByRole('button', { name: 'Forget and re-pair' }).click();
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByText(/Confirm the Mac fingerprint/).waitFor();

  const calls = await page.evaluate(() => window.__nativeCalls);
  const operations = calls.filter(({ command }) => command === 'draw_companion_submit').map(({ args }) => args.operation.type);
  for (const required of ['put_object', 'convert', 'replace_objects', 'set_viewport']) if (!operations.includes(required)) throw new Error(`iPhone native bridge omitted ${required}`);
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
