import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enhanceImageEntrance } from '../src/lib/motion/imageEntrance';

function fixture({ top = 1200, loaded = true, reduced = false, hash = '', decodePending = false } = {}) {
  const events: string[] = [];
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  let intersection: IntersectionObserverCallback;
  const observer = { observe() { events.push('observe'); }, disconnect() { events.push('disconnect'); } };
  const view = Object.assign(new EventTarget(), {
    innerHeight: 800,
    location: { hash },
    matchMedia: () => preference,
    CSS: { supports: () => true },
    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback) { intersection = callback; }
      observe() { observer.observe(); }
      disconnect() { observer.disconnect(); }
    },
    getComputedStyle: () => ({ clipPath: 'none', getPropertyValue: (name: string) => name.includes('duration') ? '500ms' : 'cubic-bezier(0, 0, 0.2, 1)' }),
    setTimeout: () => 1,
    clearTimeout() {}
  });
  const document = new EventTarget();
  const attrs = new Map<string, string>();
  let decode: () => void = () => {};
  const decoded = decodePending ? new Promise<void>(resolve => { decode = resolve; }) : Promise.resolve();
  const animations: Array<{ frames: Keyframe[]; options: KeyframeAnimationOptions; animation: Animation }> = [];
  const image = Object.assign(new EventTarget(), {
    ownerDocument: Object.assign(document, { defaultView: view }),
    complete: loaded,
    naturalWidth: loaded ? 1536 : 0,
    getBoundingClientRect: () => ({ top, bottom: top + 400 }),
    closest: () => null,
    contains: (target: unknown) => target === image,
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    removeAttribute: (name: string) => attrs.delete(name),
    decode: () => decoded,
    animate(frames: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = { onfinish: null, oncancel: null, pause() { events.push('pause'); }, play() { events.push('play'); }, cancel() { events.push('cancel'); } } as unknown as Animation;
      animations.push({ frames, options, animation });
      return animation;
    }
  });
  return {
    image: image as unknown as HTMLImageElement, view, preference, attrs, animations, events, decode,
    async flush() { await Promise.resolve(); await Promise.resolve(); },
    enter(nextTop = 100) { top = nextTop; intersection!([{ target: image, isIntersecting: true, boundingClientRect: { top } } as unknown as IntersectionObserverEntry], observer as unknown as IntersectionObserver); },
    load() { image.complete = true; image.naturalWidth = 1536; image.dispatchEvent(new Event('load')); }
  };
}

test('decoded offscreen scroll image arms once and plays a stationary 500ms wipe on entry', async () => {
  const f = fixture();
  enhanceImageEntrance(f.image, { mode: 'scroll' });
  await f.flush();
  assert.equal(f.animations.length, 1);
  assert.equal(f.attrs.get('data-image-entrance-state'), 'armed');
  assert.deepEqual(f.animations[0].frames, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]);
  assert.equal(f.animations[0].options.duration, 500);
  f.enter();
  assert.equal(f.attrs.get('data-image-entrance-state'), 'revealing');
  assert.equal(f.events.filter(event => event === 'play').length, 1);
  f.animations[0].animation.onfinish?.call(f.animations[0].animation, new Event('finish') as AnimationPlaybackEvent);
  f.enter();
  assert.equal(f.events.filter(event => event === 'play').length, 1);
  assert.equal(f.attrs.get('data-image-entrance-state'), 'settled');
});

test('a scroll image seen before decode stays visible and never hides late', async () => {
  const f = fixture({ loaded: false, decodePending: true });
  enhanceImageEntrance(f.image);
  f.enter();
  f.load();
  f.decode();
  await f.flush();
  assert.equal(f.animations.length, 0);
  assert.equal(f.attrs.get('data-image-entrance-state'), 'settled');
});

test('hero study opens only six percent of its crop, leaving most image visible', async () => {
  const f = fixture({ top: 100 });
  enhanceImageEntrance(f.image, { mode: 'hero' });
  await f.flush();
  assert.deepEqual(f.animations[0].frames[0], { clipPath: 'inset(0 3% 0 3%)' });
  assert.equal(f.attrs.get('data-image-entrance-state'), 'revealing');
  assert.equal(f.animations[0].options.duration, 500);
});

test('initially visible scroll images, reduced motion, hashes and unavailable APIs stay static', async () => {
  for (const options of [{ top: 100 }, { reduced: true }, { hash: '#team' }]) {
    const f = fixture(options);
    enhanceImageEntrance(f.image);
    await f.flush();
    assert.equal(f.animations.length, 0);
  }
  for (const capability of ['animate', 'IntersectionObserver', 'matchMedia', 'CSS']) {
    const f = fixture();
    if (capability === 'animate') Object.assign(f.image, { animate: undefined });
    else Object.assign(f.view, { [capability]: undefined });
    enhanceImageEntrance(f.image);
    await f.flush();
    assert.equal(f.animations.length, 0, capability);
  }
});

test('preference changes, hash navigation, focus and print settle pending or playing images', async () => {
  for (const trigger of ['preference', 'hash', 'focus', 'print']) {
    const f = fixture();
    enhanceImageEntrance(f.image);
    await f.flush();
    if (trigger === 'preference' || trigger === 'print') f.enter();
    if (trigger === 'preference') { f.preference.matches = true; f.preference.dispatchEvent(new Event('change')); }
    if (trigger === 'hash') { f.view.location.hash = '#team'; f.view.dispatchEvent(new Event('hashchange')); }
    if (trigger === 'print') f.view.dispatchEvent(new Event('beforeprint'));
    if (trigger === 'focus') {
      const event = new Event('focusin');
      Object.defineProperty(event, 'target', { value: f.image });
      f.image.ownerDocument.dispatchEvent(event);
    }
    assert.equal(f.attrs.get('data-image-entrance-state'), 'settled', trigger);
    assert.ok(f.events.includes('cancel'), trigger);
  }
});

test('destroy during loading prevents late decode, and destroy during playback cancels the mask', async () => {
  const pending = fixture({ decodePending: true });
  const enhancement = enhanceImageEntrance(pending.image);
  enhancement.destroy();
  pending.decode();
  await pending.flush();
  assert.equal(pending.animations.length, 0);
  const active = fixture();
  const playing = enhanceImageEntrance(active.image);
  await active.flush();
  active.enter();
  playing.destroy();
  assert.ok(active.events.includes('cancel'));
  assert.equal(active.attrs.has('data-image-entrance-state'), false);
});
