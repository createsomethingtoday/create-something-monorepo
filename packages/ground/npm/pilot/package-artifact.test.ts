import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { findWorkspaceRoot } from './workspace-root.ts';

const execFileAsync = promisify(execFile);

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
