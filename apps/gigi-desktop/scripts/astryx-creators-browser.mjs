import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
// Real creator components in an isolated Vite virtual page. All bridge calls
// resolve against this synthetic in-memory fixture; no native app, picker,
// user database, consent page, external image host or provider is opened.
const app = resolve(fileURLToPath(new URL('../', import.meta.url)));
const out = resolve(process.env.GIGI_CREATOR_EVIDENCE || '/tmp/gigi-creators-evidence');
mkdirSync(out, { recursive: true });
const require = createRequire(app + '/package.json');
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { chromium } = createRequire(
  new URL('../../../packages/agency/package.json', import.meta.url)
)('@playwright/test');
const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';import {Theme} from '@astryxdesign/core/theme';import {neutralTheme} from '@astryxdesign/theme-neutral/built';import '@astryxdesign/core/reset.css';import '@astryxdesign/core/astryx.css';import '@astryxdesign/theme-neutral/theme.css';import {Music,Social} from './creators.jsx';
const records=[];const requestLog=[];const music=[{id:'music-1',title:'Synthetic demo',artist:'Crew',kind:'audio',filename:'demo.wav',bytes:1200,availability:'available',organizationRevision:3}];
window.requests=requestLog;window.ctx={workspaceId:'test-workspace',actions:{setCreatorMount(mount){window.creatorMount=mount;},notice(){}},bridge:{call:async(operation,input={})=>{requestLog.push({operation,input});
if(operation==='music.list')return {items:music,total:music.length,offset:0,hasMore:false};if(operation==='music.edit'){music[0]={...music[0],...input,organizationRevision:4};return music[0];}if(operation==='music.import'){if(window.dropImportReply){window.dropImportReply=false;throw Error('Synthetic lost import response');}return {added:1,duplicates:0,skipped:0};}if(operation==='music.importStatus')return {state:'completed',receipt:{added:1,duplicates:0,skipped:0}};
if(operation==='social.list')return {items:records,total:records.length,nextOffset:null};if(operation==='social.save'){const {workspaceId,requestId,id,expectedRevision,...body}=input;const record={id:id||'draft-1',revision:(expectedRevision||0)+1,state:'draft',body};records.splice(0,records.length,record);if(window.dropSaveReply){window.dropSaveReply=false;throw Error('timeout');}return record;}if(operation==='connections.status')return {provider:'instagram',state:'connected',connectedAccountId:'account-1'};if(operation==='instagram.account')return {username:'synthetic',connectedAccountId:'account-1',instagramAccountId:'ig-1'};if(operation==='instagram.preview')return {imageUrl:input.imageUrl,expectedImageSha256:'a'.repeat(64),dataUrl:'data:image/jpeg;base64,/9j/2Q=='};if(operation==='social.publish'){const record={...records[0],revision:records[0].revision+1,state:'published',receipt:{state:'published',mediaId:'post-1'}};records.splice(0,records.length,record);return record;}if(operation==='media.list')return {items:[],nextOffset:null};throw Error('Synthetic operation not configured: '+operation);}}};
const root=createRoot(document.querySelector('#app'));const mode=new URLSearchParams(location.search).get('view');root.render(<Theme theme={neutralTheme} mode='light'>{mode==='social'?<Social ctx={window.ctx}/>:<Music ctx={window.ctx}/>}</Theme>);
`;
const virtual = app + '/ui/__creator_smoke.jsx';
const server = await createServer({
  root: app,
  configFile: false,
  cacheDir: resolve(out, '.vite-cache'),
  server: { host: '127.0.0.1', port: 0 },
  plugins: [
    {
      name: 'creator-smoke',
      resolveId(id) {
        if (id === '/__creator_entry.jsx') return virtual;
      },
      load(id) {
        if (id === virtual) return entry;
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/__creator_smoke')) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<!doctype html><html><body><main id="app"></main><script type="module" src="/__creator_entry.jsx"></script></body></html>'
            );
          } else next();
        });
      }
    }
  ]
});
let browser;
try {
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 840 },
    reducedMotion: 'reduce'
  });
  const errors = [];
  const browserDiagnostics = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserDiagnostics.push(message.text());
  });
  page.on('requestfailed', (request) =>
    browserDiagnostics.push(request.url() + ': ' + request.failure()?.errorText)
  );
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  );
  try {
    await page.goto(origin + '/__creator_smoke');
    await page.getByRole('heading', { name: 'Synthetic demo' }).waitFor();
    console.log('music loaded');
    await page.getByRole('button', { name: 'Organize', exact: true }).click();
    await page.locator('#music-edit-title').fill('Updated synthetic demo');
    await page.evaluate(() => {
      window.leaveResult = undefined;
      window.creatorMount.canLeave().then((v) => (window.leaveResult = v));
    });
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    assert.equal(await page.evaluate(() => window.leaveResult), false);
    console.log('music guard passed');
    await page.getByRole('button', { name: 'Save organization' }).click();
    await page.getByRole('heading', { name: 'Updated synthetic demo', exact: true }).waitFor();
    console.log('music edit passed');
    assert.equal(
      await page.evaluate(
        () => requests.find((r) => r.operation === 'music.edit').input.expectedRevision
      ),
      3
    );
    await page.getByRole('button', { name: 'Add files', exact: true }).click();
    await page.getByText('Added 1 entry.', { exact: false }).waitFor();
    assert.ok(
      await page.evaluate(
        () => requests.find((r) => r.operation === 'music.import').input.requestId
      )
    );
    console.log('music import passed');
    await page.evaluate(() => (window.dropImportReply = true));
    await page.getByRole('button', { name: 'Add files', exact: true }).click();
    await page.getByText('Synthetic lost import response').waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Add files', exact: true }).isDisabled(),
      true
    );
    assert.equal(
      await page.getByText('Added 1 entry.', { exact: false }).count(),
      0,
      'lost reply must not retain a prior success receipt'
    );
    await page.getByRole('button', { name: 'Check import receipt', exact: true }).click();
    await page.getByText('Added 1 entry.', { exact: false }).waitFor();
    assert.equal(
      await page.evaluate(() => requests.filter((r) => r.operation === 'music.import').length),
      2
    );
    assert.equal(
      await page.evaluate(
        () => requests.filter((r) => r.operation === 'music.importStatus').length
      ),
      1
    );
    const importRequests = await page.evaluate(() =>
      requests.filter((r) => r.operation === 'music.import')
    );
    const recoveredRequest = await page.evaluate(() =>
      requests.find((r) => r.operation === 'music.importStatus')
    );
    assert.equal(
      recoveredRequest.input.requestId,
      importRequests[1].input.requestId,
      'receipt recovery reads the original import request'
    );
    await page.screenshot({ path: resolve(out, 'music-import-recovery.png'), fullPage: true });
    console.log('music lost reply recovery passed');
    await page.goto(origin + '/__creator_smoke?view=social');
    await page.getByRole('button', { name: 'Check connection', exact: true }).click();
    await page.getByRole('heading', { name: '@synthetic', exact: true }).waitFor();
    await page.getByRole('button', { name: 'New draft', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Synthetic Instagram post');
    await page.getByLabel('Caption', { exact: true }).fill('Synthetic caption');
    await page
      .getByLabel('Public JPEG image URL')
      .fill('https://media.createsomething.io/synthetic.jpg');
    await page.getByRole('button', { name: 'Load verified image preview' }).click();
    await page.getByText('Image verified. Save this draft', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved locally. Nothing was published.').waitFor();
    await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
    await page.getByRole('dialog', { name: 'Publish this exact post?' }).waitFor();
    assert.equal(
      await page.evaluate(() => requests.filter((r) => r.operation === 'social.publish').length),
      0
    );
    await page.getByRole('button', { name: 'Keep as draft', exact: true }).click();
    assert.equal(
      await page.evaluate(() => requests.filter((r) => r.operation === 'social.publish').length),
      0
    );
    await page.getByRole('button', { name: 'Review & publish', exact: true }).click();
    await page.getByRole('button', { name: 'Publish on Instagram', exact: true }).click();
    await page.getByRole('heading', { name: 'Published on Instagram', exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => requests.find((r) => r.operation === 'social.publish').input.confirmed
      ),
      true
    );
    assert.equal(
      await page.evaluate(
        () =>
          requests.find((r) => r.operation === 'social.publish').input.expectedInstagramAccountId
      ),
      'ig-1'
    );
    await page.screenshot({ path: resolve(out, 'social-published.png'), fullPage: true });
    await page.goto(origin + '/__creator_smoke?view=social');
    await page.getByRole('button', { name: 'New draft', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Exact saved title');
    await page.evaluate(() => (window.dropSaveReply = true));
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('The connection check timed out.', { exact: false }).waitFor();
    await page.getByLabel('Title', { exact: true }).fill('Changed before readback');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('The last save is unverified.', { exact: false }).waitFor();
    assert.equal(
      await page.evaluate(() => requests.filter((r) => r.operation === 'social.save').length),
      1
    );
    await page.getByLabel('Title', { exact: true }).fill('Exact saved title');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Draft saved locally. Nothing was published.').waitFor();
    assert.equal(
      await page.evaluate(() => {
        const r = requests.filter((r) => r.operation === 'social.save');
        return r[0].input.requestId === r[1].input.requestId;
      }),
      true
    );
    console.log('social unverified save exact retry passed');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: resolve(out, 'social-save-recovery.png'), fullPage: true });
    const result = {
      passed: true,
      out,
      checks: [
        'Music organization expectedRevision',
        'Unsaved music leave guard',
        'Stable import request UUID',
        'Lost import response clears prior success and locks import',
        'Read-only recovery uses original import UUID',
        'Instagram image SHA binding and local save',
        'Account review with explicit exact-post confirmation',
        'Cancel review makes zero publish calls',
        'Confirmed publish includes exact Instagram account',
        'Unverified save rejects changed payload',
        'Exact save retry retains original request UUID'
      ],
      scope:
        'Synthetic Chromium component fixture with mocked bridge. Native pickers, WebKit, media codecs, live consent/providers and released installer are untested.'
    };
    writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (error) {
    await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true }).catch(() => {});
    console.log('FAIL DOM', await page.locator('body').innerText());
    console.log('ERRORS', errors);
    console.log('BROWSER DIAGNOSTICS', browserDiagnostics);
    throw error;
  }
} finally {
  if (browser) await browser.close();
  await server.close();
}
