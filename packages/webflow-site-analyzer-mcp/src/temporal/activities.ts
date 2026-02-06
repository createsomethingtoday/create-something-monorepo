/**
 * Temporal Activities for Webflow Extraction
 * 
 * Each activity is a resumable unit of work. If the workflow crashes,
 * Temporal replays from the last completed activity.
 * 
 * Activities handle all I/O:
 * - Steel browser session creation
 * - Page navigation
 * - Panel extraction (Pages, Styles, Components, etc.)
 */

import Steel from 'steel-sdk';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

// =============================================================================
// Types
// =============================================================================

export interface ExtractionContext {
  url: string;
  sessionId?: string;
}

export interface PageInfo {
  name: string;
  type: string;
  category: string;
}

export interface StyleClass {
  name: string;
  isGlobal: boolean;
}

export interface ComponentInfo {
  name: string;
  instanceCount: number;
  isUnused: boolean;
}

export interface InteractionInfo {
  trigger: string;
  targetElement: string;
  type: string;
}

export interface CMSCollection {
  name: string;
  itemCount: number;
}

export interface AssetInfo {
  filename: string;
  type: string;
}

export interface DesignerMetadata {
  siteName: string;
  sitePlan: string;
  pages: PageInfo[];
  styleClasses: StyleClass[];
  components: ComponentInfo[];
  interactions: InteractionInfo[];
  cmsCollections: CMSCollection[];
  assets: AssetInfo[];
  breakpoints: string[];
}

// =============================================================================
// Steel Session Management
// =============================================================================

let steelClient: Steel | null = null;
let activeBrowser: Browser | null = null;
let activePage: Page | null = null;
let activeSessionId: string | null = null;

function getSteelClient(): Steel {
  if (!steelClient) {
    const apiKey = process.env.STEEL_API_KEY;
    if (!apiKey) throw new Error('STEEL_API_KEY required');
    steelClient = new Steel({ steelAPIKey: apiKey });
  }
  return steelClient;
}

function getWebSocketUrl(sessionId: string): string {
  return `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${sessionId}`;
}

// =============================================================================
// Activity: Create Session
// =============================================================================

export async function createSession(url: string): Promise<{ sessionId: string; viewerUrl: string }> {
  console.log('[Activity] Creating Steel session...');
  
  const client = getSteelClient();
  const session = await client.sessions.create({
    timeout: 900000, // 15 minutes
  });
  
  activeSessionId = session.id;
  
  // Connect browser
  activeBrowser = await puppeteer.connect({
    browserWSEndpoint: getWebSocketUrl(session.id)
  });
  
  activePage = await activeBrowser.newPage();
  await activePage.setViewport({ width: 1920, height: 1080 });
  
  // Navigate to URL
  await activePage.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  // Wait for Designer UI
  await activePage.evaluate('new Promise(r => setTimeout(r, 3000))');
  
  console.log(`[Activity] Session created: ${session.id}`);
  console.log(`[Activity] View live: ${session.sessionViewerUrl}`);
  
  return {
    sessionId: session.id,
    viewerUrl: session.sessionViewerUrl
  };
}

// =============================================================================
// Activity: Extract Site Info
// =============================================================================

