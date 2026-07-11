import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const packageRoot = new URL('../', import.meta.url);
const repoRoot = new URL('../../../', import.meta.url);

test('the propose CLI writes a deterministic review packet from the actual marketplace artifacts', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'workflow-evidence-proposal-'));
  try {
    const result = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'propose',
        '--baseline',
        new URL('packages/workflow-compiler/fixtures/marketplace/workflow.json', repoRoot).pathname,
        '--agent-contract',
        new URL(
          'specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml',
          repoRoot,
        ).pathname,
        '--mcp-contract',
        new URL(
          'specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml',
          repoRoot,
        ).pathname,
        '--rule-catalog',
        new URL(
          'specs/webflow-marketplace/delivery/template-review-hub/rule-catalog.phase1.json',
          repoRoot,
        ).pathname,
        '--policy',
        new URL('fixtures/marketplace/extraction-policy.json', packageRoot).pathname,
        '--out',
        outDir,
      ],
      { cwd: packageRoot, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual((await readdir(outDir)).sort(), [
      'approval-template.json',
      'conflicts.json',
      'evidence-inventory.json',
      'manifest.json',
      'proposal.json',
    ]);

    const proposal = JSON.parse(await readFile(join(outDir, 'proposal.json'), 'utf8'));
    const template = JSON.parse(await readFile(join(outDir, 'approval-template.json'), 'utf8'));
    assert.equal(proposal.operations.length, 6);
    assert.equal(proposal.conflicts.length, 2);
    assert.equal(template.baselineHash, proposal.baselineHash);
    assert.equal(template.proposalHash, proposal.proposalHash);
    assert.deepEqual(template.requiredOperationIds, proposal.operations.map((operation) => operation.id));
    assert.deepEqual(template.requiredConflictIds, proposal.conflicts.map((conflict) => conflict.id));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
