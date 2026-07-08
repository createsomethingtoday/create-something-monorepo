import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const coveragePath = path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

test('client overlay coverage covers every managed client package', () => {
  const packages = coverage.overlays.flatMap((overlay) => overlay.packages);
  const paths = new Set(packages.map((pkg) => pkg.path));

  assert.equal(coverage.id, 'substrate:create-something:client-overlay-coverage');
  assert.equal(coverage.topologyId, 'substrate:create-something:topology:internal');
  assert.equal(coverage.overlays.length, 4);
  assert.equal(packages.length, 6);
  assert.ok(paths.has('packages/agency/clients/cato-supply-insights-review'));
  assert.ok(paths.has('packages/agency/clients/jandjhomehealth'));
  assert.ok(paths.has('packages/agency/clients/outerfields'));
  assert.ok(paths.has('packages/agency/clients/outerfields/mcp-remote'));
  assert.ok(paths.has('packages/agency/clients/outerfields/mcp-server'));
  assert.ok(paths.has('packages/agency/clients/the-stack'));
});

test('client overlay coverage creates Atlas and Substrate objects for each package', () => {
  for (const overlay of coverage.overlays) {
    assert.equal(overlay.status, 'mapped');
    assert.equal(overlay.packages.length, overlay.atlasNodes.length);
    assert.equal(overlay.packages.length, overlay.substrateRecords.length);
    assert.equal(overlay.packages.length, overlay.receipts.length);
    assert.equal(overlay.packages.length, overlay.nextActions.length);
    assert.ok(overlay.atlasCanvasId.includes(overlay.clientSlug));
    assert.ok(overlay.substrateRecords.every((record) => record.status === 'ready'));
    assert.ok(overlay.substrateRecords.every((record) => record.bindingHealth === 'bound'));
  }
});

test('client overlay coverage preserves runtime and evidence paths', () => {
  const packages = coverage.overlays.flatMap((overlay) => overlay.packages);
  const jandj = packages.find((pkg) => pkg.path === 'packages/agency/clients/jandjhomehealth');
  const outerfieldsRemote = packages.find(
    (pkg) => pkg.path === 'packages/agency/clients/outerfields/mcp-remote'
  );

  assert.ok(jandj?.runtime?.includes('cloudflare'));
  assert.ok(jandj?.docs.includes('packages/agency/clients/jandjhomehealth/README.md'));
  assert.ok(jandj?.workerConfigs.includes('packages/agency/clients/jandjhomehealth/wrangler.toml'));
  assert.ok(outerfieldsRemote?.summary.includes('Remote MCP'));
  assert.ok(outerfieldsRemote?.commands.includes('deploy'));
});
