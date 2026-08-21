/**
 * Integration test: managed browser provider + Webflow preview URL
 *
 * Runs real browser extraction against a Webflow preview URL and asserts
 * on tool output shape. Opt-in: skips when credentials are missing.
 *
 * Usage:
 *   BROWSER_RUN_ENABLED=true CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_BROWSER_RUN_API_TOKEN=xxx \
 *     WEBFLOW_PREVIEW_URL=https://preview.webflow.com/... pnpm test:integration
 *
 * Test the Designer metadata agent (Flow B: panel navigation P, G, A, H, J):
 *   RUN_DESIGNER_METADATA_TEST=1 BROWSER_RUN_ENABLED=true CLOUDFLARE_ACCOUNT_ID=xxx \
 *     CLOUDFLARE_BROWSER_RUN_API_TOKEN=xxx pnpm test:integration
 *   (Slower: ~1–3 min. Same URL as above or set WEBFLOW_PREVIEW_URL.)
 *
 * In CI: set Browser Run credentials and optionally WEBFLOW_PREVIEW_URL.
 * Without them, the script exits 0 and prints "Skipped (no credentials)".
 */

import {
  createProviderManager,
  type BrowserRoutingReceipt,
} from './src/providers/index.js';
import { initRegistry } from './src/versioning/index.js';
import type { TouchpointAnalysis, SEOAnalysis, DesignerMetadata } from './src/types.js';

const DEFAULT_PREVIEW_URL =
  'https://preview.webflow.com/preview/woven-wear?utm_medium=preview_link&utm_source=designer&utm_content=woven-wear&preview=cfce548695005e6704b16f7e3216b6f1&workflow=preview';

function skip(reason: string): never {
  console.log(reason);
  process.exit(0);
}

function fail(message: string, cause?: unknown): never {
  console.error('Integration test failed:', message);
  if (cause !== undefined) console.error(cause);
  process.exit(1);
}

function assertTouchpointShape(data: unknown): asserts data is TouchpointAnalysis {
  if (data === null || typeof data !== 'object') fail('Touchpoint result is not an object');
  const o = data as Record<string, unknown>;
  if (typeof o.url !== 'string') fail('TouchpointAnalysis.url must be string');
  if (typeof o.timestamp !== 'string') fail('TouchpointAnalysis.timestamp must be string');
  if (typeof o.totalCount !== 'number') fail('TouchpointAnalysis.totalCount must be number');
  if (!Array.isArray(o.touchpoints)) fail('TouchpointAnalysis.touchpoints must be array');
  if (typeof o.byType !== 'object' || o.byType === null) fail('TouchpointAnalysis.byType must be object');
}

function assertSEOShape(data: unknown): asserts data is SEOAnalysis {
  if (data === null || typeof data !== 'object') fail('SEO result is not an object');
  const o = data as Record<string, unknown>;
  if (typeof o.url !== 'string') fail('SEOAnalysis.url must be string');
  if (typeof o.title !== 'string') fail('SEOAnalysis.title must be string');
  if (typeof o.score !== 'number') fail('SEOAnalysis.score must be number');
  if (!Array.isArray(o.issues)) fail('SEOAnalysis.issues must be array');
}

function assertDesignerMetadataShape(data: unknown): asserts data is DesignerMetadata {
  if (data === null || typeof data !== 'object') fail('Designer metadata result is not an object');
  const o = data as Record<string, unknown>;
  if (typeof o.url !== 'string') fail('DesignerMetadata.url must be string');
  if (typeof o.siteName !== 'string') fail('DesignerMetadata.siteName must be string');
  if (!Array.isArray(o.pages)) fail('DesignerMetadata.pages must be array');
  if (!Array.isArray(o.styleClasses)) fail('DesignerMetadata.styleClasses must be array');
  if (!Array.isArray(o.components)) fail('DesignerMetadata.components must be array');
  if (!Array.isArray(o.interactions)) fail('DesignerMetadata.interactions must be array');
  if (!Array.isArray(o.breakpoints)) fail('DesignerMetadata.breakpoints must be array');
}

