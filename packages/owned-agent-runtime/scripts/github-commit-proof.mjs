#!/usr/bin/env node
// Terminal-owned, read-only production proof. This is not a Control executor.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest,
  planWorkflowRuntimeStep,
  reduceWorkflowRuntimeRun,
  verifyWorkflowRuntimeRun
} from '@createsomething/workflow-runtime';

const repository = 'createsomethingtoday/create-something-monorepo';
const owner = 'createsomethingtoday';
const hash = (value) => 'sha256:' + createHash('sha256').update(value).digest('hex');
const json = (value) => JSON.stringify(value);
const now = () => new Date().toISOString();
async function compiler() {
  // A post-release verifier resolves through a disposable registry consumer.
  const require = createRequire(
    process.env.WORKFLOW_COMPILER_CONSUMER_DIR
      ? join(resolve(process.env.WORKFLOW_COMPILER_CONSUMER_DIR), 'package.json')
      : new URL('../../workflow-compiler/package.json', import.meta.url)
  );
  return import(pathToFileURL(require.resolve('@createsomething/workflow-compiler')).href);
}
function github(endpoint, jq) {
  const result = spawnSync(
    'gh',
    ['api', '--hostname', 'github.com', '--method', 'GET', endpoint, '--jq', jq],
    { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 }
  );
  if (result.status !== 0)
    throw new Error('Authenticated GitHub read failed; no checkpoint completion was recorded.');
  return JSON.parse(result.stdout);
}
function definition(commit) {
  const receipt = { requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome'] };
  const recovery = {
    mode: 'manual_fallback',
    owner,
    path: 'Reconcile the retained attempt; never resend an ambiguous read automatically.'
  };
  return {
    schemaVersion: 'workflow_definition.v0.3',
    workflowId: 'internal.github.commit-observation',
    version: '1.0.0',
    title: 'Verify one repository commit',
    businessObjective:
      'Bind an authenticated read of one owned repository commit to a durable runtime receipt.',
    owners: { workflow: owner, policy: owner, technical: owner },
    systems: [
      {
        id: 'github',
        title: 'Owned repository',
        tier: 'database',
        owningSurface: repository,
        sourceOfTruth: true
      }
    ],
    objects: [],
    events: [],
    actors: [{ id: owner, title: 'Authenticated repository owner' }],
    states: [
      { id: 'ready', title: 'Ready' },
      { id: 'observed', title: 'Observed' },
      { id: 'reviewed', title: 'Reviewed', terminal: true }
    ],
    actions: [
      {
        id: 'read_commit',
        title: 'Read exact commit',
        kind: 'read',
        authority: owner,
        autonomy: 'auto_allow',
        systemsTouched: ['github'],
        requiredEvidence: ['repository', 'commit_sha'],
        requiredEvidenceValues: { repository, commit_sha: commit },
        approval: { required: false },
        receipt,
        recovery,
        tool: {
          name: 'read_commit',
          targetSystemId: 'github',
          parameters: [
            { name: 'repository', type: 'string', description: 'Exact owned repository' },
            { name: 'commit_sha', type: 'string', description: 'Exact immutable commit' }
          ]
        }
      },
      {
        id: 'review_observation',
        title: 'Wait for human review',
        kind: 'decision',
        authority: owner,
        autonomy: 'approval_required',
        systemsTouched: ['github'],
        requiredEvidence: ['observation_receipt'],
        approval: { required: true, owner },
        receipt,
        recovery
      }
    ],
    transitions: [
      { id: 'observe', from: 'ready', to: 'observed', actionId: 'read_commit' },
      { id: 'review', from: 'observed', to: 'reviewed', actionId: 'review_observation' }
    ],
    agents: [],
    evaluations: [
      {
        id: 'read-permitted',
        title: 'Exact commit read is permitted',
        actionId: 'read_commit',
        expectedOutcome: 'pass',
        requiredEvidence: ['repository', 'commit_sha']
      }
    ]
  };
}
async function saveCheckpoint(out, run) {
  const pending = join(out, 'checkpoint.pending');
  await writeFile(pending, json(run), { mode: 0o600 });
  await rename(pending, join(out, 'checkpoint.json'));
}

export async function verifyCommitProof(out, trustedPublicKeyPath) {
  const api = await compiler();
  const publicKey = await readFile(trustedPublicKeyPath);
  const inventory = await api.verifyWorkflowArtifactBundle(join(out, 'artifact'), { publicKey });
  assert.equal(inventory.status, 'verified');
  const manifestBytes = await readFile(join(out, 'artifact/runtime-manifest.json'));
  const manifest = parseWorkflowRuntimeManifest(JSON.parse(manifestBytes));
  const run = JSON.parse(await readFile(join(out, 'checkpoint.json')));
  const { observation, signature } = JSON.parse(await readFile(join(out, 'observation.json')));
  assert.equal(
    verify(null, Buffer.from(json(observation)), publicKey, Buffer.from(signature, 'base64')),
    true,
    'Observation signature mismatch'
  );
  assert.equal(observation.schema, 'github_commit_observation.v1');
  assert.equal(observation.repository, repository);
  assert.equal(observation.subject, owner);
  assert.match(observation.commitSha, /^[a-f0-9]{40}$/);
  assert.equal(observation.response.sha, observation.commitSha);
  assert.match(observation.response.treeSha, /^[a-f0-9]{40}$/);
  assert.equal(observation.transport, 'authenticated-gh-api-get');
  assert.equal(observation.artifactManifestSha256, inventory.manifestHash);
  assert.equal(observation.runtimeManifestSha256, hash(manifestBytes));
  assert.equal(run.artifactManifestSha256, inventory.manifestHash);
  assert.equal(run.runtimeManifestSha256, hash(manifestBytes));
  assert.equal(observation.runId, run.id);
  assert.equal(run.activation.policySha256, observation.policySha256);
  const policy = JSON.parse(await readFile(join(out, 'policy.json')));
  assert.equal(hash(json(policy)), observation.policySha256);
  assert.equal(policy.scope, 'terminal-only');
  assert.equal(policy.owner, owner);
  assert.equal(policy.repository, repository);
  assert.equal(policy.commit, observation.commitSha);
  assert.equal(policy.readOnly, true);
  assert.ok(Date.parse(observation.observedAt) < Date.parse(policy.expiresAt));
  await verifyWorkflowRuntimeRun(manifest, run);
  const receipt = run.receipts.find((entry) => entry.eventType === 'step_succeeded');
  assert.ok(receipt, 'Missing successful read receipt');
  assert.equal(receipt.verifier, 'github-commit:' + hash(json(observation)));
  assert.equal(receipt.attemptId, observation.attemptId);
  assert.equal(receipt.actionId, 'read_commit');
  assert.equal(run.steps.find((step) => step.id === 'observe').attempts.length, 1);
  assert.equal(run.receipts.filter((entry) => entry.eventType === 'effect_intent').length, 1);
  assert.equal(run.receipts.filter((entry) => entry.eventType === 'step_succeeded').length, 1);
  assert.equal(run.status, 'waiting_for_approval');
  const waiting = manifest.steps.find((step) => step.id === 'review');
  assert.equal(waiting.disposition, 'wait');
  assert.equal('capability' in waiting, false);
  assert.equal(run.steps.find((step) => step.id === 'review').attempts.length, 0);
  return {
    ok: true,
    scope: 'terminal-host/local-checkpoint/live-github-read',
    repository,
    commitSha: observation.commitSha,
    runId: run.id,
    attemptId: observation.attemptId,
    receiptId: receipt.id,
    receiptSha256: receipt.receiptSha256,
    artifactManifestSha256: inventory.manifestHash,
    compilerPackageVersion: api.WORKFLOW_COMPILER_PACKAGE_VERSION,
    nextDisposition: 'wait',
    readDispatches: 1,
    restartNetworkCalls: 0
  };
}

async function start(commit, out) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'An exact reviewed commit SHA is required');
  // Refuse reuse before any network access. A crash is a reconciliation stop.
  await mkdir(out, { mode: 0o700 });
  const api = await compiler();
  const workflow = definition(commit);
  const bundle = api.compileWorkflowDefinition(workflow);
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  const projection = api.createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: expiresAt,
    steps: [
      { id: 'observe', actionId: 'read_commit', dependsOn: [] },
      { id: 'review', actionId: 'review_observation', dependsOn: ['observe'] }
    ]
  });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const trustedKey = out + '.trusted-public.pem';
  await writeFile(trustedKey, publicKey.export({ type: 'spki', format: 'pem' }), {
    flag: 'wx',
    mode: 0o600
  });
  await api.writeCompiledWorkflowArtifacts(
    bundle,
    join(out, 'artifact'),
    undefined,
    { privateKey, keyId: 'terminal-owner-proof' },
    projection
  );
  const inventory = await api.verifyWorkflowArtifactBundle(join(out, 'artifact'), { publicKey });
  assert.equal(inventory.status, 'verified');
  const manifestBytes = await readFile(join(out, 'artifact/runtime-manifest.json'));
  const manifest = parseWorkflowRuntimeManifest(JSON.parse(manifestBytes));
  const policy = { scope: 'terminal-only', owner, repository, commit, readOnly: true, expiresAt };
  const policySha256 = hash(json(policy));
  await writeFile(join(out, 'policy.json'), json(policy), { mode: 0o600 });
  const replayCase = {
    caseId: 'observe',
    title: 'Read exact commit',
    initialState: 'ready',
    actionId: 'read_commit',
    actorId: owner,
    evidence: { repository, commit_sha: commit },
    approvals: [],
    expectedOutcome: 'pass',
    expectedState: 'observed'
  };
  const plan = api.createMcpToolCallPlan(bundle, replayCase);
  assert.equal(plan.disposition, 'pass');
  const stale = { ...replayCase, evidence: { repository, commit_sha: '0'.repeat(40) } };
  assert.equal(api.createMcpToolCallPlan(bundle, stale).disposition, 'stop');
  assert.equal(
    api.createMcpToolCallPlan(bundle, { ...replayCase, actorId: 'untrusted-owner' }).disposition,
    'stop'
  );
  const login = github('user', '{login:.login}').login;
  assert.equal(
    login,
    owner,
    'The authenticated repository owner must match the signed workflow authority'
  );
  let run = await createWorkflowRuntimeRun(manifest, {
    runId: 'github-commit-' + policySha256.slice(7),
    activation: { id: 'terminal-owner:' + policySha256, version: 1, policySha256 },
    registration: {
      buildReleaseId: 'workflow-compiler@' + api.WORKFLOW_COMPILER_PACKAGE_VERSION,
      contractSha256: bundle.definitionHash,
      runtimePolicySha256: policySha256
    },
    artifactManifestSha256: inventory.manifestHash,
    runtimeManifestSha256: hash(manifestBytes),
    clock: now()
  });
  const pass = await planWorkflowRuntimeStep(manifest, run);
  assert.equal(pass.type, 'pass');
  assert.equal(pass.capability.id, 'github:read_commit');
  await assert.rejects(() =>
    reduceWorkflowRuntimeRun(manifest, run, {
      type: 'effect_intent',
      stepId: 'observe',
      attemptId: 'invalid',
      capability: { ...pass.capability, parameterDigest: hash('wrong') },
      observedAt: now()
    })
  );
  const attemptId =
    'github-observation:' +
    hash(json({ commit, repository, manifest: inventory.manifestHash })).slice(7);
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'effect_intent',
    stepId: 'observe',
    attemptId,
    capability: pass.capability,
    observedAt: now()
  });
  await saveCheckpoint(out, run);
  assert.ok(Date.now() < Date.parse(expiresAt), 'Terminal policy expired before source invocation');
  // Fixed GET only. No prompts, shell interpolation, retries, writes or customer routes.
  const response = github(
    'repos/' + repository + '/git/commits/' + commit,
    '{sha:.sha,treeSha:.tree.sha}'
  );
  assert.equal(response.sha, commit);
  assert.match(response.treeSha, /^[a-f0-9]{40}$/);
  const observation = {
    schema: 'github_commit_observation.v1',
    repository,
    commitSha: commit,
    subject: login,
    transport: 'authenticated-gh-api-get',
    runId: run.id,
    attemptId,
    policySha256,
    artifactManifestSha256: inventory.manifestHash,
    runtimeManifestSha256: hash(manifestBytes),
    response,
    observedAt: now()
  };
  await writeFile(
    join(out, 'observation.json'),
    json({
      observation,
      signature: sign(null, Buffer.from(json(observation)), privateKey).toString('base64')
    }),
    { flag: 'wx', mode: 0o600 }
  );
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'step_succeeded',
    stepId: 'observe',
    attemptId,
    verifier: 'github-commit:' + hash(json(observation)),
    observedAt: now()
  });
  const wait = await planWorkflowRuntimeStep(manifest, run);
  assert.equal(wait.type, 'wait');
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'wait_created',
    stepId: 'review',
    approval: wait.approval,
    observedAt: now()
  });
  await saveCheckpoint(out, run);
  const proof = await verifyCommitProof(out, trustedKey);
  // An actual separate process reopens the checkpoint; verify mode has no source call.
  const restarted = spawnSync(
    process.execPath,
    [new URL(import.meta.url).pathname, 'verify', out, trustedKey],
    { encoding: 'utf8', timeout: 30000 }
  );
  assert.equal(restarted.status, 0, restarted.stderr);
  assert.deepEqual(JSON.parse(restarted.stdout), proof);
  // Missing receipt, response tamper, or checkpoint corruption must remain stops.
  const altered = structuredClone(run);
  altered.receipts[1].receiptSha256 = hash('changed');
  await assert.rejects(() => verifyWorkflowRuntimeRun(manifest, altered));
  console.log(
    JSON.stringify({
      ...proof,
      negativeChecks: [
        'stale evidence',
        'wrong actor',
        'wrong capability digest',
        'corrupt checkpoint'
      ],
      separateProcessRestart: true,
      trustedPublicKey: trustedKey,
      output: out
    })
  );
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [command, arg, key] = process.argv.slice(2);
  if (command === 'start' && arg && key) await start(arg, resolve(key));
  else if (command === 'verify' && arg && key)
    console.log(JSON.stringify(await verifyCommitProof(resolve(arg), resolve(key))));
  else
    throw new Error(
      'Usage: github-commit-proof.mjs start <exact-commit> <new-output-dir> | verify <output-dir> <trusted-public-key>'
    );
}
