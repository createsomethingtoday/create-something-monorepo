import { chromium } from '../../../node_modules/.pnpm/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const [origin, screenshots] = process.argv.slice(2);
assert(origin, 'Pass origin');
if (screenshots) mkdirSync(screenshots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 1101, 1024, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let submissions = 0;
    await page.route('**/api/contact', (route) => {
      submissions++;
      return route.abort();
    });
    await page.goto(origin, { waitUntil: 'networkidle' });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    const mobile = width <= 1100;
    const menu = page.locator('.menu-toggle');
    async function openNav() {
      if (mobile && (await menu.getAttribute('aria-expanded')) === 'false') await menu.click();
    }
    await openNav();
    for (const id of ['solutions', 'technology', 'about']) {
      const trigger = page.locator(`#${id}-toggle`);
      await trigger.focus();
      await page.keyboard.press('Enter');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(
          (id) => document.activeElement === document.querySelector(`#${id}-links a`),
          id
        ),
        true,
        'Tab enters ' + id
      );
      await page.keyboard.press('Escape');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(
        await trigger.evaluate((el) => el === document.activeElement),
        true,
        'Escape restores ' + id
      );
      await page.keyboard.press('Space');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true', 'Space opens ' + id);
      await page.keyboard.press('Space');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'Space closes ' + id);
      await page.keyboard.press('ArrowDown');
      assert.equal(
        await page.evaluate(
          (id) => document.activeElement === document.querySelector(`#${id}-links a`),
          id
        ),
        true,
        'ArrowDown enters ' + id
      );
      await page.keyboard.press('Escape');
    }
    await page.locator('#solutions-toggle').click();
    await page.locator('#about-toggle').click();
    assert.equal(
      await page.locator('#about-toggle').getAttribute('aria-expanded'),
      'true',
      'pointer switch opens About'
    );
    assert.equal(
      await page.locator('#solutions-links').isVisible(),
      false,
      'only one disclosure open'
    );
    if (screenshots && [1440, 390].includes(width))
      await page.screenshot({ path: `${screenshots}/${width}-about-menu.png` });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(
      await page.locator('#about-links').isVisible(),
      false,
      'Tab out closes disclosure'
    );
    assert.equal(
      await nav
        .getByRole('link', { name: 'Careers', exact: true })
        .evaluate((el) => el === document.activeElement),
      true
    );
    await page.locator('#solutions-toggle').click();
    if (screenshots && [1440, 390].includes(width))
      await page.screenshot({ path: `${screenshots}/${width}-solutions-menu.png` });
    await page.mouse.click(width - 8, 850);
    assert.equal(await page.locator('#solutions-links').isVisible(), false, 'outside click closes');
    if (mobile) {
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await openNav();
      await page.keyboard.press('Escape');
      assert.equal(
        await menu.evaluate((el) => el === document.activeElement),
        true,
        'mobile Escape focus'
      );
    }
    const destinations = [
      ['solutions', 'Oil & Gas and Water Treatment', '/oil-gas'],
      ['solutions', 'Mining & Metals', '/mining'],
      ['technology', 'How our chemistry works', '/#chemistry'],
      ['about', 'Mission', '/about#mission'],
      ['about', 'Meet the Team/Leadership', '/about#leadership'],
      ['about', 'News', '/news']
    ];
    for (const [id, label, path] of destinations) {
      await openNav();
      await page.locator(`#${id}-toggle`).click();
      await nav.getByRole('link', { name: label, exact: true }).click();
      await page.waitForURL(new URL(path, origin).href);
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.group-toggle')].every(
          (el) => el.getAttribute('aria-expanded') === 'false'
        )
      );
      if (mobile)
        assert.equal(
          await menu.getAttribute('aria-expanded'),
          'false',
          'mobile closes after navigation'
        );
      if (path.includes('#')) {
        const anchor = path.split('#')[1];
        assert.equal(await page.locator('#' + anchor).count(), 1, 'anchor exists');
        await page.waitForFunction((id) => {
          const target = document.getElementById(id);
          const y = (id === 'mission' ? target.querySelector('h1') : target).getBoundingClientRect()
            .top;
          return y >= 70 && y < innerHeight;
        }, anchor);
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        'no overflow ' + path + ' ' + width
      );
    }
    await openNav();
    await nav.getByRole('link', { name: 'Home', exact: true }).click();
    await page.waitForURL(new URL('/', origin).href);
    assert(
      !/PetroX|LithX/i.test(await page.locator('main').innerText()),
      'homepage uses market names'
    );
    await openNav();
    assert.equal(
      await nav.getByRole('link', { name: 'Careers', exact: true }).getAttribute('href'),
      'https://jobs.lever.co/maverickx'
    );
    await context.route('https://jobs.lever.co/maverickx', (route) => route.abort());
    await page.locator('#solutions-toggle').click();
    const popupPromise = page.waitForEvent('popup');
    await nav.getByRole('link', { name: 'Careers', exact: true }).click();
    const popup = await popupPromise;
    await popup.close();
    assert.equal(
      await page.locator('#solutions-links').isVisible(),
      false,
      'Careers closes dropdown'
    );
    await openNav();
    await page.locator('#solutions-toggle').click();
    await nav.getByRole('button', { name: 'Contact Us', exact: true }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), true, 'existing Contact opens');
    await page.waitForFunction(() =>
      document.querySelector('[role="dialog"]')?.contains(document.activeElement)
    );
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(submissions, 0, 'no contact requests');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log(
      'PASS menu keyboard, focus, dismissal, routes, anchors, Contact and overflow at ' +
        width +
        'px'
    );
    await context.close();
  }
} finally {
  await browser.close();
}
