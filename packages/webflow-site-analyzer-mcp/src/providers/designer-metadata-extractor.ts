import type { Page } from 'puppeteer-core';

import type {
  AssetInfo,
  CMSCollectionInfo,
  ComponentInfo,
  InteractionInfo,
  PageInfo,
  StyleClassInfo,
} from '../types.js';
import {
  deriveSiteName,
  parseCmsCollections,
  parseComponents,
  parseInteractions,
} from './designer-metadata-parsers.js';

export interface BrowserDesignerMetadata {
  siteName: string;
  sitePlan: string;
  pages: PageInfo[];
  styleClasses: StyleClassInfo[];
  components: ComponentInfo[];
  interactions: InteractionInfo[];
  cmsCollections: CMSCollectionInfo[];
  assets: AssetInfo[];
  breakpoints: string[];
}

async function wait(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate(`new Promise((resolve) => setTimeout(resolve, ${milliseconds}))`);
}

export async function extractWebflowDesignerMetadata(
  page: Page,
  url: string,
): Promise<BrowserDesignerMetadata> {
  const getUiText = async (limit = 400): Promise<string[]> => await page.evaluate(`
    (() => {
      const texts = [];
      document.querySelectorAll('*').forEach((element) => {
        if (element.closest('#site-iframe-next') || element.closest('script, style')) return;
        const text = element.textContent?.trim();
        if (text && text.length > 2 && text.length < 200) texts.push(text);
      });
      return [...new Set(texts)].slice(0, ${limit});
    })()
  `) as string[];

  const pressKeyAndWait = async (
    key: 'p' | 'g' | 'h' | 'j',
    milliseconds = 1500,
  ): Promise<void> => {
    await page.keyboard.press('Escape');
    await wait(page, 300);
    await page.keyboard.press(key);
    await wait(page, milliseconds);
  };

  const clickControl = async (labels: string[]): Promise<boolean> => {
    const handles = await page.$$('button, [role="tab"], [role="button"]');
    const controls = await page.evaluate(`(() =>
      Array.from(document.querySelectorAll('button, [role="tab"], [role="button"]')).map((element) => ({
        text: (element.textContent || '').trim(),
        aria: (element.getAttribute('aria-label') || '').trim()
      }))
    )()`) as Array<{ text: string; aria: string }>;
    for (const [index, handle] of handles.entries()) {
      const control = controls[index] ?? { text: '', aria: '' };
      const text = `${control.text} ${control.aria}`.toLowerCase();
      if (!labels.some((label) => text.includes(label.toLowerCase()))) continue;
      try {
        await handle.click();
        await wait(page, 800);
        return true;
      } catch {
        // Continue through matching controls until one is actionable.
      }
    }
    return false;
  };

  const initialUiTexts = await getUiText(500);
  const siteName = deriveSiteName({
    url,
    title: await page.title(),
    uiTexts: initialUiTexts,
  });
  const breakpoints = await page.evaluate(`(() =>
    Array.from(document.querySelectorAll('[aria-label]'))
      .map((element) => element.getAttribute('aria-label') || '')
      .filter((label) => label.includes('breakpoint') || label.includes('px and down'))
  )()`) as string[];

  await pressKeyAndWait('p', 3000);
  const pagesText = await getUiText(800);
  const pages: PageInfo[] = [];
  let category = 'static';
  const categoryTypes: Record<string, PageInfo['type']> = {
    Pages: 'static',
    Innerpages: 'static',
    'Template Pages': 'static',
    'CMS collection pages': 'cms-template',
    'Ecommerce pages': 'ecommerce',
    'Utility pages': 'utility',
    'User pages': 'user',
  };
  const knownPages: Array<{ name: string; type: PageInfo['type'] }> = [
    { name: 'Home', type: 'static' },
    { name: 'About us', type: 'static' },
    { name: 'Shop', type: 'static' },
    { name: 'Blogs', type: 'static' },
    { name: 'Contact', type: 'static' },
    { name: 'Style guide', type: 'static' },
    { name: 'Blogs Template', type: 'cms-template' },
    { name: 'Products Template', type: 'ecommerce' },
    { name: 'Categories Template', type: 'ecommerce' },
    { name: 'Checkout', type: 'ecommerce' },
    { name: 'Checkout (PayPal)', type: 'ecommerce' },
    { name: 'Order Confirmation', type: 'ecommerce' },
    { name: 'Password', type: 'utility' },
    { name: '404', type: 'utility' },
  ];
  for (const text of pagesText) {
    if (categoryTypes[text]) category = text;
    const emojiName = text.replace(/^[📋🖍⭐🔐👀]/u, '').trim();
    const hasPageMarker = emojiName !== text;
    const known = knownPages.find((candidate) => candidate.name === text);
    if (!hasPageMarker && !known) continue;
    const name = known?.name ?? emojiName;
    const type = known?.type ?? categoryTypes[category] ?? 'static';
    if (name && !pages.some((pageInfo) => pageInfo.name === name)) {
      pages.push({ name, type, category });
    }
  }

  await clickControl(['Design']);
  await pressKeyAndWait('g');
  const styleText = await getUiText(800);
  const globalPatterns = [
    'All H1', 'All H2', 'All H3', 'All H4', 'All H5', 'All H6',
    'All Paragraphs', 'All Unordered', 'All List Items', 'Body (All',
  ];
  const excludedStyleText = [
    'Design', 'CMS', 'Insights', 'Share', 'Publish', 'Style', 'Settings',
    'Interactions', 'Style selector', 'None', 'Desktop', 'Webflow',
  ];
  const styleClasses: StyleClassInfo[] = [];
  for (const text of styleText) {
    if (text.length < 3 || text.length >= 60) continue;
    if (excludedStyleText.some((excluded) => text.includes(excluded))) continue;
    if (!text.includes(' / ') && !text.includes('-') && !/^[A-Z]/.test(text)) continue;
    if (!styleClasses.some((styleClass) => styleClass.name === text)) {
      styleClasses.push({
        name: text,
        isGlobal: globalPatterns.some((pattern) => text.includes(pattern)),
      });
    }
  }

  await page.keyboard.press('Escape');
  await wait(page, 300);
  await page.keyboard.down('Shift');
  await page.keyboard.press('a');
  await page.keyboard.up('Shift');
  await wait(page, 2000);
  const components = parseComponents(await getUiText(1200));

  await pressKeyAndWait('h', 2000);
  const interactions = parseInteractions(await getUiText(1200));

  await clickControl(['CMS']);
  await wait(page, 1400);
  await clickControl(['Collections']);
  await wait(page, 1000);
  const cmsCollections = parseCmsCollections(await getUiText(1200));

  await pressKeyAndWait('j', 2000);
  const assets: AssetInfo[] = [];
  for (const text of await getUiText(1200)) {
    const match = text.match(/\.([a-z0-9]+)$/i);
    if (!match) continue;
    const extension = match[1]?.toLowerCase();
    const type: AssetInfo['type'] = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(extension)
      ? 'image'
      : extension === 'svg'
        ? 'svg'
        : ['mp4', 'webm'].includes(extension)
          ? 'video'
          : 'other';
    if (type !== 'other' && !assets.some((asset) => asset.filename === text)) {
      assets.push({ filename: text, type });
    }
  }

  let sitePlan = 'Unknown';
  const buttons = await page.$$('button, [role="button"], [role="tab"]');
  const labels = await page.evaluate(`(() =>
    Array.from(document.querySelectorAll('button, [role="button"], [role="tab"]'))
      .map((element) => element.getAttribute('aria-label'))
  )()`) as Array<string | null>;
  for (const [index, button] of buttons.entries()) {
    if (!labels[index]?.includes('Settings')) continue;
    await button.click();
    await wait(page, 1500);
    sitePlan = (await getUiText()).find((text) =>
      ['Starter', 'Basic', 'CMS', 'Business', 'Enterprise'].includes(text)
    ) ?? 'Unknown';
    break;
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
    breakpoints,
  };
}
