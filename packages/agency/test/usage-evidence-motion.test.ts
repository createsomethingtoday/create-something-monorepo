import assert from 'node:assert/strict';
import test from 'node:test';
import { usageEvidenceMotion } from '../src/lib/motion/usageEvidenceMotion';

function fixture(reduced = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const attributes = new Map<string, string>();
  const styles = new Map<string, string>();
  const timers = new Map<number, () => void>();
  let timerId = 0;
  let resized = () => {};
  let disconnected = false;
  const view = Object.assign(new EventTarget(), {
    matchMedia: () => media,
    getComputedStyle: () => ({ getPropertyValue: (name: string) => name.includes('duration') ? '300ms' : 'cubic-bezier(0.4, 0, 0.2, 1)' }),
    setTimeout: (callback: () => void) => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    ResizeObserver: class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() { disconnected = true; } }
  });
  const buttons = ['template-review', 'app-review', 'dashboard-loads', 'asset-updates'].map((id, index) => ({
    dataset: { usageMetric: id }, getBoundingClientRect: () => ({ top: 100 + index * 100, height: 96 })
  }));
  const marker = { getBoundingClientRect: () => ({ top: 100 + parseFloat(styles.get('--usage-marker-y') ?? '0'), height: 96 }) };
  const ledger = { getBoundingClientRect: () => ({ top: 100 }) };
  const panel = {};
  const root = {
    ownerDocument: { defaultView: view },
    querySelector: (selector: string) => selector === '[data-usage-ledger]' ? ledger : selector === '[data-usage-marker]' ? marker : panel,
    querySelectorAll: () => buttons,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    toggleAttribute: (name: string, force: boolean) => force ? attributes.set(name, '') : attributes.delete(name),
    style: { setProperty: (name: string, value: string) => styles.set(name, value), removeProperty: (name: string) => styles.delete(name) }
  } as unknown as HTMLElement;
  const contexts: Array<{ reverted: boolean; revert(): void }> = [];
  const complete: Array<() => void> = [];
  const gsap = {
    registerPlugin() {},
    context(callback: () => void) {
      const context = { reverted: false, revert() { this.reverted = true; } };
      contexts.push(context); callback(); return context;
    },
    timeline(options: { onComplete: () => void }) {
      complete.push(options.onComplete);
      return { fromTo() { return this; } };
    }
  };
  const modules = [{ gsap }, { CustomEase: { create: () => 'fixture-ease' } }] as unknown as [typeof import('gsap'), typeof import('gsap/CustomEase')];
  return { root, media, view, styles, attributes, timers, contexts, complete, modules, resized: () => resized(), disconnected: () => disconnected };
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('selection made during a delayed GSAP import remains the settled selection', async () => {
  const f = fixture();
  let resolve!: (value: typeof f.modules) => void;
  const action = usageEvidenceMotion(f.root, 'template-review', () => new Promise(r => { resolve = r; }));
  action.update('asset-updates');
  assert.equal(f.styles.get('--usage-marker-y'), '300px');
  resolve(f.modules); await flush();
  assert.equal(f.styles.get('--usage-marker-y'), '300px');
  assert(f.attributes.has('data-usage-motion-ready'));
  assert.equal(f.contexts.length, 0, 'late import must not replay a stale selection');
  action.destroy();
});

test('interrupted motion ignores stale completion and settles the latest selection', async () => {
  const f = fixture();
  const action = usageEvidenceMotion(f.root, 'template-review', async () => f.modules);
  await flush();
  action.update('app-review');
  action.update('asset-updates');
  assert.equal(f.contexts[0].reverted, true);
  f.complete[0]();
  assert.equal(f.attributes.get('data-usage-animating'), 'selection');
  assert.equal(f.styles.get('--usage-marker-y'), '300px');
  f.complete[1]();
  assert(!f.attributes.has('data-usage-animating'));
  assert.equal(f.contexts[1].reverted, true);
  assert.equal(f.timers.size, 0);
  action.destroy();
});

test('reduced motion skips loading and preference changes immediately settle active motion', async () => {
  const f = fixture(true);
  let loads = 0;
  const action = usageEvidenceMotion(f.root, 'template-review', async () => { loads++; return f.modules; });
  action.update('app-review');
  assert.equal(loads, 0);
  f.media.matches = false; f.media.dispatchEvent(new Event('change')); await flush();
  action.update('dashboard-loads');
  assert(f.attributes.has('data-usage-animating'));
  f.media.matches = true; f.media.dispatchEvent(new Event('change'));
  assert(!f.attributes.has('data-usage-animating'));
  assert(!f.attributes.has('data-usage-motion-ready'));
  assert.equal(f.styles.get('--usage-marker-y'), '200px');
  action.destroy();
});

test('wall-clock deadline, resize and print leave the CSS-owned final state', async () => {
  const f = fixture();
  const action = usageEvidenceMotion(f.root, 'template-review', async () => f.modules);
  await flush(); action.update('app-review');
  [...f.timers.values()][0]();
  assert(!f.attributes.has('data-usage-animating'));
  action.update('dashboard-loads'); f.resized();
  assert(!f.attributes.has('data-usage-animating'));
  action.update('asset-updates'); f.view.dispatchEvent(new Event('beforeprint'));
  assert(!f.attributes.has('data-usage-animating'));
  assert.equal(f.styles.get('--usage-marker-y'), '300px');
  action.destroy();
  assert(f.disconnected()); assert.equal(f.styles.size, 0);
});

test('load failure and unmount before resolution cannot leave animated or hidden state', async () => {
  const failed = fixture();
  const fallback = usageEvidenceMotion(failed.root, 'template-review', async () => { throw new Error('offline'); });
  await flush(); fallback.update('asset-updates');
  assert(!failed.attributes.has('data-usage-motion-ready'));
  assert.equal(failed.styles.get('--usage-marker-y'), '300px');
  fallback.destroy();
  const late = fixture();
  let resolve!: (value: typeof late.modules) => void;
  const action = usageEvidenceMotion(late.root, 'template-review', () => new Promise(r => { resolve = r; }));
  action.destroy(); resolve(late.modules); await flush();
  assert.equal(late.styles.size, 0); assert.equal(late.attributes.size, 0);
});
