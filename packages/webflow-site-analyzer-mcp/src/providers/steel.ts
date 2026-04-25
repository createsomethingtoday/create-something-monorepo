/**
 * Steel.dev Browser Provider
 * 
 * Uses Steel's cloud browser API optimized for AI agents.
 * 
 * Key advantages over alternatives:
 * - 24-hour session duration (vs 10 min for Cloudflare)
 * - <1s session startup time
 * - Built-in CAPTCHA solving and anti-bot protection
 * - AI-optimized content extraction (80% token reduction)
 * - Open-source and self-hostable
 * 
 * Pricing: $0.10/browser-hour, 100 free hours/month
 * 
 * @see https://steel.dev
 * @see https://docs.steel.dev
 */

import Steel from 'steel-sdk';
import { type Browser, type Frame, type Page } from 'puppeteer-core';
import type {
  AssetInfo,
  BrowserProvider,
  BrowserProviderConfig,
  AnalyzeOptions,
  BrowserSessionEvaluateOptions,
  BrowserSessionHandle,
  BrowserSessionInit,
  BrowserSessionMetrics
} from '../types.js';
import { connectPuppeteer } from './puppeteer-runtime.js';
import {
  deriveSiteName,
  parseComponents,
  parseInteractions,
  parseCmsCollections
} from './designer-metadata-parsers.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: Partial<BrowserProviderConfig> = {
  timeout: 120000, // 2 minutes - Steel supports long sessions
  retries: 2
};

// =============================================================================
// Provider Implementation
// =============================================================================

export class SteelBrowserProvider implements BrowserProvider {
  readonly name = 'steel';

  private client: Steel;
  private apiKey: string;
  private config: BrowserProviderConfig;
  private metrics: BrowserSessionMetrics = {
    sessionsCreated: 0,
    sessionsClosed: 0,
    sessionErrors: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    pageLoadsCompleted: 0,
    pageLoadErrors: 0
  };

