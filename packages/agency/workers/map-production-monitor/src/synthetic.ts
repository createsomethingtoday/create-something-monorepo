import puppeteer, { type BrowserWorker, type Page } from '@cloudflare/puppeteer';

import type { MapSyntheticCheck, MapSyntheticResult } from './monitor.ts';

type Viewport = {
  name: 'desktop' | 'mobile';
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
};

const VIEWPORTS: readonly Viewport[] = [
  { name: 'desktop', width: 1280, height: 720, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const NAVIGATION_TIMEOUT_MS = 30_000;

class SyntheticFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function errorCode(cause: unknown): string {
  if (cause instanceof SyntheticFailure) return cause.code;
  if (cause instanceof Error && cause.name === 'TimeoutError') return 'TIMEOUT';
  return 'CHECK_FAILED';
}

async function recordCheck(
  checks: MapSyntheticCheck[],
  viewport: Viewport['name'],
  id: string,
  operation: () => Promise<void>,
): Promise<void> {
  const startedAt = Date.now();
  try {
    await operation();
    checks.push({ id: `${viewport}_${id}`, ok: true, durationMs: elapsedSince(startedAt) });
  } catch (cause) {
    checks.push({
      id: `${viewport}_${id}`,
      ok: false,
      code: errorCode(cause),
      durationMs: elapsedSince(startedAt),
    });
  }
}

async function requireResponseStatus(
  page: Page,
  url: string,
  code: string,
): Promise<void> {
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: NAVIGATION_TIMEOUT_MS,
  });
  if (response?.status() !== 200) throw new SyntheticFailure(code);
}

async function bookingSnapshot(page: Page): Promise<{
  summary: string;
  href: string;
}> {
  const snapshot = await page.evaluate(() => {
    const details = document.querySelector('.summary-panel details');
    const summary = details?.querySelector('summary');
    const pre = details?.querySelector('pre');
    const link = [...(details?.querySelectorAll('a') ?? [])].find(
      (candidate) => candidate.textContent?.trim() === 'Use this in booking',
    );
    if (!(details instanceof HTMLDetailsElement) || !summary || !pre || !(link instanceof HTMLAnchorElement)) {
      return null;
    }
    details.open = true;
    return { summary: pre.innerText, href: link.href };
  });
  if (!snapshot?.href || !snapshot.summary) throw new SyntheticFailure('BOOKING_SUMMARY_MISSING');
  return snapshot;
}

function assertBookingSnapshot(snapshot: { summary: string; href: string }): {
  session: string;
} {
  const publicReference = snapshot.summary.match(/^Map reference: (map_[a-zA-Z0-9]+)$/m)?.[1];
  const readiness = snapshot.summary.match(/^Readiness: (.+) \((\d+)\/100\)$/m);
  const bookingUrl = new URL(snapshot.href);
  const session = bookingUrl.searchParams.get('atlas_session_id');
  if (!publicReference || !readiness || !session) throw new SyntheticFailure('BOOKING_CONTEXT_INVALID');
  const expectedReference = `map_${session.replace(/[^a-zA-Z0-9]/g, '').slice(-16) || 'anonymous'}`;
  const expectedSlug = readiness[1]!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (
    publicReference !== expectedReference ||
    bookingUrl.searchParams.get('score') !== readiness[2] ||
    bookingUrl.searchParams.get('readiness') !== expectedSlug
  ) {
    throw new SyntheticFailure('BOOKING_CONTEXT_MISMATCH');
  }
  return { session };
}

async function clickStarter(page: Page): Promise<void> {
  const clicked = await page.evaluate(() => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('.starter-grid button')].find(
      (candidate) => candidate.textContent?.includes('RevOps lead handoff'),
    );
    if (!button) return false;
    button.click();
    return true;
  });
  if (!clicked) throw new SyntheticFailure('STARTER_NOT_FOUND');
  await page.waitForFunction(
    () => document.querySelector('.starter-panel .panel-title strong')?.textContent?.trim() === 'RevOps lead handoff loaded',
    { timeout: NAVIGATION_TIMEOUT_MS },
  );
}

async function updateLabel(page: Page, label: string): Promise<void> {
  const updated = await page.evaluate((nextLabel) => {
    const candidate = [...document.querySelectorAll('label')].find(
      (labelElement) => labelElement.querySelector('span')?.textContent?.trim() === 'Label',
    );
    const input = candidate?.querySelector('input');
    if (!(input instanceof HTMLInputElement)) return false;
    input.value = nextLabel;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, label);
  if (!updated) throw new SyntheticFailure('LABEL_INPUT_MISSING');
}

async function resetCanvas(page: Page): Promise<void> {
  const reset = await page.evaluate(() => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('.summary-actions button.danger')].find(
      (candidate) => candidate.textContent?.trim() === 'Reset',
    );
    if (!button) return false;
    button.click();
    return true;
  });
  if (!reset) throw new SyntheticFailure('RESET_CONTROL_MISSING');
}

