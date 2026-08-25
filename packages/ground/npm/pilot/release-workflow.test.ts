import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import test from 'node:test';

function findWorkspaceRoot(start: string): string {
  let current = resolve(start);
  const root = parse(current).root;
  while (current !== root) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    current = dirname(current);
  }
  throw new Error(`Unable to find workspace root from ${start}`);
}

const workspace = findWorkspaceRoot(process.cwd());

test('Ground release assets publish checksums, provenance, and through npm trusted publishing', async () => {
  const workflow = await readFile(join(workspace, '.github/workflows/ground-release.yml'), 'utf8');

  assert.match(workflow, /verify-calibration:/);
  assert.match(workflow, /name:\s*Verify governed Ground calibration/);
  assert.match(workflow, /ground-calibration-verify\.mjs/);
  assert.match(workflow, /ground-calibration-receipt\.json/);
  assert.match(workflow, /--release-tag/);
  assert.match(workflow, /name:\s*Preserve calibration receipt\s*\n\s*if:\s*always\(\)/);
  assert.match(workflow, /needs:\s*verify-calibration/);
  assert.match(workflow, /needs\.verify-calibration\.result == 'success'/);
  assert.match(workflow, /name:\s*Record source provenance/);
  assert.match(workflow, /GROUND_SOURCE_SHA:\s*\$\{\{ steps\.provenance\.outputs\.sha \}\}/);
  assert.match(workflow, /name:\s*Generate checksums/);
  assert.match(workflow, /SHA256SUMS/);
  assert.match(workflow, /files:\s*\|[\s\S]*SHA256SUMS/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /publish-npm:/);
  assert.match(workflow, /needs:\s*\[release, verify-calibration\]/);
  assert.match(workflow, /publish_only:/);
  assert.match(
    workflow,
    /Skip build and GitHub Release creation; publish an existing verified release to npm only/
  );
  assert.match(workflow, /github\.event_name != 'workflow_dispatch' \|\| !inputs\.publish_only/);
  assert.match(
    workflow,
    /always\(\) && needs\.verify-calibration\.result == 'success' && \(inputs\.publish_only \|\| needs\.release\.result == 'success'\)/
  );
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}\s+# v6\.5\.0/);
  assert.doesNotMatch(workflow, /actions\/setup-node@v6(?:\s|$)/);
  assert.match(workflow, /node-version:\s*'24'/);
  assert.match(workflow, /Verify release tag matches package version/);
  assert.match(
    workflow,
    /expected_tag="ground-v\$\(node -p \"require\('\.\/package\.json'\)\.version\"\)"/
  );
  assert.match(workflow, /npm publish --access public/);
  assert.match(workflow, /id:\s*package/);
  assert.match(workflow, /already_published=true/);
  assert.match(workflow, /steps\.package\.outputs\.already_published != 'true'/);
  assert.match(workflow, /target:\s*x86_64-apple-darwin/);
  assert.match(workflow, /os:\s*macos-15-intel/);
  assert.match(workflow, /os:\s*macos-15(?:\s|$)/);
  assert.match(workflow, /os:\s*ubuntu-24\.04-arm/);
  assert.match(workflow, /name:\s*darwin-x64/);
  assert.match(workflow, /name:\s*Smoke native CLI and MCP/);
  assert.match(workflow, /smoke-native-release\.mjs/);
  assert.match(workflow, /ground-\$\{\{ matrix\.name \}\}-smoke\.json/);
  assert.match(workflow, /consumer-smoke:/);
  assert.match(workflow, /needs:\s*publish-npm/);
  assert.match(workflow, /name:\s*Smoke a fresh published-package consumer/);
  assert.match(workflow, /smoke-published-consumer\.mjs/);
  assert.match(workflow, /ground-\$\{\{ matrix\.name \}\}-consumer-smoke\.json/);
  assert.match(workflow, /publish-consumer-receipts:/);
  assert.match(workflow, /GH_REPO:\s*\$\{\{ github\.repository \}\}/);
  assert.match(workflow, /CONSUMER-SHA256SUMS/);
  assert.match(workflow, /pattern:\s*ground-\*-consumer-smoke/);
  assert.match(workflow, /macOS Intel \| `ground-darwin-x64\.tar\.gz`/);
  assert.doesNotMatch(workflow, /Intel via Rosetta/);
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN/);
});
