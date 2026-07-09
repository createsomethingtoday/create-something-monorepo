import assert from 'node:assert/strict';
import test from 'node:test';

import {
	CANVAS_KERNEL_RENDER_BACKENDS,
	CANVAS_KERNEL_RENDERER,
	canvasKernelViewportForNodes,
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

test('computes a lower-zoom public overview when fit padding is increased', () => {
	const nodes = [
		{ height: 76, id: 'agency_canvas', kind: 'touchpoint', label: '.agency public canvas', status: 'run', width: 246, x: 80, y: 178 },
		{ height: 76, id: 'signal_queue', kind: 'data', label: 'Signal queue', status: 'run', width: 218, x: 390, y: 76 },
		{ height: 76, id: 'client_delivery', kind: 'actor', label: 'Client delivery lane', status: 'run', width: 260, x: 1326, y: 162 }
	];
	const defaultViewport = canvasKernelViewportForNodes(nodes, 1061, 682);
	const publicOverview = canvasKernelViewportForNodes(nodes, 1061, 682, { fitPadding: 180 });

	assert.ok(publicOverview.zoom < defaultViewport.zoom);
	assert.ok(nodes[0].x * publicOverview.zoom + publicOverview.x > 70);
});
