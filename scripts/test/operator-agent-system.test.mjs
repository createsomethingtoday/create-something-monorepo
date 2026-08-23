import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const scriptPath = path.join(repoRoot, 'scripts/operator-agent-system.mjs');

function run(command, args, cwd, options = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
    env: options.env ?? process.env,
  });
}

function runAsync(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

function makeWorkspace() {
  const workspace = mkdtempSync(path.join(tmpdir(), 'operator-agent-system-'));
  mkdirSync(path.join(workspace, 'docs/guides'), { recursive: true });
  writeFileSync(path.join(workspace, 'docs/guides/example.md'), '# Example\n\nExisting source fact for grounding.\n');
  run('git', ['init'], workspace);
  run('git', ['add', '.'], workspace);
  run(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'initial'],
    workspace
  );
  return workspace;
}

function makePatternReviewWorkspace() {
  const workspace = mkdtempSync(path.join(tmpdir(), 'operator-agent-pattern-review-'));
  mkdirSync(path.join(workspace, 'docs/guides'), { recursive: true });
  writeFileSync(
    path.join(workspace, 'AGENTS.md'),
    '# Agent Principles\n\nPolicy is an artifact. Work maps through Database, Automation, and Judgment.\n'
  );
  writeFileSync(path.join(workspace, 'docs/README.md'), '# Docs\n\nUse policy artifacts and receipts as source truth.\n');
  writeFileSync(
    path.join(workspace, 'docs/MCP_FIRST_THESIS.md'),
    '# MCP First Thesis\n\nMCP creation is the control layer for CREATE SOMETHING.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/THREE_TIER_FRAMEWORK.md'),
    '# Three Tier Framework\n\nDatabase provides resources. Automation provides tools. Judgment provides prompts and policy.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/guides/OPERATOR_AGENT_SYSTEM.md'),
    '# Operator Agent System\n\nBatch eval measures local executors. Teacher Shadow mode compares local predictions against teacher traces.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/guides/OPERATOR_AGENT_PUBLIC_ACCESS.md'),
    '# Operator Agent Public Access\n\nCloudflare Access protects the public route. The no-write gateway exposes read-only modes.\n'
  );
  writeFileSync(
    path.join(workspace, 'docs/guides/OPERATOR_AGENT_EXTERNAL_PATTERN_MATRIX.md'),
    '# Operator Agent External Pattern Matrix\n\nOpenHands, SWE-agent, Aider, LangGraph, and Codified Context map into the concrete chain: model -> harness -> sandbox/runtime boundary -> repo context -> tool permissions -> evals/tests -> review gate -> memory/update artifact.\n'
  );
  return workspace;
}

function writeCandidate(workspace, candidate) {
  const candidatePath = path.join(workspace, 'candidate.json');
  writeFileSync(candidatePath, `${JSON.stringify({ candidates: [candidate] }, null, 2)}\n`);
  return candidatePath;
}

test('operator-agent patch applies one low-risk docs candidate and writes receipts', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-001',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Add review note',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Exercise the autonomous patch lane.',
    proposedAction: 'Append a bounded operator-agent patch note.',
    validation: ['git diff --check'],
    rollback: 'revert docs/guides/example.md',
    confidence: 0.8,
    patch: {
      type: 'append-markdown',
      content: '## Operator Note\n\nAnchored to `Example`: This bounded append validates the docs patch lane.',
    },
  });

  const result = run(
    'node',
    [
      scriptPath,
      'patch',
      '--candidate-file',
      candidatePath,
      '--candidate-id',
      'candidate-001',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'patched');
  assert.equal(output.passed, true);
  assert.equal(output.validationResults[0].ok, true);
  assert.equal(output.validationResults[0].command, 'git diff --check -- docs/guides/example.md');
  const fileText = readFileSync(path.join(workspace, 'docs/guides/example.md'), 'utf8');
  assert.match(fileText, /## Operator Note/);
  assert.match(fileText, /This bounded append validates the docs patch lane\./);
  assert.equal(output.sourceGate.ok, true);
  assert.ok(output.preReceiptPath);
  assert.ok(output.receiptPath);
});

test('operator-agent capabilities expose only the declared no-write local profile', () => {
  const workspace = makeWorkspace();
  const result = run('node', [scriptPath, 'capabilities', '--json'], workspace);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'capabilities');
  assert.equal(output.passed, true);
  assert.equal(output.profile.id, 'local-readonly');
  assert.equal(output.profile.autonomyLevel, 'A0');
  assert.ok(output.profile.skills.length > 0);
  assert.ok(output.profile.mcpTools.length > 0);
  assert.deepEqual(output.profile.plugins, []);
  assert.equal(output.capabilityGate.ok, true);
  assert.equal(output.mutation.writesPerformed, 0);
});

test('operator-agent capabilities block a declared source outside the repository', () => {
  const workspace = makeWorkspace();
  const manifestPath = path.join(workspace, 'unsafe-capabilities.json');
  writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: 'operator-agent-capabilities.v1',
      defaultProfile: 'local-readonly',
      profiles: [
        {
          id: 'local-readonly',
          autonomyLevel: 'A0',
          skills: [{ id: 'unsafe-source', source: '../outside.md', access: 'read' }],
          mcpTools: ['operator_agent_readiness'],
          plugins: [],
          policy: {
            protectedWrites: 'deny',
            credentials: 'deny',
            destructiveActions: 'deny',
            clientProduction: 'deny',
            externalPluginActivation: 'deny',
          },
        },
      ],
    })
  );

  const result = run('node', [scriptPath, 'capabilities', '--capability-manifest', manifestPath, '--json'], workspace);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.passed, false);
  assert.match(output.capabilityGate.blockers.join('\n'), /source-backed read-only skills/);
});

test('operator-agent model-probe passes when local endpoint returns the required JSON object', async () => {
  const workspace = makeWorkspace();
  const server = createServer((request, response) => {
    assert.equal(request.url, '/v1/chat/completions');
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.equal(JSON.parse(body).think, false);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ready: true,
                  loop: 'operator-agent-system',
                  task: 'model-probe',
                  canReturnJson: true,
                }),
              },
            },
          ],
        })
      );
    });
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'model-probe',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'model-probe');
    assert.equal(output.passed, true);
    assert.equal(output.outcome, 'model-probed');
    assert.equal(output.contractGate.ok, true);
    assert.equal(output.modelResult.parsed.task, 'model-probe');
    assert.ok(output.receiptPath);
  } finally {
    server.close();
  }
});

test('operator-agent model-probe records a bounded contract-repair retry', async () => {
  const workspace = makeWorkspace();
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ready: true,
                loop: 'operator-agent-system',
                task: requests === 1 ? 'wrong-task' : 'model-probe',
                canReturnJson: true,
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [scriptPath, 'model-probe', '--base-url', `http://127.0.0.1:${port}/v1`, '--model', 'fake-model', '--json'],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(requests, 2);
    assert.equal(output.outcome, 'model-probe-repaired');
    assert.equal(output.reliability.disposition, 'repaired');
    assert.equal(output.reliability.attempts.length, 2);
    assert.equal(output.reliability.attempts[0].passed, false);
    assert.equal(output.reliability.attempts[1].passed, true);
  } finally {
    server.close();
  }
});

test('operator-agent model-probe blocks when endpoint returns the wrong JSON contract', async () => {
  const workspace = makeWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ready: true,
                loop: 'operator-agent-system',
                task: 'different-task',
                canReturnJson: true,
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'model-probe',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 1, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'model-probe');
    assert.equal(output.passed, false);
    assert.equal(output.outcome, 'model-probe-blocked');
    assert.equal(output.contractGate.ok, false);
    assert.match(output.contractGate.blockers.join('\n'), /task/);
  } finally {
    server.close();
  }
});

