import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4196';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 768, 820, 834, 912, 1024, 1025, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'networkidle' });
    const geometry = await page.locator('#team').evaluate(section => {
      const image = section.querySelector('img');
      const copy = section.querySelector('div');
      const i = image.getBoundingClientRect();
      const c = copy.getBoundingClientRect();
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, image: { x: i.x, y: i.y, width: i.width, height: i.height }, copy: { x: c.x, y: c.y, width: c.width, height: c.height } };
    });
    assert.ok(geometry.scrollWidth <= width, `No overflow at ${width}`);
    if (width <= 1024) {
      assert.ok(geometry.copy.y + geometry.copy.height <= geometry.image.y, `Copy precedes full portrait at ${width}`);
      assert.ok(Math.abs(geometry.image.width / geometry.image.height - .8) < .01, `Full 4:5 artwork at ${width}`);
    } else {
      assert.ok(geometry.image.x + geometry.image.width < geometry.copy.x, `Balanced desktop columns at ${width}`);
      assert.ok(Math.abs(geometry.image.width - geometry.image.height) < 1, `Square desktop crop at ${width}`);
    }
    await page.close();
  }
  console.log('Team balance passed at ten phone/tablet/desktop widths.');
} finally {
  await browser.close();
}