  constructor(apiKey?: string, config?: Partial<BrowserProviderConfig>) {
    const key = apiKey || process.env.STEEL_API_KEY;
    if (!key) {
      throw new Error('Steel API key required. Set STEEL_API_KEY environment variable or pass apiKey to constructor.');
    }

    this.apiKey = key;
    this.client = new Steel({ steelAPIKey: key });
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      name: 'steel'
    } as BrowserProviderConfig;
  }

  /**
   * Build WebSocket URL with API key authentication
   */
  private getWebSocketUrl(sessionId: string): string {
    return `wss://connect.steel.dev?apiKey=${this.apiKey}&sessionId=${sessionId}`;
  }

  /**
   * Check if URL is a Webflow preview URL (requires special handling)
   */
  private isWebflowPreview(url: string): boolean {
    return url.includes('preview.webflow.com/preview/');
  }

  /**
   * Create a Steel session and connect Puppeteer
   */
  private async createSession(timeoutMs = 900000): Promise<{ session: { id: string }, browser: Browser }> {
    // Create Steel session with optimal settings for Webflow
    const session = await this.client.sessions.create({
      timeout: timeoutMs,
    });

    // Connect Puppeteer to the Steel session via WebSocket (API key required)
    const browser = await connectPuppeteer({
      browserWSEndpoint: this.getWebSocketUrl(session.id)
    }) as Browser;

    return { session, browser };
  }

  private async configurePage(page: Page, options?: AnalyzeOptions): Promise<void> {
    if (options?.viewport) {
      await page.setViewport(options.viewport);
    } else {
      await page.setViewport({ width: 1920, height: 1080 });
    }

    if (options?.userAgent) {
      await page.setUserAgent(options.userAgent);
    }

    if (options?.cookies && options.cookies.length > 0) {
      await page.setCookie(...options.cookies);
    }
  }

  private async navigate(page: Page, url: string, options?: AnalyzeOptions): Promise<void> {
    await page.goto(url, {
      waitUntil: options?.waitForNavigation ? 'networkidle2' : 'domcontentloaded',
      timeout: options?.timeout || this.config.timeout
    });

    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: options?.timeout || this.config.timeout
      });
    }

    await this.wait(page, 1000);
    this.metrics.pageLoadsCompleted++;
  }

  private async resolveEvaluationTarget(
    page: Page,
    currentUrl: string | null,
    options?: BrowserSessionEvaluateOptions
  ): Promise<Page | Frame> {
    const target = options?.target ?? 'auto';
    const shouldUsePreviewFrame =
      target === 'preview-frame' || (target === 'auto' && currentUrl ? this.isWebflowPreview(currentUrl) : false);

    if (!shouldUsePreviewFrame) {
      return page;
    }

    await page.waitForSelector('#site-iframe-next', {
      timeout: options?.timeout || 30000
    });
    await this.wait(page, 3000);

    const iframeHandle = await page.$('#site-iframe-next');
    if (!iframeHandle) {
      throw new Error('Webflow preview iframe not found');
    }

    const frame = await iframeHandle.contentFrame();
    if (!frame) {
      throw new Error('Could not access Webflow preview iframe content');
    }

    await frame.waitForSelector('body', { timeout: options?.timeout || 10000 });
    return frame;
  }

  async openSession(input?: BrowserSessionInit): Promise<BrowserSessionHandle> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let sessionId: string | null = null;
    let currentUrl: string | null = null;
    let closed = false;

    this.metrics.sessionsCreated++;

    try {
      const { session, browser: connectedBrowser } = await this.createSession(
        input?.options?.timeout ?? 900000
      );
      browser = connectedBrowser;
      sessionId = session.id;

      const page = await browser.newPage();
      await this.configurePage(page, input?.options);

      if (input?.url) {
        await this.navigate(page, input.url, input.options);
        currentUrl = input.url;
      }

      const close = async () => {
        if (closed) return;
        closed = true;

        if (browser) {
          await browser.close();
          this.metrics.sessionsClosed++;
        }

        if (sessionId) {
          try {
            await this.client.sessions.release(sessionId);
          } catch {
            // Session may have already been released
          }
        }

        const duration = Date.now() - startTime;
        this.metrics.totalDurationMs += duration;
        this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
      };

      return {
        id: session.id,
        provider: this.name,
        goto: async (url: string, options?: AnalyzeOptions) => {
          try {
            await this.configurePage(page, options);
            await this.navigate(page, url, options);
            currentUrl = url;
          } catch (error) {
            this.metrics.pageLoadErrors++;
            throw error;
          }
        },
        evaluate: async <T>(script: string, options?: BrowserSessionEvaluateOptions): Promise<T> => {
          try {
            const target = await this.resolveEvaluationTarget(page, currentUrl, options);
            if (options?.waitForSelector) {
              await target.waitForSelector(options.waitForSelector, {
                timeout: options.timeout || this.config.timeout
              });
            }
            return await target.evaluate(script) as T;
          } catch (error) {
            this.metrics.pageLoadErrors++;
            throw error;
          }
        },
        getPageUrl: () => currentUrl,
        close
      };
    } catch (error) {
      this.metrics.sessionErrors++;
      if (browser) {
        await browser.close().catch(() => {});
        this.metrics.sessionsClosed++;
      }
      if (sessionId) {
        await this.client.sessions.release(sessionId).catch(() => {});
      }
      const duration = Date.now() - startTime;
      this.metrics.totalDurationMs += duration;
      this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
      throw error;
    }
  }

  /**
   * Execute a script in a browser context
   * Handles Webflow preview URLs by extracting from the site iframe
   */
  async analyze<T>(url: string, script: string, options?: AnalyzeOptions): Promise<T> {
    const session = await this.openSession({ url, options });
    try {
      return await session.evaluate<T>(script, {
        target: this.isWebflowPreview(url) ? 'preview-frame' : 'main',
        waitForSelector: options?.waitForSelector,
        timeout: options?.timeout
      });
    } catch (error) {
      this.metrics.sessionErrors++;
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Capture a screenshot
   */
  async screenshot(url: string, options?: AnalyzeOptions & {
    fullPage?: boolean;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
  }): Promise<Buffer> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let sessionId: string | null = null;

    try {
      this.metrics.sessionsCreated++;

      const { session, browser: b } = await this.createSession();
      browser = b;
      sessionId = session.id;

      const page = await browser.newPage();

      if (options?.viewport) {
        await page.setViewport(options.viewport);
      } else {
        await page.setViewport({ width: 1920, height: 1080 });
      }

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: options?.timeout || this.config.timeout
      });

      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options?.timeout || this.config.timeout
        });
      }

      this.metrics.pageLoadsCompleted++;

      const screenshot = await page.screenshot({
        fullPage: options?.fullPage ?? true,
        type: options?.format || 'png',
        quality: options?.format !== 'png' ? (options?.quality || 80) : undefined
      });

      return Buffer.from(screenshot);

    } catch (error) {
      this.metrics.sessionErrors++;
      this.metrics.pageLoadErrors++;
      throw error;

    } finally {
      if (browser) {
        await browser.close();
        this.metrics.sessionsClosed++;
      }

      if (sessionId) {
        try {
          await this.client.sessions.release(sessionId);
        } catch {
          // Session may have already been released
        }
      }

      const duration = Date.now() - startTime;
      this.metrics.totalDurationMs += duration;
      this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
    }
  }

  /**
   * Helper to wait - Steel sessions are stable so we can use longer waits
   */
  private async wait(page: Page, ms: number): Promise<void> {
    await page.evaluate(`new Promise(r => setTimeout(r, ${ms}))`);
  }

  /**
   * Extract Designer metadata from a Webflow preview URL
   * Orchestrates panel navigation via keyboard shortcuts
   */
  async extractDesignerMetadata(url: string, timeout?: number): Promise<{
    siteName: string;
    sitePlan: string;
    pages: Array<{ name: string; type: string; category?: string }>;
    styleClasses: Array<{ name: string; isGlobal: boolean }>;
    components: Array<{ name: string; instanceCount: number; isUnused: boolean }>;
    interactions: Array<{ trigger: string; targetElement: string; type: string }>;
    cmsCollections: Array<{ name: string; itemCount: number }>;
    assets: AssetInfo[];
    breakpoints: string[];
  }> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let sessionId: string | null = null;

    try {
      this.metrics.sessionsCreated++;

      // Create session with longer timeout for complex extraction
      const session = await this.client.sessions.create({
        timeout: 900000, // 15 minutes (max for hobby plan)
      });
      sessionId = session.id;

      browser = await connectPuppeteer({
        browserWSEndpoint: this.getWebSocketUrl(session.id)
      }) as Browser;

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to Designer preview
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: timeout || this.config.timeout
      });

      // Wait for Designer UI to load
      await this.wait(page, 3000);

      this.metrics.pageLoadsCompleted++;

      // Helper to get UI text from Designer (not iframe)
      const getUIText = async (limit = 400): Promise<string[]> => {
        return page.evaluate(`
          (function() {
            const texts = [];
            document.querySelectorAll('*').forEach(el => {
              if (!el.closest('#site-iframe-next') && !el.closest('script') && !el.closest('style')) {
                const text = el.textContent?.trim();
                if (text && text.length > 2 && text.length < 200) {
                  texts.push(text);
                }
              }
            });
            return [...new Set(texts)].slice(0, ${limit});
          })()
        `) as Promise<string[]>;
      };

      // Helper to press key and wait
      const pressKeyAndWait = async (key: 'p' | 'g' | 'h' | 'j' | 'Escape', waitMs = 1500) => {
        await page.keyboard.press('Escape');
        await this.wait(page, 300);
        await page.keyboard.press(key);
        await this.wait(page, waitMs);
      };

      // Helper to click a visible UI control by text/label
      const clickControl = async (labels: string[]): Promise<boolean> => {
        const handles = await page.$$('button, [role="tab"], [role="button"]');
        const payloads = await page.evaluate(`(() =>
          Array.from(document.querySelectorAll('button, [role="tab"], [role="button"]')).map((el) => ({
            text: (el.textContent || '').trim(),
            aria: (el.getAttribute('aria-label') || '').trim()
          }))
        )()`) as Array<{ text: string; aria: string }>;

        for (const [index, handle] of handles.entries()) {
          const payload = payloads[index] ?? { text: '', aria: '' };
          const combined = `${payload.text} ${payload.aria}`.toLowerCase();
          const match = labels.some((label) => combined.includes(label.toLowerCase()));
          if (!match) continue;
          try {
            await handle.click();
            await this.wait(page, 800);
            return true;
          } catch {
            // Try next candidate
          }
        }
        return false;
      };

      // Get site info
      const pageTitle = await page.title();
      const initialUiTexts = await getUIText(500);
      const siteName = deriveSiteName({
        url,
        title: pageTitle,
        uiTexts: initialUiTexts
      });

      // Get breakpoints
      const breakpoints = await page.evaluate(`
        (function() {
          const labels = [];
          document.querySelectorAll('[aria-label]').forEach(el => {
            const label = el.getAttribute('aria-label') || '';
            if (label.includes('breakpoint') || label.includes('px and down')) {
              labels.push(label);
            }
          });
          return labels;
        })()
      `) as string[];

      // ===== PAGES (P key) =====
      await pressKeyAndWait('p', 3000);
      
      const pages: Array<{ name: string; type: string; category?: string }> = [];
      
      // Extract all text nodes and parse the page structure
      // Based on observed Webflow Designer panel structure
      const pageData = await page.evaluate(`
        (function() {
          const results = [];
          const seen = new Set();
          
          // Walk text nodes to get ordered content
          const texts = [];
          const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              if (text && text.length > 0 && text.length < 100) {
                texts.push(text);
              }
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.id === 'site-iframe-next') return;
              if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
              for (const child of node.childNodes) {
                walk(child);
              }
            }
          };
          walk(document.body);
          
          // Section headers that mark category boundaries
          const sectionHeaders = {
            'Pages': 'static',
            'CMS collection pages': 'cms-template',
            'Ecommerce pages': 'ecommerce', 
            'Utility pages': 'utility',
            'Static page templates': 'static-template',
            'User pages': 'user'
          };
          
          // Items to exclude (UI chrome, not pages)
          const excludeList = [
            'Design', 'CMS', 'Insights', 'Share', 'Publish', 'Desktop',
            'Affects all resolutions', 'Enable custom code', 'This site was made',
            'Try it out', 'Sign up for free', 'Search pages', 'px',
            'No static page templates', 'No User pages', 'pages',
            'Style selector', 'None', 'Home', 'EN', 'Webflow'
          ];
          
          let currentCategory = 'static';
          let foundPagesSection = false;
          
          for (const text of texts) {
            // Check if this is a section header
            if (sectionHeaders[text]) {
              currentCategory = sectionHeaders[text];
              foundPagesSection = true;
              continue;
            }
            
            // Skip if in exclude list
            if (excludeList.some(ex => text === ex || text.includes(ex))) {
              continue;
            }
            
            // Skip numeric-only or very short
            if (/^\\d+$/.test(text) || text.length < 2) {
              continue;
            }
            
            // After we've found the Pages section, collect page names
            if (foundPagesSection && !seen.has(text)) {
              // These look like page names
              const looksLikePage = (
                // Common page names
                /^(Home|About|Shop|Blog|Contact|FAQ|Pricing|Services|Portfolio|Gallery|Team|News|Events|Cart)/.test(text) ||
                // Template pages
                /Template$/.test(text) ||
                // Utility pages
                /^(404|Password|Error)$/.test(text) ||
                // Checkout flow
                /^(Checkout|Order|Cart)/.test(text) ||
                // CamelCase or normal capitalized names
                /^[A-Z][a-z]/.test(text) ||
                // Multi-word page names
                /^[A-Z][a-z]+\\s/.test(text)
              );
              
              // Exclude obvious non-pages
              const definitelyNotPage = (
                text.includes('pages') ||
                text.includes('template') && !text.includes('Template') ||
                text.includes('Webflow') ||
                text.includes('Sign up') ||
                /^\\d+\\s*(px|%)/.test(text)
              );
              
              if (looksLikePage && !definitelyNotPage) {
                seen.add(text);
                results.push({
                  name: text,
                  type: currentCategory,
                  category: currentCategory
                });
              }
            }
          }
          
          return results;
        })()
      `) as Array<{ name: string; type: string; category: string }>;
      
      // Add the parsed pages
      for (const p of pageData) {
        if (!pages.some(existing => existing.name === p.name)) {
          pages.push(p);
        }
      }

      // ===== STYLE CLASSES (G key) =====
      // First click Design tab
      await clickControl(['Design']);

      await page.keyboard.press('g');
      await this.wait(page, 1500);

      const stylesText = await getUIText();

      const styleClasses: Array<{ name: string; isGlobal: boolean }> = [];
      const globalPatterns = ['All H1', 'All H2', 'All H3', 'All H4', 'All H5', 'All H6',
                              'All Paragraphs', 'All Unordered', 'All List Items', 'Body (All'];
      const uiExclusions = ['Design', 'CMS', 'Insights', 'Share', 'Publish', 'Style', 'Settings',
                           'Interactions', 'Style selector', 'None', 'Desktop', 'This site was',
                           'Webflow', 'Sign up', 'Try it', 'Make a selection', 'Select an element',
                           'preload', 'Enable', 'New!', 'Run your', 'Affects', 'No element'];

      for (const text of stylesText) {
        if (text.length > 2 && text.length < 60 &&
            !uiExclusions.some(ui => text.includes(ui))) {
          if (text.includes(' / ') || text.includes('-') || /^[A-Z]/.test(text) ||
              globalPatterns.some(p => text.includes(p))) {
            const isGlobal = globalPatterns.some(p => text.includes(p));
            if (!styleClasses.some(c => c.name === text)) {
              styleClasses.push({ name: text, isGlobal });
            }
          }
        }
      }

      // ===== COMPONENTS (Shift+A) =====
      await page.keyboard.press('Escape');
      await this.wait(page, 300);
      await page.keyboard.down('Shift');
      await page.keyboard.press('a');
      await page.keyboard.up('Shift');
      await this.wait(page, 2000);

      const componentsText = await getUIText(1200);
      const components = parseComponents(componentsText);

      // ===== INTERACTIONS (H key) =====
      await pressKeyAndWait('h', 2000);
      const interactionsText = await getUIText(1200);
      const interactions = parseInteractions(interactionsText);

      // ===== CMS COLLECTIONS (Click CMS tab) =====
      await clickControl(['CMS']);
      await this.wait(page, 1400);
      await clickControl(['Collections']);
      await this.wait(page, 1000);

      const cmsText = await getUIText(1200);
      const cmsCollections = parseCmsCollections(cmsText);

      // ===== ASSETS (J key) =====
      await pressKeyAndWait('j', 2000);
      const assetsText = await getUIText(1200);

      const assets: AssetInfo[] = [];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];

      for (const text of assetsText) {
        if (text.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm)$/i)) {
          const ext = text.split('.').pop()?.toLowerCase() || '';
          let type: AssetInfo['type'] = 'other';
          if (imageExts.includes(ext)) type = 'image';
          else if (ext === 'svg') type = 'svg';
          else if (['mp4', 'webm'].includes(ext)) type = 'video';

          if (!assets.some(a => a.filename === text)) {
            assets.push({
              filename: text,
              type,
              captureSource: 'designer-assets-panel',
              isTruncated: text.includes('…') || text.includes('...'),
            });
          }
        }
      }

      // ===== SITE PLAN (from Settings) =====
      const allButtons = await page.$$('button, [role="button"], [role="tab"]');
      const allButtonAriaLabels = await page.evaluate(`(() =>
        Array.from(document.querySelectorAll('button, [role="button"], [role="tab"]')).map((el) =>
          el.getAttribute('aria-label')
        )
      )()`) as Array<string | null>;
      let sitePlan = 'Unknown';
      for (const [index, btn] of allButtons.entries()) {
        const ariaLabel = allButtonAriaLabels[index] ?? null;
        if (ariaLabel?.includes('Settings')) {
          await btn.click();
          await this.wait(page, 1500);

          const settingsText = await getUIText();
          for (const text of settingsText) {
            if (['Starter', 'Basic', 'CMS', 'Business', 'Enterprise'].some(p => text === p)) {
              sitePlan = text;
              break;
            }
          }
          break;
        }
      }

      return {
        siteName,
        sitePlan,
        pages,
        styleClasses,
        components,
        interactions,
        cmsCollections,
        assets,
        breakpoints
      };

    } catch (error) {
      this.metrics.sessionErrors++;
      this.metrics.pageLoadErrors++;
      throw error;

    } finally {
      if (browser) {
        await browser.close();
        this.metrics.sessionsClosed++;
      }

      if (sessionId) {
        try {
          await this.client.sessions.release(sessionId);
        } catch {
          // Session may have already been released
        }
      }

      const duration = Date.now() - startTime;
      this.metrics.totalDurationMs += duration;
      this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const session = await this.client.sessions.create({
        timeout: 60000 // 1 minute test session
      });
      
      const browser = await connectPuppeteer({
        browserWSEndpoint: this.getWebSocketUrl(session.id)
      }) as Browser;
      
      const page = await browser.newPage();
      await page.goto('about:blank', { timeout: 10000 });
      
      await browser.close();
      
      try {
        await this.client.sessions.release(session.id);
      } catch {
        // Session may auto-release
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(): BrowserSessionMetrics {
    return { ...this.metrics };
  }

  /**
   * Calculate browser minutes consumed (for cost tracking)
   * Steel: $0.10/browser-hour = $0.00167/minute
   */
  getBrowserMinutesConsumed(): number {
    return this.metrics.totalDurationMs / 60000;
  }

  /**
   * Estimate cost in USD
   * Steel pricing: $0.10/browser-hour
   */
  getEstimatedCostUSD(): number {
    const hours = this.metrics.totalDurationMs / 3600000;
    return hours * 0.10;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      sessionsCreated: 0,
      sessionsClosed: 0,
      sessionErrors: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      pageLoadsCompleted: 0,
      pageLoadErrors: 0
    };
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createSteelBrowserProvider(
  apiKey?: string,
  config?: Partial<BrowserProviderConfig>
): SteelBrowserProvider {
  return new SteelBrowserProvider(apiKey, config);
}
