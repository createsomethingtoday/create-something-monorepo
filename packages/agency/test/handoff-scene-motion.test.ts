import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enhanceHandoffSceneMotion } from '../src/lib/motion/handoffSceneMotion';
import {
  reducedFilmMotion,
  filmNavigationOpen,
  filmOverlayOpen
} from '../src/lib/motion/filmPlayback';

function fixture({ desktop = true, systemReduced = false, loaded = true, throws = false } = {}) {
  reducedFilmMotion.set(false);
  filmNavigationOpen.set(false);
  filmOverlayOpen.set(false);
  const media = {
    desktop: Object.assign(new EventTarget(), { matches: desktop }),
    system: Object.assign(new EventTarget(), { matches: systemReduced })
  };
  const calls: Array<{
    target: unknown;
    frames: Keyframe[];
    options: KeyframeAnimationOptions;
    canceled: boolean;
    finish: () => void;
  }> = [];
  const animate = (target: unknown, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    if (throws) throw new Error('Animation unavailable');
    let resolve!: () => void;
    let reject!: () => void;
    const finished = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const call = { target, frames, options, canceled: false, finish: () => resolve() };
    calls.push(call);
    return {
      finished,
      cancel() {
        call.canceled = true;
        reject();
      }
    };
  };
  const images = Array.from({ length: 3 }, () => {
    const image = {
      complete: loaded,
      naturalWidth: loaded ? 1536 : 0,
      style: { transform: 'rotate(0deg)' },
      animate: (...args: [Keyframe[], KeyframeAnimationOptions]) => animate(image, ...args)
    };
    return image;
  });
  const scenes = images.map((image) => ({
    querySelector: () => image,
    contains: (target: unknown) => target === image
  }));
  const links = Array.from({ length: 3 }, (_, index) => ({
    getBoundingClientRect: () => ({ left: 20 + index * 108, width: 100 })
  }));
  const classes = new Set<string>();
  let removed = false;
  const rail = {
    className: '',
    style: { width: '', transform: '' },
    setAttribute() {},
    remove() {
      removed = true;
    },
    getBoundingClientRect() {
      return {
        left: 20 + (parseFloat(rail.style.transform.slice('translateX('.length)) || 0),
        width: parseFloat(rail.style.width) || 0
      };
    },
    animate: (...args: [Keyframe[], KeyframeAnimationOptions]) => animate(rail, ...args)
  };
  const track = {
    classList: {
      add: (value: string) => classes.add(value),
      remove: (value: string) => classes.delete(value)
    },
    appendChild() {},
    getBoundingClientRect: () => ({ left: 20, width: 316 }),
    animate() {}
  };
  const view = Object.assign(new EventTarget(), {
    matchMedia: (query: string) =>
      query.includes('prefers-reduced-motion') ? media.system : media.desktop,
    getComputedStyle: () => ({
      getPropertyValue: (property: string) =>
        property.includes('duration') ? '200ms' : 'cubic-bezier(0.4, 0, 0.2, 1)'
    })
  });
  const document = Object.assign(new EventTarget(), {
    defaultView: view,
    hidden: false,
    createElement: () => rail
  });
  const root = Object.assign(new EventTarget(), {
    ownerDocument: document,
    querySelectorAll: (selector: string) => (selector.includes('tour-scene') ? scenes : links),
    querySelector: () => track
  });
  const controller = enhanceHandoffSceneMotion(root as unknown as HTMLElement);
  controller.select(0);
  return {
    root,
    document,
    view,
    media,
    rail,
    images,
    calls,
    classes,
    controller,
    get removed() {
      return removed;
    },
    destroy() {
      controller.destroy();
      reducedFilmMotion.set(true);
      filmNavigationOpen.set(false);
      filmOverlayOpen.set(false);
    }
  };
}

