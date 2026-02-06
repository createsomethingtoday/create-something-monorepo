/**
 * Browserless Provider
 * 
 * Primary browser automation provider using Browserless.io BaaS v2.
 * Provides WebSocket-based Puppeteer connection for full browser control.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import type {
  BrowserProvider,
  BrowserProviderConfig,
  AnalyzeOptions,
  BrowserSessionMetrics
} from '../types.js';

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

  /**
   * Execute a script in a browser context
   * Handles Webflow preview URLs by extracting from the site iframe
   */
  async analyze<T>(url: string, script: string, options?: AnalyzeOptions): Promise<T> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    
    try {
      this.metrics.sessionsCreated++;
      
      browser = await puppeteer.connect({
        browserWSEndpoint: this.getEndpoint()
      });
      
      const page = await browser.newPage();
      
      // Set viewport
      if (options?.viewport) {
        await page.setViewport(options.viewport);
      } else {
        await page.setViewport({ width: 1920, height: 1080 });
      }
      
      // Set user agent if provided
      if (options?.userAgent) {
        await page.setUserAgent(options.userAgent);
      }
      
      // Set cookies if provided (for Webflow preview auth)
      if (options?.cookies) {
        await page.setCookie(...options.cookies);
      }
      
      // Navigate to URL
      await page.goto(url, {
        waitUntil: options?.waitForNavigation ? 'networkidle2' : 'domcontentloaded',
        timeout: options?.timeout || this.config.timeout
      });
      
      // Wait for specific selector if provided
      if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options?.timeout || this.config.timeout
        });
      }
      
      // Allow page to settle (for animations, lazy loading)
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      this.metrics.pageLoadsCompleted++;
      
      let result: T;
      
      // Handle Webflow preview URLs - content is in an iframe
      if (this.isWebflowPreview(url)) {
        // Wait for the site iframe to appear
        await page.waitForSelector('#site-iframe-next', { 
          timeout: options?.timeout || 30000 
        });
        
        // Give iframe content time to load
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        
        // Get the iframe and its content frame
        const iframeHandle = await page.$('#site-iframe-next');
        if (!iframeHandle) {
          throw new Error('Webflow preview iframe not found');
        }
        
        const frame = await iframeHandle.contentFrame();
        if (!frame) {
          throw new Error('Could not access Webflow preview iframe content');
        }
        
        // Wait for content in iframe
        await frame.waitForSelector('body', { timeout: 10000 });
        
        // Execute script in iframe context
        result = await frame.evaluate(script) as T;
      } else {
        // Standard page - execute directly
        result = await page.evaluate(script) as T;
      }
      
      return result;
      
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
      
      browser = await puppeteer.connect({
        browserWSEndpoint: this.getEndpoint()
      });
      
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
      browser = await puppeteer.connect({
        browserWSEndpoint: this.getEndpoint()
      });
      
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
      
      browser = await puppeteer.connect({
        browserWSEndpoint: this.getEndpoint()
      });

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
      const getUIText = async (limit = 200): Promise<string[]> => {
        return page.evaluate(getUITextScript(limit)) as Promise<string[]>;
      };

      // Helper to press key and wait
      const pressKeyAndWait = async (key: 'p' | 'g' | 'h' | 'j' | 'Escape', waitMs = 1500) => {
        await page.keyboard.press('Escape');
        await page.evaluate(`new Promise(r => setTimeout(r, 300))`);
        await page.keyboard.press(key);
        await page.evaluate(`new Promise(r => setTimeout(r, ${waitMs}))`);
      };

      // Get site info
      const siteName = await page.evaluate(`
        (function() {
          const title = document.title || '';
          return title.includes(' - ') ? title.split(' - ').pop() || '' : title;
        })()
      `) as string;

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
      const designButtons = await page.$$('button');
      for (const btn of designButtons) {
        const btnText = await btn.evaluate(el => el.textContent?.trim());
        if (btnText === 'Design') {
          await btn.click();
          await page.evaluate(`new Promise(r => setTimeout(r, 1000))`);
          break;
        }
      }
      
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
      
      const componentsText = await getUIText();
      const components: Array<{ name: string; instanceCount: number; isUnused: boolean }> = [];
      
      for (const text of componentsText) {
        const match = text.match(/^(.+?)(\d+)\s*instances?$/);
        if (match) {
          const name = match[1].trim();
          const count = parseInt(match[2], 10);
          if (!components.some(c => c.name === name)) {
            components.push({ name, instanceCount: count, isUnused: count === 0 });
          }
        }
      }

      // ===== INTERACTIONS (H key) =====
      await pressKeyAndWait('h', 2000);
      const interactionsText = await getUIText();
      
      const interactions: Array<{ trigger: string; targetElement: string; type: string }> = [];
      for (const text of interactionsText) {
        if (text.includes('Page load') && text.includes(' / ')) {
          const parts = text.split('Page load');
          if (parts[1]) {
            const target = parts[1].trim().replace(' / <none>', '').replace('<none>', '');
            if (target && !interactions.some(i => i.targetElement === target)) {
              interactions.push({ trigger: 'Page load', targetElement: target, type: 'page-load' });
            }
          }
        }
      }

      // ===== CMS COLLECTIONS (Click CMS tab) =====
      // Find and click CMS button
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const btnText = await btn.evaluate(el => el.textContent?.trim());
        if (btnText === 'CMS') {
          await btn.click();
          await page.evaluate(`new Promise(r => setTimeout(r, 1500))`);
          break;
        }
      }
      
      const cmsText = await getUIText();
      const cmsCollections: Array<{ name: string; itemCount: number }> = [];
      
      for (const text of cmsText) {
        const match = text.match(/^📋(.+?)(\d+)\s*items?$/);
        if (match) {
          const name = match[1].trim();
          const count = parseInt(match[2], 10);
          if (!cmsCollections.some(c => c.name === name)) {
            cmsCollections.push({ name, itemCount: count });
          }
        }
      }

      // ===== ASSETS (J key) =====
      await pressKeyAndWait('j', 2000);
      const assetsText = await getUIText();
      
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
      const allButtons = await page.$$('button');
      let sitePlan = 'Unknown';
      for (const btn of allButtons) {
        const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label'));
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
