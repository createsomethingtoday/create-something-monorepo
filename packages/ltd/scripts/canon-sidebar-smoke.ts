import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '../..');
const existingBaseUrl = process.env.CANON_SIDEBAR_SMOKE_URL?.replace(/\/$/, '');
const chromePath = findChromePath();

interface DevServer {
  baseUrl: string;
  stop: () => Promise<void>;
  readLogs: () => string;
}

interface NavSnapshot {
  path: string;
  totalLinks: number;
  visibleLinks: string[];
  groupLabels: string[];
  visibleGroups: string[];
  openGroups: string[];
  openSections: string[];
  activeText: string | null;
  activeHref: string | null;
  activeVisible: boolean;
  sidebarOnScreen: boolean;
  navScrollTop: number;
}

function findChromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter((candidate): candidate is string => Boolean(candidate));

  const executablePath = candidates.find((candidate) => existsSync(candidate));
  if (!executablePath) {
    throw new Error(
      `Chrome executable not found. Set CHROME_PATH to a Chrome/Chromium binary before running the Canon sidebar smoke. Checked: ${candidates.join(
        ', '
      )}`
    );
  }

  return executablePath;
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate a local port.')));
        return;
      }
      const { port } = address;
      server.close(() => resolvePort(port));
    });
  });
}

async function startDevServer(): Promise<DevServer> {
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const logs: string[] = [];
  const child = spawn(
    'pnpm',
    ['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: packageDir,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  recordOutput(child, logs);

  try {
    await waitForHttp(`${baseUrl}/canon`, 45_000);
  } catch (error) {
    await stopProcess(child);
    throw new Error(
      `LTD dev server did not become ready at ${baseUrl}: ${
        error instanceof Error ? error.message : String(error)
      }\n\nServer output:\n${logs.join('')}`
    );
  }

  return {
    baseUrl,
    readLogs: () => logs.join(''),
    stop: () => stopProcess(child)
  };
}

function recordOutput(child: ChildProcessWithoutNullStreams, logs: string[]): void {
  child.stdout.on('data', (chunk) => {
    logs.push(String(chunk));
  });
  child.stderr.on('data', (chunk) => {
    logs.push(String(chunk));
  });
}

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function stopProcess(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.killed) return;

  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolveStop();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveStop();
    });
    child.kill('SIGTERM');
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function gotoCanonPath(page: Page, baseUrl: string, path: string): Promise<NavSnapshot> {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sidebar-nav');
  await page.waitForSelector('.nav-link-active');
  await sleep(150);
  return await collectNavSnapshot(page);
}

async function collectNavSnapshot(page: Page): Promise<NavSnapshot> {
  return (await page.evaluate(`(() => {
		const text = (element) => element?.textContent?.replace(/\\s+/g, ' ').trim() || null;
		const isHiddenByClosedDisclosure = (element) => {
			let current = element?.parentElement ?? null;
			while (current) {
				if (current.tagName === 'DETAILS' && !current.hasAttribute('open')) {
					const summary = current.querySelector(':scope > summary');
					return !summary?.contains(element);
				}
				current = current.parentElement;
			}
			return false;
		};
		const isOnScreen = (element) => {
			if (!element) return false;
			if (isHiddenByClosedDisclosure(element)) return false;
			const rect = element.getBoundingClientRect();
			const style = window.getComputedStyle(element);
			return (
				rect.width > 0 &&
				rect.height > 0 &&
				rect.right > 0 &&
				rect.bottom > 0 &&
				rect.left < window.innerWidth &&
				rect.top < window.innerHeight &&
				style.visibility !== 'hidden' &&
				style.display !== 'none'
			);
		};
		const pathFor = (anchor) => anchor ? new URL(anchor.href).pathname : null;
		const nav = document.querySelector('.sidebar-nav');
		const sidebar = document.querySelector('.sidebar');
		const activeLink = document.querySelector('.sidebar-nav a[aria-current="page"]');
		const links = Array.from(document.querySelectorAll('.sidebar-nav a[href]'));
		const groups = Array.from(document.querySelectorAll('details.nav-group'));
		const visibleLinks = links
			.filter((link) => isOnScreen(link))
			.map((link) => text(link.querySelector('.nav-link-text')) ?? text(link) ?? '');

		return {
			path: window.location.pathname,
			totalLinks: links.length,
			visibleLinks,
			groupLabels: groups.map((group) => text(group.querySelector('summary .nav-link-text')) ?? ''),
			visibleGroups: groups
				.filter((group) => isOnScreen(group.querySelector('summary')))
				.map((group) => text(group.querySelector('summary .nav-link-text')) ?? ''),
			openGroups: Array.from(document.querySelectorAll('details.nav-group[open]')).map(
				(group) => text(group.querySelector('summary .nav-link-text')) ?? ''
			),
			openSections: Array.from(document.querySelectorAll('details.nav-section[open]')).map(
				(section) => text(section.querySelector('summary .nav-section-title')) ?? ''
			),
			activeText: text(activeLink?.querySelector('.nav-link-text')) ?? text(activeLink),
			activeHref: pathFor(activeLink),
			activeVisible: isOnScreen(activeLink),
			sidebarOnScreen: isOnScreen(sidebar),
			navScrollTop: nav?.scrollTop ?? 0
		};
	})()`)) as NavSnapshot;
}

