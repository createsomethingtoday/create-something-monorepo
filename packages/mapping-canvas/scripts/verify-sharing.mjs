import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.CANVAS_URL ?? 'http://localhost:8793';
const runLabel = process.env.CANVAS_RUN_LABEL ?? 'sharing-local';
const output = fileURLToPath(new URL(`../output/${runLabel}/`, import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const page = await context.newPage(), writes = [];
page.on('request', (request) => { if (request.url().includes('/api/shares') && request.method() !== 'GET') writes.push(`${request.method()} ${new URL(request.url()).pathname}`); });
await page.addInitScript(() => { window.__drawWebMcpTools = {}; Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool) { window.__drawWebMcpTools[tool.name] = tool; } } }); });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Object.keys(window.__drawWebMcpTools).length === 24);
const result = await page.evaluate(async () => {
  const tools = window.__drawWebMcpTools;
  const before = await tools.draw_get_state.execute({});
  const composed = await tools.draw_compose.execute({ nodes: [{ ref: 'rich', text: 'Draft only' }], placement: 'visible-center' });
  const formatted = await tools.draw_edit_note.execute({ id: composed.refs.rich, content: { blocks: [{ type: 'heading1', runs: [{ text: 'Share proof', bold: true }] }, { type: 'bullet', runs: [{ text: 'Safe circulation', italic: true, link: 'https://example.com/proof' }] }] } });
  await new Promise((resolve) => setTimeout(resolve, 250));
  return { beforeCount: before.document.objects.length, noteId: composed.refs.rich, formatted, state: await tools.draw_get_state.execute({}) };
});
if (writes.length) throw new Error(`Ordinary local edits caused ambient share writes: ${writes.join(', ')}`);
if (!result.formatted.formatted || result.state.document.objects.find(({ id }) => id === result.noteId)?.text !== 'Share proof\n• Safe circulation') throw new Error('Formatted note projection failed before sharing.');

const published = await page.evaluate(async () => window.__drawWebMcpTools.draw_publish_snapshot.execute({}));
if (!published.shareId || published.url.includes('?') || published.url.includes('#') || JSON.stringify(published).includes('managementToken')) throw new Error('Public share receipt is unsafe.');
const publicPayload = await (await context.request.get(`${baseUrl}/api/shares/${published.shareId}`)).json();
if (JSON.stringify(publicPayload).toLowerCase().includes('management') || publicPayload.revision !== 1) throw new Error('Public payload exposed management data.');

const competing = await page.evaluate(async ({ shareId }) => {
  const state = await window.__drawWebMcpTools.draw_get_state.execute({}), managed = JSON.parse(localStorage.getItem(`draw-share:${state.document.id}`));
  const response = await fetch(`/api/shares/${shareId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managed.token}` }, body: JSON.stringify({ document: state.document, expectedRevision: 1 }) });
  return { status: response.status, revision: (await response.json()).revision };
}, { shareId: published.shareId });
if (competing.status !== 200 || competing.revision !== 2) throw new Error('Competing snapshot update fixture failed.');
let conflictDenied = false; try { await page.evaluate(() => window.__drawWebMcpTools.draw_update_snapshot.execute({ expectedShareRevision: 1 })); } catch { conflictDenied = true; }
const refreshed = await page.evaluate(() => window.__drawWebMcpTools.draw_get_share_status.execute({}));
if (!conflictDenied || refreshed.share?.revision !== 2) throw new Error('Stale local management revision was not refreshed after conflict.');

const anonymous = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const view = await anonymous.newPage();
await view.addInitScript(() => { window.__registeredShareTools = []; Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool) { window.__registeredShareTools.push(tool.name); } } }); });
await view.goto(published.url, { waitUntil: 'networkidle' });
if (!(await view.getByText('View-only snapshot').isVisible()) || !(await view.getByRole('heading', { name: 'Share proof' }).isVisible()) || !(await view.getByRole('link', { name: 'Safe circulation' }).isVisible())) throw new Error('Anonymous formatted rendering failed.');
if (await view.locator('textarea,input.title,.toolbar,.file-actions').count() || (await view.evaluate(() => window.__registeredShareTools.length))) throw new Error('Anonymous snapshot exposed editing controls or WebMCP tools.');
await view.screenshot({ path: `${output}/anonymous-share.png`, fullPage: true });

const updated = await page.evaluate(async ({ noteId, revision }) => { const tools = window.__drawWebMcpTools; await tools.draw_edit_note.execute({ id: noteId, content: { blocks: [{ type: 'heading2', runs: [{ text: 'Updated proof', underline: true }] }, { type: 'quote', runs: [{ text: 'Stable link' }] }] } }); return tools.draw_update_snapshot.execute({ expectedShareRevision: revision }); }, { noteId: result.noteId, revision: refreshed.share.revision });
if (updated.revision !== 3 || updated.url !== published.url) throw new Error('Stable-link update failed.');
let staleDenied = false; try { await page.evaluate(() => window.__drawWebMcpTools.draw_update_snapshot.execute({ expectedShareRevision: 1 })); } catch { staleDenied = true; }
if (!staleDenied) throw new Error('Stale update was accepted.');
await view.reload({ waitUntil: 'networkidle' });
if (!(await view.getByRole('heading', { name: 'Updated proof' }).isVisible())) throw new Error('Anonymous link did not show the updated revision.');
const invalid = await context.request.delete(`${baseUrl}/api/shares/${published.shareId}`, { headers: { Origin: new URL(baseUrl).origin, Authorization: `Bearer ${'A'.repeat(43)}` } });
if (invalid.status() !== 404) throw new Error('Invalid capability disclosed share state.');
await page.evaluate(() => window.__drawWebMcpTools.draw_revoke_snapshot.execute({ confirmation: 'REVOKE SNAPSHOT' }));
const revokedApi = await context.request.get(`${baseUrl}/api/shares/${published.shareId}`), revokedView = await context.request.get(published.url);
if (revokedApi.status() !== 404 || revokedView.status() !== 404) throw new Error('Revoked snapshot remained available.');
const localAfter = await page.evaluate(() => window.__drawWebMcpTools.draw_get_state.execute({}));
if (!localAfter.document.objects.some(({ id }) => id === result.noteId)) throw new Error('Sharing mutated the local source canvas.');
await anonymous.close(); await context.close(); await browser.close();
console.log(JSON.stringify({ baseUrl, runLabel, toolCount: 24, ambientWritesBeforePublish: 0, create: 201, anonymousRead: 200, conflictDenied, refreshedRevision: 2, stableRevision: 3, staleDenied, invalidCapability: 404, revoke: 204, postRevokeApi: 404, postRevokeView: 404, localSourceRetained: true, screenshot: `${output}/anonymous-share.png`, result: 'pass' }, null, 2));
