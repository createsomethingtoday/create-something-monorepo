// Deterministic local component checks. No Identity bypass or production/vendor calls.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base = process.env.NPG_UI_URL || 'http://127.0.0.1:4217';
const evidence = process.env.NPG_UI_EVIDENCE || '/tmp/npg-chat-evidence';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
async function scenario(name, fn, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Only local fixture assets are permitted; a regression cannot spend or contact a provider.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin
      ? route.continue()
      : route.abort()
  );
  try {
    await fn(page);
    assert.deepEqual(errors, []);
    report.push({ name, passed: true });
  } finally {
    await context.close();
  }
}
try {
  for (const raw of ['null', '[]', '{"new":42}'])
    await scenario(`malformed saved draft recovers: ${raw}`, async (page) => {
      await page.addInitScript((value) => sessionStorage.setItem('npg-drafts:fixture', value), raw);
      await page.goto(base + '/?state=new');
      const input = page.getByLabel('Your question');
      await input.fill('Recovered question');
      await expect(page.getByRole('button', { name: 'Send question' })).toBeEnabled();
      // Remove init script on reload by checking persistence in the current document.
      await expect
        .poll(() =>
          page.evaluate(() => JSON.parse(sessionStorage.getItem('npg-drafts:fixture')).new)
        )
        .toBe('Recovered question');
    });
  for (const width of [320, 390, 768, 1024, 1025, 1440])
    await scenario(
      `review and responsive panels at ${width}`,
      async (page) => {
        await page.goto(base + '/?state=review');
        await expect(
          page.getByRole('heading', { name: 'Review the exact action', exact: true })
        ).toBeVisible();
        assert.equal(await page.locator('main').count(), 1);
        assert.equal(await page.locator('#main-content').count(), 1);
        assert.equal(await page.locator('.thread').evaluate((el) => el.clientHeight > 60), true);
        if (width >= 768) await expect(page.getByRole('button', { name: /^History/ })).toBeHidden();
        if (width >= 1025) await expect(page.locator('.review')).toBeInViewport();
        if (width <= 1024) {
          await page.getByRole('button', { name: /Results & evidence/ }).click();
          await expect(page.getByText('231 total', { exact: true })).toBeVisible();
          // Results disclosure never replaces the review/thread with a tab.
          await expect(page.locator('.review')).toBeVisible();
          assert.equal(await page.locator('.thread').evaluate((el) => el.clientHeight > 30), true);
          if (width === 390) await page.screenshot({ path: `${evidence}/sources-mobile.png` });
        }
        const overflow = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth
        }));
        assert.ok(overflow.document <= width && overflow.body <= width, JSON.stringify(overflow));
        const csv = page.locator('.source-link');
        assert.equal(
          await csv.getAttribute('href'),
          '/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X'
        );
        await page
          .getByRole('button', { name: 'Reject action', exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/review-${width}.png` });
        if (width === 390) {
          await page.getByLabel('Your question').focus();
          await page.keyboard.press('Shift+Tab');
          assert.equal(
            await page.evaluate(() => document.activeElement?.textContent),
            'Reject action'
          );
          await page.keyboard.press('Enter');
          await expect(
            page.getByText('Action rejected. No action was sent.', { exact: true })
          ).toBeVisible();
          const commands = await page.evaluate(() => window.npgFixtureCommands);
          assert.equal(commands.length, 1);
          assert.equal(commands[0].type, 'reject');
          assert.equal(commands[0].actionId, '1d0822cf-c2ac-4713-a6ba-fef887b7bccc');
          assert.equal(commands[0].version, 0);
          assert.equal(await page.locator('.source-link').count(), 1);
          await page.getByRole('button', { name: /^History/ }).click();
          await page.locator('.history-item').click();
          await expect(page.getByLabel('Your question')).toBeFocused();
          await expect(page.getByRole('button', { name: /^History/ })).toHaveAttribute(
            'aria-expanded',
            'false'
          );
        }
      },
      { width, height: 900 }
    );
  await scenario(
    'first question creates a conversation through the existing transport',
    async (page) => {
      await page.goto(base + '/?state=new');
      await expect(page.locator('.history-item')).toHaveCount(0);
      const input = page.getByLabel('Your question');
      await input.fill('Find family NPs near my clinic');
      await input.press('Control+Enter');
      await expect(page.getByText('231 total', { exact: true })).toBeVisible();
      await expect(page.locator('.thread-header h2')).toHaveText('Find family NPs near my clinic');
      const commands = await page.evaluate(() => window.npgFixtureCommands);
      assert.deepEqual(
        commands.map((command) => command.type),
        ['create', 'message']
      );
      assert.equal(commands[1].version, 0);
    }
  );
  await scenario('expiry disables approval while rejection remains available', async (page) => {
    await page.goto(base + '/?state=expired');
    await expect(page.getByRole('button', { name: 'Approve this action' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reject action' })).toBeEnabled();
    await expect(page.getByText('This review has expired. Approval is unavailable.')).toBeVisible();
  });
  await scenario(
    'exact enrichment review keeps cost, allowance and personal-contact scope visible',
    async (page) => {
      await page.goto(base + '/?state=enrichment');
      const review = page.locator('.review');
      await expect(review).toContainText('Maximum cost');
      await expect(review).toContainText('0.15');
      await expect(review).toContainText('One-time shared allowance');
      await expect(review).toContainText('100');
      await expect(review).toContainText('Professional profile only; personal contacts excluded.');
      await expect(review).toContainText('Include personal contact details');
      assert.deepEqual(await page.evaluate(() => window.npgFixtureCommands), []);
      await page.getByRole('button', { name: 'Reject action' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/enrichment-review.png` });
    }
  );
  await scenario(
    'honest working state, duplicate suppression, safe output and next draft',
    async (page) => {
      await page.goto(base);
      const input = page.getByLabel('Your question');
      await input.fill('Find family NPs in Springfield');
      await input.press('Control+Enter');
      await input.press('Control+Enter');
      await expect(page.getByRole('button', { name: 'Working…' })).toBeDisabled();
      await expect(page.getByText(/The response arrives together/)).toBeVisible();
      await page.screenshot({ path: `${evidence}/working-desktop.png` });
      await input.fill('My next question stays drafted');
      await expect(page.getByText('231 total', { exact: true })).toBeVisible();
      await expect(input).toHaveValue('My next question stays drafted');
      await expect(page.locator('.thread-header h2')).toHaveText('Find family NPs in Springfield');
      const commands = await page.evaluate(() => window.npgFixtureCommands);
      assert.equal(commands.filter((c) => c.type === 'message').length, 1);
      await expect(page.locator('.messages')).toContainText('<script>alert("untrusted")</script>');
      assert.equal(await page.locator('.messages script').count(), 0);
      await page.screenshot({ path: `${evidence}/completed-desktop.png` });
    }
  );
  await scenario(
    'error keeps draft and requires explicit readback before send',
    async (page) => {
      await page.goto(base + '/?state=error');
      const input = page.getByLabel('Your question');
      await input.fill('Question before interruption');
      await input.press('Control+Enter');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(input).toHaveValue('Question before interruption');
      await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
      await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Send question' })).toBeEnabled();
      assert.equal(
        (await page.evaluate(() => window.npgFixtureCommands)).filter((c) => c.type === 'message')
          .length,
        1
      );
      await input.fill('Draft persists across reload');
      await page.reload();
      await expect(input).toHaveValue('Draft persists across reload');
      await input.press('Control+Enter');
      await expect(page.getByRole('alert')).toBeVisible();
      await page.screenshot({ path: `${evidence}/error-mobile.png` });
    },
    { width: 390, height: 844 }
  );
  for (const state of ['ambiguous', 'interrupted', 'running'])
    await scenario(`${state} readback cannot resend`, async (page) => {
      await page.goto(base + '/?state=' + state);
      await page.getByLabel('Your question').fill('Do not send');
      await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
      await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Send question' })).toBeDisabled();
      assert.deepEqual(await page.evaluate(() => window.npgFixtureCommands), []);
      await page.screenshot({ path: `${evidence}/${state}.png` });
    });
  await scenario('reduced motion retains evidence and empty composer', async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base);
    await expect(page.getByRole('heading', { name: /Start with the people/ })).toBeVisible();
    await expect(page.getByLabel('Your question')).toBeVisible();
    assert.equal(
      await page.locator('.thread').evaluate((el) => getComputedStyle(el).scrollBehavior),
      'auto'
    );
    await page.screenshot({ path: `${evidence}/empty-desktop.png` });
  });
} finally {
  await browser.close();
  await writeFile(`${evidence}/browser-report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
