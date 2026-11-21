import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
describe('newsletter verification integration', () => {
 it('sends verification from the shared signup and wires every retained io signup', () => {
  const shared = read('../../canon/src/lib/newsletter/NewsletterSignup.svelte');
  expect(shared).toContain('turnstileToken: turnstileToken || undefined');
  expect(shared).toContain('TurnstileChallenge');
  for (const route of ['newsletters', 'newsletters/[slug]', 'subscribe']) {
   expect(read(`../src/routes/${route}/+page.svelte`)).toContain('turnstileSiteKey={data.turnstileSiteKey}');
  }
 });
 it('shares per-widget lifecycle with Footer without a global onload callback', () => {
  const footer = read('../../canon/src/lib/components/Footer.svelte');
  expect(footer).toContain('TurnstileChallenge');
  expect(footer).not.toContain('onTurnstileLoad');
 });
});

describe('Turnstile loader lifecycle', () => {
 it('shares one script for concurrent widgets and reuses the loaded API', async () => {
  const { vi } = await import('vitest');
  vi.resetModules();
  const scripts: any[] = [];
  class Script extends EventTarget { src = ''; async = false; remove() { scripts.splice(scripts.indexOf(this), 1); } }
  const win: any = {};
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { querySelector: () => scripts[0], createElement: () => new Script(), head: { appendChild: (s: any) => scripts.push(s) } });
  const { loadTurnstile } = await import('../../canon/src/lib/newsletter/turnstile');
  const first = loadTurnstile(); const second = loadTurnstile();
  expect(first).toBe(second); expect(scripts).toHaveLength(1);
  win.turnstile = { render: vi.fn(), remove: vi.fn(), reset: vi.fn() };
  scripts[0].dispatchEvent(new Event('load'));
  expect(await first).toBe(win.turnstile); expect(await loadTurnstile()).toBe(win.turnstile);
  vi.unstubAllGlobals();
 });
 it('allows a fresh script after a load failure', async () => {
  const { vi } = await import('vitest'); vi.resetModules();
  const scripts: any[] = [];
  class Script extends EventTarget { src = ''; async = false; remove() { scripts.splice(scripts.indexOf(this), 1); } }
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { querySelector: () => scripts[0], createElement: () => new Script(), head: { appendChild: (s: any) => scripts.push(s) } });
  const { loadTurnstile } = await import('../../canon/src/lib/newsletter/turnstile');
  const failed = loadTurnstile(); scripts[0].dispatchEvent(new Event('error'));
  await expect(failed).rejects.toThrow('could not load'); expect(scripts).toHaveLength(0);
  const retried = loadTurnstile(); expect(scripts).toHaveLength(1);
  scripts[0].dispatchEvent(new Event('error')); await expect(retried).rejects.toThrow();
  vi.unstubAllGlobals();
 });
});
