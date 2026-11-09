// Actual React/Astryx application regressions for review findings. Development
// backend only: no native app, user profile, picker, provider or database opens.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const app = resolve(new URL('../', import.meta.url).pathname);
const out = resolve(process.env.GIGI_REVIEW_EVIDENCE || '/tmp/gigi-review-regressions');
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(
  new URL('../../../packages/agency/package.json', import.meta.url)
)('@playwright/test');
const server = await createServer({
  configFile: resolve(app, 'vite.config.mjs'),
  root: app,
  // Replay a frozen pre-fix controller against the current public UI fixture.
  plugins: process.env.GIGI_REVIEW_CONTROLLER_ORACLE
    ? [
        {
          name: 'gigi-controller-regression-oracle',
          enforce: 'pre',
          load(id) {
            if (id === resolve(app, 'ui/controller.mjs'))
              return readFileSync(process.env.GIGI_REVIEW_CONTROLLER_ORACLE, 'utf8');
          }
        }
      ]
    : [],
  server: { port: 0, strictPort: false, host: '127.0.0.1' }
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 880, height: 620 },
    reducedMotion: 'reduce'
  });
  page.setDefaultTimeout(2500);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const open = async (route) => {
    await page.goto(`${origin}/?fixture=${route}&review=1`);
    await page.waitForFunction(() => globalThis.gigiTest);
    await page.waitForTimeout(60);
  };
  const navigation = {
    Music: ['Work', 'music'], People: ['Network', 'contacts'],
    'Instagram drafts': ['Work', 'social'], 'Gigs & shifts': ['Work', 'gigs'], Money: ['Work', 'finances']
  };
  const nav = (name) => ({ click: async () => {
    if (name === 'Today') return page.locator('.reference-today').click();
    const [group, destination] = navigation[name];
    const menu = page.locator(`[data-nav-menu="${group}"]`);
    if (!(await menu.evaluate((node) => node.open))) await menu.locator('summary').click();
    return menu.locator(`[data-page="${destination}"]:not([data-nav-target])`).click();
  } });
  const count = (operation) =>
    page.evaluate(
      (operation) => gigiTest.calls.filter((call) => call.operation === operation).length,
      operation
    );
  const cases = {
    music: async () => {
      await open('music');
      await page.getByRole('button', { name: 'Organize', exact: true }).waitFor();
      await nav('Music').click();
      await page.getByRole('button', { name: 'Organize', exact: true }).click();
      await page.locator('#music-edit-title').fill('Keep this music draft');
      await nav('Music').click();
      assert.equal(await page.getByRole('dialog').count(), 0, 'active Music route is not a leave');
      assert.equal(await page.locator('#music-edit-title').inputValue(), 'Keep this music draft');
      await nav('People').click();
      await page.getByRole('dialog', { name: 'Discard changes?', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
      assert.equal(
        await page.locator('#music-edit-title').inputValue(),
        'Keep this music draft',
        'Music leave guard remains registered'
      );
      await page.getByRole('button', { name: 'Save organization', exact: true }).click();
      await page.waitForFunction(() =>
        gigiTest.calls.some((call) => call.operation === 'music.edit')
      );
      const saved = await page.evaluate(
        () => gigiTest.calls.find((call) => call.operation === 'music.edit').input
      );
      assert.equal(saved.title, 'Keep this music draft');
      assert.equal(saved.expectedRevision, 1);
    },
    social: async () => {
      await open('social');
      await nav('Instagram drafts').click();
      await page.getByRole('button', { name: 'New draft', exact: true }).click();
      await page.getByLabel('Title', { exact: true }).fill('Keep this Instagram draft');
      await nav('Instagram drafts').click();
      assert.equal(
        await page.getByRole('dialog').count(),
        0,
        'active Instagram route is not a leave'
      );
      await nav('People').click();
      await page.getByRole('dialog', { name: 'Leave this draft?', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
      assert.equal(
        await page.getByLabel('Title', { exact: true }).inputValue(),
        'Keep this Instagram draft',
        'Instagram leave guard remains registered'
      );
      assert.equal(await count('social.save'), 0, 'guard and active-route clicks do not save');
    },
    record_artwork: async () => {
      for (const entity of ['tasks', 'contacts', 'finances', 'profile']) {
        await open(entity);
        await page.evaluate(
          (page) =>
            gigiTest.set({
              page,
              selected: {
                id: 'guard-record',
                title: 'Synthetic detail',
                fields: {},
                relations: []
              },
              editing: false
            }),
          entity
        );
        assert.equal(
          await page.getByRole('button', { name: 'Add artwork', exact: true }).count(),
          0,
          `${entity} cannot attach unsupported artwork`
        );
      }
      for (const entity of ['gigs', 'schedule']) {
        await open(entity);
        await page.evaluate(
          (page) =>
            gigiTest.set({
              page,
              selected: { id: 'guard-event', title: 'Synthetic event', fields: {}, relations: [] },
              editing: false
            }),
          entity
        );
        if (entity === 'gigs') await page.locator('[data-view-key="gig-artwork"] > summary').click();
        assert.equal(
          await page.getByRole('button', { name: 'Add artwork', exact: true }).count(),
          1,
          `${entity} retains artwork`
        );
      }
    },
    page_scroll: async () => {
      await open('appearance');
      await page.getByRole('main').evaluate((node) => {
        node.scrollTop = 700;
      });
      assert.ok(
        await page.getByRole('main').evaluate((node) => node.scrollTop > 0),
        'fixture scrolls within Astryx AppShell'
      );
      await nav('Today').click();
      await page.waitForFunction(
        () => gigiTest.snapshot().state.page === 'overview' && !gigiTest.snapshot().state.busy
      );
      assert.equal(
        await page.getByRole('main').evaluate((node) => node.scrollTop),
        0,
        'new page starts at top of actual AppShell scroller'
      );
    },
    gigs_back: async () => {
      await open('gigs');
      await page.getByText('More options', { exact: true }).click();
      await page.getByRole('main').evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      const before = await page.getByRole('main').evaluate((node) => node.scrollTop);
      assert.ok(before > 0, 'expanded filters make this minimum-window view scroll');
      await page.getByRole('button', { name: 'Autumn showcase', exact: true }).click();
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Gigs', exact: true })
        .click();
      await page.locator('#gigs-search').waitFor();
      await page.waitForFunction(() => !gigiTest.snapshot().gigs.loading);
      assert.equal(
        await page
          .locator('details')
          .filter({ has: page.getByText('More options', { exact: true }) })
          .evaluate((node) => node.open),
        true,
        'Back preserves expanded gig filters'
      );
      assert.ok(
        Math.abs((await page.getByRole('main').evaluate((node) => node.scrollTop)) - before) <= 1,
        'Back restores the list position with the same filter geometry'
      );
    },
    link_entity: async () => {
      await open('gigs');
      await page.getByRole('button', { name: 'Autumn showcase', exact: true }).click();
      await page.locator('[data-view-key="work-related"] > summary').click();
      await page.getByRole('button', { name: 'Add related work', exact: true }).click();
      await page.locator('#link-record-display').click();
      await page.getByRole('option', { name: 'Rehearsal contact', exact: true }).click();
      assert.equal(await page.locator('#link-record').inputValue(), 'person-1');
      await page.locator('#link-entity-display').click();
      await page.getByRole('option', { name: 'Tasks', exact: true }).click();
      await page.waitForFunction(
        () =>
          gigiTest.snapshot().state.linkChoices?.entity === 'tasks' &&
          !gigiTest.snapshot().state.busy
      );
      assert.equal(
        await page.locator('#link-record').inputValue(),
        '',
        'changing the target entity clears its previous record ID'
      );
      await page.getByRole('button', { name: 'Link records', exact: true }).click();
      assert.equal(await count('relations.link'), 0, 'a fresh record selection is required');
      await page.locator('#link-record-display').click();
      await page.getByRole('option', { name: 'Confirm the rehearsal time', exact: true }).click();
      await page.getByRole('button', { name: 'Link records', exact: true }).click();
      await page.waitForFunction(() =>
        gigiTest.calls.some((call) => call.operation === 'relations.link')
      );
      const link = await page.evaluate(
        () => gigiTest.calls.find((call) => call.operation === 'relations.link').input
      );
      assert.equal(link.toEntity, 'tasks');
      assert.equal(link.toId, 'task-1');
      assert.equal(link.role, 'Tasks');
    },
    today_direction: async () => {
      await open('overview');
      await page.evaluate(() => {
        const base = { entity: 'finances', status: 'Expected', moneyCents: 10000, date: '2026-11-12' };
        const income = { ...base, id: 'income-equal', title: 'QA receivable', fields: { Direction: 'Income' } };
        const expense = { ...base, id: 'expense-equal', title: 'QA payable', fields: { Direction: 'Expense' } };
        const unknown = { ...base, id: 'unknown-equal', title: 'QA unknown direction', fields: {} };
        gigiTest.records.finances.push(unknown);
        gigiTest.set({ overview: { ...gigiTest.snapshot().state.overview,
          payable: { count: 1, items: [expense] }, receivable: { count: 1, items: [income] }
        } });
      });
      const incoming = page.getByRole('region', { name: 'Receivable', exact: true });
      const outgoing = page.getByRole('region', { name: 'Payable', exact: true });
      assert.ok((await incoming.getByRole('button', { name: 'QA receivable', exact: true }).innerText()).includes('$100.00'), 'Today labels incoming money by its Receivable column');
      assert.ok((await outgoing.getByRole('button', { name: 'QA payable', exact: true }).innerText()).includes('$100.00'), 'Today labels outgoing money by its Payable column');
      assert.equal(await incoming.getByRole('button', { name: 'QA payable', exact: true }).count(), 0, 'payable cannot appear as receivable');
      assert.equal(await outgoing.getByRole('button', { name: 'QA receivable', exact: true }).count(), 0, 'receivable cannot appear as payable');
      await page.screenshot({ path: resolve(out, 'today-money-direction.png'), fullPage: true });
      await nav('Money').click();
      assert.ok((await page.getByRole('button', { name: 'QA unknown direction', exact: true }).innerText()).includes('Direction not set'), 'collection keeps unknown direction explicit');
    },
    event_identity: async () => {
      await open('overview');
      await page.evaluate(() => {
        const overview = gigiTest.snapshot().state.overview;
        gigiTest.set({
          overview: {
            ...overview,
            today: '2026-11-09',
            calendar: {
              weekStart: '2026-11-09',
              count: 4,
              items: [
                {
                  id: 'qa-calendar',
                  entity: 'schedule',
                  title: 'QA calendar call',
                  status: 'Confirmed',
                  date: '2026-11-12',
                  fields: { Date: '2026-11-12T18:00:00Z/2026-11-12T19:00:00Z' }
                },
                {
                  id: 'qa-performance',
                  entity: 'gigs',
                  title: 'QA stage set',
                  status: 'Booked',
                  date: '2026-11-12',
                  fields: {
                    Date: '2026-11-12',
                    'Work kind': 'Performance',
                    'Call Time': '17:00',
                    'Set Time': '19:00'
                  }
                },
                {
                  id: 'qa-crew',
                  entity: 'gigs',
                  title: 'QA crew shift',
                  status: 'Booked',
                  date: '2026-11-12',
                  fields: { Date: '2026-11-12', 'Work kind': 'Crew / work' }
                },
                {
                  id: 'qa-all-day',
                  entity: 'schedule',
                  title: 'QA all day',
                  date: '2026-11-12',
                  fields: { Date: '2026-11-12', 'All Day': true }
                }
              ]
            }
          }
        });
      });
      const calendar = await page
        .getByRole('button', { name: 'QA calendar call', exact: true })
        .innerText();
      const performance = await page
        .getByRole('button', { name: 'QA stage set', exact: true })
        .innerText();
      const crew = await page
        .getByRole('button', { name: 'QA crew shift', exact: true })
        .innerText();
      const allDay = await page
        .getByRole('button', { name: 'QA all day', exact: true })
        .innerText();
      assert.ok(calendar.includes('Calendar event'), 'Today identifies a Calendar record');
      const expectedRange = await page.evaluate(() => {
        const format = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
        return `${format.format(new Date('2026-11-12T18:00:00Z'))} – ${format.format(new Date('2026-11-12T19:00:00Z'))}`;
      });
      assert.ok(
        calendar.includes(expectedRange),
        'Calendar range is explicit in viewer local time'
      );
      assert.ok(
        performance.includes('Performance') &&
          performance.includes('Call 17:00') &&
          performance.includes('Set 19:00'),
        'performance keeps its kind and call/set times'
      );
      assert.ok(
        crew.includes('Crew / work') && crew.includes('Time not set'),
        'crew stays distinct without invented times'
      );
      assert.ok(
        allDay.includes('Calendar event') && allDay.includes('All day'),
        'all-day semantics remain explicit'
      );
      await page.screenshot({ path: resolve(out, 'today-event-identity.png'), fullPage: true });
      await page.evaluate(() => {
        gigiTest.records.gigs[0].type = 'Festival';
      });
      await nav('Gigs & shifts').click();
      const gig = await page
        .getByRole('button', { name: 'Autumn showcase', exact: true })
        .innerText();
      assert.ok(
        gig.includes('Performance') && gig.includes('Time not set') && gig.includes('Festival'),
        'Gigs list retains kind, time and original type'
      );
    },

  };
  const selected = process.argv.find((value) => value.startsWith('--case='))?.slice(7);
  for (const [name, run] of Object.entries(cases)) {
    if (selected && selected !== name) continue;
    try {
      await run();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
    }
    await page.screenshot({ path: resolve(out, `${name}.png`), fullPage: true });
  }
  const result = {
    passed: results.every((result) => result.passed) && errors.length === 0,
    cases: results,
    replacedCoverage: { cases: ['create', 'native_controls', 'profile'], suite: 'scripts/dev-astryx-quest-browser.mjs', reason: 'DEV preserves Danny’s name-only guided setup; stock mandatory currency/workspace-name form no longer ships.' },
    errors,
    scope:
      'Actual React application with synthetic development backend; no native or provider acceptance.'
  };
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  assert.equal(result.passed, true, 'review regressions must pass');
} finally {
  if (browser) await browser.close();
  await server.close();
}
