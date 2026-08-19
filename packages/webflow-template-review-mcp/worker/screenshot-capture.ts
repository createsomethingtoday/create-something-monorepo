import { Buffer } from 'node:buffer';

import puppeteer, { type BrowserWorker, type Page } from '@cloudflare/puppeteer';

import {
  PublishedSiteScreenshotError,
  type CapturedScreenshot,
  type PublishedSiteScreenshotExecutor,
  type PublishedSiteScreenshotRequest,
  type PublishedSiteScreenshotResult,
} from '../src/published-site-screenshots.js';

const JPEG_QUALITY = 80;
/**
 * Prime-sweep step delay: long enough for IntersectionObservers and lazy-load
 * requests to fire; the reveals themselves finish during later steps and the
 * post-sweep settle, so the sweep doesn't need to wait for them.
 */
const SCROLL_STEP_DELAY_MS = 150;
/** Full settle after the prime sweep returns to top, before capture begins. */
const POST_PRIME_SETTLE_MS = 350;
/**
 * Per-segment floor after scrolling to a capture position. Reveals already
 * fired during the prime sweep, so two animation frames plus this floor is
 * enough for scroll-linked paint to stabilize before the shot.
 */
const SEGMENT_SETTLE_FLOOR_MS = 150;
/** Safety cap on the scroll-prime sweep for pathologically tall pages. */
const MAX_PRIME_SCROLL_PX = 30_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Adaptive per-segment settle: two animation frames plus a short floor. */
async function settleAfterScroll(page: Page): Promise<void> {
  await page
    .evaluate(async (floorMs: number) => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
      await new Promise((resolve) => setTimeout(resolve, floorMs));
    }, SEGMENT_SETTLE_FLOOR_MS)
    .catch(() => undefined);
}

async function settlePage(page: Page, settleMs: number): Promise<void> {
  // Webfonts arriving after paint are a top source of blank-text screenshots.
  await page
    .evaluate(() => (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready ?? Promise.resolve())
    .catch(() => undefined);
  // Fixed settle lets Webflow IX2 intro animations land (elements start at opacity 0).
  if (settleMs > 0) {
    await delay(settleMs);
  }
}

async function measurePageHeight(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(document.documentElement?.scrollHeight ?? 0, document.body?.scrollHeight ?? 0),
  );
}

/**
 * Scroll through the page once before capturing so scroll-triggered IX2
 * reveals fire and lazy-loaded media arrives. Without this, below-the-fold
 * sections render as the empty space their opacity-0 initial state leaves.
 */
async function primeScrollRevealsAndLazyLoads(page: Page, stepPx: number): Promise<void> {
  await page.evaluate(
    async (step: number, stepDelayMs: number, maxScrollPx: number) => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const height = () =>
        Math.max(document.documentElement?.scrollHeight ?? 0, document.body?.scrollHeight ?? 0);
      let y = 0;
      while (y < height() && y < maxScrollPx) {
        y += step;
        window.scrollTo(0, y);
        await wait(stepDelayMs);
      }
      window.scrollTo(0, 0);
    },
    stepPx,
    SCROLL_STEP_DELAY_MS,
    MAX_PRIME_SCROLL_PX,
  );
}

interface ViewportCapture {
  screenshots: CapturedScreenshot[];
  finalUrl: string;
  pageTitle: string | null;
}

async function captureViewport(
  page: Page,
  request: PublishedSiteScreenshotRequest,
  viewport: PublishedSiteScreenshotRequest['viewports'][number],
): Promise<ViewportCapture> {
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  });

  let loadState: CapturedScreenshot['load_state'] = 'networkidle';
  try {
    await page.goto(request.url, { waitUntil: 'networkidle0', timeout: request.timeoutMs });
  } catch (error) {
    // Analytics beacons keep some sites from ever reaching network idle.
    // The partially loaded page is still evidence; capture it and say so.
    if (error instanceof Error && error.name === 'TimeoutError') {
      loadState = 'timeout';
    } else {
      throw error;
    }
  }
  await settlePage(page, request.settleMs);

  if (request.fullPage) {
    await primeScrollRevealsAndLazyLoads(page, viewport.height);
    await delay(POST_PRIME_SETTLE_MS);
  }

  const pageHeight = await measurePageHeight(page);
  const segmentCount = request.fullPage
    ? Math.min(Math.max(1, Math.ceil(pageHeight / viewport.height)), request.captureSegments)
    : 1;
  const truncated = request.fullPage && pageHeight > segmentCount * viewport.height;

  const screenshots: CapturedScreenshot[] = [];
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const started = Date.now();
    // Align the last segment to the page bottom instead of overshooting it.
    const scrollY = Math.min(segment * viewport.height, Math.max(0, pageHeight - viewport.height));
    if (request.fullPage && segmentCount > 1) {
      await page.evaluate((y: number) => window.scrollTo(0, y), scrollY);
      await settleAfterScroll(page);
    }
    const image = (await page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY })) as Uint8Array;
    screenshots.push({
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      full_page: request.fullPage,
      segment,
      scroll_y: scrollY,
      page_height_px: pageHeight,
      truncated,
      load_state: loadState,
      mime_type: 'image/jpeg',
      data: Buffer.from(image).toString('base64'),
      bytes: image.byteLength,
      duration_ms: Date.now() - started,
    });
  }
  return {
    screenshots,
    finalUrl: page.url(),
    pageTitle: await page.title().catch(() => null),
  };
}

/**
 * Executor backed by the Worker's Browser Rendering binding — real Chromium
 * on Cloudflare's fleet, so no API token and no allowlist changes on the
 * MCP client side.
 */
export function createBrowserRenderingScreenshotExecutor(
  binding: BrowserWorker | undefined,
): PublishedSiteScreenshotExecutor {
  return async (request): Promise<PublishedSiteScreenshotResult> => {
    if (!binding) {
      throw new PublishedSiteScreenshotError(
        'BROWSER_BINDING_MISSING',
        'Browser Rendering binding (BROWSER) is not configured on this Worker.',
        503,
      );
    }
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    try {
      const launched = await puppeteer.launch(binding);
      browser = launched;
      // Each viewport gets its own page, so desktop and mobile navigate,
      // settle, and capture concurrently — wall time is the slower viewport,
      // not the sum of both.
      const captures = await Promise.all(
        request.viewports.map(async (viewport) => {
          const page = await launched.newPage();
          try {
            return await captureViewport(page, request, viewport);
          } finally {
            await page.close().catch(() => undefined);
          }
        }),
      );
      return {
        final_url: captures[0]?.finalUrl ?? request.url,
        page_title: captures[0]?.pageTitle ?? null,
        screenshots: captures.flatMap((capture) => capture.screenshots),
      };
    } catch (error) {
      if (error instanceof PublishedSiteScreenshotError) throw error;
      throw new PublishedSiteScreenshotError(
        'BROWSER_RENDERING_FAILED',
        error instanceof Error ? error.message : 'Browser Rendering capture failed.',
        502,
        { url: request.url },
      );
    } finally {
      await browser?.close().catch(() => undefined);
    }
  };
}
