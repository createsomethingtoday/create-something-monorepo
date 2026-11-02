#!/usr/bin/env node
import { writeFile, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { runDiscovery, verifyGeneration } from './loop.mjs';

const usage =
  'Usage: workflow:discover run --out <owned-directory> [--repo <root>] [--history <local-summary>] | verify --out <directory> | collect-history --out <private-file> [--repo <root>]';
try {
  const [command, ...args] = process.argv.slice(2);
  if (command === '--help') {
    console.log(usage);
    process.exit(0);
  }
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--repo', '--out', '--history'].includes(args[i]) || !args[i + 1] || flags.has(args[i]))
      throw new Error('usage');
    flags.set(args[i], args[i + 1]);
  }
  if (!flags.has('--out')) throw new Error('usage');
  const repoRoot = resolve(flags.get('--repo') ?? process.cwd());
  if (command === 'run') {
    const result = await runDiscovery({
      repoRoot,
      outDir: flags.get('--out'),
      historyFile: flags.get('--history')
    });
    console.log(
      JSON.stringify({
        schema: result.schema,
        status: result.status,
        generation: result.generation,
        repairAttempts: result.repairAttempts,
        catalogDigest: result.catalog.digest,
        coverage: result.catalog.coverage,
        history: result.catalog.history.coverage,
        safety: result.catalog.safety
      })
    );
  } else if (command === 'verify' && flags.size === 1) {
    const result = await verifyGeneration(flags.get('--out'));
    console.log(JSON.stringify(result));
    if (!result.valid) process.exitCode = 1;
  } else if (command === 'collect-history' && !flags.has('--history')) {
    const repo = await realpath(repoRoot);
    const target = resolve(flags.get('--out'));
    const parent = await realpath(dirname(target));
    const rel = relative(repo, parent);
    if (rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)))
      throw new Error('history_output_must_remain_outside_repository');
    const { collectHistory } = await import('./history.mjs');
    const history = await collectHistory({ repoRoot: repo });
    await writeFile(target, JSON.stringify(history, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(
      JSON.stringify({
        schema: history.schema,
        coverage: history.coverage,
        events: history.events.length,
        privateOutput: true
      })
    );
  } else throw new Error('usage');
} catch (error) {
  const code = /^[a-z_]+$/.test(error.message) ? error.message : 'source_or_compiler_rejected';
  console.error(
    JSON.stringify({
      schema: 'workflow-discovery-failure@1',
      status: 'held',
      code,
      errorType: error.name
    })
  );
  if (code === 'usage') console.error(usage);
  process.exitCode = 1;
}