async function runViewport(
  page: Page,
  viewport: Viewport,
  baseUrl: string,
): Promise<MapSyntheticCheck[]> {
  const checks: MapSyntheticCheck[] = [];
  const consoleFailures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleFailures.push('console_error');
  });
  page.on('pageerror', () => consoleFailures.push('page_error'));

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: 1,
  });

  const mapUrl = new URL('/map', baseUrl).toString();
  await recordCheck(checks, viewport.name, 'route_and_responsive_render', async () => {
    await requireResponseStatus(page, mapUrl, 'MAP_ROUTE_UNAVAILABLE');
    await page.evaluate(() => localStorage.clear());
    const response = await page.reload({ waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    if (response?.status() !== 200) throw new SyntheticFailure('MAP_RELOAD_UNAVAILABLE');
    await page.waitForSelector('[aria-label="Public Map workflow canvas"]', {
      visible: true,
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) throw new SyntheticFailure('HORIZONTAL_OVERFLOW');
  });

  let starterSession = '';
  await recordCheck(checks, viewport.name, 'starter_booking_context', async () => {
    await clickStarter(page);
    const snapshot = await bookingSnapshot(page);
    const context = assertBookingSnapshot(snapshot);
    if (!snapshot.summary.includes('Readiness: Pilot candidate (100/100)')) {
      throw new SyntheticFailure('STARTER_READINESS_INVALID');
    }
    starterSession = context.session;
  });

  await recordCheck(checks, viewport.name, 'edit_booking_context', async () => {
    if (!starterSession) throw new SyntheticFailure('STARTER_CONTEXT_MISSING');
    await updateLabel(page, 'Synthetic workflow record');
    const snapshot = await bookingSnapshot(page);
    const context = assertBookingSnapshot(snapshot);
    if (!snapshot.summary.includes('Synthetic workflow record') || context.session !== starterSession) {
      throw new SyntheticFailure('EDIT_CONTEXT_INVALID');
    }
    const persisted = await page.evaluate(
      () => localStorage.getItem('create-something:workflow-mapping-warmup')?.includes('Synthetic workflow record') === true,
    );
    if (!persisted) throw new SyntheticFailure('LOCAL_CONTEXT_MISSING');
  });

  await recordCheck(checks, viewport.name, 'restore_booking_context', async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('create-something:public-atlas-canvas');
      if (!raw) return false;
      try {
        const canvas = JSON.parse(raw) as { nodes?: { label?: string }[] };
        return canvas.nodes?.some((node) => node.label === 'Synthetic workflow record') === true;
      } catch {
        return false;
      }
    }, { timeout: NAVIGATION_TIMEOUT_MS });
    const snapshot = await bookingSnapshot(page);
    const context = assertBookingSnapshot(snapshot);
    if (!snapshot.summary.includes('Synthetic workflow record') || context.session !== starterSession) {
      throw new SyntheticFailure('RESTORE_CONTEXT_INVALID');
    }
  });

  await recordCheck(checks, viewport.name, 'reset_booking_context', async () => {
    await resetCanvas(page);
    const snapshot = await bookingSnapshot(page);
    const context = assertBookingSnapshot(snapshot);
    if (context.session === starterSession || snapshot.summary.includes('Synthetic workflow record')) {
      throw new SyntheticFailure('RESET_CONTEXT_INVALID');
    }
  });

  await recordCheck(checks, viewport.name, 'mapping_agent_non_mutating_boundary', async () => {
    const agentUrl = new URL('/api/atlas/public-agent', baseUrl).toString();
    const result = await page.evaluate(async (url) => {
      const get = await fetch(url);
      const malformedPost = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      return { get: get.status, malformedPost: malformedPost.status };
    }, agentUrl);
    if (result.get !== 405 || result.malformedPost !== 400) {
      throw new SyntheticFailure('AGENT_BOUNDARY_INVALID');
    }
  });

  await recordCheck(checks, viewport.name, 'map_health', async () => {
    const healthUrl = new URL('/api/map/health', baseUrl).toString();
    const health = await page.evaluate(async (url) => {
      const response = await fetch(url);
      const body = await response.json().catch(() => null) as { status?: string } | null;
      return { status: response.status, ready: body?.status === 'ready' };
    }, healthUrl);
    if (health.status !== 200 || !health.ready) throw new SyntheticFailure('MAP_HEALTH_UNREADY');
  });

  await recordCheck(checks, viewport.name, 'console_health', async () => {
    if (consoleFailures.length > 0) throw new SyntheticFailure('CONSOLE_ERRORS');
  });
  return checks;
}

export async function executeMapProductionSynthetic(input: {
  browser: Fetcher;
  baseUrl: string;
}): Promise<MapSyntheticResult> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch(input.browser as BrowserWorker);
    const checks: MapSyntheticCheck[] = [];
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      try {
        checks.push(...(await runViewport(page, viewport, input.baseUrl)));
      } finally {
        await page.close().catch(() => undefined);
      }
    }
    return { checks };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
