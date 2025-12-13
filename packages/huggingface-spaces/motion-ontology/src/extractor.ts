/**
 * Motion Extractor - Puppeteer-based animation extraction
 *
 * Extracts CSS animations and transitions from live web pages
 * using real browser interaction.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import type {
  TriggerConfig,
  TechnicalAnalysis,
  AnimationData,
  TransitionData,
  TimingProfile,
} from './types.js';

let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });
  }
  return browserInstance;
}

/**
 * Extract animations currently running on the page
 */
async function extractAnimations(page: Page): Promise<AnimationData[]> {
  return page.evaluate(() => {
    return document.getAnimations().map((anim) => {
      const effect = anim.effect as KeyframeEffect;
      const timing = effect?.getTiming?.() || {};

      let targetSelector = '';
      if (effect?.target) {
        const el = effect.target as Element;
        if (el.id) {
          targetSelector = `#${el.id}`;
        } else if (el.className && typeof el.className === 'string') {
          targetSelector = `.${el.className.split(' ')[0]}`;
        } else {
          targetSelector = el.tagName?.toLowerCase() || '';
        }
      }

      return {
        name: (anim as any).animationName || anim.id || 'transition',
        duration: Number(timing.duration) || 0,
        easing: String(timing.easing || 'linear'),
        delay: Number(timing.delay) || 0,
        iterations: Number(timing.iterations) || 1,
        fillMode: String(timing.fill || 'none'),
        playState: anim.playState,
        targetSelector,
        keyframes: (effect?.getKeyframes?.() || []).map((kf) => ({
          offset: kf.offset || 0,
          properties: Object.fromEntries(
            Object.entries(kf).filter(
              ([k]) => !['offset', 'easing', 'composite'].includes(k)
            )
          ),
        })),
      };
    });
  });
}

/**
 * Extract CSS transitions defined on elements
 */
async function extractTransitions(page: Page): Promise<TransitionData[]> {
  return page.evaluate(() => {
    const result: TransitionData[] = [];
    const seen = new Set<string>();

    document.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el);
      if (style.transitionProperty && style.transitionProperty !== 'none') {
        const props = style.transitionProperty.split(',').map((p) => p.trim());
        const durations = style.transitionDuration
          .split(',')
          .map((d) => parseFloat(d) * 1000);
        const easings = style.transitionTimingFunction
          .split(',')
          .map((e) => e.trim());
        const delays = style.transitionDelay
          .split(',')
          .map((d) => parseFloat(d) * 1000);

        props.forEach((prop, i) => {
          const duration = durations[i % durations.length] || 0;
          const key = `${prop}-${duration}`;
          if (duration > 0 && !seen.has(key)) {
            seen.add(key);
            result.push({
              property: prop,
              duration,
              easing: easings[i % easings.length] || 'ease',
              delay: delays[i % delays.length] || 0,
            });
          }
        });
      }
    });

    return result;
  });
}

/**
 * Calculate timing profile from animations
 */
function calculateTimingProfile(
  animations: AnimationData[],
  transitions: TransitionData[]
): TimingProfile {
  const allDurations = [
    ...animations.map((a) => a.duration + a.delay),
    ...transitions.map((t) => t.duration + t.delay),
  ].filter((d) => d > 0);

  if (allDurations.length === 0) {
    return {
      totalDuration: 0,
      longestAnimation: 0,
      shortestAnimation: 0,
      averageDuration: 0,
      parallelAnimations: 0,
    };
  }

  return {
    totalDuration: Math.max(...allDurations),
    longestAnimation: Math.max(...allDurations),
    shortestAnimation: Math.min(...allDurations),
    averageDuration:
      allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
    parallelAnimations: animations.length,
  };
}

/**
 * Extract all animated properties
 */
function extractAnimatedProperties(
  animations: AnimationData[],
  transitions: TransitionData[]
): string[] {
  const properties = new Set<string>();

  for (const anim of animations) {
    for (const kf of anim.keyframes) {
      Object.keys(kf.properties).forEach((p) => properties.add(p));
    }
  }

  for (const trans of transitions) {
    if (trans.property !== 'all') {
      properties.add(trans.property);
    }
  }

  return [...properties];
}

/**
 * Main extraction function
 */
export async function extractMotion(
  url: string,
  trigger: TriggerConfig
): Promise<TechnicalAnalysis> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  const debug: TechnicalAnalysis['debug'] = {};

  try {
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Get animations before trigger
    const animationsBefore = await extractAnimations(page);
    debug.animationsBefore = animationsBefore.length;

    // Apply trigger
    if (trigger.type === 'hover' && trigger.selector) {
      const element = await page.$(trigger.selector);
      debug.elementFound = !!element;
      if (element) {
        await element.hover();
        debug.hoverTriggered = true;
      }
    } else if (trigger.type === 'click' && trigger.selector) {
      const element = await page.$(trigger.selector);
      debug.elementFound = !!element;
      if (element) {
        await element.click();
      }
    } else if (trigger.type === 'focus' && trigger.selector) {
      const element = await page.$(trigger.selector);
      debug.elementFound = !!element;
      if (element) {
        await element.focus();
      }
    } else if (trigger.type === 'scroll') {
      await page.evaluate((pos) => window.scrollTo(0, pos), trigger.scrollPosition || 500);
    }

    // Wait for animations to start
    await new Promise((r) => setTimeout(r, trigger.delay || 150));

    // Extract animations and transitions
    const animations = await extractAnimations(page);
    const transitions = await extractTransitions(page);
    debug.animationsAfter = animations.length;

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    const screenshot = screenshotBuffer.toString('base64');

    // Calculate timing and properties
    const timing = calculateTimingProfile(animations, transitions);
    const propertiesAnimated = extractAnimatedProperties(animations, transitions);

    return {
      animations,
      transitions,
      timing,
      propertiesAnimated,
      triggerType: trigger.type,
      extractedAt: new Date().toISOString(),
      screenshot,
      debug,
    };
  } finally {
    await page.close();
  }
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
