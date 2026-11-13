// Exact local bundle, synthetic HTTP only. Tests inspect motion in flight and
// interruption outcomes rather than implementation strings or elapsed sleeps.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.NPG_UI_URL || 'http://127.0.0.1:4227';
const directory = process.env.NPG_UI_EVIDENCE || '/tmp/npg-motion-evidence';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
async function scenario(name, fn, options = {}) {
  if (process.env.NPG_UI_SCENARIO && !name.includes(process.env.NPG_UI_SCENARIO)) return;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin
      ? route.continue()
      : route.abort()
  );
  try {
    await fn(page);
    assert.deepEqual(errors, []);
    report.push({ name, passed: true });
  } catch (error) {
    await page.screenshot({ path: directory + '/failure.png' });
    throw error;
  } finally {
    await context.close();
  }
}
async function open(page) {
  await page.goto(base + '/?state=canonical');
  await page.getByRole('textbox', { name: 'Your question' }).waitFor();
  const history = page.locator('.history-item').first();
  if (!(await history.isVisible())) await page.getByTestId('mobile-nav-toggle').click();
  await history.click();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
}
try {
  for (const reducedMotion of ['no-preference', 'reduce'])
    await scenario(
      'pane and disclosure motion obey ' + reducedMotion,
      async (page) => {
        await open(page);
        const sample = await page.evaluate(async () => {
          document.querySelector('.npg-results-toggle').click();
          await new Promise(requestAnimationFrame);
          const panel = document.querySelector('.npg-inline-results');
          return {
            opacity: Number(getComputedStyle(panel).opacity),
            transform: getComputedStyle(panel).transform,
            cssAnimations: panel.getAnimations({ subtree: true }).length
          };
        });
        assert.equal(sample.cssAnimations, 0, 'No library CSS/WAAPI clock competes with GSAP');
        if (reducedMotion === 'reduce') {
          assert.equal(sample.opacity, 1);
          assert.equal(sample.transform, 'none');
        } else
          assert.ok(
            sample.opacity < 1 || sample.transform !== 'none',
            'The standard entrance has an observable intermediate state'
          );
        const panel = page.locator('.npg-inline-results');
        await expect.poll(() => panel.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
        await expect
          .poll(() => panel.evaluate((node) => getComputedStyle(node).transform))
          .toBe('none');
        const trigger = panel
          .getByRole('button', { name: 'Source details & provenance', exact: true })
          .first();
        await trigger.scrollIntoViewIfNeeded();
        const id = await trigger.getAttribute('aria-controls');
        const body = page.locator('[id="' + id + '"]');
        await trigger.click();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(body).toHaveAttribute('aria-hidden', 'false');
        await trigger.evaluate(async (node) => {
          node.click();
          await new Promise(requestAnimationFrame);
          node.click();
          await new Promise(requestAnimationFrame);
          node.click();
        });
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(body).toHaveAttribute('aria-hidden', 'true');
        await expect(body).toHaveJSProperty('inert', true);
        await expect(body).toBeHidden();
        await trigger.click();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(body).toBeVisible();
        await expect.poll(() => body.evaluate((node) => node.style.height)).toBe('');
        if (reducedMotion === 'no-preference') {
          await trigger.click();
          await expect(body).toBeHidden();
          // Register before the preference mutation; sample inside the actual change
          // event after the scoped owners have synchronously settled their tweens.
          const preference = page.evaluate(
            (bodyId) =>
              new Promise((resolve) => {
                matchMedia('(prefers-reduced-motion: reduce)').addEventListener(
                  'change',
                  () => {
                    const node = document.getElementById(bodyId);
                    resolve({
                      height: node.style.height,
                      opacity: getComputedStyle(node).opacity,
                      hidden: node.hidden
                    });
                  },
                  { once: true }
                );
              }),
            id
          );
          await trigger.evaluate((node) => node.click());
          await page.emulateMedia({ reducedMotion: 'reduce' });
          const settled = await preference;
          assert.equal(settled.height, '');
          assert.equal(settled.opacity, '1');
          assert.equal(settled.hidden, false);
        }
        await page.getByRole('button', { name: 'Back to conversation', exact: true }).click();
        await expect(page.locator('.npg-results-toggle')).toBeFocused();
      },
      { reducedMotion }
    );

  await scenario(
    'programmatic Latest scroll cancels on real wheel intent',
    async (page) => {
      await page.route('**/delivery/abundance/healthcare-analyst/api?id=*', async (route) => {
        const response = await route.fetch();
        const view = await response.json();
        view.messages = Array.from({ length: 60 }, (_, index) => ({
          role: index % 2 ? 'assistant' : 'user',
          text:
            'Synthetic transcript item ' +
            index +
            '. Public registry evidence requires verification. '.repeat(6)
        }));
        await route.fulfill({ response, json: view });
      });
      await open(page);
      const thread = page.locator('.npg-thread');
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
      await thread.evaluate((node) => {
        node.scrollTop = 0;
      });
      await expect(page.getByRole('button', { name: 'Latest message', exact: true })).toBeEnabled();
      const inFlight = await page.evaluate(async () => {
        [...document.querySelectorAll('button')]
          .find((node) => node.getAttribute('aria-label') === 'Latest message')
          .click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        return document.querySelector('.npg-thread').scrollTop;
      });
      assert.ok(inFlight > 0, 'Latest begins a GSAP scroll');
      const box = await thread.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -160);
      const samples = await thread.evaluate(async (node) => {
        const top = node.scrollTop;
        for (let index = 0; index < 20; index++) await new Promise(requestAnimationFrame);
        return { top, end: node.scrollTop, max: node.scrollHeight - node.clientHeight };
      });
      assert.ok(samples.end < samples.max - 2, 'Cancelled scroll never resumes toward Latest');
      assert.ok(samples.end <= samples.top + 1, 'Native user scroll wins after cancellation');
    },
    { reducedMotion: 'no-preference' }
  );

  await scenario(
    'desktop operation feedback keeps the transcript header stable',
    async (page) => {
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await page.route('**/delivery/abundance/healthcare-analyst/api', async (route) => {
        if (
          route.request().method() === 'POST' &&
          route.request().postDataJSON().type === 'create'
        ) {
          await held;
          return route.fulfill({
            json: {
              id: 'new-local-conversation',
              version: 0,
              status: 'idle',
              messages: [],
              sources: [],
              pending: null
            }
          });
        }
        return route.continue();
      });
      await open(page);
      const header = page.locator('.npg-thread-title').locator('..');
      const before = await header.boundingBox();
      await page.getByRole('button', { name: 'New chat', exact: true }).click();
      await expect(page.locator('.npg-state')).toHaveText('Creating conversation');
      const during = await header.boundingBox();
      assert.equal(await page.getByRole('textbox', { name: 'Your question' }).isEditable(), false,
        'Pending navigation cannot accept a draft into the preceding conversation');
      release();
      await expect(page.getByRole('textbox', { name: 'Your question' })).toBeEditable();
      await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
      assert.ok(
        Math.abs(during.height - before.height) <= 1,
        'A longer operation label must not move the transcript down'
      );
    },
    { viewport: { width: 1440, height: 900 } }
  );

  await scenario(
    'reply arrival preserves reading after the user scrolls away',
    async (page) => {
      let saved;
      let received = false;
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await page.route('**/delivery/abundance/healthcare-analyst/api**', async (route) => {
        const request = route.request();
        if (request.method() === 'POST' && request.postDataJSON().type === 'message') {
          received = true;
          await held;
          return route.fulfill({
            json: {
              ...saved,
              version: saved.version + 1,
              messages: [
                ...saved.messages,
                { role: 'user', text: 'A synthetic follow-up' },
                {
                  role: 'assistant',
                  text: 'Synthetic delayed answer. Certification remains unknown.'
                }
              ]
            }
          });
        }
        if (new URL(request.url()).searchParams.has('id')) {
          const response = await route.fetch();
          saved = await response.json();
          saved.messages = Array.from({ length: 60 }, (_, index) => ({
            role: index % 2 ? 'assistant' : 'user',
            text:
              'Synthetic saved transcript ' +
              index +
              '. Public registry evidence requires verification. '.repeat(6)
          }));
          return route.fulfill({ response, json: saved });
        }
        return route.continue();
      });
      await open(page);
      const thread = page.locator('.npg-thread');
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
      await page.getByRole('textbox', { name: 'Your question' }).fill('A synthetic follow-up');
      await page.getByRole('button', { name: 'Send question', exact: true }).click();
      await expect.poll(() => received).toBe(true);
      await expect(page.getByRole('textbox', { name: 'Your question' })).toBeEditable();
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
      await thread.evaluate((node) => {
        node.scrollTop = 650;
      });
      await expect(page.getByRole('button', { name: 'Latest message', exact: true })).toBeEnabled();
      release();
      await expect(page.locator('.npg-messages')).toContainText('Synthetic delayed answer.');
      await expect(page.getByRole('button', { name: 'Send question', exact: true })).toBeDisabled();
      await expect(page.locator('.npg-state')).toHaveText('Ready');
      const positions = await thread.evaluate(async (node) => {
        const samples = [];
        for (let index = 0; index < 20; index++) {
          await new Promise(requestAnimationFrame);
          samples.push(node.scrollTop);
        }
        return samples;
      });
      assert.ok(
        positions.every((top) => Math.abs(top - 650) <= 1),
        'A delayed reply must not move the user away from the saved reading position'
      );
      await page.getByRole('button', { name: 'Latest message', exact: true }).click();
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
    },
    { viewport: { width: 1440, height: 900 } }
  );

  await scenario(
    'refresh preserves a blocked transcript reading position',
    async (page) => {
      await page.route('**/delivery/abundance/healthcare-analyst/api?id=*', async (route) => {
        const response = await route.fetch();
        const view = await response.json();
        view.status = 'running';
        view.messages = Array.from({ length: 60 }, (_, index) => ({
          role: index % 2 ? 'assistant' : 'user',
          text:
            'Synthetic saved transcript ' +
            index +
            '. Public registry evidence requires verification. '.repeat(6)
        }));
        await route.fulfill({ response, json: view });
      });
      await open(page);
      const thread = page.locator('.npg-thread');
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
      await thread.evaluate((node) => {
        node.scrollTop = 650;
      });
      await expect(page.getByRole('button', { name: 'Latest message', exact: true })).toBeEnabled();
      // Activate the public control without Playwright first scrolling the
      // offscreen button into view; that browser scroll is a separate intent.
      await page
        .getByRole('button', { name: 'Refresh history', exact: true })
        .evaluate((node) => node.click());
      await expect(
        page.getByRole('button', { name: 'Refresh history', exact: true })
      ).toBeEnabled();
      await expect.poll(() => thread.evaluate((node) => node.scrollTop)).toBe(650);
    },
    { viewport: { width: 1440, height: 900 } }
  );

  await scenario(
    'restored pending review begins at its exact terms',
    async (page) => {
      await page.goto(base + '/?state=skip-review');
      await page.getByRole('textbox', { name: 'Your question' }).waitFor();
      await page.getByTestId('mobile-nav-toggle').click();
      await page.locator('.history-item').first().click();
      await expect(page.locator('#npg-review-title')).toBeFocused();
      await page.reload();
      await expect(page.locator('#npg-review-title')).toBeInViewport();
      await expect(page.locator('#npg-review-title')).toBeFocused();
      const heading = await page.locator('#npg-review-title').boundingBox();
      const thread = await page.locator('.npg-thread').boundingBox();
      assert.ok(
        heading.y >= thread.y - 1 && heading.y < thread.y + thread.height / 4,
        'The exact request starts at the beginning of the reading region'
      );
      await expect(
        page.getByRole('button', { name: 'Approve this action', exact: true })
      ).toBeInViewport();
    },
    { viewport: { width: 320, height: 568 } }
  );

  await scenario(
    'conversation navigation restores each transcript position',
    async (page) => {
      const primary = '0d0822cf-c2ac-4713-a6ba-fef887b7bccc';
      const secondary = 'second-synthetic-conversation';
      const messages = Array.from({ length: 60 }, (_, index) => ({
        role: index % 2 ? 'assistant' : 'user',
        text:
          'Synthetic saved transcript ' +
          index +
          '. Public registry evidence requires verification. '.repeat(6)
      }));
      let secondaryCreated = false;
      await page.route('**/delivery/abundance/healthcare-analyst/api**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const listing = [
          {
            id: primary,
            title: 'Find NPs near Springfield, MO, and keep the complete CSV.',
            status: 'idle',
            updated_at: Date.now()
          },
          ...(secondaryCreated
            ? [
                {
                  id: secondary,
                  title: 'Second synthetic conversation',
                  status: 'idle',
                  updated_at: Date.now()
                }
              ]
            : [])
        ];
        const view = (id, empty = false) => ({
          id,
          version: 1,
          status: 'idle',
          messages: empty ? [] : messages,
          sources: [],
          pending: null
        });
        if (request.method() === 'POST') {
          const body = request.postDataJSON();
          if (body.type === 'create') {
            secondaryCreated = true;
            return route.fulfill({ json: view(secondary, true) });
          }
          return route.fulfill({ json: view(secondary) });
        }
        await route.fulfill({
          json: url.searchParams.has('id')
            ? view(url.searchParams.get('id'))
            : { conversations: listing }
        });
      });
      await open(page);
      const thread = page.locator('.npg-thread');
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
      await thread.evaluate((node) => {
        node.scrollTop = 650;
      });
      await expect(page.getByRole('button', { name: 'Latest message', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'New chat', exact: true }).click();
      // The create response replaces the composer. Wait for that conversation
      // before entering its draft, rather than racing the preceding composer.
      await expect(page.locator('.npg-thread-title')).toHaveText('Second synthetic conversation');
      await page
        .getByRole('textbox', { name: 'Your question' })
        .fill('Fixture secondary conversation');
      await page.getByRole('button', { name: 'Send question', exact: true }).click();
      await expect(page.locator('.npg-thread-title')).toHaveText('Second synthetic conversation');
      await expect
        .poll(() =>
          thread.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)
        )
        .toBeLessThan(2);
      await thread.evaluate((node) => {
        node.scrollTop = 1100;
      });
      await expect(page.getByRole('button', { name: 'Latest message', exact: true })).toBeEnabled();
      await page.locator('.history-item').filter({ hasText: 'Find NPs near Springfield' }).click();
      await expect(page.locator('.npg-thread-title')).toHaveText(
        'Find NPs near Springfield, MO, and keep the complete CSV.'
      );
      await expect.poll(() => thread.evaluate((node) => node.scrollTop)).toBe(650);
      await page
        .locator('.history-item')
        .filter({ hasText: 'Second synthetic conversation' })
        .click();
      await expect(page.locator('.npg-thread-title')).toHaveText('Second synthetic conversation');
      await expect.poll(() => thread.evaluate((node) => node.scrollTop)).toBe(1100);
    },
    { viewport: { width: 1440, height: 900 } }
  );

  for (const width of [640, 768, 1024, 1025])
    await scenario(
      'tablet toolbar keeps title and controls in one row at ' + width,
      async (page) => {
        let release;
        const held = new Promise((resolve) => { release = resolve; });
        await page.route('**/delivery/abundance/healthcare-analyst/api', async (route) => {
          if (route.request().method() === 'POST' && route.request().postDataJSON().type === 'create') {
            await held;
            return route.fulfill({ json: {
              id: 'tablet-local-conversation', version: 0, status: 'idle',
              messages: [], sources: [], pending: null
            } });
          }
          return route.continue();
        });
        await open(page);
        const title = page.locator('.npg-thread-title');
        const exactTitle = 'Find NPs near Springfield, MO, and keep the complete CSV.';
        await expect(title).toHaveAccessibleName(exactTitle);
        const header = page.locator('.npg-chat-column > :first-child');
        const before = await header.boundingBox();
        const titleBox = await title.boundingBox();
        const toggleBox = await page.locator('.npg-results-toggle').boundingBox();
        const statusBox = await page.locator('.npg-state').boundingBox();
        await page.screenshot({ path: directory + '/tablet-toolbar-' + width + '.png' });
        await page.getByTestId('mobile-nav-toggle').click();
        await page.getByRole('button', { name: 'New chat', exact: true }).click();
        await expect(page.locator('.npg-state')).toHaveText('Creating conversation');
        const during = await header.boundingBox();
        const busyTitleBox = await title.boundingBox();
        await expect(title).toHaveAccessibleName(exactTitle);
        const overflow = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth - innerWidth,
          header: document.querySelector('.npg-chat-column > :first-child').scrollWidth -
            document.querySelector('.npg-chat-column > :first-child').clientWidth
        }));
        release();
        await expect(page.getByRole('textbox', { name: 'Your question' })).toBeEditable();
        await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
        await writeFile(directory + '/tablet-toolbar-' + width + '.json', JSON.stringify({
          width, before, titleBox, toggleBox, statusBox, during, busyTitleBox, overflow
        }, null, 2));
        assert.ok(before.height <= 61, 'Tablet toolbar uses one 44px control row plus existing 8px padding');
        assert.ok(Math.abs(before.height - during.height) <= 1, 'Long operation feedback keeps toolbar height stable');
        assert.ok(titleBox.width >= 150 && titleBox.height >= 20 && busyTitleBox.width >= 150,
          'Exact title retains useful visible context in idle and busy states');
        assert.ok(toggleBox.height >= 44 && toggleBox.width >= 44, 'Evidence target remains 44px');
        assert.ok(Math.abs(titleBox.y + titleBox.height / 2 - toggleBox.y - toggleBox.height / 2) <= 1,
          'Conversation title and evidence control share one row');
        assert.ok(titleBox.height <= 24 && statusBox.height <= 24 &&
          Math.abs(statusBox.y + statusBox.height / 2 - toggleBox.y - toggleBox.height / 2) <= 1,
          'Single-line title and status text align with the control centers');
        assert.ok(overflow.document <= 0 && overflow.header <= 0, 'Long busy status does not overflow the tablet toolbar');
      },
      { viewport: { width, height: 900 } }
    );

  for (const width of [320, 390, 768, 1024, 1025, 1440])
    await scenario(
      'evidence uses its available reading width at ' + width,
      async (page) => {
        await open(page);
        const toggle = page.locator('.npg-results-toggle');
        const closedColor = await toggle.evaluate((node) => getComputedStyle(node).backgroundColor);
        if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
        const content = page.locator('.npg-evidence-content');
        await expect(content).toBeVisible();
        const pane = page.locator(width < 1280 ? '.npg-inline-results' : '.npg-evidence');
        await expect
          .poll(() => pane.evaluate((node) => getComputedStyle(node).transform))
          .toBe('none');
        const contentBox = await content.boundingBox();
        if (width === 320) {
          const conversationTitle = await page.locator('.npg-thread-title').boundingBox();
          const savedSubtitle = page.getByText('Saved with this conversation.', { exact: true });
          assert.ok(
            conversationTitle.height <= 1,
            'Short-phone evidence dedicates its reading space to source evidence'
          );
          await expect(savedSubtitle).toHaveCount(0);
          await expect(
            page.getByRole('heading', {
              name: 'Find NPs near Springfield, MO, and keep the complete CSV.',
              exact: true
            })
          ).toHaveCount(1);
          const contextHeading = page.locator('#npg-evidence-title');
          await expect(contextHeading).toHaveText('Results & evidence');
          await expect(contextHeading).toBeFocused();
          const context = page.locator('.npg-evidence-context');
          await expect(context).toHaveText(
            'Find NPs near Springfield, MO, and keep the complete CSV.'
          );
          await expect(context).toBeVisible();
          assert.ok((await context.boundingBox()).height >= 16, 'Exact conversation context stays visible');
          assert.ok(
            await pane.evaluate((node) => node.clientHeight) >= 380,
            'Compact chrome preserves the evidence reading viewport'
          );
          const coverageStatus = await page.locator('.npg-source').first()
            .getByText('degraded', { exact: true }).boundingBox();
          const readingPane = await pane.boundingBox();
          assert.ok(
            coverageStatus.y + coverageStatus.height <= readingPane.y + readingPane.height,
            'Short-phone first fold includes qualification, outreach and coverage status facts'
          );
          const value = page.locator('.npg-source').first().getByText('Certification unknown', { exact: true });
          assert.ok(await value.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)) >= 15,
            'Evidence values retain the NPG body reading size');
          const qualification = await page
            .locator('.npg-source')
            .first()
            .getByText('Certification unknown', { exact: true })
            .boundingBox();
          const paneBox = await pane.boundingBox();
          assert.ok(
            qualification.y >= paneBox.y &&
              qualification.y + qualification.height <= paneBox.y + paneBox.height,
            'The critical source qualification remains fully visible'
          );
        }
        assert.ok(contentBox.width <= 720 + 1, 'Evidence retains a bounded reading measure');
        const first = page.locator('.npg-source').first();
        const coverage = await first
          .getByRole('heading', { name: 'Coverage & limitations', exact: true })
          .boundingBox();
        const freshness = await first
          .getByRole('heading', { name: 'Source freshness', exact: true })
          .boundingBox();
        if (width >= 640 && width < 1280) {
          assert.ok(
            Math.abs(coverage.y - freshness.y) <= 1,
            'Tablet source summary and freshness share the row'
          );
          assert.ok(freshness.x > coverage.x + 100, 'The two groups use distinct readable columns');
          assert.ok(
            Math.abs(contentBox.x + contentBox.width / 2 - width / 2) <= 1,
            'Tablet evidence is centered'
          );
        } else
          assert.ok(
            freshness.y > coverage.y,
            'Narrow source rails and phones retain one reading column'
          );
        const selected = await toggle.evaluate((node) => getComputedStyle(node).backgroundColor);
        assert.equal(
          selected,
          'rgb(217, 236, 248)',
          'Open evidence has a restrained blue selected state'
        );
        if (width < 1280) assert.notEqual(selected, closedColor);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          'No horizontal document overflow'
        );
        await page.screenshot({ path: directory + '/evidence-' + width + '.png' });
        await writeFile(directory + '/geometry-' + width + '.json', JSON.stringify(await pane.evaluate((node) => ({
          viewportHeight: node.clientHeight,
          contentHeight: node.scrollHeight,
          sourceTop: node.querySelector('.npg-source').getBoundingClientRect().y,
          valueSize: getComputedStyle([...node.querySelectorAll('.astryx-text')].find((item) => item.textContent === 'Certification unknown')).fontSize
        })), null, 2));
      },
      { viewport: { width, height: width === 320 ? 568 : 900 } }
    );

  await scenario(
    'provider identity precedes exact scope without duplicated terms',
    async (page) => {
      await page.goto(base + '/?state=skip-review');
      await page.getByRole('textbox', { name: 'Your question' }).waitFor();
      await page.getByTestId('mobile-nav-toggle').click();
      await page.locator('.history-item').first().click();
      await expect(page.locator('#npg-review-title')).toBeFocused();
      const labels = await page.locator('.npg-review dt').allTextContents();
      assert.equal(labels.filter((label) => label === 'Provider').length, 1);
      assert.equal(labels.filter((label) => label === 'Scope').length, 1);
      assert.ok(labels.indexOf('Provider') < labels.indexOf('Scope'));
      const provider = await page
        .locator('.npg-review')
        .getByText('Apify one-api/skip-trace', { exact: true })
        .boundingBox();
      const thread = await page.locator('.npg-thread').boundingBox();
      assert.ok(
        provider.y >= thread.y && provider.y + provider.height < thread.y + thread.height,
        'Exact provider identity is visible before scrolling on a short phone'
      );
      const qualification = await page
        .locator('.npg-review')
        .getByText('Approve only this request. Contact consent remains unverified.', {
          exact: true
        })
        .boundingBox();
      assert.ok(
        qualification.y >= thread.y &&
          qualification.y + qualification.height <= thread.y + thread.height,
        'The complete consent qualification is visible above the fixed decision footer at the start'
      );
      const scope = await page.locator('.npg-review dt').filter({ hasText: 'Scope' }).boundingBox();
      assert.ok(qualification.y < scope.y, 'Consent qualification precedes the longer exact scope');
      await expect(page.locator('.npg-review-summary')).toContainText('Jamie Example');
      await expect(page.locator('.npg-review-summary')).toContainText('1234567890');
    },
    { viewport: { width: 320, height: 568 } }
  );

  await scenario(
    'desktop evidence choice and 44px controls survive reload',
    async (page) => {
      await open(page);
      const toggle = page.locator('.npg-results-toggle');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const evidence = page.locator('.npg-evidence');
      await expect(evidence).toBeVisible();
      const scrollBudget = await evidence.evaluate((node) => ({
        client: node.clientHeight,
        scroll: node.scrollHeight,
        bottom: node.getBoundingClientRect().bottom
      }));
      assert.ok(
        scrollBudget.client < page.viewportSize().height,
        'Desktop evidence must fit the viewport'
      );
      assert.ok(
        scrollBudget.scroll > scrollBudget.client,
        'Long evidence has its own scroll surface'
      );
      assert.ok(
        scrollBudget.bottom <= page.viewportSize().height + 1,
        'Desktop evidence bottom is inside the viewport'
      );
      await expect(
        page.getByRole('button', { name: 'Top of evidence', exact: true })
      ).toBeInViewport();
      await evidence.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await expect(
        page.getByRole('button', { name: 'Top of evidence', exact: true })
      ).toBeEnabled();
      await page.getByRole('button', { name: 'Top of evidence', exact: true }).click();
      await expect.poll(() => evidence.evaluate((node) => node.scrollTop)).toBe(0);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await page.reload();
      await expect(page.locator('.npg-thread-title')).toHaveText(
        'Find NPs near Springfield, MO, and keep the complete CSV.'
      );
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('.npg-evidence')).toHaveCount(0);
      for (const button of await page.locator('button:visible').all()) {
        assert.ok(
          (await button.boundingBox()).height >= 44,
          'Visible controls retain 44px targets'
        );
      }
    },
    { viewport: { width: 1440, height: 900 } }
  );
  console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
  await writeFile(directory + '/motion-report.json', JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
