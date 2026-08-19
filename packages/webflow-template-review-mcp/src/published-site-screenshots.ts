/**
 * Published-site screenshot capture contract.
 *
 * The tool layer normalizes reviewer input here; the Worker supplies an
 * executor backed by Cloudflare Browser Rendering (real Chromium). Kitesurf
 * was evaluated and rejected for this path: it dropped IX2-animated hero
 * content and scrambled gallery layouts on real Marketplace templates
 * (tested 2026-08-12), which makes working sites look broken.
 */

export interface PublishedSiteScreenshotViewport {
  name: ScreenshotViewportName;
  width: number;
  height: number;
  isMobile: boolean;
}

export const SCREENSHOT_VIEWPORT_NAMES = ['desktop', 'tablet', 'mobile'] as const;
export type ScreenshotViewportName = (typeof SCREENSHOT_VIEWPORT_NAMES)[number];

/** Mirrors DEFAULT_SANDBOX_VIEWPORTS so sandbox and screenshot evidence line up. */
export const SCREENSHOT_VIEWPORT_PRESETS: Record<ScreenshotViewportName, PublishedSiteScreenshotViewport> = {
  desktop: { name: 'desktop', width: 1440, height: 900, isMobile: false },
  tablet: { name: 'tablet', width: 768, height: 1024, isMobile: false },
  mobile: { name: 'mobile', width: 390, height: 844, isMobile: true },
};

export const DEFAULT_SCREENSHOT_VIEWPORTS: ScreenshotViewportName[] = ['desktop', 'mobile'];
export const DEFAULT_SCREENSHOT_SETTLE_MS = 1_500;
export const DEFAULT_SCREENSHOT_TIMEOUT_MS = 30_000;
/**
 * Full-page mode returns viewport-height segments rather than one tall image:
 * Claude's vision downscales to ~1568px on the long side, so a 6000px-tall
 * capture arrives unreadable, and Webflow IX2 scroll reveals never fire in a
 * scroll-less capture. Segment count is bounded to keep responses small.
 */
export const DEFAULT_MAX_SEGMENTS = 5;
export const MAX_SEGMENTS_LIMIT = 8;

export interface PublishedSiteScreenshotInput {
  published_url: string;
  viewports?: ScreenshotViewportName[];
  full_page?: boolean;
  settle_ms?: number;
  max_segments?: number;
}

export interface PublishedSiteScreenshotRequest {
  url: string;
  viewports: PublishedSiteScreenshotViewport[];
  fullPage: boolean;
  settleMs: number;
  timeoutMs: number;
  maxSegments: number;
}

export interface CapturedScreenshot {
  viewport: ScreenshotViewportName;
  width: number;
  height: number;
  full_page: boolean;
  /** 0-based segment index within this viewport's scroll sweep. */
  segment: number;
  /** Scroll offset (px from page top) where this segment was captured. */
  scroll_y: number;
  /** Total scrollable page height at this viewport, in px. */
  page_height_px: number;
  /** True when the page continues past the last captured segment. */
  truncated: boolean;
  /** 'networkidle' when the page settled; 'timeout' when we captured whatever had loaded. */
  load_state: 'networkidle' | 'timeout';
  mime_type: 'image/jpeg';
  /** Base64-encoded JPEG bytes. */
  data: string;
  bytes: number;
  duration_ms: number;
}

export interface PublishedSiteScreenshotResult {
  final_url: string;
  page_title: string | null;
  screenshots: CapturedScreenshot[];
}

export type PublishedSiteScreenshotExecutor = (
  request: PublishedSiteScreenshotRequest,
) => Promise<PublishedSiteScreenshotResult>;

/** Handle to one stored capture: its KV id plus the signed per-segment view URL. */
export interface PublishedScreenshotRef {
  id: string;
  view_url: string;
}

export interface ScreenshotCaptureConfig {
  executor?: PublishedSiteScreenshotExecutor;
  /**
   * Stores one captured screenshot and returns its KV id plus a signed,
   * human-viewable URL (or null when storage is unavailable). claude.ai does
   * not render MCP image content for the human, so these links are how
   * reviewers see captures.
   */
  publishScreenshot?: (screenshot: CapturedScreenshot) => Promise<PublishedScreenshotRef | null>;
  /**
   * Stores a gallery manifest over already-published captures and returns one
   * signed URL that renders every segment on a single HTML page (or null when
   * storage is unavailable). See src/screenshot-gallery.ts.
   */
  publishGallery?: (manifest: import('./screenshot-gallery.js').ScreenshotGalleryManifest) => Promise<string | null>;
}

export class PublishedSiteScreenshotError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PublishedSiteScreenshotError';
  }
}

/**
 * Screenshot capture accepts published *.webflow.io staging domains only.
 * That is where Marketplace review evidence lives, and the restriction keeps
 * the tool from becoming an open screenshot proxy for arbitrary hosts.
 */
export function assertPublishedWebflowUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublishedSiteScreenshotError('INVALID_URL', 'published_url is not a valid URL.', 400, {
      published_url: rawUrl,
    });
  }
  if (url.protocol !== 'https:') {
    throw new PublishedSiteScreenshotError('INVALID_URL_SCHEME', 'published_url must use https.', 400, {
      protocol: url.protocol,
    });
  }
  const host = url.hostname.toLowerCase();
  if (!host.endsWith('.webflow.io') || host === 'webflow.io' || host.split('.').length < 3) {
    throw new PublishedSiteScreenshotError(
      'HOST_NOT_ALLOWED',
      'published_url must be a published template staging domain (https://<site>.webflow.io).',
      400,
      { hostname: url.hostname },
    );
  }
  if (url.username || url.password) {
    throw new PublishedSiteScreenshotError('INVALID_URL', 'published_url must not embed credentials.', 400);
  }
  return url;
}

export function normalizePublishedSiteScreenshotInput(
  input: PublishedSiteScreenshotInput,
): PublishedSiteScreenshotRequest {
  const url = assertPublishedWebflowUrl(input.published_url);
  const requested = input.viewports?.length ? input.viewports : DEFAULT_SCREENSHOT_VIEWPORTS;
  const viewports = Array.from(new Set(requested)).map((name) => SCREENSHOT_VIEWPORT_PRESETS[name]);
  const settleMs = input.settle_ms ?? DEFAULT_SCREENSHOT_SETTLE_MS;
  if (!Number.isInteger(settleMs) || settleMs < 0 || settleMs > 10_000) {
    throw new PublishedSiteScreenshotError('INVALID_SETTLE_MS', 'settle_ms must be an integer between 0 and 10000.', 400, {
      settle_ms: settleMs,
    });
  }
  const maxSegments = input.max_segments ?? DEFAULT_MAX_SEGMENTS;
  if (!Number.isInteger(maxSegments) || maxSegments < 1 || maxSegments > MAX_SEGMENTS_LIMIT) {
    throw new PublishedSiteScreenshotError(
      'INVALID_MAX_SEGMENTS',
      `max_segments must be an integer between 1 and ${MAX_SEGMENTS_LIMIT}.`,
      400,
      { max_segments: maxSegments },
    );
  }
  return {
    url: url.toString(),
    viewports,
    fullPage: input.full_page ?? false,
    settleMs,
    timeoutMs: DEFAULT_SCREENSHOT_TIMEOUT_MS,
    maxSegments,
  };
}
