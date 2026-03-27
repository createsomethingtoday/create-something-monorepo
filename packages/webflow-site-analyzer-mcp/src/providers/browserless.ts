/**
 * Browserless Provider
 * 
 * Primary browser automation provider using Browserless.io BaaS v2.
 * Provides WebSocket-based Puppeteer connection for full browser control.
 */

import { type Browser, type Frame, type Page } from 'puppeteer-core';
import type {
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
  timeout: 60000, // 60 seconds
  retries: 2
};

// =============================================================================
// Provider Implementation
// =============================================================================

export class BrowserlessProvider implements BrowserProvider {
  readonly name = 'browserless';
  
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

  constructor(config: BrowserProviderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (!this.config.token) {
      throw new Error('Browserless token is required');
    }
  }

  /**
   * Get the WebSocket endpoint for Browserless
   */
  private getEndpoint(): string {
    const base = this.config.endpoint || 'wss://chrome.browserless.io';
    return `${base}?token=${this.config.token}`;
  }

  /**
   * Check if URL is a Webflow preview URL (requires iframe handling)
   */
  private isWebflowPreview(url: string): boolean {
    return url.includes('preview.webflow.com/preview/');
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

    await page.evaluate('new Promise((resolve) => setTimeout(resolve, 1000))');
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
    await page.evaluate('new Promise((resolve) => setTimeout(resolve, 3000))');

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
    let currentUrl: string | null = null;
    let closed = false;

    this.metrics.sessionsCreated++;

    try {
      browser = await connectPuppeteer({
        browserWSEndpoint: this.getEndpoint()
      }) as Browser;

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

        const duration = Date.now() - startTime;
        this.metrics.totalDurationMs += duration;
        this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
      };

      return {
        id: `browserless-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    
    try {
      this.metrics.sessionsCreated++;
      
      browser = await connectPuppeteer({
        browserWSEndpoint: this.getEndpoint()
      }) as Browser;
      
      const page = await browser.newPage();
      
      // Set viewport
      if (options?.viewport) {
        await page.setViewport(options.viewport);
      } else {
        await page.setViewport({ width: 1920, height: 1080 });
      }
      
      // Navigate
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: options?.timeout || this.config.timeout
      });
      
      // Wait for specific selector if provided
      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options?.timeout || this.config.timeout
        });
      }
      
      this.metrics.pageLoadsCompleted++;
      
      // Capture screenshot
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
      
      const duration = Date.now() - startTime;
      this.metrics.totalDurationMs += duration;
      this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    let browser: Browser | null = null;
    
    try {
      browser = await connectPuppeteer({
        browserWSEndpoint: this.getEndpoint()
      }) as Browser;
      
      const page = await browser.newPage();
      await page.goto('about:blank', { timeout: 10000 });
      
      return true;
      
    } catch {
      return false;
      
    } finally {
      if (browser) {
        await browser.close();
      }
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
   */
  getBrowserMinutesConsumed(): number {
    return this.metrics.totalDurationMs / 60000;
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

  /**
   * Extract Designer metadata from a Webflow preview URL
   * Orchestrates panel navigation via keyboard shortcuts to gather:
   * - Pages (P key)
   * - Style classes (G key)
   * - Components (Shift+A)
   * - Interactions (H key)
   * - CMS Collections (CMS tab)
   * - Assets (J key)
   */
  async extractDesignerMetadata(url: string, timeout?: number): Promise<{
    siteName: string;
    sitePlan: string;
    pages: Array<{ name: string; type: string; category?: string }>;
    styleClasses: Array<{ name: string; isGlobal: boolean }>;
    components: Array<{ name: string; instanceCount: number; isUnused: boolean }>;
    interactions: Array<{ trigger: string; targetElement: string; type: string }>;
    cmsCollections: Array<{ name: string; itemCount: number }>;
    assets: Array<{ filename: string; type: string }>;
    breakpoints: string[];
  }> {
    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      this.metrics.sessionsCreated++;
      
      browser = await connectPuppeteer({
        browserWSEndpoint: this.getEndpoint()
      }) as Browser;

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to Designer preview
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: timeout || this.config.timeout
      });

      // Wait for Designer UI to load (reduced from 4s to 3s)
      await page.evaluate(`new Promise(r => setTimeout(r, 3000))`);

      this.metrics.pageLoadsCompleted++;

      // Script to get UI text from Designer (not iframe)
      const getUITextScript = (limit: number) => `
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
      `;

      // Helper to get UI text
      const getUIText = async (limit = 400): Promise<string[]> => {
        return page.evaluate(getUITextScript(limit)) as Promise<string[]>;
      };

      // Helper to press key and wait
      const pressKeyAndWait = async (key: 'p' | 'g' | 'h' | 'j' | 'Escape', waitMs = 1500) => {
        await page.keyboard.press('Escape');
        await page.evaluate(`new Promise(r => setTimeout(r, 300))`);
        await page.keyboard.press(key);
        await page.evaluate(`new Promise(r => setTimeout(r, ${waitMs}))`);
      };

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
            await page.evaluate(`new Promise(r => setTimeout(r, 800))`);
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
      await pressKeyAndWait('p', 2000);
      const pagesText = await getUIText();
      
      const pages: Array<{ name: string; type: string; category?: string }> = [];
      let currentCategory = 'Innerpages';
      const categoryTypes: Record<string, string> = {
        'Innerpages': 'static',
        'Template Pages': 'static',
        'CMS collection pages': 'cms-template',
        'Ecommerce pages': 'ecommerce',
        'Utility pages': 'utility',
        'User pages': 'user'
      };

      for (const text of pagesText) {
        // Check for category headers
        for (const cat of Object.keys(categoryTypes)) {
          if (text === cat) {
            currentCategory = cat;
          }
        }
        // Check for page names (with emoji prefix)
        if ((text.startsWith('📋') || text.startsWith('🖍') || text.startsWith('⭐') ||
             text.startsWith('🔐') || text.startsWith('👀')) && text.length < 50) {
          const pageName = text.replace(/^[📋🖍⭐🔐👀]/, '').trim();
          if (pageName && !pages.some(p => p.name === pageName)) {
            pages.push({
              name: pageName,
              type: categoryTypes[currentCategory] || 'static',
              category: currentCategory
            });
          }
        }
        // Ecommerce pages without emoji
        if (['Products Template', 'Categories Template', 'Checkout', 'Checkout (PayPal)', 'Order Confirmation'].includes(text)) {
          if (!pages.some(p => p.name === text)) {
            pages.push({ name: text, type: 'ecommerce', category: 'Ecommerce pages' });
          }
        }
      }

      // ===== STYLE CLASSES (G key - Style Selectors) =====
      // First click on Design tab to ensure we're in the right context
      await clickControl(['Design']);
      
      // Press G for Style Selectors panel
      await page.keyboard.press('g');
      await page.evaluate(`new Promise(r => setTimeout(r, 1500))`);
      
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
          // Check if it matches class naming patterns
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
      await page.evaluate(`new Promise(r => setTimeout(r, 300))`);
      await page.keyboard.down('Shift');
      await page.keyboard.press('a');
      await page.keyboard.up('Shift');
      await page.evaluate(`new Promise(r => setTimeout(r, 2000))`);
      
      const componentsText = await getUIText(1200);
      const components = parseComponents(componentsText);

      // ===== INTERACTIONS (H key) =====
      await pressKeyAndWait('h', 2000);
      const interactionsText = await getUIText(1200);
      const interactions = parseInteractions(interactionsText);

      // ===== CMS COLLECTIONS (Click CMS tab) =====
      // Find and click CMS button
      await clickControl(['CMS']);
      await page.evaluate(`new Promise(r => setTimeout(r, 1400))`);
      await clickControl(['Collections']);
      await page.evaluate(`new Promise(r => setTimeout(r, 1000))`);
      
      const cmsText = await getUIText(1200);
      const cmsCollections = parseCmsCollections(cmsText);

      // ===== ASSETS (J key) =====
      await pressKeyAndWait('j', 2000);
      const assetsText = await getUIText(1200);
      
      const assets: Array<{ filename: string; type: string }> = [];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
      
      for (const text of assetsText) {
        if (text.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm)$/i)) {
          const ext = text.split('.').pop()?.toLowerCase() || '';
          let type = 'other';
          if (imageExts.includes(ext)) type = 'image';
          else if (ext === 'svg') type = 'svg';
          else if (['mp4', 'webm'].includes(ext)) type = 'video';
          
          if (!assets.some(a => a.filename === text)) {
            assets.push({ filename: text, type });
          }
        }
      }

      // ===== SITE PLAN (from Settings) =====
      // Find and click Settings button
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
          await page.evaluate(`new Promise(r => setTimeout(r, 1500))`);
          
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

      const duration = Date.now() - startTime;
      this.metrics.totalDurationMs += duration;
      this.metrics.averageDurationMs = this.metrics.totalDurationMs / this.metrics.sessionsCreated;
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createBrowserlessProvider(token?: string): BrowserlessProvider {
  const resolvedToken = token || process.env.BROWSERLESS_TOKEN;
  
  if (!resolvedToken) {
    throw new Error('BROWSERLESS_TOKEN environment variable or token parameter required');
  }
  
  return new BrowserlessProvider({
    name: 'browserless',
    token: resolvedToken,
    endpoint: process.env.BROWSERLESS_ENDPOINT || 'wss://chrome.browserless.io'
  });
}
