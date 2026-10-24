#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Run from the checkout root, like the existing MCP gate. Enumerate actual test
// files so future session regressions join the gate without an allowlist update.
// Missing directories, empty suites and runner errors must fail, never pass empty.
function testsIn(directory, pattern) {
  const tests = readdirSync(directory).filter((name) => pattern.test(name)).sort();
  if (tests.length === 0) throw new Error(`No auth regression tests found in ${directory}`);
  return tests;
}

try {
  const canon = testsIn('packages/canon/src/lib/auth', /\.test\.ts$/);
  const io = testsIn('packages/io/test', /session.*\.test\.ts$/);
  const suites = [
    ['@create-something/canon', canon.map((file) => `src/lib/auth/${file}`), 'test'],
    ['@create-something/io', io.map((file) => `test/${file}`), 'exec', 'vitest', 'run']
  ];
  let failed = false;
  for (const [pkg, files, ...command] of suites) {
    console.log(`Auth regressions for ${pkg}:\n${files.map((file) => `- ${file}`).join('\n')}`);
    const result = spawnSync('pnpm', ['--filter', pkg, ...command, ...files], {
      cwd: path.resolve('.'),
      env: process.env,
      stdio: 'inherit'
    });
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) failed = true;
  }
  process.exitCode = failed ? 1 : 0;
} catch (error) {
  console.error(`Auth regression gate failed: ${error.message}`);
  process.exitCode = 1;
}