function assertExpectedPreviewRoute(
  receipt: BrowserRoutingReceipt,
  cloudflareConfigured: boolean,
): void {
  const expectedProvider = cloudflareConfigured
    ? 'cloudflare-chromium'
    : process.env.STEEL_API_KEY
      ? 'steel'
      : 'browserless';
  if (receipt.selectedProvider !== expectedProvider) {
    fail(`Expected ${expectedProvider} to execute preview work; got ${receipt.selectedProvider}.`);
  }
  if (cloudflareConfigured) {
    if (receipt.capability !== 'designer-authenticated') {
      fail(`Expected designer-authenticated capability; got ${receipt.capability}.`);
    }
    if (receipt.attempts.some((attempt) => attempt.provider === 'cloudflare-kitesurf')) {
      fail('Kitesurf must be skipped for Webflow preview work.');
    }
  }
}

async function main(): Promise<void> {
  const cloudflareConfigured = Boolean(
    process.env.BROWSER_RUN_ENABLED === 'true'
    && (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID)
    && process.env.CLOUDFLARE_BROWSER_RUN_API_TOKEN,
  );
  const incumbentConfigured = Boolean(
    process.env.STEEL_API_KEY
    || process.env.BROWSERLESS_TOKEN
    || process.env.BROWSERLESS_API_KEY,
  );
  const url = process.env.WEBFLOW_PREVIEW_URL ?? DEFAULT_PREVIEW_URL;

  if (!cloudflareConfigured && !incumbentConfigured) {
    skip('Integration test skipped: no Browser Run or incumbent browser credentials configured.');
  }

  if (!url.includes('preview.webflow.com/preview/')) {
    fail('WEBFLOW_PREVIEW_URL must be a Webflow preview URL (preview.webflow.com/preview/...)');
  }

  console.log('Running integration test (managed browser + Webflow preview)...');
  console.log('URL:', url);

  const manager = createProviderManager();

  const registry = await initRegistry();
  const timeout = 90_000;

  try {
    // 1. Touchpoints
    console.log('  Running analyze_touchpoints (managed session + iframe load, may take 30–90s)...');
    const { code: touchpointsCode, versionId: touchpointsVersion } = registry.getScriptForExecution('touchpoints', true);
    const touchpointsOperation = await manager.analyzeWithReceipt<unknown>(
      url,
      touchpointsCode,
      { timeout },
    );
    const touchpointsRaw = touchpointsOperation.data;
    assertTouchpointShape(touchpointsRaw);
    assertExpectedPreviewRoute(touchpointsOperation.receipt, cloudflareConfigured);
    console.log(
      `  analyze_touchpoints: OK (provider ${touchpointsOperation.receipt.selectedProvider}, version ${touchpointsVersion}, totalCount=${touchpointsRaw.totalCount})`,
    );

    // 2. SEO
    console.log('  Running extract_seo (new session, may take 30–90s)...');
    const { code: seoCode, versionId: seoVersion } = registry.getScriptForExecution('seo', true);
    const seoOperation = await manager.analyzeWithReceipt<unknown>(
      url,
      seoCode,
      { timeout },
    );
    const seoRaw = seoOperation.data;
    assertSEOShape(seoRaw);
    assertExpectedPreviewRoute(seoOperation.receipt, cloudflareConfigured);
    console.log(
      `  extract_seo: OK (provider ${seoOperation.receipt.selectedProvider}, version ${seoVersion}, score=${seoRaw.score})`,
    );

    // 3. Designer metadata (Flow B: panel navigation agent) — opt-in, slow
    const runDesignerTest = process.env.RUN_DESIGNER_METADATA_TEST === '1';
    if (runDesignerTest) {
      console.log('  Running extract_designer_metadata (panel navigation P, G, A, H, J; may take 1–3 min)...');
      const metadataOperation = await manager.extractDesignerMetadataWithReceipt(url, timeout);
      const metaRaw = metadataOperation.data;
      assertDesignerMetadataShape(metaRaw);
      assertExpectedPreviewRoute(metadataOperation.receipt, cloudflareConfigured);
      const meta = metaRaw as DesignerMetadata;
      console.log(
        `  extract_designer_metadata: OK (provider ${metadataOperation.receipt.selectedProvider}, siteName=${meta.siteName}, pages=${meta.totalPages}, classes=${meta.totalClasses}, components=${meta.totalComponents})`
      );
    }
  } catch (err) {
    fail('Extraction or assertion failed', err);
  }

  console.log('Integration test passed.');
}

main();