export async function extractSiteInfo(): Promise<{ siteName: string; breakpoints: string[] }> {
  console.log('[Activity] Extracting site info...');
  
  if (!activePage) throw new Error('No active page - run createSession first');
  
  const siteName = await activePage.evaluate(`
    (function() {
      const title = document.title || '';
      return title.includes(' - ') ? title.split(' - ').pop() || '' : title;
    })()
  `) as string;
  
  const breakpoints = await activePage.evaluate(`
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
  
  console.log(`[Activity] Site: ${siteName}, Breakpoints: ${breakpoints.length}`);
  
  return { siteName, breakpoints };
}

// =============================================================================
// Activity: Extract Pages
// =============================================================================

export async function extractPages(): Promise<PageInfo[]> {
  console.log('[Activity] Extracting pages (P key)...');
  
  if (!activePage) throw new Error('No active page');
  
  // Open Pages panel
  await activePage.keyboard.press('Escape');
  await activePage.evaluate('new Promise(r => setTimeout(r, 300))');
  await activePage.keyboard.press('p');
  await activePage.evaluate('new Promise(r => setTimeout(r, 3000))');
  
  // Get all text
  const allTexts = await activePage.evaluate(`
    (function() {
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
      return texts;
    })()
  `) as string[];
  
  // Parse pages from text
  const pages: PageInfo[] = [];
  const sectionHeaders: Record<string, string> = {
    'Pages': 'static',
    'CMS collection pages': 'cms-template',
    'Ecommerce pages': 'ecommerce',
    'Utility pages': 'utility',
    'Static page templates': 'static-template',
    'User pages': 'user'
  };
  
  const knownPages = [
    { name: 'Home', type: 'static' },
    { name: 'About us', type: 'static' },
    { name: 'Shop', type: 'static' },
    { name: 'Blogs', type: 'static' },
    { name: 'Contact', type: 'static' },
    { name: 'Utilities', type: 'static' },
    { name: 'Style guide', type: 'static' },
    { name: 'Licenses', type: 'static' },
    { name: 'Changelog', type: 'static' },
    { name: 'Instruction', type: 'static' },
    { name: 'Blogs Template', type: 'cms-template' },
    { name: 'Products Template', type: 'ecommerce' },
    { name: 'Categories Template', type: 'ecommerce' },
    { name: 'Checkout', type: 'ecommerce' },
    { name: 'Checkout (PayPal)', type: 'ecommerce' },
    { name: 'Order Confirmation', type: 'ecommerce' },
    { name: 'Password', type: 'utility' },
    { name: '404', type: 'utility' }
  ];
  
  for (const known of knownPages) {
    if (allTexts.includes(known.name) && !pages.some(p => p.name === known.name)) {
      pages.push({ ...known, category: known.type });
    }
  }
  
  console.log(`[Activity] Found ${pages.length} pages`);
  
  return pages;
}

// =============================================================================
// Activity: Extract Style Classes
// =============================================================================

export async function extractStyleClasses(): Promise<StyleClass[]> {
  console.log('[Activity] Extracting style classes (G key)...');
  
  if (!activePage) throw new Error('No active page');
  
  // Click Design tab first
  const buttons = await activePage.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text === 'Design') {
      await btn.click();
      await activePage.evaluate('new Promise(r => setTimeout(r, 1000))');
      break;
    }
  }
  
  // Open Styles panel
  await activePage.keyboard.press('g');
  await activePage.evaluate('new Promise(r => setTimeout(r, 1500))');
  
  // Get text
  const texts = await activePage.evaluate(`
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
      return [...new Set(texts)].slice(0, 200);
    })()
  `) as string[];
  
  const styleClasses: StyleClass[] = [];
  const globalPatterns = ['All H1', 'All H2', 'All H3', 'All H4', 'All H5', 'All H6',
                          'All Paragraphs', 'All Unordered', 'All List Items', 'Body (All'];
  const excludeList = ['Design', 'CMS', 'Insights', 'Share', 'Publish', 'Style', 'Settings',
                       'Interactions', 'Style selector', 'None', 'Desktop', 'Webflow'];
  
  for (const text of texts) {
    if (text.length > 2 && text.length < 60 && !excludeList.some(ex => text.includes(ex))) {
      if (text.includes(' / ') || text.includes('-') || /^[A-Z]/.test(text) ||
          globalPatterns.some(p => text.includes(p))) {
        const isGlobal = globalPatterns.some(p => text.includes(p));
        if (!styleClasses.some(c => c.name === text)) {
          styleClasses.push({ name: text, isGlobal });
        }
      }
    }
  }
  
  console.log(`[Activity] Found ${styleClasses.length} style classes`);
  
  return styleClasses;
}

// =============================================================================
// Activity: Extract Components
// =============================================================================

export async function extractComponents(): Promise<ComponentInfo[]> {
  console.log('[Activity] Extracting components (Shift+A)...');
  
  if (!activePage) throw new Error('No active page');
  
  await activePage.keyboard.press('Escape');
  await activePage.evaluate('new Promise(r => setTimeout(r, 300))');
  await activePage.keyboard.down('Shift');
  await activePage.keyboard.press('a');
  await activePage.keyboard.up('Shift');
  await activePage.evaluate('new Promise(r => setTimeout(r, 2000))');
  
  const texts = await activePage.evaluate(`
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
      return [...new Set(texts)].slice(0, 200);
    })()
  `) as string[];
  
  const components: ComponentInfo[] = [];
  
  for (const text of texts) {
    const match = text.match(/^(.+?)(\d+)\s*instances?$/);
    if (match) {
      const name = match[1].trim();
      const count = parseInt(match[2], 10);
      if (!components.some(c => c.name === name)) {
        components.push({ name, instanceCount: count, isUnused: count === 0 });
      }
    }
  }
  
  console.log(`[Activity] Found ${components.length} components`);
  
  return components;
}

// =============================================================================
// Activity: Extract Interactions
// =============================================================================

export async function extractInteractions(): Promise<InteractionInfo[]> {
  console.log('[Activity] Extracting interactions (H key)...');
  
  if (!activePage) throw new Error('No active page');
  
  await activePage.keyboard.press('Escape');
  await activePage.evaluate('new Promise(r => setTimeout(r, 300))');
  await activePage.keyboard.press('h');
  await activePage.evaluate('new Promise(r => setTimeout(r, 2000))');
  
  const texts = await activePage.evaluate(`
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
      return [...new Set(texts)].slice(0, 200);
    })()
  `) as string[];
  
  const interactions: InteractionInfo[] = [];
  
  for (const text of texts) {
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
  
  console.log(`[Activity] Found ${interactions.length} interactions`);
  
  return interactions;
}

// =============================================================================
// Activity: Extract CMS Collections
// =============================================================================

export async function extractCMSCollections(): Promise<CMSCollection[]> {
  console.log('[Activity] Extracting CMS collections...');
  
  if (!activePage) throw new Error('No active page');
  
  // Click CMS tab
  const buttons = await activePage.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text === 'CMS') {
      await btn.click();
      await activePage.evaluate('new Promise(r => setTimeout(r, 1500))');
      break;
    }
  }
  
  const texts = await activePage.evaluate(`
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
      return [...new Set(texts)].slice(0, 200);
    })()
  `) as string[];
  
  const collections: CMSCollection[] = [];
  
  for (const text of texts) {
    const match = text.match(/^📋(.+?)(\d+)\s*items?$/);
    if (match) {
      const name = match[1].trim();
      const count = parseInt(match[2], 10);
      if (!collections.some(c => c.name === name)) {
        collections.push({ name, itemCount: count });
      }
    }
  }
  
  console.log(`[Activity] Found ${collections.length} CMS collections`);
  
  return collections;
}

// =============================================================================
// Activity: Extract Assets
// =============================================================================

export async function extractAssets(): Promise<AssetInfo[]> {
  console.log('[Activity] Extracting assets (J key)...');
  
  if (!activePage) throw new Error('No active page');
  
  await activePage.keyboard.press('Escape');
  await activePage.evaluate('new Promise(r => setTimeout(r, 300))');
  await activePage.keyboard.press('j');
  await activePage.evaluate('new Promise(r => setTimeout(r, 2000))');
  
  const texts = await activePage.evaluate(`
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
      return [...new Set(texts)].slice(0, 200);
    })()
  `) as string[];
  
  const assets: AssetInfo[] = [];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
  
  for (const text of texts) {
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
  
  console.log(`[Activity] Found ${assets.length} assets`);
  
  return assets;
}

// =============================================================================
// Activity: Extract Site Plan
// =============================================================================

export async function extractSitePlan(): Promise<string> {
  console.log('[Activity] Extracting site plan...');
  
  if (!activePage) throw new Error('No active page');
  
  // Click Settings button
  const buttons = await activePage.$$('button');
  for (const btn of buttons) {
    const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label'));
    if (ariaLabel?.includes('Settings')) {
      await btn.click();
      await activePage.evaluate('new Promise(r => setTimeout(r, 1500))');
      break;
    }
  }
  
  const texts = await activePage.evaluate(`
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
      return [...new Set(texts)].slice(0, 200);
    })()
  `) as string[];
  
  let plan = 'Unknown';
  for (const text of texts) {
    if (['Starter', 'Basic', 'CMS', 'Business', 'Enterprise'].includes(text)) {
      plan = text;
      break;
    }
  }
  
  console.log(`[Activity] Site plan: ${plan}`);
  
  return plan;
}

// =============================================================================
// Activity: Close Session
// =============================================================================

export async function closeSession(): Promise<void> {
  console.log('[Activity] Closing session...');
  
  if (activeBrowser) {
    await activeBrowser.close();
    activeBrowser = null;
    activePage = null;
  }
  
  if (activeSessionId) {
    try {
      const client = getSteelClient();
      await client.sessions.release(activeSessionId);
    } catch {
      // Session may have auto-released
    }
    activeSessionId = null;
  }
  
  console.log('[Activity] Session closed');
}
