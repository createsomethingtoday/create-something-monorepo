import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

let configuredUrl = process.env.CANVAS_URL;
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
let preview;
let browser;
let downloadUrl;

async function verify(viewport, label) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!new URL(request.url()).pathname.startsWith('/cdn-cgi/rum')) failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`);
  });
  const response = await page.goto(downloadUrl, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${label} landing returned ${response?.status() ?? 'no response'}`);
  if (await page.title() !== 'Draw for Mac | CREATE SOMETHING') throw new Error(`${label} title is incorrect`);
  if (await page.locator('link[rel="canonical"][href="https://draw.createsomething.agency/download"]').count() !== 1) throw new Error(`${label} canonical URL is unavailable`);
  if (await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent || '{}')['@type'])).then((types) => !types.includes('SoftwareApplication'))) throw new Error(`${label} SoftwareApplication schema is unavailable`);
  if (!(await page.getByRole('heading', { level: 1, name: /Keep the Mac authoritative/ }).isVisible())) throw new Error(`${label} proposition is unavailable`);
  if (await page.getByRole('link', { name: 'Open Draw' }).count() < 2) throw new Error(`${label} primary action is incomplete`);
  const requestLinks = page.getByRole('link', { name: 'Request Mac preview' });
  if (await requestLinks.count() !== 2 || !(await requestLinks.first().getAttribute('href'))?.startsWith('mailto:micah@createsomething.io')) throw new Error(`${label} preview handoff is incomplete`);
  if (!await page.getByText('unsigned, not notarized', { exact: false }).first().isVisible()) throw new Error(`${label} unsigned boundary is unavailable`);
  if (!await page.getByText('0c82b266fa7df6d7078bdc93d7ff2f02186da4168e7b3567f97a376f5843f0bd', { exact: true }).isVisible()) throw new Error(`${label} checksum is unavailable`);
  if (await page.locator('a[href$=".dmg"]').count()) throw new Error(`${label} exposes an unsigned public DMG`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error(`${label} has horizontal overflow`);
  if (errors.length) throw new Error(`${label} console errors: ${errors.join(' | ')}`);
  if (failedRequests.length) throw new Error(`${label} failed requests: ${failedRequests.join(' | ')}`);
  await page.getByRole('navigation', { name: 'Draw navigation' }).getByRole('link', { name: 'Open Draw' }).click();
  await page.getByRole('button', { name: /Pen tool/ }).waitFor();
  const workbenchPadding = await page.locator('.workbench').evaluate((node) => getComputedStyle(node).paddingTop);
  if (workbenchPadding !== '0px') throw new Error(`${label} landing styles leaked into the canvas (${workbenchPadding} workbench padding)`);
  await context.close();
  return 'pass';
}

try {
  if (!configuredUrl) {
    const port = await new Promise((resolve, reject) => {
      const listener = createServer();
      listener.once('error', reject);
      listener.listen(0, '127.0.0.1', () => {
        const address = listener.address();
        if (!address || typeof address === 'string') { listener.close(); reject(new Error('Could not reserve a preview port')); return; }
        listener.close((error) => error ? reject(error) : resolve(address.port));
      });
    });
    const build = spawnSync('pnpm', ['run', 'build'], { cwd: packageRoot, stdio: 'inherit' });
    if (build.status !== 0) throw new Error(`Production build failed with status ${build.status}`);
    configuredUrl = `http://127.0.0.1:${port}`;
    preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: packageRoot, stdio: 'inherit' });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { if ((await fetch(configuredUrl)).ok) break; } catch { /* Wait for the preview listener. */ }
      if (attempt === 99) throw new Error(`Preview did not start at ${configuredUrl}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!configuredUrl) throw new Error('Download verifier URL is unavailable');
  downloadUrl = new URL('/download', new URL(configuredUrl)).href;
  browser = await chromium.launch({ headless: true });
  const result = {
    url: downloadUrl,
    desktop: await verify({ width: 1440, height: 1000 }, 'Desktop'),
    mobile: await verify({ width: 390, height: 844 }, 'Mobile'),
    publicBinary: 'held-until-signed-and-notarized'
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  preview?.kill('SIGTERM');
}
