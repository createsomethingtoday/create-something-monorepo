import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInkMotion, inkFeedback, inkReveal } from './ink-motion';

class Motion extends EventTarget {
  finish = vi.fn(() => this.dispatchEvent(new Event('finish')));
  cancel = vi.fn(() => this.dispatchEvent(new Event('cancel')));
}
let preference: EventTarget & { matches: boolean };
let page: EventTarget & { hidden: boolean; activeElement: unknown };
let viewport: EventTarget;
let animation: Motion;
let node: EventTarget & { animate: ReturnType<typeof vi.fn>; contains: ReturnType<typeof vi.fn> };
beforeEach(() => {
  preference = Object.assign(new EventTarget(), { matches: false });
  page = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  viewport = Object.assign(new EventTarget(), { matchMedia: () => preference });
  animation = new Motion();
  node = Object.assign(new EventTarget(), {
    animate: vi.fn(() => animation),
    contains: vi.fn(() => false)
  });
  vi.stubGlobal('window', viewport);
  vi.stubGlobal('document', page);
});
afterEach(() => vi.unstubAllGlobals());
const element = () => node as unknown as HTMLElement;

describe('Human Ink interruptions', () => {
  it.each(['preference', 'visibility', 'pagehide'])(
    'settles active work immediately on %s',
    (reason) => {
      const motion = createInkMotion();
      motion.animate(element(), [], { duration: 3000 });
      if (reason === 'preference') {
        preference.matches = true;
        preference.dispatchEvent(new Event('change'));
      }
      if (reason === 'visibility') {
        page.hidden = true;
        page.dispatchEvent(new Event('visibilitychange'));
      }
      if (reason === 'pagehide') viewport.dispatchEvent(new Event('pagehide'));
      expect(animation.finish).toHaveBeenCalledOnce();
      motion.settle();
      expect(animation.finish).toHaveBeenCalledOnce();
      motion.destroy();
    }
  );
  it('never starts motion while reduced or hidden', () => {
    const motion = createInkMotion();
    preference.matches = true;
    expect(motion.animate(element(), [], {})).toBeUndefined();
    preference.matches = false;
    page.hidden = true;
    expect(motion.animate(element(), [], {})).toBeUndefined();
    expect(node.animate).not.toHaveBeenCalled();
    motion.destroy();
  });
  it('cancels work and removes interruption listeners on route teardown', () => {
    const motion = createInkMotion();
    motion.animate(element(), [], {});
    motion.destroy();
    expect(animation.cancel).toHaveBeenCalledOnce();
    viewport.dispatchEvent(new Event('pagehide'));
    expect(animation.finish).not.toHaveBeenCalled();
  });
  it('finishes a reveal immediately when keyboard focus enters', () => {
    let intersect: IntersectionObserverCallback;
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe() {}
        unobserve = unobserve;
        disconnect = disconnect;
      }
    );
    const action = inkReveal(element());
    intersect!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(unobserve).toHaveBeenCalledWith(node);
    node.dispatchEvent(new Event('focusin'));
    expect(animation.finish).toHaveBeenCalledOnce();
    action.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it('replaces feedback on rapid changes without moving the input or leaving an older animation', () => {
    const action = inkFeedback(element(), 'invite');
    action.update('invite');
    expect(node.animate).not.toHaveBeenCalled();
    action.update('open');
    action.update('invite');
    expect(animation.cancel).toHaveBeenCalledOnce();
    expect(node.animate).toHaveBeenCalledTimes(2);
    action.destroy();
  });
});
