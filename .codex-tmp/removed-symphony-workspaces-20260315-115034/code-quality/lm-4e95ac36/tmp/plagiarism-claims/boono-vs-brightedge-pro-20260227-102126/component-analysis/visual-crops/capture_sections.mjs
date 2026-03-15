import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node capture_sections.mjs <outDir>');
  process.exit(1);
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const targets = [
  {
    key: 'brightedge',
    url: 'https://brightedge-pro.webflow.io/',
    selectors: {
      nav: ['nav.navbar', '.navbar.w-nav', 'nav[role="banner"]', 'nav'],
      hero: ['.hero-section', 'section.hero-section', '.hero-wrap', '#Hero', '.hero'],
      faq: ['.faq-section', 'section.faq-section', '#faq', '.faq', 'section[id*="faq" i]']
    }
  },
  {
    key: 'boono',
    url: 'https://boono.webflow.io/',
    selectors: {
      nav: ['.navbar.w-nav', 'nav.navbar', 'nav[role="banner"]', 'nav'],
      hero: ['section.hero', '.section.hero', '.hero-overlay', '#Hero', '.hero-main-wrap'],
      faq: ['section.faq', '.section.faq', '#FAQ', '.faq-content-wrap', 'section[id*="faq" i]']
    }
  }
];

function sanitizeClip(box, pageWidth, pageHeight) {
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const width = Math.min(pageWidth - x, Math.ceil(box.width));
  let height = Math.min(pageHeight - y, Math.ceil(box.height));
  height = Math.min(height, 900); // keep sections readable for side-by-side report
  return { x, y, width, height };
}

const metadata = { generatedAt: new Date().toISOString(), captures: [] };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 2600, deviceScaleFactor: 1 });

  for (const target of targets) {
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));

    const fullPath = path.join(outDir, `${target.key}_full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });

    const pageMetrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));

    const captureRecord = { target: target.key, url: target.url, sections: {} };

    for (const [section, selectorList] of Object.entries(target.selectors)) {
      let handle = null;
      let usedSelector = null;

      for (const selector of selectorList) {
        const candidate = await page.$(selector);
        if (candidate) {
          handle = candidate;
          usedSelector = selector;
          break;
        }
      }

      if (!handle) {
        captureRecord.sections[section] = { found: false, selectorTried: selectorList };
        continue;
      }

      const box = await handle.boundingBox();
      if (!box || box.width < 20 || box.height < 20) {
        captureRecord.sections[section] = { found: false, selector: usedSelector, reason: 'invalid_bbox' };
        continue;
      }

      const clip = sanitizeClip(box, pageMetrics.width, pageMetrics.height);
      const outPath = path.join(outDir, `${target.key}_${section}.png`);
      await page.screenshot({ path: outPath, clip, captureBeyondViewport: true });

      captureRecord.sections[section] = {
        found: true,
        selector: usedSelector,
        bbox: box,
        clip,
        image: path.basename(outPath)
      };
    }

    metadata.captures.push(captureRecord);
  }

  fs.writeFileSync(path.join(outDir, 'capture_metadata.json'), JSON.stringify(metadata, null, 2));
} finally {
  await browser.close();
}
