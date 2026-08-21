import type { Browser, ConnectOptions, Frame, Page } from 'puppeteer-core';

import type {
  AnalyzeOptions,
  BrowserProvider,
  BrowserSessionEvaluateOptions,
  BrowserSessionHandle,
  BrowserSessionInit,
  BrowserSessionMetrics,
} from '../types.js';
import { connectPuppeteer } from './puppeteer-runtime.js';
import {
  extractWebflowDesignerMetadata,
  type BrowserDesignerMetadata,
} from './designer-metadata-extractor.js';

export type CloudflareBrowserRunEngine = 'kitesurf' | 'chromium';
export type BrowserRunConnect = (options: ConnectOptions) => Promise<Browser>;
export type BrowserRunDesignerExtractor = (
  page: Page,
  url: string,
) => Promise<BrowserDesignerMetadata>;

export interface CloudflareBrowserRunProviderConfig {
  accountId: string;
  apiToken: string;
  engine: CloudflareBrowserRunEngine;
  keepAliveMs?: number;
  timeoutMs?: number;
  connect?: BrowserRunConnect;
  extractDesignerMetadata?: BrowserRunDesignerExtractor;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_KEEP_ALIVE_MS = 600_000;

function requireConfigValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function validateKeepAlive(value: number): number {
  if (!Number.isInteger(value) || value <= 0 || value > DEFAULT_KEEP_ALIVE_MS) {
    throw new Error('Cloudflare Browser Run keepAliveMs must be between 1 and 600000');
  }
  return value;
}

function createMetrics(): BrowserSessionMetrics {
  return {
    sessionsCreated: 0,
    sessionsClosed: 0,
    sessionErrors: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    pageLoadsCompleted: 0,
    pageLoadErrors: 0,
  };
}

export class CloudflareBrowserRunProvider implements BrowserProvider {
  readonly name: string;

  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly engine: CloudflareBrowserRunEngine;
  private readonly keepAliveMs: number;
  private readonly timeoutMs: number;
  private readonly connect: BrowserRunConnect;
  private readonly designerExtractor: BrowserRunDesignerExtractor;
  private metrics = createMetrics();

  constructor(config: CloudflareBrowserRunProviderConfig) {
    this.accountId = requireConfigValue(config.accountId, 'Cloudflare account ID');
    this.apiToken = requireConfigValue(config.apiToken, 'Cloudflare Browser Run API token');
    this.engine = config.engine;
    this.keepAliveMs = validateKeepAlive(config.keepAliveMs ?? DEFAULT_KEEP_ALIVE_MS);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.connect = config.connect ?? (async (options) => await connectPuppeteer(options) as Browser);
    this.designerExtractor = config.extractDesignerMetadata ?? extractWebflowDesignerMetadata;
    this.name = `cloudflare-${config.engine}`;
  }

  async analyze<T>(url: string, script: string, options?: AnalyzeOptions): Promise<T> {
    const session = await this.openSession({ url, options });
    try {
      return await session.evaluate<T>(script, {
        target: this.isWebflowPreview(url) ? 'preview-frame' : 'main',
        waitForSelector: options?.waitForSelector,
        timeout: options?.timeout,
      });
    } catch (error) {
      this.metrics.sessionErrors += 1;
      throw error;
    } finally {
      await session.close();
    }
  }

  async screenshot(url: string, options?: AnalyzeOptions): Promise<Buffer> {
    const startedAt = Date.now();
    let browser: Browser | null = null;
    this.metrics.sessionsCreated += 1;

    try {
      browser = await this.connectToBrowser();
      const page = await browser.newPage();
      await this.configurePage(page, options);
      await this.navigate(page, url, options);
      const screenshot = await page.screenshot({
        fullPage: options?.fullPage ?? true,
        type: options?.format ?? 'png',
        quality: options?.format && options.format !== 'png'
          ? (options.quality ?? 80)
          : undefined,
      });
      return Buffer.from(screenshot);
    } catch (error) {
      this.metrics.sessionErrors += 1;
      this.metrics.pageLoadErrors += 1;
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        this.metrics.sessionsClosed += 1;
      }
      this.recordDuration(startedAt);
    }
  }

  async openSession(input?: BrowserSessionInit): Promise<BrowserSessionHandle> {
    const startedAt = Date.now();
    let browser: Browser | null = null;
    let currentUrl: string | null = null;
    let closed = false;
    this.metrics.sessionsCreated += 1;

    try {
      browser = await this.connectToBrowser();
      const page = await browser.newPage();
      await this.configurePage(page, input?.options);

      if (input?.url) {
        await this.navigate(page, input.url, input.options);
        currentUrl = input.url;
      }

      return {
        id: `${this.name}-${crypto.randomUUID()}`,
        provider: this.name,
        goto: async (url: string, options?: AnalyzeOptions) => {
          try {
            await this.configurePage(page, options);
            await this.navigate(page, url, options);
            currentUrl = url;
          } catch (error) {
            this.metrics.pageLoadErrors += 1;
            throw error;
          }
        },
        evaluate: async <T>(script: string, options?: BrowserSessionEvaluateOptions): Promise<T> => {
          try {
            const target = await this.resolveEvaluationTarget(page, currentUrl, options);
            if (options?.waitForSelector) {
              await target.waitForSelector(options.waitForSelector, {
                timeout: options.timeout ?? this.timeoutMs,
              });
            }
            return await target.evaluate(script) as T;
          } catch (error) {
            this.metrics.pageLoadErrors += 1;
            throw error;
          }
        },
        getPageUrl: () => currentUrl,
        close: async () => {
          if (closed) return;
          closed = true;
          await browser?.close();
          this.metrics.sessionsClosed += 1;
          this.recordDuration(startedAt);
        },
      };
    } catch (error) {
      this.metrics.sessionErrors += 1;
      if (browser) {
        await browser.close().catch(() => {});
        this.metrics.sessionsClosed += 1;
      }
      this.recordDuration(startedAt);
      throw error;
    }
  }

