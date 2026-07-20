import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  connectorCatalogCount,
  integrationCatalog,
  integrationCatalogSourceVersion
} from '../src/lib/data/integrationCatalog.generated.ts';
import { integrationProofItems } from '../src/lib/data/integrationProof.ts';
import { normalizeIntegrationMapContext } from '../src/lib/atlas/integration-context.ts';

const registry = JSON.parse(
  readFileSync(new URL('../../../config/mcp-hub/registry.json', import.meta.url), 'utf8')
);
const publicRegistryEntries = Object.entries(registry.servers).filter(([, server]) =>
  String((server as { description?: string }).description ?? '').startsWith(
    'Composio toolkit gateway:'
  )
);

test('generated catalog exactly matches the public brokered registry boundary', () => {
  assert.equal(integrationCatalogSourceVersion, registry.version);
  assert.equal(connectorCatalogCount, publicRegistryEntries.length);
  assert.equal(integrationCatalog.length, publicRegistryEntries.length);
  assert.ok(integrationCatalog.every((integration) => integration.id.startsWith('composio-toolkit-')));
  assert.ok(integrationCatalog.every((integration) => integration.status === 'connector_available'));
  assert.deepEqual(Object.keys(integrationCatalog[0]).sort(), ['id', 'name', 'slug', 'status']);
});

test('curated compatibility marks use explicit roles, statuses, and destinations', () => {
  const platforms = integrationProofItems.filter((item) => item.role === 'platform');
  const connectors = integrationProofItems.filter((item) => item.role === 'connector');

  assert.deepEqual(
    platforms.map((item) => item.name),
    ['OpenAI', 'Cloudflare']
  );
  assert.ok(platforms.every((item) => item.status === 'current_platform'));
  assert.ok(connectors.length >= 6);
  assert.ok(connectors.every((item) => item.status === 'connector_available'));
  assert.ok(connectors.every((item) => item.href.includes('/partners?integration=')));
  assert.ok(connectors.every((item) => integrationCatalog.some((entry) => entry.id === `composio-toolkit-${item.id}`)));
});

test('public catalog does not expose registry transport or descriptive metadata', () => {
  const serializedCatalog = JSON.stringify(integrationCatalog);
  const publicIds = new Set(publicRegistryEntries.map(([id]) => id));
  const excludedRegistryIds = Object.keys(registry.servers).filter((id) => !publicIds.has(id));

  assert.doesNotMatch(serializedCatalog, /createsomething\.workers\.dev|estimated_tool_count|catalog_exposure_mode/);
  assert.ok(excludedRegistryIds.length > 0);
  assert.ok(excludedRegistryIds.every((id) => !integrationCatalog.some((entry) => entry.id === id)));
});

test('catalog connector context is bounded before it enters the public map', () => {
  assert.deepEqual(normalizeIntegrationMapContext('salesforce_service_cloud', 'Salesforce Service Cloud'), {
    slug: 'salesforce_service_cloud',
    name: 'Salesforce Service Cloud'
  });
  assert.equal(normalizeIntegrationMapContext('../internal', 'Internal'), null);
  assert.equal(normalizeIntegrationMapContext('salesforce', '\u0000\u0007'), null);
});