function assertRootCanon(snapshot: NavSnapshot): void {
  assert.equal(snapshot.path, '/canon');
  assert.equal(
    snapshot.totalLinks,
    53,
    'Canon sidebar should expose every registry-backed doc link.'
  );
  assert.deepEqual(snapshot.groupLabels, ['Primitives', 'Workflow', 'Systems']);
  assert.deepEqual(
    snapshot.openGroups,
    [],
    'Component groups should start collapsed on the Canon overview.'
  );
  assert.deepEqual(snapshot.visibleGroups, ['Primitives', 'Workflow', 'Systems']);
  assert.ok(snapshot.openSections.includes('Getting Started'));
  assert.ok(snapshot.openSections.includes('Components'));
  assert.equal(snapshot.activeText, 'Introduction');
  assert.equal(snapshot.activeHref, '/canon');
  assert.equal(snapshot.activeVisible, true);
  assert.equal(snapshot.sidebarOnScreen, true);
  assert.equal(snapshot.visibleLinks.includes('Overview'), true);
  assert.equal(
    snapshot.visibleLinks.includes('Conversion'),
    false,
    'Workflow child links should stay hidden until the Workflow group opens.'
  );
}

function assertConversionRoute(snapshot: NavSnapshot): void {
  assert.equal(snapshot.path, '/canon/components/conversion');
  assert.equal(
    snapshot.totalLinks,
    53,
    'Canon sidebar should keep the full registry-backed link set.'
  );
  assert.deepEqual(snapshot.groupLabels, ['Primitives', 'Workflow', 'Systems']);
  assert.equal(snapshot.openGroups.includes('Workflow'), true);
  assert.equal(snapshot.openGroups.includes('Primitives'), false);
  assert.equal(snapshot.openGroups.includes('Systems'), false);
  assert.ok(snapshot.openSections.includes('Components'));
  assert.equal(snapshot.activeText, 'Conversion');
  assert.equal(snapshot.activeHref, '/canon/components/conversion');
  assert.equal(snapshot.activeVisible, true);
  assert.equal(snapshot.sidebarOnScreen, true);
  assert.equal(snapshot.visibleLinks.includes('Conversion'), true);
  assert.equal(snapshot.visibleLinks.includes('Feedback'), true);
}

async function runSmoke(baseUrl: string): Promise<NavSnapshot[]> {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const snapshots: NavSnapshot[] = [];

    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    const canonRoot = await gotoCanonPath(page, baseUrl, '/canon');
    assertRootCanon(canonRoot);
    snapshots.push(canonRoot);

    const conversionDesktop = await gotoCanonPath(page, baseUrl, '/canon/components/conversion');
    assertConversionRoute(conversionDesktop);
    snapshots.push(conversionDesktop);

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await page.goto(`${baseUrl}/canon/components/conversion`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.menu-toggle');
    await page.click('.menu-toggle');
    await page.waitForSelector('.sidebar.sidebar-open');
    await page.waitForSelector('.nav-link-active');
    await sleep(150);
    const conversionMobile = await collectNavSnapshot(page);
    assertConversionRoute(conversionMobile);
    snapshots.push(conversionMobile);

    return snapshots;
  } catch (error) {
    await captureFailureScreenshot(browser);
    throw error;
  } finally {
    await browser.close();
  }
}

async function captureFailureScreenshot(browser: Browser): Promise<void> {
  const pages = await browser.pages();
  const activePage = pages.at(-1);
  if (!activePage) return;

  const outputDir = resolve(repoRoot, 'output/playwright');
  mkdirSync(outputDir, { recursive: true });
  await activePage.screenshot({
    path: resolve(outputDir, `canon-sidebar-smoke-${Date.now()}.png`),
    fullPage: true
  });
}

async function main(): Promise<void> {
  let devServer: DevServer | null = null;
  const baseUrl = existingBaseUrl ?? (devServer = await startDevServer()).baseUrl;

  try {
    const snapshots = await runSmoke(baseUrl);
    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl,
          chromePath,
          snapshots
        },
        null,
        2
      )
    );
    console.log('Canon sidebar smoke passed.');
  } catch (error) {
    if (devServer) {
      console.error(`LTD dev server output:\n${devServer.readLogs()}`);
    }
    throw error;
  } finally {
    await devServer?.stop();
  }
}

main().catch((error: unknown) => {
  console.error(
    `Canon sidebar smoke failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
  );
  process.exitCode = 1;
});
