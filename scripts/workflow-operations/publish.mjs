import { readFile, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyGeneration } from '../workflow-discovery/loop.mjs';
import { definitionDigest, reconcileLifecycle } from '../workflow-discovery/lifecycle.mjs';
import { loadLifecycle, saveLifecycle } from '../workflow-discovery/state-store.mjs';
import { verifyInternalValidation } from './runtime.mjs';
async function read(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1048576)
    throw new Error('publication_input_invalid');
  return JSON.parse(await readFile(path, 'utf8'));
}
export async function publishInternalRun({
  catalogRoot,
  runtimeOut,
  trustedKeyPath,
  sourceCommit,
  runUrl,
  persist = false,
  load = loadLifecycle,
  save = saveLifecycle
}) {
  if (
    !/^[a-f0-9]{40}$/.test(sourceCommit) ||
    !/^https:\/\/github\.com\/createsomethingtoday\/create-something-monorepo\/actions\/runs\/[0-9]+$/.test(
      runUrl
    )
  )
    throw new Error('publication_provenance_invalid');
  const verified = await verifyGeneration(catalogRoot);
  if (!verified.valid) throw new Error('publication_catalog_invalid');
  const catalog = await read(join(catalogRoot, verified.generation, 'catalog.json'));
  const proof = await verifyInternalValidation({ outDir: runtimeOut, trustedKeyPath });
  const policy = await read(new URL('./registration.json', import.meta.url));
  const bindings = await read(new URL('./reviewed-candidates.json', import.meta.url));
  if (
    bindings.schema !== 'workflow-discovery-reviewed-bindings@1' ||
    Object.keys(bindings).length !== 3 ||
    bindings.registration.registrationId !== policy.id ||
    bindings.registration.policySha256 !== definitionDigest(policy) ||
    proof.registrationSha256 !== definitionDigest(policy)
  )
    throw new Error('publication_registration_mismatch');
  const prior = persist ? await load() : { ledger: null, sha: null, runs: [] };
  const lifecycle = reconcileLifecycle(prior.ledger, catalog, {
    observedAt: new Date().toISOString(),
    reviews: bindings.reviews,
    registration: bindings.registration
  });
  const run = {
    runId: proof.runId,
    registrationId: policy.id,
    sourceCommit,
    observedAt: proof.observedAt,
    status: proof.status === 'completed' ? 'passed' : 'held',
    evidenceSha256: definitionDigest(proof),
    runUrl
  };
  const previous = prior.runs.find((x) => x.runId === run.runId);
  if (previous && definitionDigest(previous) !== definitionDigest(run))
    throw new Error('publication_run_conflict');
  const runs = previous ? prior.runs : [...prior.runs, run].slice(-512);
  const stored = persist ? await save({ ledger: lifecycle, sha: prior.sha, runs }) : null;
  return {
    schema: 'internal-workflow-publication@1',
    persisted: persist,
    stored,
    lifecycle,
    run,
    metrics: {
      activeCandidates: lifecycle.entries.filter((x) => x.status !== 'superseded').length,
      registered: lifecycle.entries.filter((x) => x.status === 'registered').length,
      retainedRuns: runs.length,
      passedRuns: runs.filter((x) => x.status === 'passed').length,
      heldRuns: runs.filter((x) => x.status === 'held').length
    },
    authority: 'descriptive_only'
  };
}
async function main(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--persist') {
      if (flags.persist) throw new Error('usage');
      flags.persist = true;
      continue;
    }
    if (
      !['--catalog-root', '--runtime-out', '--trusted-key', '--commit', '--run-url'].includes(
        args[i]
      ) ||
      !args[i + 1] ||
      flags[args[i]]
    )
      throw new Error('usage');
    flags[args[i]] = args[++i];
  }
  if (Object.keys(flags).filter((x) => x !== 'persist').length !== 5) throw new Error('usage');
  const result = await publishInternalRun({
    catalogRoot: resolve(flags['--catalog-root']),
    runtimeOut: resolve(flags['--runtime-out']),
    trustedKeyPath: resolve(flags['--trusted-key']),
    sourceCommit: flags['--commit'],
    runUrl: flags['--run-url'],
    persist: flags.persist === true
  });
  console.log(
    JSON.stringify({
      schema: result.schema,
      persisted: result.persisted,
      stored: result.stored,
      metrics: result.metrics,
      run: result.run,
      authority: result.authority
    })
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(() => {
    console.error(
      JSON.stringify({
        schema: 'internal-workflow-publication@1',
        status: 'held',
        reason: 'verification_or_state_publication_failed'
      })
    );
    process.exitCode = 1;
  });