test('operator-agent model-benchmark passes after repeated strict JSON probes', async () => {
  const workspace = makeWorkspace();
  const requestedModels = [];
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      requestedModels.push(JSON.parse(body).model);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ready: true,
                  loop: 'operator-agent-system',
                  task: 'model-probe',
                  canReturnJson: true,
                }),
              },
            },
          ],
        })
      );
    });
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'model-benchmark',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--models',
        'fake-a,fake-b',
        '--attempts',
        '2',
        '--min-pass-rate',
        '1',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'model-benchmark');
    assert.equal(output.outcome, 'model-benchmarked');
    assert.equal(output.passed, true);
    assert.equal(output.models.length, 2);
    assert.equal(output.models[0].passRate, 1);
    assert.equal(output.bestModel.passRate, 1);
    assert.deepEqual(requestedModels.sort(), ['fake-a', 'fake-a', 'fake-b', 'fake-b']);
  } finally {
    server.close();
  }
});

test('operator-agent model-benchmark blocks below the pass-rate threshold', async () => {
  const workspace = makeWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ready: true,
                loop: 'operator-agent-system',
                task: 'wrong-task',
                canReturnJson: true,
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'model-benchmark',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--attempts',
        '2',
        '--min-pass-rate',
        '1',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 1, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'model-benchmark');
    assert.equal(output.outcome, 'model-benchmark-blocked');
    assert.equal(output.passed, false);
    assert.equal(output.models[0].passedCount, 0);
    assert.match(output.models[0].attempts[0].blockers.join('\n'), /task/);
  } finally {
    server.close();
  }
});

