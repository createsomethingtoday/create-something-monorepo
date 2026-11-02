import assert from 'node:assert/strict';
import test from 'node:test';
import { enhanceNativeDisclosure } from '../src/lib/motion/evidenceDisclosure';

function fixture() {
  const media = Object.assign(new EventTarget(), { matches: false });
  let resized: () => void = () => {};
  const view = Object.assign(new EventTarget(), {
    innerHeight: 800,
    ResizeObserver: class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} },
    matchMedia: () => media,
    getComputedStyle: () => ({ getPropertyValue: (name: string) => name.includes('duration') ? '200ms' : 'ease', borderTopWidth: '1', borderBottomWidth: '1' })
  });
  const summary = Object.assign(new EventTarget(), { getBoundingClientRect: () => ({ height: 48 }), focus: () => {} });
  const animations: Array<{ resolve: () => void; cancelled: boolean; cancel: () => void; finished: Promise<void> }> = [];
  const animate = () => {
    let resolve!: () => void;
    const animation = { resolve: () => resolve(), cancelled: false, cancel() { this.cancelled = true; }, finished: new Promise<void>(r => { resolve = r; }) };
    animations.push(animation);
    return animation;
  };
  const body = { height: 120, inert: false, contains: () => false, getBoundingClientRect() { return { height: this.height }; }, animate };
  const classes = new Set<string>();
  const styles = new Map<string, string>();
  const details = Object.assign(new EventTarget(), {
    open: false,
    ownerDocument: { defaultView: view, activeElement: summary, getElementById: () => null },
    children: [Object.assign(summary, { tagName: 'SUMMARY' }), body],
    querySelector: (selector: string) => selector.includes('summary') ? summary : body,
    getBoundingClientRect: () => ({ height: details.open ? 170 : 50 }),
    classList: { toggle: (name: string, on: boolean) => on ? classes.add(name) : classes.delete(name), remove: (name: string) => classes.delete(name) },
    style: { set height(value: string) { styles.set('height', value); }, set overflow(value: string) { styles.set('overflow', value); }, removeProperty: (name: string) => styles.delete(name) },
    contains: () => false,
    animate
  });
  const click = (detail = 1) => {
    const event = Object.assign(new Event('click', { cancelable: true }), { detail, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false });
    summary.dispatchEvent(event);
    return event;
  };
  return { details, summary, body, view, media, animations, classes, styles, click, resized: () => resized() };
}

test('pointer toggles can reverse without a stale completion closing the latest state', async () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  assert.equal(f.click().defaultPrevented, true);
  assert.equal(f.details.open, true);
  const opening = f.animations[0];
  f.click();
  assert.equal(f.body.inert, true, 'closing content cannot receive focus');
  f.click();
  assert.equal(f.body.inert, false);
  opening.resolve();
  await Promise.resolve();
  assert.equal(f.details.open, true);
  f.animations.at(-2)!.resolve();
  await Promise.resolve();
  assert.equal(f.styles.size, 0);
  dispose();
});

test('keyboard clicks retain native immediate toggle behavior', () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  assert.equal(f.click(0).defaultPrevented, false);
  assert.equal(f.animations.length, 0);
  dispose();
});

test('reduced-motion changes settle a closing panel and remove transient styles', () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click();
  f.click();
  f.media.matches = true;
  f.media.dispatchEvent(new Event('change'));
  assert.equal(f.details.open, false);
  assert.equal(f.body.inert, false);
  assert.equal(f.styles.size, 0);
  dispose();
});

test('viewport changes and cleanup leave the native disclosure usable', () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click();
  f.view.dispatchEvent(new Event('resize'));
  assert.equal(f.details.open, true);
  assert.equal(f.styles.size, 0);
  dispose();
  assert.equal(f.click().defaultPrevented, false);
});


test('nested content resizing settles the current panel without clipping new content', () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click();
  f.resized();
  assert.notEqual(f.styles.size, 0, 'initial observer delivery must not cancel the opening');
  f.body.height = 200;
  f.resized();
  assert.equal(f.styles.size, 0);
  assert.equal(f.details.open, true);
  dispose();
});

test('large library panels open immediately and print restores prior state', () => {
  const f = fixture();
  f.view.innerHeight = 100;
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click();
  assert.equal(f.details.open, true);
  assert.equal(f.animations.length, 0);
  f.click();
  assert.equal(f.details.open, false);
  f.view.dispatchEvent(new Event('beforeprint'));
  assert.equal(f.details.open, true);
  f.view.dispatchEvent(new Event('afterprint'));
  assert.equal(f.details.open, false);
  dispose();
});


test('keyboard activation during a pointer close immediately restores native state', () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click();
  f.click();
  assert.equal(f.body.inert, true);
  assert.equal(f.click(0).defaultPrevented, false);
  assert.equal(f.styles.size, 0);
  assert.equal(f.body.inert, false);
  // The browser's default keyboard toggle now runs on the settled closed panel.
  f.details.open = true;
  f.details.dispatchEvent(new Event('toggle'));
  f.view.dispatchEvent(new Event('resize'));
  assert.equal(f.details.open, true);
  dispose();
});

test('a wall-clock deadline settles animation even if frame completion stalls', async () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click();
  f.click();
  await new Promise(resolve => setTimeout(resolve, 340));
  assert.equal(f.details.open, false);
  assert.equal(f.body.inert, false);
  assert.equal(f.styles.size, 0);
  dispose();
});

test('rapid native keyboard toggles read current DOM before the queued toggle event', () => {
  const f = fixture();
  const dispose = enhanceNativeDisclosure(f.details as unknown as HTMLDetailsElement);
  f.click(0);
  f.details.open = true; // Browser default; its toggle event is still queued.
  f.click(0);
  assert.equal(f.details.open, true, 'Enhancement must not reset the panel before the next native toggle');
  f.details.open = false;
  f.details.dispatchEvent(new Event('toggle'));
  dispose();
});
