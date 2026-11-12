// Exact built React/Astryx client against local synthetic HTTP responses only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base = process.env.NPG_UI_URL || 'http://127.0.0.1:4227';
const evidence = process.env.NPG_UI_EVIDENCE || '/tmp/npg-astryx-evidence';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
async function scenario(name, fn, viewport = { width: 1440, height: 900 }, options = {}) {
  if (process.env.NPG_UI_SCENARIO && !name.includes(process.env.NPG_UI_SCENARIO)) return;
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy|Refused to/i.test(message.text()))
      errors.push(message.text());
  });
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== new URL(base).origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  try {
    await fn(page);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    report.push({ name, passed: true });
  } finally {
    await context.close();
  }
}
const commands = (page) =>
  page.evaluate(() => fetch('/__fixture/commands').then((response) => response.json()));
async function gotoState(page, state) {
  await page.goto(base + '/?state=' + (state || ''));
  await page.getByRole('button', { name: 'Send question', exact: true }).waitFor();
  if (state && state !== 'new') {
    const history = page.locator('.history-item').first();
    if (!(await history.isVisible())) await page.getByTestId('mobile-nav-toggle').click();
    await history.click();
    if (['review', 'expired', 'enrichment'].includes(state))
      await expect(
        page.getByRole('heading', { name: 'Review the exact action', exact: true })
      ).toBeFocused();
    else await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
    await expect(page.locator('.npg-thread-title')).toHaveText(
      'Find NPs near Springfield, MO, and keep the complete CSV.'
    );
  }
}
async function disclosureHasClearBody(page, button) {
  const id = await button.getAttribute('aria-controls');
  const first = page
    .locator('[id="' + id + '"]')
    .locator('dt')
    .first();
  await expect(first).toBeVisible();
  await expect
    .poll(async () => {
      const label = await first.boundingBox();
      const trigger = await button.boundingBox();
      return label.y - (trigger.y + trigger.height);
    })
    .toBeGreaterThanOrEqual(0);
}
try {
  await scenario(
    'large saved evidence retains review focus after the render commits',
    async (page) => {
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 8 });
      await page.route('**/healthcare-analyst/api?*', async (route) => {
        const response = await route.fetch();
        const view = await response.json();
        view.sources = Array.from({ length: 20 }, (_, index) => ({
          tool: 'get_healthcare_coverage',
          data: { total: index, limitation: 'Synthetic source evidence. '.repeat(200) }
        }));
        await route.fulfill({ response, json: view });
      });
      await gotoState(page, 'review');
      await expect(
        page.getByRole('heading', { name: 'Review the exact action', exact: true })
      ).toBeInViewport();
      assert.deepEqual(await commands(page), []);
      await session.detach();
    }
  );
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 }
  ])
    await scenario(
      'mobile identity and opaque review composer at ' + viewport.width + '×' + viewport.height,
      async (page) => {
        await gotoState(page, 'review');
        const brand = page
          .getByRole('navigation', { name: 'NPG workspace', exact: true })
          .getByText('Healthcare analyst', { exact: true });
        const fits = await brand.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1
        );
        assert.ok(fits, 'Product identity is truncated');
        const helper = page.getByText(
          'Review or reject the action above before sending another question.',
          { exact: true }
        );
        const hasSurface = await helper.evaluate((element) => {
          for (
            let parent = element;
            parent && !parent.classList.contains('npg-thread');
            parent = parent.parentElement
          ) {
            const color = getComputedStyle(parent).backgroundColor;
            if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return true;
          }
          return false;
        });
        assert.ok(hasSurface, 'Composer helper has no opaque surface above the transcript');
        const placeholderBottom = await page
          .getByRole('textbox', { name: 'Your question' })
          .evaluate(
            (element) =>
              element.parentElement.querySelector('[aria-hidden="true"]').getBoundingClientRect()
                .bottom
          );
        const footerTop = await page
          .getByText(/Ctrl \/ ⌘ \+ Enter/)
          .evaluate((element) => element.getBoundingClientRect().top);
        assert.ok(
          placeholderBottom <= footerTop,
          'Composer placeholder overlaps its keyboard hint'
        );

        await page
          .getByRole('button', { name: 'Reject action', exact: true })
          .scrollIntoViewIfNeeded();
        await expect(helper).toBeInViewport();
        await page.screenshot({
          path: `${evidence}/mobile-polish-${viewport.width}-${viewport.height}.png`
        });
        assert.deepEqual(await commands(page), []);
      },
      viewport
    );
  for (const width of [1440, 1025, 1024, 768, 390, 320])
    await scenario(
      'exact review and evidence at ' + width,
      async (page) => {
        await gotoState(page, 'review');
        const heading = page.getByRole('heading', { name: 'Review the exact action', exact: true });
        await expect(heading).toBeInViewport();
        assert.equal(await page.getByRole('main').count(), 1);
        if (width <= 1024) {
          await page.getByRole('button', { name: /Results & evidence/ }).click();
          await expect(page.getByText('231 total', { exact: true })).toBeVisible();
        }
        const csv = page.locator('.source-link');
        await expect(csv).toHaveAttribute(
          'href',
          '/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X'
        );
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const reject = page.getByRole('button', { name: 'Reject action', exact: true });
        await reject.scrollIntoViewIfNeeded();
        await expect(reject).toBeInViewport();
        await page.screenshot({ path: `${evidence}/review-${width}.png` });
        if (width === 390) {
          await reject.focus();
          await page.keyboard.press('Enter');
          await expect(
            page.getByText('Action rejected. No action was sent.', { exact: true })
          ).toBeVisible();
          assert.deepEqual(
            (await commands(page)).map((command) => command.type),
            ['reject']
          );
          await expect(page.locator('.source-link')).toHaveCount(1);
        } else assert.deepEqual(await commands(page), []);
      },
      { width, height: 900 }
    );
  for (const viewport of [
    { width: 390, height: 667 },
    { width: 320, height: 568 }
  ])
    await scenario(
      'short phone keeps review reachable ' + viewport.width + '×' + viewport.height,
      async (page) => {
        await gotoState(page, 'review');
        await expect(
          page.getByRole('heading', { name: 'Review the exact action', exact: true })
        ).toBeInViewport();
        await page.getByRole('button', { name: /Results & evidence/ }).click();
        const csv = page.locator('.source-link');
        await csv.scrollIntoViewIfNeeded();
        await expect(csv).toBeInViewport();
        const heading = page.getByRole('heading', { name: 'Review the exact action', exact: true });
        await heading.scrollIntoViewIfNeeded();
        await expect(heading).toBeInViewport();
        const usable = await page
          .locator('.npg-thread')
          .evaluate((element) => element.clientHeight);
        assert.ok(usable >= 180, JSON.stringify({ usable }));
        await page
          .getByRole('button', { name: 'Reject action', exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `${evidence}/short-${viewport.width}-${viewport.height}.png`
        });
        assert.deepEqual(await commands(page), []);
      },
      viewport
    );
  for (const raw of ['null', '[]', '{"new":42}'])
    await scenario('malformed saved drafts recover ' + raw, async (page) => {
      await page.addInitScript((value) => {
        if (!sessionStorage.getItem('fixture-seeded')) {
          sessionStorage.setItem('npg-drafts:fixture', value);
          sessionStorage.setItem('fixture-seeded', 'true');
        }
      }, raw);
      await gotoState(page, 'new');
      const input = page.getByRole('textbox', { name: 'Your question' });
      await input.fill('Recovered question');
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeEnabled();
      await page.reload();
      await expect(input).toHaveText('Recovered question');
      assert.deepEqual(await commands(page), []);
    });
  await scenario(
    'new conversation preserves next draft during create and message',
    async (page) => {
      await gotoState(page, 'new');
      const input = page.getByRole('textbox', { name: 'Your question' });
      await input.fill('Find family NPs near my clinic');
      await input.press('Control+Enter');
      await input.press('Control+Enter');
      await input.fill('Draft typed during conversation creation');
      await expect(page.getByText('231 total', { exact: true })).toBeVisible();
      await expect(input).toHaveText('Draft typed during conversation creation');
      assert.deepEqual(
        (await commands(page)).map((command) => command.type),
        ['create', 'message']
      );
      await page.reload();
      await expect(input).toHaveText('Draft typed during conversation creation');
      await expect(page.locator('.npg-thread-title')).toHaveText('Find family NPs near my clinic');
    }
  );
  await scenario('working state is honest and output is escaped', async (page) => {
    await gotoState(page);
    const input = page.getByRole('textbox', { name: 'Your question' });
    await input.fill('Find family NPs in Springfield');
    await input.press('Control+Enter');
    await input.press('Control+Enter');
    await expect(page.getByRole('button', { name: 'Working…' })).toBeDisabled();
    await expect(page.getByText(/The response arrives together/)).toBeVisible();
    await page.screenshot({ path: `${evidence}/working.png` });
    await input.fill('My next question');
    await expect(page.getByText('231 total', { exact: true })).toBeVisible();
    await expect(input).toHaveText('My next question');
    assert.equal((await commands(page)).filter((command) => command.type === 'message').length, 1);
    await expect(page.locator('.npg-messages')).toContainText(
      '<script>alert("untrusted")</script>'
    );
    assert.equal(await page.locator('.npg-messages script').count(), 0);
    await page.screenshot({ path: `${evidence}/completed.png` });
  });
  await scenario(
    'error preserves draft and requires explicit readback',
    async (page) => {
      await gotoState(page, 'error');
      const input = page.getByRole('textbox', { name: 'Your question' });
      await input.fill('Question before interruption');
      await input.press('Control+Enter');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(input).toHaveText('Question before interruption');
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeEnabled();
      await page.screenshot({ path: `${evidence}/error.png` });
      assert.equal(
        (await commands(page)).filter((command) => command.type === 'message').length,
        1
      );
    },
    { width: 390, height: 844 }
  );
  await scenario('expiry disables only approval', async (page) => {
    await gotoState(page, 'expired');
    await expect(page.getByRole('button', { name: 'Approve this action' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reject action', exact: true })).toBeEnabled();
    await expect(page.getByText('This review has expired. Approval is unavailable.')).toBeVisible();
  });
  await scenario('exact enrichment review retains cost allowance and scope', async (page) => {
    await gotoState(page, 'enrichment');
    const review = page.locator('.npg-review');
    for (const text of [
      'Maximum cost',
      '0.15',
      'One-time shared allowance',
      '100',
      'Professional profile only; personal contacts excluded.',
      'Include personal contact details'
    ])
      await expect(review).toContainText(text);
    assert.deepEqual(await commands(page), []);
    await page.screenshot({ path: `${evidence}/enrichment.png` });
  });
  for (const state of ['ambiguous', 'running', 'interrupted'])
    await scenario(state + ' readback cannot resend', async (page) => {
      await gotoState(page, state);
      await page.getByRole('textbox', { name: 'Your question' }).fill('Do not send');
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeDisabled();
      assert.deepEqual(await commands(page), []);
    });
  await scenario('canonical nested evidence preserves source boundaries', async (page) => {
    await gotoState(page, 'canonical');
    const evidencePanel = page.locator('.npg-evidence');
    for (const text of [
      'snapshot-all-np',
      'all_np_taxonomies',
      '363LF0000X',
      '2026-09-14',
      'Certification unknown',
      'not_recorded'
    ])
      await expect(evidencePanel).toContainText(text);
    await expect(page.getByText('200 total', { exact: true })).toBeVisible();
    await expect(page.getByText('Shown count not supplied', { exact: true })).toBeVisible();
    await evidencePanel
      .getByRole('region', { name: 'Registry practitioner', exact: true })
      .getByRole('button', { name: 'Public registry record · unverified' })
      .click();
    await expect(evidencePanel).toContainText('Jamie Example');
    await disclosureHasClearBody(
      page,
      evidencePanel
        .getByRole('region', { name: 'Registry practitioner', exact: true })
        .getByRole('button', { name: 'Public registry record · unverified' })
    );
    await evidencePanel
      .getByRole('button', { name: 'Vendor-reported professional profile · unverified' })
      .click();
    await expect(evidencePanel).toContainText('Nurse practitioner');
    await disclosureHasClearBody(
      page,
      evidencePanel.getByRole('button', {
        name: 'Vendor-reported professional profile · unverified'
      })
    );
    await page.screenshot({ path: `${evidence}/canonical-evidence.png` });
  });
  await scenario(
    'Skip Trace evidence is unverified and blocked contacts stay undisclosed',
    async (page) => {
      await gotoState(page, 'skiptrace');
      const panel = page.locator('.npg-evidence');
      await expect(panel).toContainText('Look up one candidate with Skip Trace');
      await expect(panel).toContainText('0.05');
      await expect(panel).toContainText('Charge reconciled');
      await expect(panel).toContainText('Apify one-api/skip-trace');
      const first = panel.locator('.npg-source').first();
      await first
        .getByRole('button', {
          name: 'Skip Trace vendor contacts · ownership and consent unverified; recruiting readiness blocked'
        })
        .click();
      await expect(first).toContainText('synthetic-person@example.invalid');
      await disclosureHasClearBody(
        page,
        first.getByRole('button', { name: /Skip Trace vendor contacts/ })
      );
      const blocked = panel.locator('.npg-source').nth(1);
      await expect(blocked).toContainText('privacy_blocked');
      assert.equal(
        await blocked.getByRole('button', { name: /Skip Trace vendor contacts/ }).count(),
        0
      );
      await expect(
        blocked.getByText('stale-contact@example.invalid', { exact: true })
      ).not.toBeVisible();
      assert.equal(await page.getByRole('button', { name: /Refresh Skip Trace/ }).count(), 0);
      assert.deepEqual(await commands(page), []);
      await page.screenshot({ path: `${evidence}/skiptrace-evidence.png` });
    }
  );
  await scenario('skip focus newline IME and local fonts', async (page) => {
    await gotoState(page, 'new');
    const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
    await skip.focus();
    await skip.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    const input = page.getByRole('textbox', { name: 'Your question' });
    await input.fill('Line one');
    await input.press('Enter');
    await input.press('x');
    assert.equal((await commands(page)).length, 0);
    await expect(input).toContainText('Line one');
    await input.evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          ctrlKey: true,
          isComposing: true,
          bubbles: true
        })
      )
    );
    assert.equal((await commands(page)).length, 0);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.fonts.check('14px Figtree')), true);
  });
  await scenario('reduced motion keeps an honest empty state', async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoState(page, 'new');
    await expect(
      page.getByRole('heading', { name: 'Start with the people you need to find.' })
    ).toBeVisible();
    await page.screenshot({ path: `${evidence}/empty.png` });
  });
  await scenario(
    'no JavaScript retains sole main and truthful instructions',
    async (page) => {
      await page.goto(base);
      await expect(page.getByRole('heading', { name: 'NPG Healthcare analyst' })).toBeVisible();
      await expect(page.locator('noscript')).toBeVisible();
      assert.match(
        await page.locator('noscript').textContent(),
        /needs JavaScript to send questions/
      );
      assert.equal(await page.getByRole('main').count(), 1);
      assert.equal(await page.getByRole('button').count(), 0);
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      await skip.focus();
      await skip.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
    },
    { width: 390, height: 844 },
    { javaScriptEnabled: false }
  );
} finally {
  await browser.close();
  await writeFile(`${evidence}/browser-report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
