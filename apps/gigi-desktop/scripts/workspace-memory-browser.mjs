// Actual React/Astryx + native domain runtime, isolated synthetic SQLite only.
import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const app = resolve(new URL('../', import.meta.url).pathname);
const root = mkdtempSync(join(tmpdir(), 'gigi-memory-ui-'));
const binary = resolve(app, 'src-tauri/target/debug/examples/memory_fixture');
const call = (operation, input = {}) => {
  const response = JSON.parse(
    execFileSync(binary, [root], { input: JSON.stringify({ operation, input }), encoding: 'utf8' })
  );
  if (response.error) throw Error(response.error);
  return response.value;
};
const workspace = call('workspace.create');
const middleware = (req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const v = JSON.parse(raw);
      if (!v.operation.startsWith('memory.') || v.input.workspaceId !== workspace.id)
        throw Error('Synthetic scope denied');
      res.end(JSON.stringify({ value: call(v.operation, v.input) }));
    } catch (error) {
      res.end(JSON.stringify({ error: error.message }));
    }
  });
};
const server = await createServer({
  configFile: resolve(app, 'vite.config.mjs'),
  root: app,
  plugins: [
    {
      name: 'synthetic-memory-domain',
      configureServer(server) {
        server.middlewares.use('/__synthetic_memory', middleware);
      }
    }
  ],
  server: { port: 0, host: '127.0.0.1' }
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const path = `/?fixture=memory&nativeMemory=1&memoryWorkspace=${workspace.id}`;
console.log(JSON.stringify({ origin, path, workspaceId: workspace.id, root }));
if (process.argv.includes('--serve')) await new Promise(() => {});
const { chromium } = createRequire(
  new URL('../../../packages/agency/package.json', import.meta.url)
)('@playwright/test');
const out = process.env.GIGI_MEMORY_EVIDENCE || '/tmp/gigi-workspace-memory';
mkdirSync(out, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 880, height: 620 },
    reducedMotion: 'reduce'
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin + path);
  await page.getByRole('heading', { name: 'Workspace memory', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create memory', exact: true }).click();
  await page.locator('#memory-text').fill('Prefer morning rehearsals');
  await page.locator('#memory-source').fill('User statement at synthetic rehearsal');
  await page.screenshot({ path: join(out, 'editor-880.png'), fullPage: true });
  let releaseStaging, stagingReached;
  const stagingWait = new Promise(resolve => { stagingReached = resolve; });
  const stagingHold = new Promise(resolve => { releaseStaging = resolve; });
  await page.route('**/__synthetic_memory', async route => {
    if (route.request().postDataJSON().operation === 'memory.request') {
      stagingReached();
      await stagingHold;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Confirm and save memory' }).click();
  await stagingWait;
  assert.equal(await page.locator('#memory-text').isDisabled(), true, 'text frozen during submission');
  assert.equal(await page.locator('#memory-source').isDisabled(), true, 'provenance frozen during submission');
  releaseStaging();
  await page.getByText('Memory saved and read back.', { exact: true }).waitFor();
  assert.equal(
    call('memory.search', { workspaceId: workspace.id, query: 'morning' }).items[0].state,
    'inferred'
  );
  await page.reload();
  await page.getByRole('article', { name: 'Prefer morning rehearsals', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await page.locator('#memory-text').fill('Prefer afternoon rehearsals');
  await page.getByRole('button', { name: 'Confirm and save memory' }).click();
  await page.getByText('Memory saved and read back.', { exact: true }).waitFor();
  const item = call('memory.search', { workspaceId: workspace.id, query: 'afternoon' }).items[0];
  assert.equal(item.revision, 2);
  call('memory.request', {
    workspaceId: workspace.id,
    requestId: 'external-assistant',
    action: 'save',
    entry: {
      kind: 'relationship',
      text: 'Alex prefers email for rehearsal coordination',
      state: 'inferred',
      scope: 'workspace',
      source: { kind: 'observation', reference: 'Synthetic assistant proposal' }
    }
  });
  await page.getByRole('button', { name: 'Refresh memory' }).click();
  await page.getByText('Alex prefers email for rehearsal coordination', { exact: true }).waitFor();
  await page.screenshot({ path: join(out, 'review-880.png'), fullPage: true });
  await page.getByRole('button', { name: 'Approve request', exact: true }).click();
  await page
    .getByRole('article', { name: 'Alex prefers email for rehearsal coordination', exact: true })
    .waitFor();
  await page
    .getByRole('article', { name: 'Prefer afternoon rehearsals', exact: true })
    .getByRole('button', { name: 'Forget', exact: true })
    .click();
  await page.getByRole('button', { name: 'Forget memory', exact: true }).click();
  await page.getByText('Forgotten from future memory retrieval.', { exact: true }).waitFor();
  assert.equal(
    call('memory.search', { workspaceId: workspace.id, query: 'afternoon' }).items.length,
    0
  );
  for (const [theme, width, height] of [
    ['studio', 880, 620],
    ['paper', 1280, 840],
    ['midnight', 880, 620]
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(origin + path + `&theme=${theme}`);
    await page
      .getByRole('article', { name: 'Alex prefers email for rehearsal coordination', exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'no horizontal overflow'
    );
    await page.screenshot({ path: join(out, `${theme}-${width}.png`), fullPage: true });
  }
  await page.locator('[data-nav-overflow="Platform"]').click();
  await page.locator('[data-page="memory"]').first().click();
  await page.getByRole('button', { name: 'Create memory', exact: true }).focus();
  assert.equal(
    await page
      .getByRole('button', { name: 'Create memory', exact: true })
      .evaluate((el) => el === document.activeElement),
    true
  );
  await page.keyboard.press('Enter');
  await page.locator('#memory-text').waitFor();
  await page.locator('#memory-text').fill('Unsaved memory');
  await page.locator('[data-page="overview"]').first().click();
  assert.equal(
    await page.getByRole('heading', { name: 'Create memory', exact: true }).count(),
    1,
    'draft navigation guard'
  );
  await page.getByRole('button', { name: 'Cancel editing' }).click();
  // Actual controller/App partitioning: a failed second-workspace read must never
  // retain the previous workspace's private rows in the rendered output.
  await page.evaluate(() => gigiTest.set({workspace:{id:'synthetic-other-workspace',name:'Other synthetic workspace'}}));
  await page.getByText('Synthetic scope denied', {exact:true}).waitFor();
  assert.equal(await page.getByRole('article', {name:'Alex prefers email for rehearsal coordination',exact:true}).count(), 0);
  assert.equal(await page.getByText('Alex prefers email for rehearsal coordination',{exact:true}).count(), 0);
  assert.deepEqual(errors, []);
  writeFileSync(
    join(out, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        nativeDomain: true,
        reopenedEveryCall: true,
        widths: [880, 1280],
        themes: ['studio', 'paper', 'midnight'],
        errors
      },
      null,
      2
    )
  );
  console.log(`Evidence: ${out}`);
} finally {
  await browser?.close();
  await server.close();
  rmSync(root, { recursive: true, force: true });
}
