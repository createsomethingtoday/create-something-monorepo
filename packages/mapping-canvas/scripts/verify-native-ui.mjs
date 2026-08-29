import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.CANVAS_URL ?? 'http://127.0.0.1:4173';
const outputRoot = fileURLToPath(new URL('../output/native-ui/', import.meta.url));
await mkdir(outputRoot, { recursive: true });
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

async function nativePage(role, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ role, blankDocument }) => {
    let revision = 0;
    let online = true;
    let document = structuredClone(blankDocument);
    window.__nativeCalls = [];
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args = {}) => {
        window.__nativeCalls.push({ command, args });
        if (command === 'draw_runtime_role') return role;
        if (command === 'draw_host_status') return { sessionId: 'session-native', revision, document, pairedClients: [], transport: { endpoint: 'https://192.0.2.1:4242', certificateFingerprint: 'a'.repeat(64) } };
        if (command === 'draw_companion_status') return { status: 'unpaired' };
        if (command === 'draw_pair_begin') return { code: '271828', expiresAt: '2099-01-01T00:00:00Z' };
        if (command === 'draw_discover_hosts') return [{ endpoint: 'https://draw-mac.local:4242', sessionId: 'session-native', protocolVersion: 'create-something.draw-pairing.v1', certificateFingerprint: 'abcdef0123456789'.repeat(4), certificateDer: 'fixture-certificate' }];
        if (command === 'draw_companion_pair') return { status: 'paired', sessionId: 'session-native', revision, document, certificateFingerprint: 'abcdef0123456789'.repeat(4), queueDepth: 0, online };
        if (command === 'draw_companion_set_online') { online = args.online; return { status: online ? 'synced' : 'paired', revision, document, queueDepth: online ? 0 : 1, online }; }
        if (command === 'draw_companion_refresh') return { status: 'paired', sessionId: 'session-native', revision, document, queueDepth: 0, online, certificateFingerprint: 'abcdef0123456789'.repeat(4) };
        if (command === 'draw_host_apply_local' || command === 'draw_companion_submit') {
          revision += 1;
          const operation = args.operation;
          if (operation.type === 'put_object') document = { ...document, objects: [...document.objects.filter((item) => item.id !== operation.object.id), operation.object] };
          if (operation.type === 'set_title') document = { ...document, title: operation.title };
          if (operation.type === 'set_viewport') document = { ...document, viewport: operation.viewport };
          if (operation.type === 'remove_objects') document = { ...document, objects: document.objects.filter((item) => !operation.ids.includes(item.id)) };
          return online ? { status: 'applied', revision, document, queueDepth: 0, online } : { status: 'queued', revision: revision - 1, queueDepth: 1, online };
        }
        if (command === 'draw_revoke_client') return { status: 'revoked' };
        throw new Error(`Unexpected native command: ${command}`);
      }
    };
  }, { role, blankDocument });
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
  await host.page.screenshot({ path: `${outputRoot}mac-pairing.png`, fullPage: true });
  if (host.errors.length) throw new Error(`Mac native-shell errors: ${host.errors.join(' | ')}`);
  await host.context.close();

  const phone = await nativePage('companion', { width: 393, height: 852 });
  const { page } = phone;
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByText(/Fingerprint abcdef0123456789/).waitFor();
  await page.getByLabel('Pairing code').fill('271828');
  await page.getByRole('button', { name: 'Pair securely' }).click();
  await page.getByText('Paired securely with Mac over local Wi-Fi').waitFor();

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
  const before = await note.boundingBox();
  if (!before) throw new Error('Native note unavailable for movement');
  await page.mouse.move(before.x + 20, before.y + 20);
  await page.mouse.down();
  await page.mouse.move(before.x + 70, before.y + 70, { steps: 4 });
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
  await page.getByRole('button', { name: 'Open device pairing' }).click();
  await page.getByRole('button', { name: 'Reconnect' }).click();

  const calls = await page.evaluate(() => window.__nativeCalls);
  const operations = calls.filter(({ command }) => command === 'draw_companion_submit').map(({ args }) => args.operation.type);
  for (const required of ['put_object', 'convert']) if (!operations.includes(required)) throw new Error(`iPhone native bridge omitted ${required}`);
  if (!calls.some(({ command, args }) => command === 'draw_companion_set_online' && args.online === false) || !calls.some(({ command, args }) => command === 'draw_companion_set_online' && args.online === true)) throw new Error('Offline/reconnect bridge was not exercised');
  await page.screenshot({ path: `${outputRoot}iphone-paired.png`, fullPage: true });
  if (phone.errors.length) throw new Error(`iPhone native-shell errors: ${phone.errors.join(' | ')}`);
  await phone.context.close();
  console.log(JSON.stringify({ result: 'pass', hostCode: '271828', iPhoneOperations: operations, screenshots: [`${outputRoot}mac-pairing.png`, `${outputRoot}iphone-paired.png`] }, null, 2));
} finally {
  await browser.close();
}
