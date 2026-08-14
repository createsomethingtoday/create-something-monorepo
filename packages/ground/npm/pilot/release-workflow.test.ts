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

test('Ground release assets publish a checksum manifest and embedded source provenance', async () => {
  const workflow = await readFile(join(workspace, '.github/workflows/ground-release.yml'), 'utf8');

  assert.match(workflow, /name:\s*Record source provenance/);
  assert.match(workflow, /GROUND_SOURCE_SHA:\s*\$\{\{ steps\.provenance\.outputs\.sha \}\}/);
  assert.match(workflow, /name:\s*Generate checksums/);
  assert.match(workflow, /SHA256SUMS/);
  assert.match(workflow, /files:\s*\|[\s\S]*SHA256SUMS/);
});
