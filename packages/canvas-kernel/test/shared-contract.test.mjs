import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANVAS_KERNEL_RENDER_BACKENDS,
  CANVAS_KERNEL_RENDERER,
  SHARED_CANVAS_STATE_VERSION,
  SUBSTRATE_COMPUTE_SNAPSHOT_VERSION
} from '../dist/index.js';

test('exports the shared canvas-state contract identity', () => {
  assert.equal(SHARED_CANVAS_STATE_VERSION, 'flow.shared-canvas-state.v1');
  assert.equal(CANVAS_KERNEL_RENDERER, 'canvas-kernel');
});

test('exports the supported render backends in priority order', () => {
  assert.deepEqual(CANVAS_KERNEL_RENDER_BACKENDS, ['webgpu', 'canvas-2d', 'unavailable']);
});

test('exports the Substrate compute snapshot contract identity', () => {
  assert.equal(SUBSTRATE_COMPUTE_SNAPSHOT_VERSION, 'flow.substrate-compute-snapshot.v1');
});
