import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSceneSelection } from '../src/lib/motion/sceneReveal';

function harness() {
  const scenes = ['learn', 'build', 'run'];
  const requests = new Map<string, { resolve: (value: string) => void; reject: (reason: Error) => void }[]>();
  const events: unknown[][] = [];
  const selection = createSceneSelection(scenes, {
    load(scene: string) {
      return new Promise<string>((resolve, reject) => {
        requests.set(scene, [...(requests.get(scene) ?? []), { resolve, reject }]);
      });
    },
    settle() { events.push(['settle']); },
    loading(scene: string, current: string) { events.push(['loading', scene, current]); },
    show(scene: string, asset: string, direction: 1 | -1) { events.push(['show', scene, asset, direction]); },
    ready(scene: string) { events.push(['ready', scene]); },
    failed(scene: string, current: string) { events.push(['failed', scene, current]); }
  });
  return { selection, events, request: (scene: string, index = 0) => requests.get(scene)![index] };
}

test('keeps the displayed scene until loading completes and uses the visual transition direction', async () => {
  const h = harness();
  const build = h.selection.select(1);
  assert.deepEqual(h.events, [['settle'], ['loading', 'build', 'learn']]);
  h.request('build').resolve('decoded-build');
  await build;
  assert.deepEqual(h.events.slice(-2), [['show', 'build', 'decoded-build', 1], ['ready', 'build']]);
  const learn = h.selection.select(0);
  h.request('learn').resolve('decoded-learn');
  await learn;
  assert.deepEqual(h.events.slice(-2), [['show', 'learn', 'decoded-learn', -1], ['ready', 'learn']]);
});

test('latest selection wins when image decodes finish out of order', async () => {
  const h = harness();
  const build = h.selection.select(1);
  const run = h.selection.select(2);
  h.request('run').resolve('decoded-run');
  await run;
  h.request('build').resolve('stale-build');
  await build;
  assert.deepEqual(h.events.filter(event => event[0] === 'show'), [['show', 'run', 'decoded-run', 1]]);
  assert.deepEqual(h.events.at(-1), ['ready', 'run']);
});

test('returning to the displayed scene cancels a pending selection without loading or replacing it', async () => {
  const h = harness();
  const build = h.selection.select(1);
  await h.selection.select(0);
  h.request('build').resolve('stale-build');
  await build;
  assert.deepEqual(h.events.at(-1), ['ready', 'learn']);
  assert.equal(h.events.filter(event => event[0] === 'show').length, 0);
});

test('Learn to Build still wipes forward when a pending Run selection is superseded', async () => {
  const h = harness();
  const run = h.selection.select(2);
  const build = h.selection.select(1);
  h.request('build').resolve('decoded-build');
  await build;
  assert.deepEqual(h.events.filter(event => event[0] === 'show'), [['show', 'build', 'decoded-build', 1]]);
  h.request('run').resolve('stale-run');
  await run;
  assert.deepEqual(h.events.at(-1), ['ready', 'build']);
});

test('Run to Build still wipes backward when a pending Learn selection is superseded', async () => {
  const h = harness();
  const initialRun = h.selection.select(2);
  h.request('run').resolve('decoded-run');
  await initialRun;
  const learn = h.selection.select(0);
  const build = h.selection.select(1);
  h.request('build').resolve('decoded-build');
  await build;
  assert.deepEqual(h.events.filter(event => event[0] === 'show').at(-1), ['show', 'build', 'decoded-build', -1]);
  h.request('learn').resolve('stale-learn');
  await learn;
  assert.deepEqual(h.events.at(-1), ['ready', 'build']);
});

test('settles an interrupted reveal before loading the next scene', async () => {
  const h = harness();
  const build = h.selection.select(1);
  h.request('build').resolve('decoded-build');
  await build;
  void h.selection.select(2);
  assert.deepEqual(h.events.slice(-2), [['settle'], ['loading', 'run', 'build']]);
});

test('failed loading retains the current scene and permits retry; stale failures do not overwrite feedback', async () => {
  const h = harness();
  const build = h.selection.select(1);
  h.request('build').reject(new Error('offline'));
  await build;
  assert.deepEqual(h.events.at(-1), ['failed', 'build', 'learn']);
  const retry = h.selection.select(1);
  const run = h.selection.select(2);
  h.request('build', 1).reject(new Error('stale failure'));
  await retry;
  assert.deepEqual(h.events.at(-1), ['loading', 'run', 'learn']);
  h.request('run').resolve('decoded-run');
  await run;
  assert.deepEqual(h.events.at(-1), ['ready', 'run']);
});

test('destroy settles animation and prevents late image completion from changing the page', async () => {
  const h = harness();
  const build = h.selection.select(1);
  h.selection.destroy();
  const count = h.events.length;
  h.request('build').resolve('decoded-build');
  await build;
  await h.selection.select(2);
  assert.equal(h.events.length, count);
  assert.equal(h.events.filter(event => event[0] === 'show').length, 0);
});