test('operator-agent memory-proposal turns recent receipts into no-write durable-context candidates', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, '2026-07-05T21-46-14-model-benchmark.json'),
    `${JSON.stringify(
      {
        generatedAt: '2026-07-05T21:46:14.384Z',
        mode: 'model-benchmark',
        outcome: 'model-benchmarked',
        passed: true,
        bestModel: {
          model: 'ornith:9b',
          passRate: 1,
          averageLatencyMs: 9790,
          maxLatencyMs: 18313,
        },
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    path.join(outDir, '2026-07-05T21-48-15-schedule-once.json'),
    `${JSON.stringify(
      {
        generatedAt: '2026-07-05T21:48:15.865Z',
        mode: 'schedule-once',
        outcome: 'schedule-passed',
        passed: true,
        scorecard: {
          modelHealth: 'ok',
          patternReviewPassed: true,
          modelScoutOk: true,
          writesPerformed: 0,
        },
      },
      null,
      2
    )}\n`
  );

  const result = run(
    'node',
    [scriptPath, 'memory-proposal', '--out-dir', outDir, '--receipt-dir', outDir, '--receipt-limit', '5', '--json'],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'memory-proposal');
  assert.equal(output.outcome, 'memory-proposed');
  assert.equal(output.mutation.writesPerformed, 0);
  assert.equal(output.mutation.memoryStoreMutated, false);
  assert.ok(output.receiptsInspected.length >= 2);
  assert.ok(output.proposals.some((proposal) => proposal.note.includes('ornith:9b')));
  assert.ok(output.proposals.every((proposal) => proposal.writeBack.includes('operator-controlled')));
});

test('operator-agent patch blocks non-doc candidates before writing', () => {
  const workspace = makeWorkspace();
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  writeFileSync(path.join(workspace, 'scripts/example.mjs'), 'console.log("example");\n');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-unsafe',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Change script',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['scripts/example.mjs'],
    why: 'This should be blocked by the first patch slice.',
    proposedAction: 'Edit a script.',
    validation: ['node --check scripts/example.mjs'],
    rollback: 'revert scripts/example.mjs',
    confidence: 0.7,
  });

  const result = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--json'], workspace);

  assert.equal(result.status, 1, result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'blocked');
  assert.ok(output.candidateGate.blockers.some((blocker) => blocker.includes('not allowlisted')));
  assert.equal(readFileSync(path.join(workspace, 'scripts/example.mjs'), 'utf8'), 'console.log("example");\n');
});

test('operator-agent patch applies one allowlisted scripts candidate with node check validation', () => {
  const workspace = makeWorkspace();
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  writeFileSync(path.join(workspace, 'scripts/operator-agent-example.mjs'), 'export const ok = true;\n');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-script',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Mark script patch lane',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['scripts/operator-agent-example.mjs'],
    why: 'Exercise the bounded scripts patch lane.',
    proposedAction: 'Append a reversible marker comment.',
    validation: ['node --check scripts/operator-agent-example.mjs'],
    rollback: 'remove appended marker comment',
    confidence: 0.7,
  });

  const result = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--json'], workspace);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'patched');
  assert.equal(output.passed, true);
  assert.equal(output.validationResults[0].ok, true);
  assert.equal(output.validationResults[0].command, 'node --check scripts/operator-agent-example.mjs');
  const fileText = readFileSync(path.join(workspace, 'scripts/operator-agent-example.mjs'), 'utf8');
  assert.match(fileText, /\/\/ operator-agent-system:patch-note/);
  assert.match(fileText, /candidate: candidate-script/);
});

test('operator-agent patch applies one allowlisted scripts exact-replace candidate with node check validation', () => {
  const workspace = makeWorkspace();
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  writeFileSync(path.join(workspace, 'scripts/operator-agent-example.mjs'), 'export const status = "before";\n');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-script-exact-replace',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Replace one exact script span',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['scripts/operator-agent-example.mjs'],
    why: 'Exercise the bounded scripts code patch lane.',
    proposedAction: 'Replace one exact span and validate the script.',
    validation: ['node --check scripts/operator-agent-example.mjs'],
    rollback: 'replace export const status = "after"; with export const status = "before";',
    confidence: 0.74,
    patch: {
      type: 'exact-replace',
      search: 'export const status = "before";',
      replace: 'export const status = "after";',
    },
  });

  const result = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--json'], workspace);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'patched');
  assert.equal(output.passed, true);
  assert.equal(output.validationResults[0].ok, true);
  assert.equal(output.patchResult.note, 'Applied exact-replace patch to scripts/operator-agent-example.mjs.');
  const fileText = readFileSync(path.join(workspace, 'scripts/operator-agent-example.mjs'), 'utf8');
  assert.equal(fileText, 'export const status = "after";\n');
});

test('operator-agent complete carries one bounded candidate to a verified terminal state', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  const targetFile = path.join(workspace, 'scripts/operator-agent-example.mjs');
  writeFileSync(targetFile, 'export const status = "before";\n');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-complete-local',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Complete one bounded script task',
    risk: 'low',
    autonomyLevel: 'A1',
    files: ['scripts/operator-agent-example.mjs'],
    why: 'Prove Ornith can carry a bounded work item to a verified terminal state.',
    proposedAction: 'Replace one exact span and finish without an operator chaining commands.',
    validation: ['node --check scripts/operator-agent-example.mjs'],
    rollback: 'restore the pre-run file snapshot',
    confidence: 0.9,
    patch: {
      type: 'exact-replace',
      search: 'export const status = "before";',
      replace: 'export const status = "complete";',
    },
  });

  const result = run(
    'node',
    [
      scriptPath,
      'complete',
      '--candidate-file',
      candidatePath,
      '--candidate-id',
      'candidate-complete-local',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'complete');
  assert.equal(output.autonomyLevel, 'A1');
  assert.equal(output.terminalState, 'completed');
  assert.equal(output.outcome, 'completed-local');
  assert.equal(output.passed, true);
  assert.equal(output.stages.preflight.outcome, 'dry-run');
  assert.equal(output.stages.action.outcome, 'patched');
  assert.equal(output.stages.action.passed, true);
  assert.equal(readFileSync(targetFile, 'utf8'), 'export const status = "complete";\n');
  assert.ok(output.receiptPath);
});

test('operator-agent complete automatically restores and verifies the source snapshot after failed validation', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  const targetFile = path.join(workspace, 'scripts/operator-agent-example.mjs');
  const beforeText = 'export const status = "before";\n';
  writeFileSync(targetFile, beforeText);
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-complete-rollback',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Rollback a failed bounded script task',
    risk: 'low',
    autonomyLevel: 'A1',
    files: ['scripts/operator-agent-example.mjs'],
    why: 'Prove failed verification cannot leave the worktree broken.',
    proposedAction: 'Apply an invalid exact replacement so the completion loop must restore the snapshot.',
    validation: ['node --check scripts/operator-agent-example.mjs'],
    rollback: 'restore the pre-run file snapshot and rerun validation',
    confidence: 0.9,
    patch: {
      type: 'exact-replace',
      search: 'export const status = "before";',
      replace: 'export const status = ;',
    },
  });

  const result = run(
    'node',
    [scriptPath, 'complete', '--candidate-file', candidatePath, '--out-dir', outDir, '--json'],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.terminalState, 'rolled-back');
  assert.equal(output.outcome, 'validation-failed-rolled-back');
  assert.equal(output.passed, true);
  assert.equal(output.stages.action.outcome, 'validation-failed');
  assert.equal(output.stages.rollback.hashRestored, true);
  assert.equal(output.stages.rollback.validation.every((entry) => entry.ok), true);
  assert.equal(readFileSync(targetFile, 'utf8'), beforeText);
});

test('operator-agent complete escalates A4 client production work before mutation', () => {
  const workspace = makeWorkspace();
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  const targetFile = path.join(workspace, 'scripts/operator-agent-example.mjs');
  const beforeText = 'export const status = "before";\n';
  writeFileSync(targetFile, beforeText);
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-complete-a4',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Attempt protected client production work',
    risk: 'low',
    autonomyLevel: 'A1',
    files: ['scripts/operator-agent-example.mjs'],
    why: 'Prove the completion loop preserves the A4 boundary.',
    proposedAction: 'Change one exact local span before client promotion.',
    validation: ['node --check scripts/operator-agent-example.mjs'],
    rollback: 'restore the pre-run file snapshot',
    confidence: 0.9,
    patch: {
      type: 'exact-replace',
      search: 'export const status = "before";',
      replace: 'export const status = "client";',
    },
  });

  const result = run(
    'node',
    [
      scriptPath,
      'complete',
      '--candidate-file',
      candidatePath,
      '--target',
      'client-production',
      '--json',
    ],
    workspace
  );

  assert.equal(result.status, 1, result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.terminalState, 'escalated');
  assert.equal(output.outcome, 'escalated-a4');
  assert.equal(output.escalation.autonomyLevel, 'A4');
  assert.match(output.escalation.blockers.join('\n'), /Client production/);
  assert.equal(output.stages.action, undefined);
  assert.equal(readFileSync(targetFile, 'utf8'), beforeText);
});

test('operator-agent complete accepts a task and autonomously selects a gate-passing candidate', async () => {
  const workspace = makeWorkspace();
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const payload = JSON.parse(body);
      assert.match(payload.messages.at(-1).content, /Task: Add a concrete completion note/);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    id: 'candidate-task-complete',
                    profile: 'docs',
                    surface: 'docs/guides',
                    title: 'Add a concrete completion note',
                    risk: 'low',
                    autonomyLevel: 'A1',
                    files: ['docs/guides/example.md'],
                    why: 'Carry the supplied task through the bounded docs lane.',
                    proposedAction: 'Append one source-grounded completion note.',
                    validation: ['git diff --check'],
                    rollback: 'remove the appended completion note',
                    confidence: 0.92,
                    patch: {
                      type: 'append-markdown',
                      content:
                        '## Completion Note\n\nFor `docs/guides/example.md`, the `Example` workflow now records a verified terminal state.',
                    },
                  },
                ]),
              },
            },
          ],
        })
      );
    });
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'complete',
        '--task',
        'Add a concrete completion note',
        '--surface',
        'docs/guides',
        '--limit',
        '1',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-ornith',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.terminalState, 'completed');
    assert.equal(output.candidate.id, 'candidate-task-complete');
    assert.equal(output.selection.source, 'scout');
    assert.equal(output.selection.task, 'Add a concrete completion note');
    assert.match(readFileSync(path.join(workspace, 'docs/guides/example.md'), 'utf8'), /## Completion Note/);
  } finally {
    server.close();
  }
});

test('operator-agent complete promotes internal production work and auto-rolls back a failed smoke', () => {
  const workspace = makeWorkspace();
  const remote = mkdtempSync(path.join(tmpdir(), 'operator-agent-remote-'));
  const outDir = path.join(workspace, '.receipts');
  mkdirSync(path.join(workspace, 'scripts'), { recursive: true });
  run('git', ['init', '--bare'], remote);
  run('git', ['checkout', '-b', 'codex/ornith-promotion-fixture'], workspace);
  run('git', ['remote', 'add', 'origin', remote], workspace);
  run('git', ['config', 'user.name', 'Ornith Test'], workspace);
  run('git', ['config', 'user.email', 'ornith@example.com'], workspace);

  const targetFile = path.join(workspace, 'scripts/operator-agent-example.mjs');
  writeFileSync(targetFile, 'export const status = "before";\n');
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-deploy-fixture.mjs'),
    "import fs from 'node:fs'; fs.writeFileSync('.deploy-state', 'deployed\\n');\n"
  );
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-promote-fixture.mjs'),
    "process.stdout.write('review gate passed\\n');\n"
  );
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-smoke-fixture.mjs'),
    "import fs from 'node:fs'; process.exit(fs.readFileSync('.deploy-state', 'utf8').trim() === 'healthy' ? 0 : 1);\n"
  );
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-rollback-fixture.mjs'),
    "import fs from 'node:fs'; fs.writeFileSync('.deploy-state', 'rolled-back\\n');\n"
  );
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-rollback-smoke-fixture.mjs'),
    "import fs from 'node:fs'; process.exit(fs.readFileSync('.deploy-state', 'utf8').trim() === 'rolled-back' ? 0 : 1);\n"
  );
  run('git', ['add', 'scripts'], workspace);
  run(
    'git',
    ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'promotion fixture'],
    workspace
  );

  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-complete-production',
    profile: 'scripts',
    surface: 'scripts',
    title: 'Promote one bounded internal production task',
    risk: 'low',
    autonomyLevel: 'A1',
    files: ['scripts/operator-agent-example.mjs'],
    why: 'Prove the A3 promotion and auto-rollback lifecycle.',
    proposedAction: 'Replace one exact span, promote it, deploy it, and verify production.',
    validation: ['node --check scripts/operator-agent-example.mjs'],
    rollback: 'run the recorded rollback and rollback smoke commands',
    confidence: 0.93,
    patch: {
      type: 'exact-replace',
      search: 'export const status = "before";',
      replace: 'export const status = "production";',
    },
  });
  const promotionPath = path.join(workspace, 'promotion.json');
  writeFileSync(
    promotionPath,
    `${JSON.stringify(
      {
        schemaVersion: 'operator-agent-promotion.v1',
        linearIssue: 'CRE-1153',
        target: 'create-something-internal-production',
        risk: 'low',
        branch: 'codex/ornith-promotion-fixture',
        remote: 'origin',
        commitMessage: 'CRE-1153 complete bounded Ornith production fixture',
        stages: {
          promote: [['node', 'scripts/operator-agent-promote-fixture.mjs']],
          deploy: [['node', 'scripts/operator-agent-deploy-fixture.mjs']],
          smoke: [['node', 'scripts/operator-agent-smoke-fixture.mjs']],
          rollback: [['node', 'scripts/operator-agent-rollback-fixture.mjs']],
          rollbackSmoke: [['node', 'scripts/operator-agent-rollback-smoke-fixture.mjs']],
        },
      },
      null,
      2
    )}\n`
  );

  const result = run(
    'node',
    [
      scriptPath,
      'complete',
      '--candidate-file',
      candidatePath,
      '--target',
      'create-something-internal-production',
      '--promotion-file',
      promotionPath,
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.autonomyLevel, 'A3');
  assert.equal(output.terminalState, 'rolled-back');
  assert.equal(output.outcome, 'production-smoke-failed-rolled-back');
  assert.equal(output.passed, true);
  assert.equal(output.stages.commit.ok, true);
  assert.equal(output.stages.push.ok, true);
  assert.equal(output.stages.promote.every((entry) => entry.ok), true);
  assert.equal(output.stages.deploy.every((entry) => entry.ok), true);
  assert.equal(output.stages.smoke.some((entry) => !entry.ok), true);
  assert.equal(output.stages.productionRollback.every((entry) => entry.ok), true);
  assert.equal(output.stages.rollbackSmoke.every((entry) => entry.ok), true);
  assert.equal(readFileSync(path.join(workspace, '.deploy-state'), 'utf8'), 'rolled-back\n');
  const pushed = run('git', ['show', 'refs/heads/codex/ornith-promotion-fixture:scripts/operator-agent-example.mjs'], remote);
  assert.equal(pushed.status, 0, pushed.stderr);
  assert.equal(pushed.stdout, 'export const status = "production";\n');
});

test('operator-agent rollback-proof applies and restores one exact-replace candidate pair', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  mkdirSync(path.join(workspace, 'scripts/test'), { recursive: true });
  const testFile = path.join(workspace, 'scripts/test/operator-agent-example.test.mjs');
  const beforeText = [
    "import assert from 'node:assert/strict';",
    "import test from 'node:test';",
    '',
    "test('rollback proof before', () => {",
    '  assert.equal(1 + 1, 2);',
    '});',
    '',
  ].join('\n');
  writeFileSync(testFile, beforeText);
  const forwardPath = writeCandidate(workspace, {
    id: 'candidate-forward-rollback-proof',
    profile: 'tests',
    surface: 'scripts/test',
    title: 'Forward rollback proof',
    risk: 'low',
    autonomyLevel: 'A1',
    files: ['scripts/test/operator-agent-example.test.mjs'],
    why: 'Exercise rollback-proof mode with a reversible exact replacement.',
    proposedAction: 'Change one unique test title span.',
    validation: ['node --test scripts/test/operator-agent-example.test.mjs'],
    rollback: 'Run candidate-rollback-proof to restore the original test title.',
    confidence: 0.82,
    patch: {
      type: 'exact-replace',
      search: 'rollback proof before',
      replace: 'rollback proof after',
    },
  });
  const rollbackPath = path.join(workspace, 'rollback-candidate.json');
  writeFileSync(
    rollbackPath,
    `${JSON.stringify(
      {
        candidates: [
          {
            id: 'candidate-rollback-proof',
            profile: 'tests',
            surface: 'scripts/test',
            title: 'Rollback rollback proof',
            risk: 'low',
            autonomyLevel: 'A1',
            files: ['scripts/test/operator-agent-example.test.mjs'],
            why: 'Restore the forward exact replacement through the harness.',
            proposedAction: 'Restore the original unique test title span.',
            validation: ['node --test scripts/test/operator-agent-example.test.mjs'],
            rollback: 'Run candidate-forward-rollback-proof if the rollback must be reverted.',
            confidence: 0.82,
            patch: {
              type: 'exact-replace',
              search: 'rollback proof after',
              replace: 'rollback proof before',
            },
          },
        ],
      },
      null,
      2
    )}\n`
  );

  const result = run(
    'node',
    [
      scriptPath,
      'rollback-proof',
      '--candidate-file',
      forwardPath,
      '--candidate-id',
      'candidate-forward-rollback-proof',
      '--rollback-candidate-file',
      rollbackPath,
      '--rollback-candidate-id',
      'candidate-rollback-proof',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'rollback-proven');
  assert.equal(output.passed, true);
  assert.equal(output.hashRestored, true);
  assert.equal(output.stages.forwardDryRun.outcome, 'dry-run');
  assert.equal(output.stages.forwardActual.outcome, 'patched');
  assert.equal(output.stages.rollbackDryRun.outcome, 'dry-run');
  assert.equal(output.stages.rollbackActual.outcome, 'patched');
  assert.equal(readFileSync(testFile, 'utf8'), beforeText);
  assert.ok(output.receipts.forwardActual);
  assert.ok(output.receipts.rollbackActual);
});

test('operator-agent patch requires rollback-proof receipt for A2 local exact-replace candidates', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  mkdirSync(path.join(workspace, 'scripts/test'), { recursive: true });
  const testFile = path.join(workspace, 'scripts/test/operator-agent-a2.test.mjs');
  writeFileSync(
    testFile,
    [
      "import assert from 'node:assert/strict';",
      "import test from 'node:test';",
      '',
      "test('a2 before', () => {",
      '  assert.equal(2 + 2, 4);',
      '});',
      '',
    ].join('\n')
  );
  const candidate = {
    id: 'candidate-a2-proof-required',
    profile: 'tests',
    surface: 'scripts/test',
    title: 'A2 proof-gated patch',
    risk: 'low',
    autonomyLevel: 'A2',
    files: ['scripts/test/operator-agent-a2.test.mjs'],
    why: 'Require rollback proof before A2 local code writes.',
    proposedAction: 'Change one unique test title span.',
    validation: ['node --test scripts/test/operator-agent-a2.test.mjs'],
    rollback: 'Run candidate-a2-proof-required-rollback to restore the title.',
    confidence: 0.83,
    patch: {
      type: 'exact-replace',
      search: 'a2 before',
      replace: 'a2 after',
    },
  };
  const candidatePath = writeCandidate(workspace, candidate);
  const rollbackPath = path.join(workspace, 'rollback-candidate.json');
  writeFileSync(
    rollbackPath,
    `${JSON.stringify(
      {
        candidates: [
          {
            ...candidate,
            id: 'candidate-a2-proof-required-rollback',
            title: 'A2 proof-gated rollback',
            proposedAction: 'Restore the original unique test title span.',
            rollback: 'Run candidate-a2-proof-required if the rollback must be reverted.',
            patch: {
              type: 'exact-replace',
              search: 'a2 after',
              replace: 'a2 before',
            },
          },
        ],
      },
      null,
      2
    )}\n`
  );

  const blocked = run(
    'node',
    [scriptPath, 'patch', '--candidate-file', candidatePath, '--candidate-id', candidate.id, '--out-dir', outDir, '--json'],
    workspace
  );

  assert.equal(blocked.status, 1, blocked.stdout);
  const blockedOutput = JSON.parse(blocked.stdout);
  assert.equal(blockedOutput.outcome, 'blocked');
  assert.ok(blockedOutput.candidateGate.blockers.some((blocker) => blocker.includes('A2 local code patches require rollback-proof')));

  const proof = run(
    'node',
    [
      scriptPath,
      'rollback-proof',
      '--candidate-file',
      candidatePath,
      '--candidate-id',
      candidate.id,
      '--rollback-candidate-file',
      rollbackPath,
      '--rollback-candidate-id',
      'candidate-a2-proof-required-rollback',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(proof.status, 0, proof.stderr || proof.stdout);
  const proofOutput = JSON.parse(proof.stdout);
  assert.equal(proofOutput.outcome, 'rollback-proven');
  assert.equal(proofOutput.hashRestored, true);

  const allowed = run(
    'node',
    [
      scriptPath,
      'patch',
      '--candidate-file',
      candidatePath,
      '--candidate-id',
      candidate.id,
      '--rollback-proof-receipt',
      proofOutput.receiptPath,
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
  const allowedOutput = JSON.parse(allowed.stdout);
  assert.equal(allowedOutput.outcome, 'patched');
  assert.equal(allowedOutput.candidateGate.rollbackProof.ok, true);
  assert.equal(readFileSync(testFile, 'utf8').includes("test('a2 after'"), true);
});

test('operator-agent patch blocks low-quality append content before writing', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-low-quality',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Add questionable checklist',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Model-generated candidate with a questionable command.',
    proposedAction: 'append-markdown',
    validation: ['git diff --check'],
    rollback: 'remove appended checklist',
    confidence: 0.9,
    patch: {
      type: 'append-markdown',
      content:
        '## Pre-Deploy Verification Checklist\n\nRun `git checkout POLICY_OS_GATING_DEPLOY_CHECKLIST_2026-03-09.md` before deploy.',
    },
  });

  const dryRun = run(
    'node',
    [
      scriptPath,
      'patch',
      '--candidate-file',
      candidatePath,
      '--candidate-id',
      'candidate-low-quality',
      '--dry-run',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const dryRunOutput = JSON.parse(dryRun.stdout);
  assert.equal(dryRunOutput.outcome, 'dry-run');
  assert.equal(dryRunOutput.contentGate.ok, false);
  assert.match(dryRunOutput.contentGate.blockers[0], /git checkout/);

  const write = run(
    'node',
    [
      scriptPath,
      'patch',
      '--candidate-file',
      candidatePath,
      '--candidate-id',
      'candidate-low-quality',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(write.status, 1, write.stdout);
  const writeOutput = JSON.parse(write.stdout);
  assert.equal(writeOutput.outcome, 'content-blocked');
  assert.equal(readFileSync(path.join(workspace, 'docs/guides/example.md'), 'utf8'), '# Example\n\nExisting source fact for grounding.\n');
});

test('operator-agent patch blocks ungrounded append content before writing', () => {
  const workspace = makeWorkspace();
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-ungrounded',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Add generic note',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Generic content should not write without source grounding.',
    proposedAction: 'append-markdown',
    validation: ['git diff --check'],
    rollback: 'remove appended note',
    confidence: 0.8,
    patch: {
      type: 'append-markdown',
      content: '## Operator Note\n\nTarget file: `docs/guides/example.md`\n\nThis note does not cite existing source content.',
    },
  });

  const result = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--json'], workspace);

  assert.equal(result.status, 1, result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'source-blocked');
  assert.equal(output.sourceGate.ok, false);
  assert.match(output.sourceGate.blockers[0], /existing heading or source line/);
  assert.equal(readFileSync(path.join(workspace, 'docs/guides/example.md'), 'utf8'), '# Example\n\nExisting source fact for grounding.\n');
});

test('operator-agent patch blocks redundant append content before writing', () => {
  const workspace = makeWorkspace();
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-redundant',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Repeat existing note',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Repeating existing source text should not write.',
    proposedAction: 'append-markdown',
    validation: ['git diff --check'],
    rollback: 'remove appended note',
    confidence: 0.8,
    patch: {
      type: 'append-markdown',
      content:
        '## Operator Note\n\n- Target file: `docs/guides/example.md`\n- Anchored to heading: `Example`\n- Existing source fact for grounding.',
    },
  });

  const dryRun = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--dry-run', '--json'], workspace);

  assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
  const dryRunOutput = JSON.parse(dryRun.stdout);
  assert.equal(dryRunOutput.outcome, 'dry-run');
  assert.equal(dryRunOutput.sourceGate.ok, true);
  assert.equal(dryRunOutput.usefulnessGate.ok, false);
  assert.match(dryRunOutput.usefulnessGate.blockers[0], /repeats existing source/);

  const write = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--json'], workspace);

  assert.equal(write.status, 1, write.stdout);
  const writeOutput = JSON.parse(write.stdout);
  assert.equal(writeOutput.outcome, 'usefulness-blocked');
  assert.equal(readFileSync(path.join(workspace, 'docs/guides/example.md'), 'utf8'), '# Example\n\nExisting source fact for grounding.\n');
});

test('operator-agent patch blocks generic operator-review append content before writing', () => {
  const workspace = makeWorkspace();
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-generic-review',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Add generic review note',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Generic fallback content should not write.',
    proposedAction: 'append-markdown',
    validation: ['git diff --check'],
    rollback: 'remove appended note',
    confidence: 0.8,
    patch: {
      type: 'append-markdown',
      content:
        '## Operator Review Note\n\n- Target file: `docs/guides/example.md`\n- Anchored to heading: `Example`\n- Review the existing guide before promoting this candidate.\n- Keep rollback to removing this appended section.',
    },
  });

  const result = run('node', [scriptPath, 'patch', '--candidate-file', candidatePath, '--json'], workspace);

  assert.equal(result.status, 1, result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.outcome, 'usefulness-blocked');
  assert.equal(output.usefulnessGate.ok, false);
  assert.match(output.usefulnessGate.blockers[0], /generic operator-review/);
});

test('operator-agent revise repairs a content-blocked append candidate with stable lineage', async () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-revise',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Repair questionable checklist',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Model-generated candidate with a questionable command.',
    proposedAction: 'append-markdown',
    validation: ['git diff --check'],
    rollback: 'remove appended checklist',
    confidence: 0.9,
    patch: {
      type: 'append-markdown',
      content: '## Quick Start\n\nRun `git checkout docs/guides/example.md` before deploy.',
    },
  });
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                patch: {
                  type: 'append-markdown',
                  content:
                    '## Operator Review Note\n\n- Target file: `docs/guides/example.md`\n- Anchored to heading: `Example`\n- Add an acceptance note for future operator-agent patch candidates.',
                },
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const revise = await runAsync(
      'node',
      [
        scriptPath,
        'revise',
        '--candidate-file',
        candidatePath,
        '--candidate-id',
        'candidate-revise',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--out-dir',
        outDir,
        '--json',
      ],
      workspace
    );

    assert.equal(revise.status, 0, revise.stderr || revise.stdout);
    const reviseOutput = JSON.parse(revise.stdout);
    assert.equal(reviseOutput.originalContentGate.ok, false);
    assert.equal(reviseOutput.revisedContentGate.ok, true);
    assert.equal(reviseOutput.comparison.blockersResolved, true);
    assert.equal(reviseOutput.candidates[0].id, 'candidate-revise-rev1');
    assert.equal(reviseOutput.candidates[0].revisionRootId, 'candidate-revise');
    assert.equal(reviseOutput.candidates[0].parentCandidateId, 'candidate-revise');
    assert.equal(reviseOutput.candidates[0].revisionDepth, 1);
    assert.deepEqual(reviseOutput.revisionLineage, {
      rootId: 'candidate-revise',
      parentId: 'candidate-revise',
      previousDepth: 0,
      nextDepth: 1,
      maxDepth: 3,
      nextId: 'candidate-revise-rev1',
      ok: true,
      blockers: [],
    });

    const patch = run(
      'node',
      [
        scriptPath,
        'patch',
        '--candidate-file',
        reviseOutput.receiptPath,
        '--candidate-id',
        'candidate-revise-rev1',
        '--dry-run',
        '--json',
      ],
      workspace
    );

    assert.equal(patch.status, 0, patch.stderr || patch.stdout);
    const patchOutput = JSON.parse(patch.stdout);
    assert.equal(patchOutput.contentGate.ok, true);
    assert.equal(patchOutput.sourceGate.ok, true);
    assert.equal(patchOutput.usefulnessGate.ok, true);
    assert.equal(patchOutput.outcome, 'dry-run');
  } finally {
    server.close();
  }
});

test('operator-agent revise caps repeated revision chains before model calls', async () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const candidatePath = writeCandidate(workspace, {
    id: 'candidate-loop-revised-revised-revised',
    profile: 'docs',
    surface: 'docs/guides',
    title: 'Repair questionable checklist (revised) (revised)',
    risk: 'low',
    autonomyLevel: 'A0',
    files: ['docs/guides/example.md'],
    why: 'Model-generated candidate with a questionable command. Revised to satisfy operator-agent content quality gates.',
    proposedAction: 'append-markdown',
    validation: ['git diff --check'],
    rollback: 'remove appended checklist',
    confidence: 0.9,
    patch: {
      type: 'append-markdown',
      content: '## Quick Start\n\nRun `git checkout docs/guides/example.md` before deploy.',
    },
  });
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'revise should not call model after max depth' }));
  });

  try {
    const port = await listen(server);
    const revise = await runAsync(
      'node',
      [
        scriptPath,
        'revise',
        '--candidate-file',
        candidatePath,
        '--candidate-id',
        'candidate-loop-revised-revised-revised',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--out-dir',
        outDir,
        '--json',
      ],
      workspace
    );

    assert.equal(revise.status, 1, revise.stdout);
    const output = JSON.parse(revise.stdout);
    assert.equal(output.outcome, 'revision-depth-blocked');
    assert.equal(output.passed, false);
    assert.equal(output.revisionLineage.rootId, 'candidate-loop');
    assert.equal(output.revisionLineage.previousDepth, 3);
    assert.equal(output.revisionLineage.nextDepth, 4);
    assert.equal(output.revisionLineage.ok, false);
    assert.match(output.revisionLineage.blockers[0], /maximum revision depth/);
    assert.equal(output.revisionModel, null);
  } finally {
    server.close();
  }
});

test('operator-agent batch-eval scores scout patch and revise without writing files', async () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  let requestCount = 0;
  const server = createServer((request, response) => {
    requestCount += 1;
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    if (requestCount === 1) {
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    id: 'batch-candidate',
                    profile: 'docs',
                    surface: 'docs/guides',
                    title: 'Repair questionable checklist',
                    risk: 'low',
                    autonomyLevel: 'A0',
                    files: ['docs/guides/example.md'],
                    why: 'Batch eval should measure gate failures.',
                    proposedAction: 'append-markdown',
                    validation: ['git diff --check'],
                    rollback: 'remove appended checklist',
                    confidence: 0.9,
                    patch: {
                      type: 'append-markdown',
                      content: '## Quick Start\n\nRun `git checkout docs/guides/example.md` before deploy.',
                    },
                  },
                ]),
              },
            },
          ],
        })
      );
      return;
    }

    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                patch: {
                  type: 'append-markdown',
                  content:
                    '## Operator Review Note\n\n- Target file: `docs/guides/example.md`\n- Anchored to heading: `Example`\n- Add a batch-eval acceptance note for repaired docs candidates.',
                },
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const batch = await runAsync(
      'node',
      [
        scriptPath,
        'batch-eval',
        '--surface',
        'docs/guides',
        '--limit',
        '1',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--out-dir',
        outDir,
        '--json',
      ],
      workspace
    );

    assert.equal(batch.status, 0, batch.stderr || batch.stdout);
    const output = JSON.parse(batch.stdout);
    assert.equal(output.mode, 'batch-eval');
    assert.equal(output.outcome, 'evaluated');
    assert.equal(output.passed, true);
    assert.equal(output.scorecard.candidatesProposed, 1);
    assert.equal(output.scorecard.dryRunPatchAttempts, 1);
    assert.equal(output.scorecard.initialWritesAllowed, 0);
    assert.equal(output.scorecard.initialGateFailures.content, 1);
    assert.equal(output.scorecard.revisionsAttempted, 1);
    assert.equal(output.scorecard.revisionsPassed, 1);
    assert.equal(output.scorecard.postRevisionDryRunAttempts, 1);
    assert.equal(output.scorecard.postRevisionWritesAllowed, 1);
    assert.equal(output.scorecard.writesPerformed, 0);
    assert.equal(output.runs[0].candidateId, 'batch-candidate');
    assert.equal(output.runs[0].initialPatch.contentGate.ok, false);
    assert.equal(output.runs[0].revision.outcome, 'revised');
    assert.equal(output.runs[0].revisedPatch.usefulnessGate.ok, true);
    assert.equal(readFileSync(path.join(workspace, 'docs/guides/example.md'), 'utf8'), '# Example\n\nExisting source fact for grounding.\n');
    assert.equal(requestCount, 2);
  } finally {
    server.close();
  }
});

test('operator-agent scout emits a patchable docs append candidate', () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const scout = run(
    'node',
    [
      scriptPath,
      'scout',
      '--surface',
      'docs/guides',
      '--limit',
      '1',
      '--no-model',
      '--out-dir',
      outDir,
      '--json',
    ],
    workspace
  );

  assert.equal(scout.status, 0, scout.stderr || scout.stdout);
  const scoutOutput = JSON.parse(scout.stdout);
  assert.equal(scoutOutput.candidates.length, 1);
  assert.equal(scoutOutput.candidates[0].patch.type, 'append-markdown');
  assert.match(scoutOutput.candidates[0].patch.content, /## Operator Agent Candidate/);
  assert.match(scoutOutput.candidates[0].patch.content, /Example/);
  assert.equal(scoutOutput.candidates[0].validation[0], 'git diff --check');

  const patch = run(
    'node',
    [
      scriptPath,
      'patch',
      '--candidate-file',
      scoutOutput.receiptPath,
      '--candidate-id',
      scoutOutput.candidates[0].id,
      '--dry-run',
      '--json',
    ],
    workspace
  );

  assert.equal(patch.status, 0, patch.stderr || patch.stdout);
  const patchOutput = JSON.parse(patch.stdout);
  assert.equal(patchOutput.outcome, 'dry-run');
  assert.equal(patchOutput.candidateGate.ok, true);
  assert.equal(patchOutput.sourceGate.ok, true);
  assert.equal(patchOutput.usefulnessGate.ok, true);
});

test('operator-agent scout records model parse failure before deterministic fallback', async () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '[{ "id": "bad-model-output", "profile": "docs"',
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const scout = await runAsync(
      'node',
      [
        scriptPath,
        'scout',
        '--surface',
        'docs/guides',
        '--limit',
        '1',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--out-dir',
        outDir,
        '--json',
      ],
      workspace
    );

    assert.equal(scout.status, 0, scout.stderr || scout.stdout);
    const output = JSON.parse(scout.stdout);
    assert.equal(output.modelResult.ok, false);
    assert.match(output.modelResult.error, /complete JSON array/);
    assert.equal(output.candidates[0].patch.type, 'append-markdown');
  } finally {
    server.close();
  }
});

test('operator-agent scout normalizes patchable model candidates', async () => {
  const workspace = makeWorkspace();
  const outDir = path.join(workspace, '.receipts');
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  id: 'model-docs-001',
                  profile: 'docs',
                  surface: 'docs/guides',
                  title: 'Add pitfalls',
                  risk: 'low',
                  autonomyLevel: 'A0',
                  files: [{ path: 'docs/guides/example.md' }],
                  why: 'Capture model schema drift.',
                  proposedAction: 'append-markdown',
                  validation: ['git diff --check'],
                  rollback: 'remove appended section',
                  confidence: 0.9,
                  patch: {
                    type: 'append-markdown',
                    content:
                      '## Common Pitfalls\n\n- Target file: `docs/guides/example.md`\n- Anchored to heading: `Example`\n- Skipping the pre‑deployment check.',
                  },
                },
              ]),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const scout = await runAsync(
      'node',
      [
        scriptPath,
        'scout',
        '--surface',
        'docs/guides',
        '--limit',
        '1',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--out-dir',
        outDir,
        '--json',
      ],
      workspace
    );

    assert.equal(scout.status, 0, scout.stderr || scout.stdout);
    const scoutOutput = JSON.parse(scout.stdout);
    assert.equal(scoutOutput.modelResult.ok, true);
    assert.deepEqual(scoutOutput.candidates[0].files, ['docs/guides/example.md']);
    assert.match(scoutOutput.candidates[0].patch.content, /pre-deployment/);

    const patch = run(
      'node',
      [
        scriptPath,
        'patch',
        '--candidate-file',
        scoutOutput.receiptPath,
        '--candidate-id',
        'model-docs-001',
        '--dry-run',
        '--json',
      ],
      workspace
    );

    assert.equal(patch.status, 0, patch.stderr || patch.stdout);
    const patchOutput = JSON.parse(patch.stdout);
    assert.equal(patchOutput.candidateGate.ok, true);
    assert.equal(patchOutput.sourceGate.ok, true);
    assert.equal(patchOutput.usefulnessGate.ok, true);
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review passes from canonical repo patterns without model', () => {
  const workspace = makePatternReviewWorkspace();
  const result = run('node', [scriptPath, 'pattern-review', '--no-model', '--json'], workspace);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'pattern-review');
  assert.equal(output.outcome, 'pattern-reviewed');
  assert.equal(output.passed, true);
  assert.equal(output.modelResult.ok, false);
  assert.equal(output.patternReviewGate.ok, true);
  assert.equal(output.patternReviewSource, 'deterministic');
  assert.equal(output.fallbackUsed, true);
  assert.equal(output.sourceCoverage.every((entry) => entry.present), true);
  assert.match(output.patternReview.thesis, /operator receipts, gates, and runtime commands/);
  assert.equal(output.sourceCoverage.find((entry) => entry.id === 'external-agent-pattern-matrix').present, true);
  assert.ok(output.filesInspected.some((entry) => entry.file === 'docs/guides/OPERATOR_AGENT_SYSTEM.md'));
  assert.ok(output.patternReview.namingCritique.length > 0);
  assert.match(output.patternReview.namingCritique[0].critique, /abstract/i);
  assert.ok(output.patternReview.namingCritique[0].replacement);
});

test('operator-agent pattern-review inspects repo-wide pattern files', () => {
  const workspace = makePatternReviewWorkspace();
  mkdirSync(path.join(workspace, 'docs/policies/v1'), { recursive: true });
  mkdirSync(path.join(workspace, 'config/cloudflare'), { recursive: true });
  mkdirSync(path.join(workspace, 'scripts/test'), { recursive: true });
  writeFileSync(
    path.join(workspace, 'docs/policies/v1/policy.operator-agent-production-lab.v1.md'),
    '# Operator Agent Production Lab Policy\n\nProduction-lab actions require rollback and validation evidence.\n'
  );
  writeFileSync(
    path.join(workspace, 'config/cloudflare/operator-agent-access-policy.json'),
    '{ "name": "CREATE SOMETHING Operator Agent Gateway" }\n'
  );
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-runtime.mjs'),
    'const runtime = "operator-agent runtime keeps gateway and tunnel processes visible";\n'
  );
  writeFileSync(
    path.join(workspace, 'scripts/test/operator-agent-runtime.test.mjs'),
    'test("runtime stays inspectable", () => {});\n'
  );

  const result = run('node', [scriptPath, 'pattern-review', '--no-model', '--json'], workspace);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  const inspected = output.filesInspected.map((entry) => entry.file);
  assert.ok(inspected.includes('docs/policies/v1/policy.operator-agent-production-lab.v1.md'));
  assert.ok(inspected.includes('config/cloudflare/operator-agent-access-policy.json'));
  assert.ok(inspected.includes('scripts/operator-agent-runtime.mjs'));
  assert.ok(inspected.includes('scripts/test/operator-agent-runtime.test.mjs'));
  assert.equal(output.patternReviewScope, 'all');
});

test('operator-agent pattern-review and scout fall back when rg is absent', () => {
  const workspace = makePatternReviewWorkspace();
  mkdirSync(path.join(workspace, 'docs/policies/v1'), { recursive: true });
  mkdirSync(path.join(workspace, 'scripts/test'), { recursive: true });
  writeFileSync(
    path.join(workspace, 'docs/policies/v1/policy.operator-agent-production-lab.v1.md'),
    '# Operator Agent Production Lab Policy\n\nProduction-lab actions require rollback and validation evidence.\n'
  );
  writeFileSync(
    path.join(workspace, 'scripts/operator-agent-runtime.mjs'),
    'const runtime = "operator-agent runtime keeps gateway and tunnel processes visible";\n'
  );

  const env = { ...process.env, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' };
  const pattern = run(process.execPath, [scriptPath, 'pattern-review', '--no-model', '--json'], workspace, { env });

  assert.equal(pattern.status, 0, pattern.stderr || pattern.stdout);
  const patternOutput = JSON.parse(pattern.stdout);
  const inspected = patternOutput.filesInspected.map((entry) => entry.file);
  assert.ok(inspected.includes('docs/policies/v1/policy.operator-agent-production-lab.v1.md'));
  assert.ok(inspected.includes('scripts/operator-agent-runtime.mjs'));

  const scout = run(process.execPath, [scriptPath, 'scout', '--surface', 'docs/guides', '--limit', '1', '--no-model', '--json'], workspace, {
    env,
  });

  assert.equal(scout.status, 0, scout.stderr || scout.stdout);
  const scoutOutput = JSON.parse(scout.stdout);
  assert.equal(scoutOutput.filesInspected.length, 1);
  assert.match(scoutOutput.filesInspected[0], /^docs\/guides\//);
});

test('operator-agent pattern-review blocks abstract-only naming without critique', async () => {
  const workspace = makePatternReviewWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                thesis: 'Create Something needs an AI native orchestration abstraction platform.',
                tierMap: {
                  Database: 'Abstract source platform.',
                  Automation: 'Abstract automation platform.',
                  Judgment: 'Abstract judgment platform.',
                },
                operatingPatterns: ['Use the composable abstraction layer across all agents.'],
                safeNextActions: ['Name the abstraction and continue.'],
                gaps: [],
                evidenceFiles: ['AGENTS.md'],
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 1, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.patternReviewSource, 'deterministic-fallback');
    assert.equal(output.modelResult.schemaGate.ok, false);
    assert.match(output.modelResult.schemaGate.blockers.join('\n'), /namingCritique/);
    assert.equal(output.outcome, 'pattern-review-blocked');
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review blocks abstraction-building next actions even with critique', async () => {
  const workspace = makePatternReviewWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                thesis: 'Local models review concrete CREATE SOMETHING operator patterns.',
                tierMap: {
                  Database: 'Docs, policy artifacts, receipts, and configs provide truth.',
                  Automation: 'CLI modes, gateway routes, and batch eval run bounded checks.',
                  Judgment: 'Policy artifacts, rollback, and teacher shadow traces decide authority.',
                },
                operatingPatterns: ['Use inspected evidence before widening authority.'],
                safeNextActions: ['Define a composable abstraction layer for all operator agents.'],
                namingCritique: [
                  {
                    label: 'composable abstraction layer',
                    critique: 'The label hides receipts, gates, and rollback evidence behind broad wording.',
                    replacement: 'pattern-review receipt plus batch-eval scorecard',
                  },
                ],
                gaps: [],
                evidenceFiles: ['AGENTS.md'],
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 1, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.modelResult.schemaGate.ok, false);
    assert.match(output.modelResult.schemaGate.blockers.join('\n'), /must not propose new abstractions/);
    assert.equal(output.outcome, 'pattern-review-blocked');
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review allows abstraction language only as naming critique', async () => {
  const workspace = makePatternReviewWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                thesis: 'Local model review stays grounded in CREATE SOMETHING receipts and gates.',
                tierMap: {
                  Database: 'Docs, policy artifacts, receipts, and configs provide truth.',
                  Automation: 'CLI modes, gateway routes, and batch eval run bounded checks.',
                  Judgment: 'Policy artifacts, rollback, and teacher shadow traces decide authority.',
                },
                operatingPatterns: ['Use inspected evidence before widening authority.'],
                safeNextActions: ['Compare the latest pattern-review receipt with the batch-eval scorecard.'],
                namingCritique: [
                  {
                    label: 'AI-native abstraction layer',
                    critique: 'The label hides receipts, gates, commands, and rollback evidence.',
                    replacement: 'pattern-review receipt plus operator-agent schedule scorecard',
                  },
                ],
                gaps: [],
                evidenceFiles: ['AGENTS.md'],
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.patternReviewSource, 'model');
    assert.equal(output.patternReviewGate.ok, true);
    assert.match(output.patternReview.namingCritique[0].label, /abstraction/i);
    assert.equal(output.outcome, 'pattern-reviewed');
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review does not feed raw policy JSON into model prompt', async () => {
  const workspace = makePatternReviewWorkspace();
  mkdirSync(path.join(workspace, 'docs/policies/v1'), { recursive: true });
  writeFileSync(
    path.join(workspace, 'docs/policies/v1/policy.raw-json.v1.json'),
    '{"policy_id":"policy.raw-json.v1","status":"draft","raw_prompt_trap":"do not copy this object"}\n'
  );
  let capturedPrompt = '';
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const parsed = JSON.parse(body);
      capturedPrompt = parsed.messages.find((message) => message.role === 'user')?.content ?? '';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  thesis: 'Local models review concrete CREATE SOMETHING operator patterns.',
                  tierMap: {
                    Database: 'Docs, policy artifacts, receipts, and configs provide truth.',
                    Automation: 'CLI modes, gateway routes, and batch eval run bounded checks.',
                    Judgment: 'Policy artifacts, rollback, and teacher shadow traces decide authority.',
                  },
                  operatingPatterns: ['Keep pattern-review grounded in source headings and concrete source lines.'],
                  safeNextActions: ['Use the pattern-review receipt before scout.'],
                  gaps: [],
                  evidenceFiles: ['AGENTS.md', 'docs/policies/v1/policy.raw-json.v1.json'],
                }),
              },
            },
          ],
        })
      );
    });
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.ok(output.filesInspected.some((entry) => entry.file === 'docs/policies/v1/policy.raw-json.v1.json'));
    assert.doesNotMatch(capturedPrompt, /\{"policy_id"/);
    assert.doesNotMatch(capturedPrompt, /raw_prompt_trap/);
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review prompt keeps policy purpose text out of the response contract', async () => {
  const workspace = makePatternReviewWorkspace();
  mkdirSync(path.join(workspace, 'docs/policies/v1'), { recursive: true });
  writeFileSync(
    path.join(workspace, 'docs/policies/v1/policy.account-role-boundaries.v1.md'),
    '# policy.account-role-boundaries.v1\n\n## Purpose\n\nThis policy defines account role boundaries.\n'
  );
  let capturedPrompt = '';
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const parsed = JSON.parse(body);
      capturedPrompt = parsed.messages.find((message) => message.role === 'user')?.content ?? '';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  thesis: 'Local models review concrete CREATE SOMETHING operator patterns.',
                  tierMap: {
                    Database: 'Docs, policy artifacts, receipts, and configs provide truth.',
                    Automation: 'CLI modes, gateway routes, and batch eval run bounded checks.',
                    Judgment: 'Policy artifacts, rollback, and teacher shadow traces decide authority.',
                  },
                  operatingPatterns: ['Keep policy docs as evidence, not as the response shape.'],
                  safeNextActions: ['Use the pattern-review receipt before scout.'],
                  gaps: [],
                  evidenceFiles: ['docs/policies/v1/policy.account-role-boundaries.v1.md'],
                }),
              },
            },
          ],
        })
      );
    });
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(capturedPrompt, /Do not summarize any single policy, README, guide, or source file as the response/);
    assert.ok(capturedPrompt.lastIndexOf('Final response contract:') > capturedPrompt.lastIndexOf('Source excerpts:'));
    assert.doesNotMatch(capturedPrompt, /This policy defines account role boundaries/);
    assert.doesNotMatch(capturedPrompt, /policy\.account-role-boundaries\.v1\.md/);
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review blocks invented evidence files', async () => {
  const workspace = makePatternReviewWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                thesis: 'Local models review concrete CREATE SOMETHING operator patterns.',
                tierMap: {
                  Database: 'Docs, policy artifacts, receipts, and configs provide truth.',
                  Automation: 'CLI modes, gateway routes, and batch eval run bounded checks.',
                  Judgment: 'Policy artifacts, rollback, and teacher shadow traces decide authority.',
                },
                operatingPatterns: ['Use inspected evidence files only.'],
                safeNextActions: ['Block invented evidence before delegation.'],
                gaps: [],
                evidenceFiles: ['invented_rollout_report.json'],
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 1, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.modelResult.schemaGate.ok, false);
    assert.match(output.modelResult.schemaGate.blockers.join('\n'), /invented_rollout_report\.json/);
    assert.equal(output.outcome, 'pattern-review-blocked');
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review writes pattern-review receipt from model JSON', async () => {
  const workspace = makePatternReviewWorkspace();
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                thesis: 'Local models are governed CREATE SOMETHING executors under operator policy.',
                tierMap: {
                  Database: 'Docs, configs, receipts, and policy artifacts provide truth.',
                  Automation: 'CLI modes, gateway routes, and batch eval execute bounded work.',
                  Judgment: 'Cloudflare Access, policy artifacts, teacher shadow, and rollback decide authority.',
                },
                operatingPatterns: [
                  'Use Cloudflare Access plus bearer auth for no-write public gateway access.',
                  'Use batch eval and teacher shadow receipts before widening autonomy.',
                ],
                safeNextActions: ['Run scout only after the pattern-review receipt is current.'],
                gaps: [],
                evidenceFiles: ['docs/guides/OPERATOR_AGENT_SYSTEM.md'],
              }),
            },
          },
        ],
      })
    );
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'pattern-review');
    assert.equal(output.modelResult.ok, true);
    assert.equal(output.patternReviewGate.ok, true);
    assert.equal(output.patternReviewSource, 'model');
    assert.equal(output.fallbackUsed, false);
    assert.equal(output.outcome, 'pattern-reviewed');
    assert.match(output.patternReview.tierMap.Judgment, /teacher shadow/);
  } finally {
    server.close();
  }
});

test('operator-agent pattern-review repairs incomplete model schema before fallback', async () => {
  const workspace = makePatternReviewWorkspace();
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    request.resume();
    response.writeHead(200, { 'content-type': 'application/json' });
    const content =
      requests === 1
        ? JSON.stringify({
            purpose: 'The operator-agent watches patterns but omitted the required CREATE SOMETHING schema.',
          })
        : JSON.stringify({
            thesis: 'The operator-agent reviews concrete CREATE SOMETHING patterns before work is delegated.',
            tierMap: {
              Database: 'Docs, policy artifacts, receipts, and configs provide source truth.',
              Automation: 'CLI modes, gateway routes, and batch eval execute bounded checks.',
              Judgment: 'Cloudflare Access, rollback policy, and teacher shadow traces decide authority.',
            },
            operatingPatterns: [
              'Keep pattern-review read-only before scout or patch.',
              'Critique naming when abstractions hide the operator workflow.',
            ],
            safeNextActions: ['Feed the pattern-review receipt into batch eval.'],
            gaps: [],
            evidenceFiles: ['docs/guides/OPERATOR_AGENT_SYSTEM.md'],
          });
    response.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });

  try {
    const port = await listen(server);
    const result = await runAsync(
      'node',
      [
        scriptPath,
        'pattern-review',
        '--base-url',
        `http://127.0.0.1:${port}/v1`,
        '--model',
        'fake-model',
        '--timeout-ms',
        '10000',
        '--json',
      ],
      workspace
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(requests, 2);
    assert.equal(output.modelResult.ok, true);
    assert.equal(output.modelResult.schemaGate.ok, false);
    assert.equal(output.repairResult.ok, true);
    assert.equal(output.repairResult.schemaGate.ok, true);
    assert.equal(output.patternReviewSource, 'model-repair');
    assert.equal(output.fallbackUsed, false);
    assert.equal(output.patternReviewGate.ok, true);
    assert.match(output.patternReview.operatingPatterns.join('\n'), /naming/);
  } finally {
    server.close();
  }
});
