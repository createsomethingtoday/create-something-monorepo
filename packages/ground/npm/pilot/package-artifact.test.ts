import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);

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
const packageDirectory = resolve(workspace, 'packages/ground/npm');

test('npm artifact ships thin command wrappers, not a platform-specific native binary', async () => {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageDirectory
  });
  const [{ files }] = JSON.parse(stdout) as [{ files: Array<{ path: string }> }];
  const paths = files.map((file) => file.path).sort();

  assert.deepEqual(paths.filter((path) => path.startsWith('bin/')), [
    'bin/ground-mcp.js',
    'bin/ground.js',
    'bin/native/.gitkeep',
    'bin/run-native.js'
  ]);
});
