import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  findLatestBatchEvalReceipt,
  formatMarkdownSummary,
  parseArgs,
  summarizeReceipt,
} from '../cmux-ornith-receipt.mjs';

function fixtureReceipt() {
  return {
    generatedAt: '2026-07-08T19:11:04.092Z',
    mode: 'batch-eval',
    loop: 'operator-agent-system',
    target: 'local',
    surface: 'docs/guides',
    limit: 1,
    scout: {
      modelResult: { ok: true },
      filesInspected: ['docs/guides/example.md'],
      nextDecision: 'operator selects one candidate for policy-gated patch',
    },
    scorecard: {
      candidatesProposed: 1,
      writesPerformed: 0,
    },
    passed: true,
    outcome: 'evaluated',
    runs: [
      {
        candidateId: 'candidate-001',
        candidateFile: '.cache/operator-agent-system/candidate-input.json',
        initialPatch: {
          candidate: {
            id: 'candidate-001',
            title: 'Review docs/guides/example.md for a small bounded improvement',
            files: ['docs/guides/example.md'],
            risk: 'low',
            autonomyLevel: 'A0',
            validation: ['git diff --check'],
            rollback: 'revert file if later patched',
          },
          candidateGate: { ok: true, blockers: [] },
          contentGate: { ok: true, blockers: [] },
          sourceGate: { ok: true, blockers: [] },
          usefulnessGate: { ok: false, blockers: ['generic append'] },
          decision: {
            allowed: false,
            validation: ['git diff --check'],
            rollback: 'revert file if later patched',
            blockers: ['usefulness gate failed'],
          },
          dryRun: true,
          passed: false,
          outcome: 'blocked',
          patchResult: { note: 'Dry run blocked.' },
          preReceiptPath: '.cache/operator-agent-system/pre.json',
        },
      },
    ],
  };
}

test('receipt reviewer parses args', () => {
  assert.deepEqual(parseArgs(['--receipt', 'receipt.json', '--json']), {
    receipt: 'receipt.json',
    cacheDir: '.cache/operator-agent-system',
    json: true,
    help: false,
  });
});

test('receipt reviewer finds latest batch-eval receipt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ornith-receipt-'));
  const oldReceipt = path.join(tmp, 'old-batch-eval-local-scout.json');
  const newReceipt = path.join(tmp, 'new-batch-eval-local-scout.json');
  fs.writeFileSync(oldReceipt, '{}');
  fs.writeFileSync(newReceipt, '{}');
  fs.utimesSync(oldReceipt, new Date('2026-07-08T19:00:00.000Z'), new Date('2026-07-08T19:00:00.000Z'));
  fs.utimesSync(newReceipt, new Date('2026-07-08T19:01:00.000Z'), new Date('2026-07-08T19:01:00.000Z'));
  const latest = findLatestBatchEvalReceipt(tmp, process.cwd());
  assert.equal(path.basename(latest), 'new-batch-eval-local-scout.json');
});

test('receipt reviewer summarizes evidence-backed candidates', () => {
  const summary = summarizeReceipt(fixtureReceipt(), 'receipt.json');
  assert.equal(summary.passed, true);
  assert.equal(summary.runs.length, 1);
  assert.equal(summary.runs[0].candidateId, 'candidate-001');
  assert.equal(summary.runs[0].allowed, false);
  assert.deepEqual(summary.runs[0].blockers, ['generic append', 'usefulness gate failed']);
});

test('receipt reviewer markdown states review boundary', () => {
  const markdown = formatMarkdownSummary(summarizeReceipt(fixtureReceipt(), 'receipt.json'));
  assert.match(markdown, /Free-form visible chat is not evidence for promotion/);
  assert.match(markdown, /Codex must inspect target files/);
  assert.match(markdown, /candidate-001/);
  assert.match(markdown, /generic append, usefulness gate failed/);
  assert.match(markdown, /Files inspected: docs\/guides\/example.md/);
});
