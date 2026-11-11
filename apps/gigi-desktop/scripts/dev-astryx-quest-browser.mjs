// Public-interface regression coverage for the DEV React/Astryx guided quest.
// Synthetic in-memory native contracts only; no user profile or provider action.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const app = resolve(fileURLToPath(new URL('../', import.meta.url)));
const out = resolve(process.env.GIGI_QUEST_EVIDENCE || '/tmp/gigi-dev-astryx-quest');
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(new URL('../../../packages/agency/package.json', import.meta.url))('@playwright/test');
const server = process.env.GIGI_TEST_ORIGIN ? null : await createServer({
  configFile: resolve(app, 'vite.config.mjs'), root: app,
  server: { port: 0, strictPort: false, host: '127.0.0.1' }
});
if (server) await server.listen();
const origin = process.env.GIGI_TEST_ORIGIN || `http://127.0.0.1:${server.httpServer.address().port}`;
const results = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1040, height: 780 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/?fixture=overview&theme=paper`);
  await page.waitForFunction(() => globalThis.gigiTest?.snapshot().devQuest);
  await page.evaluate(() => {
    gigiTest.records.profile.length = 0;
    gigiTest.set({ workspace: null, setupProfile: false, setupDraft: null, currency: null, currencyKnown: false });
  });
  assert.equal(await page.locator('#workspace-form input[name="currency"]').count(), 0);
  assert.equal(await page.locator('#workspace-form input[name="name"]').count(), 0);
  await page.locator('input[name="ownerName"]').fill('Synthetic Danny');
  await page.getByRole('button', { name: 'Let’s go →', exact: true }).click();
  await page.locator('#setup-heading').waitFor();
  const profile = await page.evaluate(() => {
    const call = gigiTest.calls.find((entry) => entry.operation === 'records.save' && entry.input.entity === 'profile');
    return { call, current: gigiTest.snapshot().state, saved: gigiTest.records.profile };
  });
  assert.deepEqual(profile.call.input.fields, {});
  assert.equal(profile.current.currency, null);
  assert.equal(profile.current.currencyKnown, true);
  assert.equal(profile.saved.length, 1);
  assert.equal(profile.saved[0].title, 'Synthetic Danny');
  assert.equal(await page.getByRole('button', { name: 'Add a gig myself', exact: true }).isVisible(), true);
  await page.screenshot({ path: resolve(out, 'connected-manual-fallback.png'), fullPage: true });
  results.push('Name-only creation saves and reads back one profile, leaves currency unset, and retains the explicit manual fallback.');

  await page.evaluate(async () => {
    gigiTest.failNext('records.get:profile', 'Synthetic saved-profile check unavailable');
    await gigiTest.snapshot().devQuest.load(gigiTest.records.profile[0]);
    gigiTest.render();
  });
  await page.getByRole('button', { name: 'Check saved progress', exact: true }).waitFor();
  assert.equal(await page.locator('#setup-heading').count(), 0, 'optional setup cannot hide failed local record recovery');
  await page.getByRole('button', { name: 'Check saved progress', exact: true }).click();
  await page.locator('#setup-heading').waitFor();
  assert.equal(await page.evaluate(() => gigiTest.calls.filter((entry) => entry.operation === 'records.save' && entry.input.entity === 'profile').length), 1);
  results.push('A failed local progress readback remains visible before optional connected setup; Check saved progress recovers through reads without another profile save.');

  await page.evaluate(() => {
    const ctx = gigiTest.snapshot();
    ctx.devQuest.connected.assistant.status = {
      provider: 'codex', available: false, authenticated: true, toolsAvailable: false,
      workspaceVerified: false, reason: 'gigi_tools_unavailable', checkedAt: Date.now()
    };
    gigiTest.render();
  });
  assert.match(await page.locator('body').innerText(), /Codex is signed in, but GiGi’s workspace tools are unavailable/);
  assert.equal(await page.getByRole('button', { name: 'Get Codex on this Mac ↗', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Check again after installing', exact: true }).count(), 0);
  await page.screenshot({ path: resolve(out, 'tools-unavailable-recovery.png'), fullPage: true });
  const statusReads = await page.evaluate(() => gigiTest.calls.filter(entry => entry.operation === 'agent.chat.status').length);
  await page.getByRole('button', { name: 'Check workspace tools', exact: true }).click();
  await page.waitForFunction(count => gigiTest.calls.filter(entry => entry.operation === 'agent.chat.status').length > count, statusReads);
  assert.equal(await page.evaluate(() => gigiTest.calls.some(entry => ['agent.chat.login.start', 'agent.chat.send', 'help.open'].includes(entry.operation))), false);
  results.push('Signed-in Codex with missing workspace tools offers read-only tools recovery, without reinstall, new login, provider turn or record write.');

  // Supply a verified synthetic native status; this does not call a provider.
  await page.evaluate(() => {
    const ctx = gigiTest.snapshot();
    ctx.devQuest.connected.assistant.status = {
      provider: 'codex', available: true, authenticated: true, toolsAvailable: true,
      workspaceVerified: true, workspace: ctx.state.workspace, checkedAt: Date.now()
    };
    gigiTest.render();
  });
  await page.getByRole('button', { name: 'Try a read-only first answer', exact: true }).click();
  await page.locator('.chat-panel').waitFor();
  await page.locator('#chat-message').waitFor();
  assert.equal(await page.evaluate(() => gigiTest.snapshot().devQuest.view.active), false);
  assert.match(await page.locator('#chat-message').inputValue(), /Do not change any records/);
  assert.equal(await page.evaluate(() => gigiTest.calls.filter((entry) => entry.operation === 'agent.chat.send').length), 0);
  await page.screenshot({ path: resolve(out, 'first-answer-visible-unsent.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close Ask GiGi', exact: true }).click();
  await page.getByRole('button', { name: 'Continue connections →', exact: true }).click();
  await page.locator('#setup-heading').waitFor();
  results.push('The verified read-only first-answer action leaves setup, opens a visible chat draft, and sends no agent turn.');

  await page.getByRole('button', { name: 'Add a gig myself', exact: true }).click();
  await page.locator('#quest-gig-form').waitFor();
  await page.locator('input[name="title"]').fill('Synthetic Friday');
  await page.getByRole('button', { name: 'Add gig →', exact: true }).click();
  await page.locator('#quest-person-form').waitFor();
  await page.evaluate(() => gigiTest.failNext('relations.link', 'Synthetic crew link receipt unavailable'));
  await page.locator('input[name="title"]').fill('Synthetic Alex');
  await page.getByRole('button', { name: 'Add to my gig →', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Synthetic crew link receipt unavailable' }).waitFor();
  assert.equal(await page.getByText('2 of 3 done', { exact: true }).isVisible(), true);
  const savedBeforeRetry = await page.evaluate(() => gigiTest.calls.filter((entry) => entry.operation === 'records.save').length);
  await page.screenshot({ path: resolve(out, 'saved-person-unconfirmed-link.png'), fullPage: true });
  await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  await page.getByRole('button', { name: 'Continue setup →', exact: true }).click();
  await page.getByRole('button', { name: 'Retry link to gig →', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Retry link to gig →', exact: true }).click();
  await page.getByText('3 of 3 done', { exact: true }).waitFor();
  const verified = await page.evaluate(() => {
    const calls = gigiTest.calls, link = calls.findLastIndex((entry) => entry.operation === 'relations.link');
    return {
      saves: calls.filter((entry) => entry.operation === 'records.save').length,
      link: calls[link], readsAfter: calls.slice(link + 1).filter((entry) => entry.operation === 'records.get'),
      gig: gigiTest.snapshot().devQuest.view.gig,
      person: gigiTest.snapshot().devQuest.view.person,
      linked: gigiTest.snapshot().devQuest.view.crewLinked
    };
  });
  assert.equal(verified.saves, savedBeforeRetry);
  assert.equal(verified.linked, true);
  assert.ok(verified.readsAfter.some((entry) => entry.input.entity === 'gigs' && entry.input.id === verified.gig.id));
  assert.ok(verified.gig.relations.some((relation) => relation.toId === verified.person.id && relation.role === 'Contacts'));
  await page.screenshot({ path: resolve(out, 'three-missions-verified.png'), fullPage: true });
  results.push('A saved person with an unconfirmed link stays at 2 of 3; pause/resume and retry perform no duplicate save, and 3 of 3 follows an exact relation receipt plus gig readback.');

  await page.locator('.quest-sidequests > summary').click();
  const providerWritesBefore = await page.evaluate(() => gigiTest.calls.filter((entry) => /connections\.|imports\.commit|auth\.login|agent\.chat\.send/.test(entry.operation)).length);
  await page.getByRole('button', { name: 'Bring in your calendar', exact: true }).click();
  await page.locator('#source-connections').waitFor();
  assert.equal(await page.evaluate(() => gigiTest.calls.filter((entry) => /connections\.|imports\.commit|auth\.login|agent\.chat\.send/.test(entry.operation)).length), providerWritesBefore);
  results.push('The optional calendar quest opens the existing consent-controlled Settings surface without connecting, importing, signing in or sending an agent turn.');

  // The same current native readbacks restore the journey without replaying a write.
  await page.evaluate(async () => {
    const ctx = gigiTest.snapshot();
    await ctx.devQuest.load(gigiTest.records.profile[0]);
    await ctx.devQuest.action('resume');
  });
  await page.getByRole('button', { name: 'Start using GiGi →', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.evaluate(() => document.querySelector('.quest').dataset.questAnimation), 'static');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.quest img')].every((image) => image.complete && image.naturalWidth > 0)), true);
  await page.screenshot({ path: resolve(out, 'verified-mobile-reduced-motion.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start using GiGi →', exact: true }).click();
  await page.waitForFunction(() => !gigiTest.snapshot().devQuest.view.active);
  assert.equal(await page.evaluate(() => gigiTest.snapshot().state.selected?.title), 'Synthetic Friday');
  assert.deepEqual(errors, []);
  results.push('Saved progress restores through reads, reduced motion keeps final content visible without horizontal overflow at 390px, and Finish opens the exact saved gig.');
  // Terminal receipts use recovery cursors; only an explicit preview may retry.
  for (const state of ['partial', 'cancelled']) for (const retryCursor of [null, 'synthetic-retry-page-2']) {
    await page.evaluate(({ state, retryCursor }) => {
      const ctx = gigiTest.snapshot(), connected = ctx.devQuest.connected, imports = connected.imports;
      connected.journey.start('results', 'contacts');
      imports.state = { ...imports._empty('contacts'), source: { provider: 'gmail', state: 'connected', connectedAccountId: 'synthetic-account' },
        receipt: { jobId: 'synthetic-terminal', state, retryCursor, nextCursor: null, createdCount: 1, failedCount: state === 'partial' ? 1 : 0,
          scope: { workspaceId: ctx.state.workspace.id, provider: 'gmail', connectedAccountId: 'synthetic-account' } } };
      globalThis.questRetryPreviewCalls = [];
      imports.bridge.previewSource = async (workspaceId, provider, connectedAccountId, selection, cursor) => {
        questRetryPreviewCalls.push({ workspaceId, provider, connectedAccountId, cursor: cursor ?? null });
        return { previewId: 'synthetic-retry-preview', revision: 'synthetic-revision', expiresAt: Math.floor(Date.now()/1000)+60,
          scope: { workspaceId, provider, connectedAccountId }, records: [], scannedCount: 0, selectedCount: 0, existingCount: 0, coverage: 'complete' };
      };
      gigiTest.render();
    }, { state, retryCursor });
    const writesBefore = await page.evaluate(() => gigiTest.calls.filter(entry => /records.save|relations.link|imports.commit|connections\.|auth.login|agent.chat.send/.test(entry.operation)).length);
    assert.equal(await page.evaluate(() => questRetryPreviewCalls.length), 0);
    const retry = page.getByRole('button', { name: 'Preview remaining records →', exact: true });
    await retry.waitFor();
    await page.screenshot({ path: resolve(out, `recovery-${state}-${retryCursor ? 'continuation' : 'first-page'}.png`), fullPage: true });
    await retry.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Preview before importing', exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => questRetryPreviewCalls), [{ workspaceId: 'synthetic-astryx-rewrite', provider: 'gmail', connectedAccountId: 'synthetic-account', cursor: retryCursor }]);
    assert.equal(await page.evaluate(() => gigiTest.calls.filter(entry => /records.save|relations.link|imports.commit|connections\.|auth.login|agent.chat.send/.test(entry.operation)).length), writesBefore);
    assert.equal(await page.getByRole('button', { name: 'Preview remaining records →', exact: true }).count(), 0);
    await page.screenshot({ path: resolve(out, `retry-${state}-${retryCursor ? 'continuation' : 'first-page'}.png`), fullPage: true });
    results.push(`${state} receipt exposes an explicit keyboard-operable retry preview using ${retryCursor ? 'the recovery cursor' : 'the first page when retryCursor is null'}, without automatic import, consent or record writes.`);
  }
  // A successful commit with an unreadable receipt must retain its recovery job.
  await page.evaluate(() => {
    const ctx=gigiTest.snapshot(),connected=ctx.devQuest.connected,imports=connected.imports;
    const scope={workspaceId:ctx.state.workspace.id,provider:'gmail',connectedAccountId:'synthetic-account'};
    connected.journey.start('results','contacts');
    imports.state={...imports._empty('contacts'),source:{provider:'gmail',state:'connected',connectedAccountId:'synthetic-account'},
      preview:{previewId:'pending-import-job',revision:'pending-revision',scope,expiresAt:Math.floor(Date.now()/1000)+900,
        records:[{id:'pending-source',title:'Synthetic original page',fields:{}}],scannedCount:1,selectedCount:1,existingCount:0,nextCursor:'unconfirmed-next-page'}};
    globalThis.questPending={outage:true,commits:[],reads:[],previews:[]};
    imports.bridge.commitSource=async(...args)=>{questPending.commits.push(args);return {state:'partial'};};
    imports.bridge.importStatus=async(workspaceId,jobId)=>{
      questPending.reads.push({workspaceId,jobId});if(questPending.outage)throw new Error('Synthetic import receipt unavailable');
      return {jobId,previewId:jobId,state:'partial',scope,records:[],createdCount:0,existingCount:0,failedCount:1,nextCursor:null,retryCursor:null};
    };
    imports.bridge.previewSource=async(workspaceId,provider,connectedAccountId,selection,cursor)=>{
      questPending.previews.push({workspaceId,provider,connectedAccountId,cursor:cursor??null});
      return {previewId:'recovered-page',revision:'recovered-revision',scope,expiresAt:Math.floor(Date.now()/1000)+900,
        records:[],scannedCount:0,selectedCount:0,existingCount:0,coverage:'complete'};
    };
    gigiTest.render();
  });
  await page.getByRole('button',{name:'Import this reviewed page →',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Synthetic import receipt unavailable'}).waitFor();
  const pendingInput=await page.evaluate(()=>structuredClone(gigiTest.snapshot().devQuest.connected.imports.state.importInput));
  assert.ok(pendingInput);
  assert.equal(await page.getByRole('button',{name:'Preview the next page',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Discard preview',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Stop import',exact:true}).isVisible(),true);
  await page.screenshot({path:resolve(out,'unconfirmed-import-keeps-recovery.png')});
  await page.getByRole('button',{name:'Recover or retry exact import',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>gigiTest.snapshot().devQuest.connected.imports.state.importInput),pendingInput);
  assert.equal(await page.evaluate(()=>questPending.commits.length),1,'an unavailable receipt must not repeat the commit');
  assert.equal(await page.evaluate(()=>questPending.previews.length),0);
  await page.evaluate(()=>{questPending.outage=false;});
  await page.getByRole('button',{name:'Check import result →',exact:true}).click();
  await page.getByRole('button',{name:'Preview remaining records →',exact:true}).waitFor();
  await page.getByRole('button',{name:'Preview remaining records →',exact:true}).click();
  await page.getByRole('heading',{name:'Preview before importing',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>questPending.previews),[{workspaceId:'synthetic-astryx-rewrite',provider:'gmail',connectedAccountId:'synthetic-account',cursor:null}]);
  assert.equal(await page.evaluate(()=>questPending.commits.length),1);
  assert.equal(await page.evaluate(()=>gigiTest.snapshot().devQuest.connected.imports.state.importInput),null);
  results.push('An approved import with a lost receipt keeps its exact recovery job, blocks continuation/discard, retries read-first without another commit, and permits a new preview only after receipt reconciliation.');

  // Exercise the rendered Astryx-owned frame and responsive budgets, not source wrappers.
  for (const theme of ['paper', 'midnight']) for (const viewport of [{ width: 880, height: 620 }, { width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(theme => {
      const ctx = gigiTest.snapshot();
      ctx.actions.setPreferences({ ...ctx.preferences, theme });
      ctx.devQuest.connected.journey.start('assistant');
      gigiTest.render();
    }, theme);
    await page.locator('#setup-heading').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const frame = await page.evaluate(() => ({
      stack: document.querySelector('main.quest').classList.contains('astryx-stack'),
      grid: document.querySelector('.quest-layout').classList.contains('astryx-grid'),
      mission: document.querySelector('.quest-mission').classList.contains('astryx-stack'),
      route: document.querySelector('.quest-map').classList.contains('astryx-grid'),
      padding: document.querySelector('main.quest').dataset.paddingInline,
      columns: getComputedStyle(document.querySelector('.quest-layout')).gridTemplateColumns.split(' ').length
    }));
    assert.equal(frame.stack && frame.grid && frame.mission && frame.route, true);
    assert.equal(frame.columns, viewport.width === 390 ? 1 : 2);
    await page.getByRole('button', { name: 'Add a gig myself', exact: true }).focus();
    assert.equal(await page.getByRole('button', { name: 'Add a gig myself', exact: true }).evaluate(node => node === document.activeElement), true);
    await page.screenshot({ path: resolve(out, `layout-${theme}-${viewport.width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  results.push('Actual Astryx Grid/Stack frames retain two desktop columns and one mobile column, keyboard access and no horizontal overflow at 880×620,1440×900,390×844 in Paper and Midnight.');
  const report = { status: 'passed', results, limits: 'Synthetic browser fixture only. Native WebKit, live provider consent/import, phone access and real profiles are not exercised.' };
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await server?.close();
}
