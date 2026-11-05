import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWaypointGuide } from '../src/lib/motion/waypointGuide';

test('rapid reversals discard stale frames and continue from the rendered position', () => {
  let rendered = 0;
  const frames: Array<(value: number) => void> = [];
  const journeys: Array<[number, number]> = [];
  let cancels = 0;
  const guide = createWaypointGuide(value => { rendered = value; }, (from, to, update) => {
    journeys.push([from, to]); frames.push(update); return () => { cancels++; };
  });
  guide.block(false); guide.select(2); frames[0](.3);
  guide.select(0); frames[0](1);
  assert.equal(rendered, .3);
  assert.deepEqual(journeys, [[0, 1], [.3, 0]]);
  frames[1](0); assert.equal(rendered, 0); assert.ok(cancels >= 1);
  guide.destroy(); frames[1](.5); assert.equal(rendered, 0);
});

test('reduced motion, overlays and resize settle at the latest stop without starting travel', () => {
  let rendered = 0;
  let travels = 0;
  const guide = createWaypointGuide(value => { rendered = value; }, () => { travels++; return () => {}; });
  guide.select(1); assert.equal(rendered, .5); assert.equal(travels, 0);
  guide.block(false); guide.select(2); assert.equal(travels, 1);
  guide.block(true); assert.equal(rendered, 1);
  guide.select(0); assert.equal(rendered, 0);
  guide.refresh(); assert.equal(rendered, 0); assert.equal(travels, 1);
});
