import assert from 'node:assert/strict';
import test from 'node:test';

import { selectTelemetryServers, WORKWAY_FLEET_SERVERS } from './telemetry-fleet.js';

test('telemetry fleet includes only active HTTP servers for the requested source', () => {
  const servers = selectTelemetryServers(
    {
      active: { transport: 'http', tags: ['workway'] },
      dormant: { transport: 'http', tags: ['workway'], lifecycle: 'dormant' },
      local: { transport: 'stdio', tags: ['workway'], lifecycle: 'local' },
      other: { transport: 'http', tags: ['cs'] }
    },
    'workway'
  );

  assert.deepEqual(servers, ['active']);
});

test('current Workway telemetry fleet excludes retired Gmail and dormant DM identities', () => {
  assert.ok(WORKWAY_FLEET_SERVERS.includes('halfdozen-telemetry'));
  for (const dormantServer of [
    'halfdozen-dm-mcp',
    'halfdozen-gmail-sync-danny',
    'halfdozen-gmail-sync-fillip',
    'halfdozen-gmail-sync-leah'
  ]) {
    assert.ok(!WORKWAY_FLEET_SERVERS.includes(dormantServer), dormantServer);
  }
});
