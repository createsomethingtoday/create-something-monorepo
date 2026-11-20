import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseGridTransition, createRouteEntrance } from '../src/lib/motion/routeEntrance';

test('public route changes use the grid; anchors, restoration and operational routes stay native', () => {
  const sample = (from: string | undefined, to: string, type = 'link') => shouldUseGridTransition({ from, to: new URL(to, 'https://createsomething.agency'), type });
  assert.equal(sample('/', '/services'), true);
  assert.equal(sample('/services', '/contact'), true);
  assert.equal(sample('/services', '/stack#ownership'), true);
  assert.equal(sample('/', '/#work'), false);
  assert.equal(sample('/services', '/services?plan=team'), false);
  assert.equal(sample('/services', '/', 'popstate'), false);
  assert.equal(sample(undefined, '/'), false);
  for (const route of ['/account', '/api/contact', '/map/workspace', '/map/subscribe', '/auth/login', '/admin', '/login', '/delivery/client', '/dashboard']) {
    assert.equal(sample('/', route), false, route);
    assert.equal(sample(route, '/'), false, route);
  }
});

const frame = () => new Promise(resolve => setTimeout(resolve, 0));
function coverFixture() {
  const covers: { removed: boolean; panels: HTMLElement[]; rules: HTMLElement[]; remove: () => void }[] = [];
  const mount = () => {
    const cover = { removed: false, panels: [{} as HTMLElement, {} as HTMLElement], rules: [{} as HTMLElement], remove() { this.removed = true; } };
    covers.push(cover); return cover;
  };
  return { covers, mount };
}
function runtimeFixture() {
  const completions: (() => void)[] = [];
  let killed = 0;
  return { completions, get killed() { return killed; }, runtime: {
    timeline({ onComplete }: { onComplete: () => void }) {
      completions.push(onComplete);
      const timeline = { fromTo() { return timeline; }, kill() { killed++; } };
      return timeline;
    }
  } };
}
test('navigation and animation loading do not hold the route; cancelled imports cannot revive a cover', async () => {
  const fixture = coverFixture();
  let finish!: (value: any) => void;
  const runtime = runtimeFixture();
  const controller = createRouteEntrance(() => new Promise(resolve => { finish = resolve; }), fixture.mount);
  const returned = controller.start(Promise.resolve());
  assert.equal(returned, undefined, 'No promise is returned to the router');
  assert.equal(fixture.covers.length, 1, 'Cover mounts synchronously around commit');
  controller.cancel(); finish(runtime.runtime); await frame();
  assert.equal(fixture.covers[0].removed, true);
  assert.equal(runtime.completions.length, 0, 'Stale import never creates a timeline');
});
test('only the newest navigation owns its grid; pending route completion cannot clear the newer cover', async () => {
  const fixture = coverFixture(), runtime = runtimeFixture();
  const controller = createRouteEntrance(async () => runtime.runtime, fixture.mount);
  let finish!: () => void;
  controller.start(new Promise<void>(resolve => { finish = resolve; }));
  await frame(); runtime.completions[0](); await frame();
  controller.start(Promise.resolve()); await frame();
  finish(); await frame();
  assert.equal(fixture.covers[0].removed, true);
  assert.equal(fixture.covers[1].removed, false);
  runtime.completions[1](); await frame();
  runtime.completions[2]();
  assert.equal(fixture.covers[1].removed, true);
  assert.ok(runtime.killed >= 1);
});
test('rejected navigation, enhancement failure and deadline all fail open', async () => {
  const fixture = coverFixture();
  let reject!: (value: Error) => void;
  const pending = new Promise((_resolve, fail) => { reject = fail; });
  const controller = createRouteEntrance(() => new Promise(() => {}), fixture.mount, 10);
  controller.start(pending); reject(new Error('cancelled')); await frame();
  assert.equal(fixture.covers[0].removed, true);
  controller.start(new Promise(() => {}));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(fixture.covers[1].removed, true);
  const broken = createRouteEntrance(async () => { throw new Error('offline'); }, fixture.mount);
  broken.start(Promise.resolve()); await frame();
  assert.equal(fixture.covers[2].removed, true);
});
test('reduced motion prevents any visual layer from mounting', () => {
  const fixture = coverFixture();
  const controller = createRouteEntrance(async () => runtimeFixture().runtime, fixture.mount);
  controller.start(Promise.resolve(), () => false);
  assert.equal(fixture.covers.length, 0);
});
