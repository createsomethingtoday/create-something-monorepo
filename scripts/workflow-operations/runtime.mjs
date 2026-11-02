#!/usr/bin/env node
// Fixed, registered internal host. It grants no customer Control authority.
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, lstat, realpath } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileWorkflowDefinition,
  createWorkflowRuntimeManifest,
  writeCompiledWorkflowArtifacts,
  verifyWorkflowArtifactBundle
} from '../../packages/workflow-compiler/dist/index.js';
import {
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest,
  planWorkflowRuntimeStep,
  reduceWorkflowRuntimeRun,
  verifyWorkflowRuntimeRun
} from '../../packages/workflow-runtime/dist/index.js';
import { projectExecutionEvidence } from '../graph-engineering/evidence.mjs';

const registrationPath = new URL('./registration.json', import.meta.url);
const defaultRepo = fileURLToPath(new URL('../../', import.meta.url));
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, canonical(value[k])])
        )
      : value;
const json = (value) => JSON.stringify(canonical(value));
const hash = (value) => 'sha256:' + createHash('sha256').update(value).digest('hex');
const digest = (value) => hash(json(value));
const now = () => new Date().toISOString();
const inside = (root, target) => {
  const rel = relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};
const signed = (payload, privateKey) => ({
  payload,
  signature: sign(null, Buffer.from(json(payload)), privateKey).toString('base64')
});
async function read(path, maximum = 16 * 1024 * 1024) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > maximum)
    throw new Error('runtime_file_boundary');
  const bytes = await readFile(path);
  if (bytes.length > maximum) throw new Error('runtime_file_boundary');
  return bytes;
}
async function parse(path) {
  return JSON.parse(await read(path));
}
async function emit(path, value) {
  await writeFile(path, json(value) + '\n', { flag: 'wx', mode: 0o600 });
}
function verified(envelope, key) {
  assert.equal(
    verify(
      null,
      Buffer.from(json(envelope.payload)),
      key,
      Buffer.from(envelope.signature, 'base64')
    ),
    true,
    'runtime_signature_mismatch'
  );
  return envelope.payload;
}
async function registration() {
  const r = JSON.parse(await read(registrationPath));
  assert.equal(r.schema, 'internal-workflow-registration@1');
  assert.equal(r.owner, 'create-something-engineering');
  assert.equal(r.executable, 'node:current-process');
  assert.deepEqual(r.argv, ['packages/database-layer/scripts/ontology.mjs', 'check']);
  assert.equal(r.timeoutMs, 15000);
  assert.equal(r.maximumOutputBytes, 1048576);
  assert.equal(r.effects, 'read_only_validation');
  assert.equal(r.recovery.maximumCommandRetries, 0);
  assert.equal(r.recovery.maximumDerivedRepairAttempts, 1);
  return r;
}
async function sources(repo, r) {
  for (const source of r.sourceFiles) {
    assert.equal(isAbsolute(source.path), false);
    assert.equal(
      source.path.split('/').some((p) => p === '..'),
      false
    );
    let part = repo;
    for (const segment of source.path.split('/')) {
      part = join(part, segment);
      assert.equal((await lstat(part)).isSymbolicLink(), false, 'runtime_source_symlink');
    }
    assert.equal(
      hash(await read(join(repo, source.path))),
      source.sha256,
      'runtime_source_hash_mismatch'
    );
  }
}
async function save(out, run, registrationSha256, key) {
  const envelope = signed(
    { schema: 'internal-runtime-checkpoint@1', registrationSha256, run },
    key
  );
  await emit(join(out, 'checkpoints', `${run.version}.json`), envelope);
  const pending = join(out, `checkpoint-${randomUUID()}.pending`);
  await emit(pending, envelope);
  await rename(pending, join(out, 'checkpoint.json'));
}
function executeFixed(command, args, options) {
  const result = spawnSync(command, args, options);
  return {
    status: result.status,
    signal: result.signal,
    errorCode: result.error?.code ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  };
}
function reason(run, observation) {
  if (run.status === 'completed') return 'completed';
  if (run.status === 'failed') return 'validation_failed';
  if (run.steps.some((s) => s.attempts.some((a) => a.status === 'prepared')))
    return 'effect_reconciliation_required';
  return observation?.disposition ?? 'runtime_evidence_incomplete';
}
async function artifactFiles(out) {
  const dir = join(out, 'artifact');
  const manifest = await parse(join(dir, 'manifest.json'));
  return Object.fromEntries(
    await Promise.all(
      [...manifest.files.map((f) => f.path), 'manifest.json', 'attestation.json'].map(
        async (path) => [path, await readFile(join(dir, path), 'utf8')]
      )
    )
  );
}
async function base({ outDir, trustedKeyPath }) {
  const out = resolve(outDir);
  assert.equal((await lstat(out)).isSymbolicLink(), false, 'runtime_output_symlink');
  const key = await read(resolve(trustedKeyPath));
  const r = await registration();
  const registered = verified(await parse(join(out, 'registration.json')), key);
  assert.equal(digest(registered), digest(r), 'runtime_registration_mismatch');
  const inventory = await verifyWorkflowArtifactBundle(join(out, 'artifact'), { publicKey: key });
  assert.equal(inventory.status, 'verified');
  const definition = await parse(join(out, 'definition.json'));
  assert.equal(
    hash(await read(join(out, 'definition.json'))),
    r.sourceFiles.find((s) => s.path === r.workflowDefinition).sha256,
    'runtime_definition_bytes_mismatch'
  );
  const bundle = compileWorkflowDefinition(definition);
  assert.equal(bundle.definitionHash, r.definitionHash, 'runtime_definition_hash_mismatch');
  assert.equal(inventory.definitionHash, r.definitionHash);
  const bytes = await readFile(join(out, 'artifact', 'runtime-manifest.json'));
  const manifest = parseWorkflowRuntimeManifest(JSON.parse(bytes));
  const checkpoint = verified(await parse(join(out, 'checkpoint.json')), key);
  assert.equal(checkpoint.schema, 'internal-runtime-checkpoint@1');
  assert.equal(checkpoint.registrationSha256, digest(r));
  const run = checkpoint.run;
  assert.equal(run.artifactManifestSha256, inventory.manifestHash);
  assert.equal(run.runtimeManifestSha256, hash(bytes));
  assert.equal(run.registration.contractSha256, r.definitionHash);
  assert.equal(run.registration.runtimePolicySha256, digest(r));
  assert.equal(run.activation.policySha256, digest(r));
  assert.equal(run.registration.buildReleaseId, r.id);
  await verifyWorkflowRuntimeRun(manifest, run);
  // Every immutable checkpoint must verify, including the pre-invocation intent.
  for (let version = 1; version <= run.version; version++) {
    const prior = verified(await parse(join(out, 'checkpoints', `${version}.json`)), key);
    assert.equal(prior.registrationSha256, digest(r));
    assert.equal(prior.run.version, version);
    assert.equal(prior.run.id, run.id);
    await verifyWorkflowRuntimeRun(manifest, prior.run);
    assert.deepEqual(prior.run.receipts, run.receipts.slice(0, prior.run.receipts.length));
  }
  let observation = null;
  try {
    observation = verified(await parse(join(out, 'observation.json')), key);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (observation) {
    assert.equal(observation.schema, 'internal-validation-observation@1');
    assert.equal(observation.registrationSha256, digest(r));
    assert.equal(observation.runId, run.id);
    assert.deepEqual(observation.sourceFiles, r.sourceFiles);
    assert.deepEqual(observation.argv, r.argv);
    assert.equal(observation.executable, r.executable);
    const attempt = run.steps
      .flatMap((s) => s.attempts)
      .find((a) => a.id === observation.attemptId);
    assert.ok(attempt);
    if (run.status === 'completed') {
      assert.equal(observation.disposition, 'succeeded');
      assert.equal(observation.exitCode, 0);
      assert.ok(
        run.receipts.some(
          (x) => x.eventType === 'step_succeeded' && x.verifier === digest(observation)
        )
      );
    } else if (run.status === 'failed') {
      assert.equal(observation.disposition, 'nonzero');
      assert.ok(
        run.receipts.some(
          (x) => x.eventType === 'attempt_failed' && x.verifier === digest(observation)
        )
      );
    }
  }
  if (['completed', 'failed'].includes(run.status))
    assert.ok(observation, 'runtime_observation_missing');
  return { out, key, r, manifest, run, observation };
}
async function derived(context) {
  const { out, key, r, run, observation } = context;
  const observedAt = observation?.observedAt ?? run.receipts.at(-1).createdAt;
  const input = {
    schemaVersion: 'execution_evidence_input.v0.1',
    scope: r.scope,
    asOf: observedAt,
    maxAgeSeconds: 3600,
    runtime: {
      sourceId: `internal-runtime:${run.id}`,
      evidenceRef: 'checkpoint.json',
      scope: r.scope,
      observedAt,
      freshness: 'current',
      artifactFiles: await artifactFiles(out),
      run
    },
    reviews: [],
    bindings: []
  };
  const graph = await projectExecutionEvidence(input, { trustedPublicKey: key });
  const explanation = {
    schema: 'internal-workflow-explanation@1',
    scope: r.scope,
    scopeProvenance: 'caller_declared_not_authenticated',
    runtimeAuthority: 'internal_registered_actions_host',
    graphAuthority: 'unattested_offline_projection',
    authorization: 'owning_host_required',
    runId: run.id,
    status: run.status,
    reason: reason(run, observation),
    executionOwner: r.owner,
    ownerProvenance: 'registered_host_policy_not_live_linear',
    observedAt,
    freshness: 'current',
    requiredEvidence:
      run.status === 'completed' ? [] : ['operator_reconciliation_of_retained_attempt'],
    registrationSha256: digest(r),
    receiptSha256: run.receipts.at(-1).receiptSha256,
    commandDispatches: run.receipts.filter((x) => x.eventType === 'effect_intent').length,
    automaticCommandRetries: 0,
    customerControlActivation: false
  };
  return { 'graph-input.json': input, 'graph.json': graph, 'explanation.json': explanation };
}
async function writeDerived(out, files, repair = false) {
  for (const [name, value] of Object.entries(files)) {
    if (!repair) await emit(join(out, name), value);
    else {
      const target = join(out, name);
      try {
        assert.equal((await lstat(target)).isSymbolicLink(), false, 'runtime_derived_symlink');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      const tmp = join(out, `${name}-${randomUUID()}.pending`);
      await emit(tmp, value);
      await rename(tmp, target);
    }
  }
}
export async function verifyInternalValidation(options) {
  const context = await base(options);
  const files = await derived(context);
  for (const [name, value] of Object.entries(files))
    assert.equal(
      (await read(join(context.out, name))).toString(),
      json(value) + '\n',
      'runtime_derived_mismatch'
    );
  return { verified: true, ...files['explanation.json'] };
}
export async function explainInternalValidation(options) {
  const context = await base(options);
  assert.equal(digest(options.scope), digest(context.r.scope), 'runtime_scope_denied');
  const result = (await derived(context))['explanation.json'];
  const asOf = options.asOf ?? now();
  assert.equal(new Date(asOf).toISOString(), asOf);
  assert.ok(Date.parse(asOf) >= Date.parse(result.observedAt), 'runtime_observation_in_future');
  if (Date.parse(asOf) - Date.parse(result.observedAt) > 3600000) result.freshness = 'stale';
  return result;
}
export async function repairInternalEvidence(options) {
  const context = await base(options);
  const files = await derived(context);
  let invalid = false;
  for (const [name, value] of Object.entries(files)) {
    try {
      if ((await read(join(context.out, name))).toString() !== json(value) + '\n') invalid = true;
    } catch (error) {
      if (error.code === 'ENOENT') invalid = true;
      else throw error;
    }
  }
  if (invalid) await writeDerived(context.out, files, true);
  const verified = await verifyInternalValidation(options);
  return {
    ...verified,
    repairAttempts: invalid ? 1 : 0,
    repairScope: 'derived_evidence_only',
    commandDispatches: 0
  };
}
export async function runInternalValidation({
  repoRoot = defaultRepo,
  outDir,
  execute = executeFixed
} = {}) {
  const repo = await realpath(repoRoot);
  const out = resolve(outDir);
  const parent = await realpath(dirname(out));
  const physical = join(parent, out.split(/[\\/]/).at(-1));
  assert.equal(
    inside(repo, physical) || inside(physical, repo),
    false,
    'runtime_output_overlaps_source'
  );
  const r = await registration();
  await sources(repo, r);
  const definitionBytes = await read(join(repo, r.workflowDefinition));
  const definition = JSON.parse(definitionBytes);
  const bundle = compileWorkflowDefinition(definition);
  assert.equal(bundle.definitionHash, r.definitionHash, 'runtime_definition_hash_mismatch');
  // Exclusive output allocation precedes key creation, compilation output and effects.
  await mkdir(out, { mode: 0o700 });
  await mkdir(join(out, 'checkpoints'), { mode: 0o700 });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const trustedKeyPath = out + '.trusted-public.pem';
  await writeFile(trustedKeyPath, publicKey.export({ format: 'pem', type: 'spki' }), {
    flag: 'wx',
    mode: 0o600
  });
  await emit(join(out, 'registration.json'), signed(r, privateKey));
  await writeFile(join(out, 'definition.json'), definitionBytes, { flag: 'wx', mode: 0o600 });
  const projection = createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    steps: [{ id: 'validate', actionId: 'validate_contract', dependsOn: [] }]
  });
  await writeCompiledWorkflowArtifacts(
    bundle,
    join(out, 'artifact'),
    undefined,
    { privateKey, keyId: 'internal-actions-ephemeral-host' },
    projection
  );
  const inventory = await verifyWorkflowArtifactBundle(join(out, 'artifact'), { publicKey });
  assert.equal(inventory.status, 'verified');
  const manifestBytes = await readFile(join(out, 'artifact', 'runtime-manifest.json'));
  const manifest = parseWorkflowRuntimeManifest(JSON.parse(manifestBytes));
  let run = await createWorkflowRuntimeRun(manifest, {
    runId: 'internal-contract-' + randomUUID(),
    activation: { id: 'internal-actions:' + digest(r), version: 1, policySha256: digest(r) },
    registration: {
      buildReleaseId: r.id,
      contractSha256: r.definitionHash,
      runtimePolicySha256: digest(r)
    },
    artifactManifestSha256: inventory.manifestHash,
    runtimeManifestSha256: hash(manifestBytes),
    clock: now()
  });
  await save(out, run, digest(r), privateKey);
  const plan = await planWorkflowRuntimeStep(manifest, run);
  assert.equal(plan.type, 'pass');
  assert.equal(plan.capability.id, 'repository:validate_ontology');
  const attemptId = 'validation-' + randomUUID();
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'effect_intent',
    stepId: 'validate',
    attemptId,
    capability: plan.capability,
    observedAt: now()
  });
  await save(out, run, digest(r), privateKey);
  await sources(repo, r);
  let result;
  try {
    result = await execute(process.execPath, [...r.argv], {
      cwd: repo,
      encoding: 'utf8',
      shell: false,
      timeout: r.timeoutMs,
      maxBuffer: r.maximumOutputBytes,
      env: { PATH: process.env.PATH ?? '', LANG: 'C', TZ: 'UTC' }
    });
  } catch {
    result = { status: null, signal: null, errorCode: 'HOST_EXCEPTION', stdout: '', stderr: '' };
  }
  let sourceUnchanged = true;
  try {
    await sources(repo, r);
  } catch {
    sourceUnchanged = false;
  }
  const ambiguous =
    !Number.isInteger(result.status) ||
    result.signal !== null ||
    result.errorCode !== null ||
    !sourceUnchanged;
  const disposition = ambiguous ? 'ambiguous' : result.status === 0 ? 'succeeded' : 'nonzero';
  const observation = {
    schema: 'internal-validation-observation@1',
    runId: run.id,
    attemptId,
    registrationSha256: digest(r),
    sourceFiles: r.sourceFiles,
    executable: r.executable,
    argv: r.argv,
    timeoutMs: r.timeoutMs,
    sourceUnchanged,
    exitCode: Number.isInteger(result.status) ? result.status : null,
    disposition,
    stdoutSha256: hash(result.stdout ?? ''),
    stderrSha256: hash(result.stderr ?? ''),
    observedAt: now()
  };
  await emit(join(out, 'observation.json'), signed(observation, privateKey));
  if (!ambiguous) {
    run = await reduceWorkflowRuntimeRun(
      manifest,
      run,
      disposition === 'succeeded'
        ? {
            type: 'step_succeeded',
            stepId: 'validate',
            attemptId,
            verifier: digest(observation),
            observedAt: observation.observedAt
          }
        : {
            type: 'attempt_failed',
            stepId: 'validate',
            attemptId,
            class: 'terminal',
            verifier: digest(observation),
            failureDigest: digest(observation),
            observedAt: observation.observedAt
          }
    );
    await save(out, run, digest(r), privateKey);
  }
  const context = await base({ outDir: out, trustedKeyPath });
  await writeDerived(out, await derived(context));
  const verified = await verifyInternalValidation({ outDir: out, trustedKeyPath });
  return { ...verified, trustedKeyPath, output: out };
}
if (
  process.argv[1] &&
  (await realpath(resolve(process.argv[1]))) === fileURLToPath(import.meta.url)
) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const flags = new Map();
    for (let i = 0; i < args.length; i += 2) {
      if (
        !['--out', '--repo', '--trusted-key'].includes(args[i]) ||
        !args[i + 1] ||
        flags.has(args[i])
      )
        throw new Error('runtime_usage');
      flags.set(args[i], args[i + 1]);
    }
    if (!flags.has('--out')) throw new Error('runtime_usage');
    let result;
    if (command === 'run' && !flags.has('--trusted-key'))
      result = await runInternalValidation({
        outDir: flags.get('--out'),
        repoRoot: flags.get('--repo')
      });
    else if (
      ['verify', 'reconcile'].includes(command) &&
      flags.size === 2 &&
      flags.has('--trusted-key')
    )
      result = await (command === 'verify' ? verifyInternalValidation : repairInternalEvidence)({
        outDir: flags.get('--out'),
        trustedKeyPath: flags.get('--trusted-key')
      });
    else throw new Error('runtime_usage');
    console.log(JSON.stringify(result));
    if (command === 'run' && result.status !== 'completed') process.exitCode = 2;
  } catch {
    console.error(
      JSON.stringify({
        schema: 'internal-runtime-failure@1',
        status: 'held',
        reason: 'registered_runtime_verification_failed'
      })
    );
    process.exitCode = 1;
  }
}