test('selection connects the new artifact to its waypoint without replaying or changing authored styles', async () => {
  const f = fixture();
  try {
    assert.equal(f.calls.length, 0, 'Initial state remains synchronous');
    f.controller.select(1);
    assert.equal(f.calls.length, 2);
    assert.deepEqual(
      f.calls.map((call) => call.target),
      [f.rail, f.images[1]]
    );
    assert.ok(
      f.calls.every((call) => call.options.duration === 200),
      'Canonical micro duration'
    );
    assert.equal(
      f.rail.style.transform,
      'translateX(108px)',
      'Underlying marker is already at the semantic selection'
    );
    f.controller.select(1);
    assert.equal(f.calls.length, 2, 'Scroll repetition does not restart arrival');
    f.calls.forEach((call) => call.finish());
    await Promise.resolve();
    assert.ok(f.calls.every((call) => call.canceled));
    assert.deepEqual(
      f.images.map((image) => image.style),
      Array.from({ length: 3 }, () => ({ transform: 'rotate(0deg)' }))
    );
  } finally {
    f.destroy();
  }
});

test('rapid reversal cancels obsolete artwork and settles only the latest waypoint', () => {
  const f = fixture();
  try {
    f.controller.select(2);
    f.controller.select(0);
    assert.ok(f.calls.slice(0, 2).every((call) => call.canceled));
    assert.equal(f.calls[3].target, f.images[0]);
    assert.equal(f.calls[3].frames[0].translate, '-8px 0');
    assert.equal(f.rail.style.transform, 'translateX(0px)');
  } finally {
    f.destroy();
  }
});

test('system preference, local control, overlays, stacked layout and unreadied images preserve a complete state', () => {
  for (const options of [{ desktop: false }, { systemReduced: true }]) {
    const f = fixture(options);
    try {
      f.controller.select(2);
      assert.equal(f.calls.length, 0);
      assert.equal(f.rail.style.transform, 'translateX(216px)');
    } finally {
      f.destroy();
    }
  }
  const unreadied = fixture({ loaded: false });
  try {
    unreadied.controller.select(1);
    assert.deepEqual(
      unreadied.calls.map((call) => call.target),
      [unreadied.rail],
      'A late or failed image never fades from blank'
    );
  } finally {
    unreadied.destroy();
  }
  for (const store of [reducedFilmMotion, filmNavigationOpen, filmOverlayOpen]) {
    const f = fixture();
    try {
      f.controller.select(1);
      store.set(true);
      assert.ok(f.calls.every((call) => call.canceled));
      f.controller.select(2);
      assert.equal(f.calls.length, 2, 'Blocked selection is instant');
      assert.equal(f.rail.style.transform, 'translateX(216px)');
    } finally {
      f.destroy();
    }
  }
});

test('interruptions settle active effects and selection during resize or print cannot restart them', () => {
  for (const trigger of [
    'resize',
    'hashchange',
    'beforeprint',
    'visibilitychange',
    'system',
    'focus'
  ]) {
    const f = fixture();
    try {
      f.controller.select(1);
      if (trigger === 'visibilitychange') {
        f.document.hidden = true;
        f.document.dispatchEvent(new Event(trigger));
      } else if (trigger === 'system') {
        f.media.system.matches = true;
        f.media.system.dispatchEvent(new Event('change'));
      } else if (trigger === 'focus') {
        const event = new Event('focusin');
        Object.defineProperty(event, 'target', { value: f.images[1] });
        f.root.dispatchEvent(event);
      } else f.view.dispatchEvent(new Event(trigger));
      assert.ok(
        f.calls.every((call) => call.canceled),
        trigger
      );
      if (['resize', 'hashchange', 'beforeprint', 'visibilitychange', 'system'].includes(trigger)) {
        f.controller.select(2);
        assert.equal(
          f.calls.length,
          2,
          `${trigger}: selection remains instant during interruption`
        );
      }
    } finally {
      f.destroy();
    }
  }
});

test('failed animation and destroy retain the current state and remove generated decoration', () => {
  for (const throws of [false, true]) {
    const f = fixture({ throws });
    f.controller.select(1);
    f.destroy();
    assert.equal(f.removed, true);
    assert.equal(f.classes.has('has-selection-rail'), false);
    assert.ok(f.calls.every((call) => call.canceled));
    const count = f.calls.length;
    f.controller.select(2);
    f.view.dispatchEvent(new Event('resize'));
    assert.equal(f.calls.length, count, 'Teardown prevents replacement effects');
  }
});