  async extractDesignerMetadata(url: string, timeout?: number): Promise<BrowserDesignerMetadata> {
    if (this.engine !== 'chromium') {
      throw new Error('Kitesurf does not support persistent authenticated Designer extraction');
    }

    const startedAt = Date.now();
    let browser: Browser | null = null;
    this.metrics.sessionsCreated += 1;
    try {
      browser = await this.connectToBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: timeout ?? this.timeoutMs,
      });
      await page.evaluate('new Promise((resolve) => setTimeout(resolve, 3000))');
      this.metrics.pageLoadsCompleted += 1;
      return await this.designerExtractor(page, url);
    } catch (error) {
      this.metrics.sessionErrors += 1;
      this.metrics.pageLoadErrors += 1;
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        this.metrics.sessionsClosed += 1;
      }
      this.recordDuration(startedAt);
    }
  }

  async healthCheck(): Promise<boolean> {
    let session: BrowserSessionHandle | null = null;
    try {
      session = await this.openSession({ url: 'about:blank' });
      return true;
    } catch {
      return false;
    } finally {
      await session?.close();
    }
  }

  getSessionMetrics(): BrowserSessionMetrics {
    return { ...this.metrics };
  }

  private buildEndpoint(): string {
    const productPath = this.engine === 'kitesurf' ? 'browser-run' : 'browser-rendering';
    const endpoint = new URL(
      `wss://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/${productPath}/devtools/browser`,
    );
    if (this.engine === 'kitesurf') {
      endpoint.searchParams.set('browser', 'kitesurf');
    } else {
      endpoint.searchParams.set('keep_alive', String(this.keepAliveMs));
    }
    return endpoint.toString();
  }

  private async connectToBrowser(): Promise<Browser> {
    try {
      return await this.connect({
        browserWSEndpoint: this.buildEndpoint(),
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });
    } catch {
      throw new Error(`Cloudflare Browser Run ${this.engine} connection failed`);
    }
  }

  private async configurePage(page: Page, options?: AnalyzeOptions): Promise<void> {
    await page.setViewport(options?.viewport ?? { width: 1920, height: 1080 });
    if (options?.userAgent) await page.setUserAgent(options.userAgent);
    if (options?.cookies?.length) await page.setCookie(...options.cookies);
  }

  private async navigate(page: Page, url: string, options?: AnalyzeOptions): Promise<void> {
    await page.goto(url, {
      waitUntil: options?.waitForNavigation ? 'networkidle2' : 'domcontentloaded',
      timeout: options?.timeout ?? this.timeoutMs,
    });
    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: options.timeout ?? this.timeoutMs,
      });
    }
    await page.evaluate('new Promise((resolve) => setTimeout(resolve, 1000))');
    this.metrics.pageLoadsCompleted += 1;
  }

  private async resolveEvaluationTarget(
    page: Page,
    currentUrl: string | null,
    options?: BrowserSessionEvaluateOptions,
  ): Promise<Page | Frame> {
    const target = options?.target ?? 'auto';
    const usePreviewFrame = target === 'preview-frame'
      || (target === 'auto' && currentUrl !== null && this.isWebflowPreview(currentUrl));
    if (!usePreviewFrame) return page;

    await page.waitForSelector('#site-iframe-next', {
      timeout: options?.timeout ?? this.timeoutMs,
    });
    await page.evaluate('new Promise((resolve) => setTimeout(resolve, 3000))');
    const iframe = await page.$('#site-iframe-next');
    if (!iframe) throw new Error('Webflow preview iframe not found');
    const frame = await iframe.contentFrame();
    if (!frame) throw new Error('Could not access Webflow preview iframe content');
    await frame.waitForSelector('body', { timeout: options?.timeout ?? 10_000 });
    return frame;
  }

  private isWebflowPreview(url: string): boolean {
    return url.includes('preview.webflow.com/preview/');
  }

  private recordDuration(startedAt: number): void {
    this.metrics.totalDurationMs += Date.now() - startedAt;
    this.metrics.averageDurationMs = this.metrics.sessionsCreated > 0
      ? this.metrics.totalDurationMs / this.metrics.sessionsCreated
      : 0;
  }
}

export function createCloudflareBrowserRunProvider(
  config: CloudflareBrowserRunProviderConfig,
): CloudflareBrowserRunProvider {
  return new CloudflareBrowserRunProvider(config);
}
