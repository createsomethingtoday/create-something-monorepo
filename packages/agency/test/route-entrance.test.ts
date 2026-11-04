import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldEnterHomeBoundary, createRouteEntrance } from '../src/lib/motion/routeEntrance';
test('homepage boundary excludes anchors, initial load and restoration', () => {
  const to = new URL('https://createsomething.agency/services');
  assert.equal(shouldEnterHomeBoundary({ from: '/', to, type: 'link' }), true);
  assert.equal(shouldEnterHomeBoundary({ from: '/services', to: new URL('https://createsomething.agency/'), type: 'link' }), true);
  for (const sample of [
    { from: '/', to: new URL('https://createsomething.agency/#work'), type: 'link' },
    { from: '/', to, type: 'popstate' },
    { from: undefined, to, type: 'enter' },
    { from: '/services', to: new URL('https://createsomething.agency/contact'), type: 'link' }
  ]) assert.equal(shouldEnterHomeBoundary(sample), false);
});
test('superseded asynchronous loading cannot animate the newer route', async () => {
  let finish!: (value: any) => void;
  let animations = 0;
  const controller = createRouteEntrance(() => new Promise(resolve => { finish = resolve; }));
  const pending = controller.enter({} as HTMLElement);
  controller.cancel();
  finish({ fromTo: () => { animations++; return { revert() {} }; } });
  await pending;
  assert.equal(animations, 0);
});
test('cancellation restores styles and preference suppresses late loading', async () => {
  let reverted = 0;
  let enabled = true;
  const controller = createRouteEntrance(async () => ({ fromTo: () => ({ revert() { reverted++; } }) }));
  await controller.enter({} as HTMLElement, () => enabled);
  controller.cancel();
  assert.equal(reverted, 1);
  enabled = false;
  await controller.enter({} as HTMLElement, () => enabled);
  controller.cancel();
  assert.equal(reverted, 1);
});
