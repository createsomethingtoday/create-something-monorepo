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
  } catch (error) {
    await page.screenshot({ path: `${evidence}/failed.png` });
    throw error;
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
    if (['review', 'expired', 'enrichment', 'skip-review'].includes(state))
      await expect(page.getByRole('heading', { name: /^Review: / })).toBeFocused();
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
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1440, 900]
  ]) {
    await scenario(
      `composer writing and action regions remain readable at ${width}`,
      async (page) => {
        await gotoState(page, 'new');
        const input = page.getByRole('textbox', { name: 'Your question' });
        const surface = await page.locator('.npg-composer-surface').boundingBox();
        const threadBox = await page.locator('.npg-thread').boundingBox();
        assert.ok(
          surface.y >= threadBox.y - 1,
          'The empty composer label and top must not start behind the header'
        );
        const type = await input.evaluate((element) => {
          const style = getComputedStyle(element);
          return { size: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) };
        });
        assert.ok(type.size >= 16, 'The primary writing text must be comfortable on a phone');
        assert.ok(type.line >= type.size * 1.25, 'Writing lines must retain readable leading');
        const draft =
          'Family nurse practitioners near Springfield, Missouri.\nKeep the complete sourcing CSV.\nExplain coverage limits before any paid lookup.';
        const lines = draft.split('\n');
        await input.fill(lines[0]);
        for (const line of lines.slice(1)) {
          await input.press('Enter');
          await page.keyboard.insertText(line);
        }
        await expect(input).toBeFocused();
        if (width === 390) {
          assert.ok(
            await input.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
            'A taller phone should show this complete initial draft without internal scrolling'
          );
        }
        const send = page.getByRole('button', { name: 'Send question', exact: true });
        const inputBox = await input.boundingBox();
        const sendBox = await send.boundingBox();
        assert.ok(sendBox.height >= 44, 'The send control must remain comfortably tappable');
        assert.ok(
          inputBox.y + inputBox.height <= sendBox.y + 1,
          'The send action must not overlap writing'
        );
        await send.scrollIntoViewIfNeeded();
        await expect(send).toBeInViewport();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.deepEqual(await commands(page), []);
        await page.screenshot({
          path: `${evidence}/composer-${width}.png`,
          animations: 'disabled'
        });
        await page.reload();
        await expect(input).toHaveText(draft, { useInnerText: true });
        const overflows = await input.evaluate(
          (element) => element.scrollHeight > element.clientHeight + 1
        );
        const hint = page.locator('#npg-draft-scroll-hint');
        if (overflows) {
          await expect(hint).toBeVisible();
          await expect(input).toHaveAttribute('aria-describedby', 'npg-draft-scroll-hint');
        } else await expect(hint).toHaveCount(0);
        await input.fill('Brief question.');
        await expect(hint).toHaveCount(0);
        assert.deepEqual(await commands(page), []);
      },
      { width, height }
    );
  }

  await scenario(
    'long draft scroll cue follows the editor across history and resize',
    async (page) => {
      await page.goto(base + '/?state=canonical');
      const input = page.getByRole('textbox', { name: 'Your question' });
      await input.waitFor();
      const draft =
        'Find family nurse practitioners near Springfield Missouri and keep a complete sourcing list. '.repeat(
          4
        );
      await page.evaluate((text) => {
        const bootstrap = JSON.parse(document.getElementById('npg-bootstrap').textContent);
        sessionStorage.setItem(
          'npg-drafts:' + bootstrap.owner,
          JSON.stringify({ new: text, [bootstrap.conversations[0].id]: text })
        );
      }, draft);
      await page.reload();
      const hint = page.locator('#npg-draft-scroll-hint');
      await expect(hint).toBeVisible();
      await page.getByTestId('mobile-nav-toggle').click();
      await page.locator('.history-item').first().click();
      await expect(input).toBeFocused();
      await expect(input).toHaveText(draft);
      await expect
        .poll(() => input.evaluate((element) => element.scrollHeight > element.clientHeight + 1))
        .toBe(true);
      await expect(hint).toBeVisible();
      await expect(input).toHaveAttribute('aria-describedby', 'npg-draft-scroll-hint');
      await input.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
      await expect(hint).toHaveText('Scroll up to review');
      await input.evaluate((element) => element.scrollTo({ top: 0 }));
      await expect(hint).toHaveText('Scroll down to review');
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect
        .poll(() => input.evaluate((element) => element.scrollHeight <= element.clientHeight + 1))
        .toBe(true);
      await expect(hint).toHaveCount(0);
      await expect(input).toHaveText(draft);
      assert.deepEqual(await commands(page), []);
    },
    { width: 390, height: 844 }
  );

  await scenario(
    'mobile evidence returns to exact review with context beside decisions',
    async (page) => {
      await gotoState(page, 'skip-review');
      await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveCount(0);
      for (const control of await page.locator('.npg-review-decision-bar button').all()) {
        const visible = (await control.innerText()).trim().toLowerCase();
        const accessible = ((await control.getAttribute('aria-label')) || visible).toLowerCase();
        assert.ok(
          accessible.includes(visible),
          'Spoken control name must include its visible label'
        );
      }
      const pending = await page.evaluate(async () => {
        const id = JSON.parse(document.getElementById('npg-bootstrap').textContent).conversations[0]
          .id;
        return (await (await fetch('/delivery/abundance/healthcare-analyst/api?id=' + id)).json())
          .pending;
      });
      const reviewText = (await page.locator('.npg-review').innerText()).replace(/\s+/g, ' ');
      for (const value of Object.values(pending.review)) {
        if (typeof value !== 'string') continue;
        // Supplemental group labels may sit between supplied sentences. Each
        // original sentence, including punctuation, must remain in order.
        let cursor = 0;
        for (const sentence of value.replace(/\s+/g, ' ').split(/(?<=\.) (?=[A-Z])/)) {
          const position = reviewText.indexOf(sentence, cursor);
          assert.ok(position >= 0, 'A supplied review term was omitted or reordered');
          cursor = position + sentence.length;
        }
      }
      const exact = page.getByRole('button', { name: 'Exact request data', exact: true });
      await exact.click();
      assert.deepEqual(
        JSON.parse(await page.locator('.npg-review .npg-json').innerText()),
        pending.arguments
      );
      assert.ok(
        await page
          .locator('.npg-review .npg-json')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
        'Exact paid request must remain readable without horizontal scrolling'
      );
      await exact.click();
      await page.getByRole('button', { name: 'Read terms', exact: true }).click();
      await expect(page.locator('#npg-review-title')).toBeFocused();

      await page.getByRole('button', { name: /Results & evidence/ }).click();
      await expect(
        page.getByRole('heading', { name: 'Results & evidence', exact: true })
      ).toBeFocused();
      await expect(page.getByText('231 records', { exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Back to conversation', exact: true }).click();
      await expect(page.locator('#npg-review-title')).toBeFocused();
      const reject = page.getByRole('button', { name: 'Reject action', exact: true });
      await reject.scrollIntoViewIfNeeded();
      const summary = page.locator('.npg-review-summary');
      await expect(summary).toContainText('1234567890');
      await expect(summary).toContainText('Jamie Example');
      await expect(summary).toContainText('(unverified)');
      await expect(summary).toContainText('$0.10');
      const bounds = await summary.boundingBox();
      const pane = await page.locator('.npg-review-surface').boundingBox();
      assert.ok(pane.y >= 0 && pane.y + pane.height <= page.viewportSize().height + 1);
      assert.ok(
        bounds.y >= pane.y && bounds.y + bounds.height <= pane.y + pane.height,
        'Full decision summary must be visible with decision controls'
      );
      await expect(
        page.getByRole('button', { name: 'Approve this action', exact: true })
      ).toBeInViewport();
      await expect(reject).toBeInViewport();
      const rejectBox = await reject.boundingBox();
      const detailsBox = await page
        .getByRole('button', { name: 'Read terms', exact: true })
        .boundingBox();
      assert.ok(
        Math.abs(rejectBox.y - detailsBox.y) < 1,
        'Short-phone decision controls must share one row'
      );
      assert.ok(
        rejectBox.height >= 44 && detailsBox.height >= 44,
        'Decision targets must remain comfortably tappable'
      );
      assert.deepEqual(await commands(page), []);
      await reject.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
      assert.deepEqual(
        (await commands(page)).map((command) => command.type),
        ['reject']
      );
      await page.reload();
      await expect(
        page.getByText('Action rejected. No action was sent.', { exact: true })
      ).toBeVisible();
    },
    { width: 320, height: 568 }
  );

  await scenario(
    'multiline paste remains literal through draft recovery and submit',
    async (page) => {
      await gotoState(page, 'new');
      const input = page.getByRole('textbox', { name: 'Your question' });
      const draft =
        'Family NPs in Springfield, MO.\n\nKeep <example> as literal text.\nInclude source limits.';
      await input.focus();
      await input.evaluate((element, text) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', text);
        element.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true })
        );
      }, draft);
      assert.equal((await input.innerText()).trimEnd(), draft);
      await expect(input.locator('[data-astryx-token], example')).toHaveCount(0);
      await page.reload();
      assert.equal((await input.innerText()).trimEnd(), draft);
      assert.deepEqual(await commands(page), []);
      await page.getByRole('button', { name: 'Send question', exact: true }).click();
      await expect
        .poll(async () => (await commands(page)).some((command) => command.type === 'message'))
        .toBe(true);
      assert.equal(
        (await commands(page)).find((command) => command.type === 'message').text.trimEnd(),
        draft
      );
    }
  );

  await scenario('exact review conditions remain inside their metadata row', async (page) => {
    await gotoState(page, 'skip-review');
    const escaped = await page.locator('.npg-review dd').evaluateAll((rows) =>
      rows.flatMap((row) => {
        const box = row.getBoundingClientRect();
        return Array.from(row.querySelectorAll('p'))
          .filter((paragraph) => {
            const bounds = paragraph.getBoundingClientRect();
            return bounds.bottom > box.bottom + 1 || bounds.top < box.top - 1;
          })
          .map((paragraph) => paragraph.textContent);
      })
    );
    assert.deepEqual(escaped, [], 'Exact conditions must not overlap the following review row');
    assert.deepEqual(await commands(page), []);
  });

  await scenario(
    'pending review keeps its conversation context available without a command',
    async (page) => {
      await gotoState(page, 'skip-review');
      const context = page.getByRole('button', { name: 'Conversation context', exact: true });
      await expect(context).toHaveAttribute('aria-expanded', 'false');
      await expect(
        page.getByRole('article', { name: 'Message from user', exact: true })
      ).toBeHidden();
      await context.click();
      await expect(context).toHaveAttribute('aria-expanded', 'true');
      await expect(
        page.getByRole('article', { name: 'Message from user', exact: true })
      ).toContainText('Find NPs near Springfield, MO');
      await expect(
        page.getByRole('article', { name: 'Message from assistant', exact: true })
      ).toContainText('Board certification and active licensure remain unknown');
      await page.screenshot({ path: `${evidence}/review-context.png`, animations: 'disabled' });
      await context.click();
      await page.getByRole('button', { name: 'Read terms', exact: true }).click();
      await expect(page.locator('#npg-review-title')).toBeFocused();
      await expect(page.locator('#npg-review-title')).toBeInViewport();
      await expect(page.locator('.npg-review-summary')).toContainText('Jamie Example');
      assert.deepEqual(await commands(page), []);
    },
    { width: 320, height: 568 }
  );

  await scenario(
    'unknown review terms and long identity remain complete and bounded',
    async (page) => {
      const limits =
        'One pinned run, using the current operator limit. Repeated identical input requires a fresh review. Account ownership and empty-sentinel anonymous access are checked before dispatch; these checks cannot exclude explicit grants or Actor-creator sharing. Account restriction and sharing setup require operator review.';
      const args = {
        npi: '1234567890',
        clinics: [{ address: '100 Example Street, Springfield, Missouri 65801' }],
        max_minutes: 35,
        request_reference: 'synthetic-' + 'a'.repeat(120),
        confirm_paid_enrichment: true
      };
      await page.route('**/healthcare-analyst/api?id=*', async (route) => {
        const response = await route.fetch();
        const view = await response.json();
        view.pending.review = {
          scope: 'One selected NPI with the supplied clinic and time limit.',
          limits,
          maximumCost: 0.007,
          currency: 'USD'
        };
        view.pending.arguments = args;
        view.sources[0].data.results = [
          {
            npi: '1234567890',
            name: 'Synthetic Candidate With A Deliberately Long Registry Display Name For Narrow Screen Verification'
          }
        ];
        await route.fulfill({ response, json: view });
      });
      await gotoState(page, 'skip-review');
      const review = page.locator('.npg-review');
      await expect(review).toContainText(limits);
      await expect(review.getByText('Run limits', { exact: true })).toHaveCount(0);
      await expect(review).toContainText('100 Example Street, Springfield, Missouri 65801');
      await expect(review).toContainText('35 minutes');
      await expect(page.locator('.npg-review-summary')).toContainText('$0.007 USD');
      await page.getByRole('button', { name: 'Exact request data', exact: true }).click();
      assert.deepEqual(JSON.parse(await review.locator('.npg-json').innerText()), args);
      assert.ok(
        await review
          .locator('.npg-json')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
        'Long exact request values must wrap without losing their original data'
      );
      const approve = page.getByRole('button', { name: 'Approve this action', exact: true });
      await expect(approve).toBeInViewport();
      await expect(
        page.getByRole('button', { name: 'Reject action', exact: true })
      ).toBeInViewport();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(await commands(page), []);
      await page.screenshot({ path: `${evidence}/long-review.png` });
    },
    { width: 320, height: 568 }
  );

  await scenario(
    'starter fills an editable draft without submitting and survives reload',
    async (page) => {
      await gotoState(page, 'new');
      assert.ok(
        (await page.getByRole('button', { name: 'Send question', exact: true }).boundingBox())
          .height >= 44
      );
      const starter = page.getByRole('button', { name: /Find candidates by city/ });
      await starter.click();
      const input = page.getByRole('textbox', { name: 'Your question' });
      await expect(input).toBeFocused();
      await expect(input).toHaveText(
        'Find FNP and adult-gerontology NP candidates in Springfield, MO, with a complete sourcing CSV.'
      );
      assert.deepEqual(await commands(page), []);
      await page.reload();
      await expect(input).toHaveText(
        'Find FNP and adult-gerontology NP candidates in Springfield, MO, with a complete sourcing CSV.'
      );
      assert.deepEqual(await commands(page), []);
    },
    { width: 390, height: 844 }
  );

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
      await expect(page.getByRole('heading', { name: /^Review: / })).toBeInViewport();
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
        const threadBox = await page.locator('.npg-thread').boundingBox();
        assert.ok(
          threadBox && threadBox.y + threadBox.height <= viewport.height + 1,
          'Review must scroll inside the workspace, not extend the whole page'
        );
        const helper = page.locator('.npg-review-summary');
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
        await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveCount(0);
        // The saved draft remains in state while review replaces the inactive composer.

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
        const heading = page.getByRole('heading', { name: /^Review: / });
        await expect(heading).toBeInViewport();
        assert.equal(await page.getByRole('main').count(), 1);
        await page.getByRole('button', { name: /Results & evidence/ }).click();
        await expect(page.getByText('231 records', { exact: true })).toBeVisible();
        const csv = page.locator('.source-link');
        assert.ok(
          (await csv.boundingBox()).height >= 44,
          'CSV action must remain comfortably tappable'
        );
        await expect(csv).toHaveAttribute(
          'href',
          '/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X'
        );
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (width <= 1024)
          await page.getByRole('button', { name: 'Back to conversation', exact: true }).click();
        else {
          await page.getByRole('button', { name: /Results & evidence/ }).click();
          await expect(page.locator('#npg-review-title')).toBeFocused();
        }
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
          await page.getByRole('button', { name: /Results & evidence/ }).click();
          await expect(page.locator('.source-link')).toHaveCount(1);
          await expect(page.locator('.source-link')).toHaveAttribute(
            'href',
            '/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X'
          );
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
        await expect(page.getByRole('heading', { name: /^Review: / })).toBeInViewport();
        await page.getByRole('button', { name: /Results & evidence/ }).click();
        const csv = page.locator('.source-link');
        await csv.scrollIntoViewIfNeeded();
        await expect(csv).toBeInViewport();
        await page.getByRole('button', { name: 'Back to conversation', exact: true }).click();
        const heading = page.getByRole('heading', { name: /^Review: / });
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
      await expect(page.getByText('231 records', { exact: true })).toBeVisible();
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
  await scenario(
    'new chat leaves mobile evidence and focuses its empty draft',
    async (page) => {
      await gotoState(page, 'result');
      await page
        .getByRole('textbox', { name: 'Your question' })
        .fill('Keep this draft with the old conversation');
      await page.getByRole('button', { name: /Results & evidence/ }).click();
      await page.getByTestId('mobile-nav-toggle').click();
      await page.getByRole('button', { name: 'New chat', exact: true }).click();
      const input = page.getByRole('textbox', { name: 'Your question' });
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
      await expect(input).toHaveText('');
      await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible();
      assert.deepEqual(
        (await commands(page)).map((command) => command.type),
        ['create']
      );
      const drafts = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('npg-drafts:fixture'))
      );
      assert.ok(Object.values(drafts).includes('Keep this draft with the old conversation'));
    },
    { width: 390, height: 844 }
  );
  await scenario('working state is honest and output is escaped', async (page) => {
    await gotoState(page);
    const input = page.getByRole('textbox', { name: 'Your question' });
    await input.fill('Find family NPs in Springfield');
    await input.press('Control+Enter');
    await input.press('Control+Enter');
    await expect(page.getByRole('button', { name: 'Working…' })).toBeDisabled();
    await expect(
      page.getByText('Your answer will appear here when it is ready.', { exact: true })
    ).toBeVisible();
    await page.screenshot({ path: `${evidence}/working.png` });
    await input.fill('My next question');
    await expect(page.getByText('231 records', { exact: true })).toBeVisible();
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
      // Opening history remounts the empty editor after the mobile dialog closes.
      // It must keep a real line box without introducing a draft or a command.
      await expect(input).toHaveText('');
      await expect.poll(async () => (await input.boundingBox())?.height ?? 0).toBeGreaterThan(0);
      assert.deepEqual(await commands(page), []);
      await input.fill('Question before interruption');
      await input.press('Control+Enter');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(input).toHaveText('Question before interruption');
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeDisabled();
      assert.ok(
        (await page.getByRole('button', { name: 'Refresh history', exact: true }).boundingBox())
          .height >= 44,
        'The recovery action must remain comfortably tappable'
      );
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
      'Not recorded'
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
      // Decision-relevant outcome and billing evidence stay visible without opening technical details.
      await expect(first.getByText('Review required', { exact: true })).toBeVisible();
      await expect(first.getByText('0.05', { exact: true })).toBeVisible();
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
      await expect(blocked).toContainText('Privacy blocked');
      await expect(blocked.getByText('Privacy blocked', { exact: true })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible();
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
