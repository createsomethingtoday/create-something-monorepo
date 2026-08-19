/**
 * Single-page screenshot gallery.
 *
 * The capture tool mints one per-segment view link per screenshot, which
 * reviewers found tedious to open one by one. The gallery stores a small
 * manifest (KV, same ~1h TTL as the screenshot bytes) and serves one
 * HMAC-signed HTML page that renders every capture inline, grouped by
 * viewport — one shareable link instead of six.
 */

import {
  SCREENSHOT_VIEW_TTL_SECONDS,
  signCapabilityClaims,
  verifyCapabilitySignature,
} from './screenshot-view.js';

export const SCREENSHOT_GALLERY_PATH = '/screenshot-gallery';

export interface ScreenshotGalleryEntry {
  /** KV screenshot id (the `shot:` key suffix) this entry renders. */
  id: string;
  viewport: string;
  width: number;
  height: number;
  segment: number;
  scroll_y: number;
  page_height_px: number;
  truncated: boolean;
}

export interface ScreenshotGalleryManifest {
  final_url: string;
  page_title: string | null;
  captured_at: string;
  screenshots: ScreenshotGalleryEntry[];
}

function galleryPayload(id: string, exp: number): string {
  return `screenshot-gallery:${id}:${exp}`;
}

export interface BuildScreenshotGalleryUrlOptions {
  origin: string;
  secret: string;
  id: string;
  ttlSeconds?: number;
}

export async function buildScreenshotGalleryUrl(options: BuildScreenshotGalleryUrlOptions): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + (options.ttlSeconds ?? SCREENSHOT_VIEW_TTL_SECONDS);
  const signature = await signCapabilityClaims(options.secret, galleryPayload(options.id, exp));
  const url = new URL(SCREENSHOT_GALLERY_PATH, options.origin);
  url.searchParams.set('id', options.id);
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('sig', signature);
  return url.toString();
}

export interface ScreenshotGalleryDeps {
  secret?: string;
  getManifest: (id: string) => Promise<ScreenshotGalleryManifest | null>;
  /** Mints a signed /screenshot-view URL for one stored capture. */
  buildImageUrl: (screenshotId: string) => Promise<string>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function htmlError(status: number, title: string, message: string): Response {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui,sans-serif;background:#111;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0"><main style="text-align:center;padding:2rem"><h1 style="font-size:1.25rem">${escapeHtml(title)}</h1><p style="color:#aaa">${escapeHtml(message)}</p></main></body></html>`;
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
  });
}

const GALLERY_STYLES = `
  :root { color-scheme: dark; }
  body { margin: 0; background: #111; color: #eee; font-family: system-ui, -apple-system, sans-serif; }
  header { padding: 1.5rem 2rem; border-bottom: 1px solid #2a2a2a; }
  header h1 { margin: 0 0 0.25rem; font-size: 1.15rem; font-weight: 600; }
  header p { margin: 0; color: #999; font-size: 0.85rem; }
  header a { color: #8ab4f8; }
  main { padding: 1.5rem 2rem 3rem; max-width: 1520px; margin: 0 auto; }
  h2 { font-size: 0.95rem; font-weight: 600; color: #ccc; margin: 2rem 0 0.75rem; position: sticky; top: 0; background: #111; padding: 0.5rem 0; }
  figure { margin: 0 0 1.25rem; }
  figcaption { color: #888; font-size: 0.78rem; margin-bottom: 0.35rem; font-variant-numeric: tabular-nums; }
  img { max-width: 100%; height: auto; display: block; border: 1px solid #2e2e2e; border-radius: 6px; background: #fff; }
`;

/** Renders the gallery manifest as one scrollable HTML page. */
export async function handleScreenshotGalleryRequest(url: URL, deps: ScreenshotGalleryDeps): Promise<Response> {
  if (!deps.secret) {
    return htmlError(503, 'Gallery unavailable', 'Screenshot gallery signing secret is not configured.');
  }
  const id = url.searchParams.get('id') ?? '';
  const exp = Number.parseInt(url.searchParams.get('exp') ?? '', 10);
  const signature = url.searchParams.get('sig') ?? '';
  if (!id || !Number.isFinite(exp) || !signature) {
    return htmlError(400, 'Bad request', 'Missing id, exp, or sig.');
  }
  if (!(await verifyCapabilitySignature(deps.secret, galleryPayload(id, exp), signature))) {
    return htmlError(403, 'Invalid link', 'Signature verification failed.');
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return htmlError(410, 'Link expired', 'This gallery link has expired. Re-run the capture tool for a fresh one.');
  }
  const manifest = await deps.getManifest(id);
  if (!manifest) {
    return htmlError(410, 'Gallery expired', 'These captures are no longer stored. Re-run the capture tool for a fresh gallery.');
  }

  const byViewport = new Map<string, ScreenshotGalleryEntry[]>();
  for (const entry of manifest.screenshots) {
    const group = byViewport.get(entry.viewport) ?? [];
    group.push(entry);
    byViewport.set(entry.viewport, group);
  }

  const sections: string[] = [];
  for (const [viewport, entries] of byViewport) {
    const first = entries[0];
    const heading = `${escapeHtml(viewport)} (${first.width}×${first.height}) — page height ${first.page_height_px}px${entries.some((entry) => entry.truncated) ? ' · truncated: page continues past the last segment' : ''}`;
    const figures = await Promise.all(
      entries.map(async (entry) => {
        const src = await deps.buildImageUrl(entry.id);
        const caption = `Segment ${entry.segment} — scroll_y ${entry.scroll_y}px`;
        return `<figure><figcaption>${escapeHtml(caption)}</figcaption><img src="${escapeHtml(src)}" alt="${escapeHtml(`${viewport} segment ${entry.segment}`)}" width="${entry.width}" loading="lazy"></figure>`;
      }),
    );
    sections.push(`<h2>${heading}</h2>${figures.join('')}`);
  }

  const title = manifest.page_title?.trim() || manifest.final_url;
  const siteLink = /^https?:\/\//i.test(manifest.final_url)
    ? `<a href="${escapeHtml(manifest.final_url)}" rel="noopener noreferrer">${escapeHtml(manifest.final_url)}</a>`
    : escapeHtml(manifest.final_url);
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(`Screenshots — ${title}`)}</title>
<style>${GALLERY_STYLES}</style>
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<p>${siteLink} · captured ${escapeHtml(manifest.captured_at)} · this page and its images expire ~1 hour after capture</p>
</header>
<main>${sections.join('')}</main>
</body>
</html>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
