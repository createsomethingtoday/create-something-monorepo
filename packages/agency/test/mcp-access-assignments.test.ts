import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldSurfacePartnerLaneInMcpAccess } from '../src/lib/server/mcp-access-surface.ts';

test('shouldSurfacePartnerLaneInMcpAccess hides archived and toolkit-only lanes', () => {
	assert.equal(
		shouldSurfacePartnerLaneInMcpAccess({
			status: 'active',
			metadata: {
				archived_at: '2026-04-21T00:00:00.000Z',
			},
		}),
		false,
	);

	assert.equal(
		shouldSurfacePartnerLaneInMcpAccess({
			status: 'active',
			metadata: {
				surface_mode: 'toolkit_only',
			},
		}),
		false,
	);

	assert.equal(
		shouldSurfacePartnerLaneInMcpAccess({
			status: 'paused',
			metadata: {},
		}),
		false,
	);

	assert.equal(
		shouldSurfacePartnerLaneInMcpAccess({
			status: 'active',
			metadata: {
				display_name: 'Visible lane',
			},
		}),
		true,
	);
});
