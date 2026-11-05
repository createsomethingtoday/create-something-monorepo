import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enhanceChapterEntrances } from '../src/lib/motion/chapterEntrance';
import { reducedFilmMotion, filmNavigationOpen, filmOverlayOpen } from '../src/lib/motion/filmPlayback';

type Runtime = Awaited<ReturnType<NonNullable<Parameters<typeof enhanceChapterEntrances>[1]>>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture({ tops = [1200, 1600], reduced = false, hash = '', pending = false, fontsPending = false } = {}) {
  reducedFilmMotion.set(reduced);
  filmNavigationOpen.set(false);
  filmOverlayOpen.set(false);
  const events: string[] = [];
  let intersection!: IntersectionObserverCallback;
  const observed = new Set<HTMLElement>();
  const fonts = deferred<void>();
  if (!fontsPending) fonts.resolve();
  const view = Object.assign(new EventTarget(), {
    innerHeight: 800,
    location: { hash },
    getComputedStyle: () => ({ getPropertyValue: () => '500ms' }),
    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback) { intersection = callback; }
      observe(node: HTMLElement) { observed.add(node); events.push('observe'); }
      unobserve(node: HTMLElement) { observed.delete(node); events.push('unobserve'); }
      disconnect() { observed.clear(); events.push('disconnect'); }
    }
  });
  const document = Object.assign(new EventTarget(), { defaultView: view, hidden: false, fonts: { ready: fonts.promise } });
  const groups = tops.map((top, index) => {
    const focusTarget = {};
    const lines = [{ style: { transform: 'rotate(1deg)' } }, { style: { transform: '' } }];
    const section = { contains: (target: unknown) => target === focusTarget };
    const heading = {
      dataset: {} as Record<string, string>,
      getBoundingClientRect: () => ({ top: tops[index] }),
      querySelectorAll: () => lines,
      closest: () => section
    };
    return { heading: heading as unknown as HTMLElement, lines, focusTarget, originalTop: top };
  });
  const root = Object.assign(new EventTarget(), { ownerDocument: document, querySelectorAll: () => groups.map(group => group.heading) });
  const contexts: Array<{ root: HTMLElement; reverts: number; restore: Array<() => void> }> = [];
  const tweens: Array<{ plays: number; kills: number; complete: () => void; duration: number }> = [];
  let currentContext: typeof contexts[number] | undefined;
  const runtime = {
    context(callback: () => void, heading: HTMLElement) {
      const context = { root: heading, reverts: 0, restore: [] as Array<() => void> };
      contexts.push(context);
      currentContext = context;
      callback();
      currentContext = undefined;
      return { revert() { context.reverts++; context.restore.forEach(restore => restore()); } };
    },
    fromTo(lines: Array<{ style: { transform: string } }>, _from: unknown, options: { onComplete: () => void; duration: number }) {
      for (const line of lines) {
        const original = line.style.transform;
        currentContext!.restore.push(() => { line.style.transform = original; });
        line.style.transform = 'translateY(105%)';
      }
      const tween = { plays: 0, kills: 0, complete: options.onComplete, duration: options.duration };
      tweens.push(tween);
      return { play() { tween.plays++; }, kill() { tween.kills++; } };
    }
  } as unknown as Runtime;
  const module = deferred<Runtime>();
  if (!pending) module.resolve(runtime);
  const enhancement = enhanceChapterEntrances(root as unknown as HTMLElement, () => module.promise);
  return {
    view, document, root, groups, events, observed, tweens, contexts, module, runtime, fonts, enhancement,
    async flush() { for (let i = 0; i < 5; i++) await Promise.resolve(); },
    enter(index = 0, top = 100) {
      tops[index] = top;
      intersection([{ target: groups[index].heading, isIntersecting: true, boundingClientRect: { top } } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    },
    move(index: number, top: number) { tops[index] = top; },
    focus(index: number) {
      const event = new Event('focusin');
      Object.defineProperty(event, 'target', { value: groups[index].focusTarget });
      root.dispatchEvent(event);
    },
    destroy() { enhancement.destroy(); reducedFilmMotion.set(true); filmNavigationOpen.set(false); filmOverlayOpen.set(false); }
  };
}

test('offscreen chapter headings arm once, play on entry, and restore their own authored styles on completion', async () => {
  const f = fixture();
  try {
    await f.flush();
    assert.equal(f.groups[0].heading.dataset.chapterEntranceState, 'armed');
    assert.equal(f.tweens[0].plays, 0);
    assert.equal(f.tweens[0].duration, .5, 'Uses the authored duration token');
    f.enter();
    assert.equal(f.groups[0].heading.dataset.chapterEntranceState, 'revealing');
    assert.equal(f.tweens[0].plays, 1);
    f.tweens[0].complete();
    assert.equal(f.groups[0].heading.dataset.chapterEntranceState, 'settled');
    assert.equal(f.observed.has(f.groups[0].heading), false);
    assert.deepEqual(f.groups[0].lines.map(line => line.style.transform), ['rotate(1deg)', '']);
    assert.equal(f.contexts[0].root, f.groups[0].heading);
    assert.equal(f.contexts[0].reverts, 1);
    assert.equal(f.contexts[1].reverts, 0, 'Completing one heading leaves the next heading armed');
    assert.equal(f.groups[1].lines[0].style.transform, 'translateY(105%)');
    f.enter();
    assert.equal(f.tweens[0].plays, 1, 'Intersection repetition cannot replay a completed heading');
  } finally { f.destroy(); }
});

test('initially visible headings and headings reached during a slow module import never hide', async () => {
  for (const pending of [false, true]) {
    const f = fixture({ tops: [pending ? 1200 : 100], pending });
    try {
      if (pending) { f.move(0, 100); f.module.resolve(f.runtime); }
      await f.flush();
      assert.equal(f.tweens.length, 0);
      assert.deepEqual(f.groups[0].lines.map(line => line.style.transform), ['rotate(1deg)', '']);
    } finally { f.destroy(); }
  }
});

test('font readiness is awaited and copy reached while fonts load remains visible', async () => {
  const f = fixture({ tops: [1200], fontsPending: true });
  try {
    await f.flush();
    assert.equal(f.tweens.length, 0);
    f.move(0, 100);
    f.fonts.resolve();
    await f.flush();
    assert.equal(f.tweens.length, 0);
  } finally { f.destroy(); }
});

test('initial reduced motion and hash arrivals leave complete static headings', async () => {
  for (const options of [{ reduced: true }, { hash: '#work' }]) {
    const f = fixture(options);
    try {
      await f.flush();
      assert.equal(f.tweens.length, 0);
      assert.equal(f.observed.size, 0);
    } finally { f.destroy(); }
  }
});

test('reduced motion, dialog and navigation interruption settle armed or playing headings permanently', async () => {
  for (const store of [reducedFilmMotion, filmOverlayOpen, filmNavigationOpen]) {
    for (const playing of [false, true]) {
      const f = fixture();
      try {
        await f.flush();
        if (playing) f.enter();
        store.set(true);
        assert.ok(f.groups.every(group => group.heading.dataset.chapterEntranceState === 'settled'));
        assert.ok(f.contexts.every(context => context.reverts === 1));
        assert.ok(f.tweens.every(tween => tween.kills === 1));
        assert.equal(f.observed.size, 0);
        store.set(false);
        f.enter();
        assert.equal(f.tweens.length, 2, 'Unblocking creates no replacement entrance');
        assert.equal(f.tweens[0].plays, playing ? 1 : 0, 'Settled copy cannot re-hide or restart');
      } finally { f.destroy(); }
    }
  }
});

test('focus settles only its own chapter while hash navigation, print and hidden documents settle all', async () => {
  const focused = fixture();
  try {
    await focused.flush();
    focused.focus(0);
    assert.equal(focused.groups[0].heading.dataset.chapterEntranceState, 'settled');
    assert.equal(focused.groups[1].heading.dataset.chapterEntranceState, 'armed');
    assert.equal(focused.contexts[1].reverts, 0);
  } finally { focused.destroy(); }
  for (const trigger of ['hash', 'print', 'hidden']) {
    const f = fixture();
    try {
      await f.flush();
      f.enter();
      if (trigger === 'hash') { f.view.location.hash = '#work'; f.view.dispatchEvent(new Event('hashchange')); }
      if (trigger === 'print') f.view.dispatchEvent(new Event('beforeprint'));
      if (trigger === 'hidden') { f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')); }
      assert.ok(f.groups.every(group => group.heading.dataset.chapterEntranceState === 'settled'), trigger);
      assert.ok(f.contexts.every(context => context.reverts === 1), trigger);
      f.enter();
      assert.equal(f.tweens[0].plays, 1, `${trigger}: no replay`);
    } finally { f.destroy(); }
  }
});

test('resizing preserves armed, revealing and settled headings without rebuilding or replaying', async () => {
  const f = fixture({ tops: [1200, 1600, 2000] });
  try {
    await f.flush();
    f.enter(1);
    f.enter(2);
    f.tweens[2].complete();
    const expected = ['armed', 'revealing', 'settled'];
    assert.deepEqual(f.groups.map(group => group.heading.dataset.chapterEntranceState), expected);
    f.view.dispatchEvent(new Event('resize'));
    assert.deepEqual(f.groups.map(group => group.heading.dataset.chapterEntranceState), expected);
    assert.equal(f.contexts.length, 3, 'Resize creates no replacement contexts');
    assert.deepEqual(f.contexts.map(context => context.reverts), [0, 0, 1]);
    assert.deepEqual(f.tweens.map(tween => tween.plays), [0, 1, 1]);
    f.enter(1);
    f.enter(2);
    assert.deepEqual(f.tweens.map(tween => tween.plays), [0, 1, 1], 'Current and completed entrances cannot replay');
  } finally { f.destroy(); }
});

test('a skipped-past intersection settles directly instead of playing an offscreen entrance', async () => {
  const f = fixture({ tops: [1200] });
  try {
    await f.flush();
    f.enter(0, -200);
    assert.equal(f.groups[0].heading.dataset.chapterEntranceState, 'settled');
    assert.equal(f.tweens[0].plays, 0);
    assert.equal(f.contexts[0].reverts, 1);
  } finally { f.destroy(); }
});

test('failed module loading leaves authored content intact without an unhandled failure', async () => {
  const f = fixture({ pending: true });
  try {
    f.module.reject(new Error('offline'));
    await f.flush();
    assert.equal(f.tweens.length, 0);
    assert.deepEqual(f.groups[0].lines.map(line => line.style.transform), ['rotate(1deg)', '']);
  } finally { f.destroy(); }
});

test('destroy before module resolution prevents late setup; active teardown restores styles and removes state', async () => {
  const pending = fixture({ pending: true });
  pending.destroy();
  pending.module.resolve(pending.runtime);
  await pending.flush();
  assert.equal(pending.tweens.length, 0);
  assert.equal(pending.observed.size, 0);

  const active = fixture();
  await active.flush();
  active.enter();
  active.destroy();
  assert.ok(active.contexts.every(context => context.reverts === 1));
  assert.ok(active.groups.every(group => group.heading.dataset.chapterEntranceState === undefined));
  assert.deepEqual(active.groups[0].lines.map(line => line.style.transform), ['rotate(1deg)', '']);
  assert.ok(active.events.includes('disconnect'));
  active.view.dispatchEvent(new Event('resize'));
  active.focus(0);
  assert.ok(active.groups.every(group => group.heading.dataset.chapterEntranceState === undefined), 'Removed event handlers cannot restore stale state');
});
