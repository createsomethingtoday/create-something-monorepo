import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'stopwatch-state-'));
try {
  const executable = join(directory, 'operator-state-test');
  const compiled = spawnSync(
    process.env.CXX || 'c++',
    ['-std=c++11', '-Wall', '-Wextra', '-Werror', 'test/operator_state_test.cpp', '-o', executable],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  );
  if (compiled.status !== 0) throw new Error(compiled.stderr || compiled.stdout);
  const tested = spawnSync(executable, [], { encoding: 'utf8' });
  if (tested.status !== 0) throw new Error(tested.stderr || tested.stdout);
  console.log('Stopwatch operator state tests passed.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
