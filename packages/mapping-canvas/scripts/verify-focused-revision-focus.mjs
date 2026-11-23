import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CANVAS_URL ?? 'http://127.0.0.1:5202';
const browser = await chromium.launch({ headless: true, channel: process.env.CHROME_CHANNEL ?? 'chrome' });
const errors = [], checks = [];
const check = (name, condition) => { checks.push({ name, pass: Boolean(condition) }); console.log(name, condition); if (!condition) throw new Error(name); };
async function fixture() {
  const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const { mount } = await import('/node_modules/.vite/deps/svelte.js');
    const { default: Harness } = await import('/src/lib/testing/FocusedRevisionHarness.svelte');
    const target = document.createElement('div'); document.body.append(target); mount(Harness, { target });
  });
  await page.getByRole('button', { name: 'Revise selection', exact: true }).click();
  await page.getByLabel('Find exact text').fill('Noah'); await page.getByLabel('Replace with').fill('Inez');
  await page.getByRole('button', { name: 'Preview revision', exact: true }).click();
  return page;
}
try {
  const page = await fixture();
  await page.getByRole('button', { name: 'Accept revision', exact: true }).click();
  await page.getByRole('button', { name: 'Outside prototype', exact: true }).focus();
  await page.evaluate(() => window.__focusedRevisionHarness.complete());
  await page.getByRole('button', { name: 'Undo revision', exact: true }).waitFor();
  check('delayed Accept preserves focus moved outside', await page.getByRole('button', { name: 'Outside prototype', exact: true }).evaluate(el => el === document.activeElement));
  await page.getByRole('button', { name: 'Undo revision', exact: true }).click(); await page.getByRole('button', { name: 'Outside prototype', exact: true }).focus();
  await page.evaluate(() => window.__focusedRevisionHarness.complete()); await page.getByText('Revision undone.', { exact: false }).waitFor();
  check('delayed Undo preserves focus moved outside', await page.getByRole('button', { name: 'Outside prototype', exact: true }).evaluate(el => el === document.activeElement));
  await page.close();
  const replaced = await fixture(); await replaced.getByRole('button', { name: 'Accept revision', exact: true }).click();
  await replaced.getByRole('button', { name: 'Outside prototype', exact: true }).focus(); await replaced.evaluate(() => window.__focusedRevisionHarness.changeProject());
  await replaced.waitForFunction(() => !document.getElementById('focused-revision-form')); await replaced.evaluate(() => window.__focusedRevisionHarness.complete());
  check('project replacement drops proposal and old Undo receipt', !(await replaced.getByRole('button', { name: 'Undo revision', exact: true }).count()) && !(await replaced.getByRole('alert').count()));
  check('late result does not focus new project', await replaced.getByRole('button', { name: 'Outside prototype', exact: true }).evaluate(el => el === document.activeElement)); await replaced.close();
  const failed = await fixture(); await failed.getByRole('button', { name: 'Accept revision', exact: true }).click(); await failed.evaluate(() => window.__focusedRevisionHarness.fail());
  await failed.getByRole('alert').filter({ hasText: 'No automatic retry' }).waitFor();
  check('interrupted result is explicit and not replayed', await failed.getByLabel('Harness calls').innerText() === '1' && !(await failed.getByRole('button', { name: 'Undo revision', exact: true }).count()));
  check('component harness has no page errors', errors.length === 0);
  const out = new URL('../output/focused-revision/', import.meta.url); await mkdir(out, { recursive: true }); await writeFile(new URL('focus-error-result.json', out), JSON.stringify({ checks, errors, scope: 'Actual Svelte component with a controlled delayed/failing executor; not native/production API evidence' }, null, 2));
} finally { await browser.close(); }
