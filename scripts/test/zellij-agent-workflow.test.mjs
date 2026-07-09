import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPrompt,
  buildWorkflow,
  deriveSessionName,
  parseArgs,
  renderText,
  slugify,
} from '../zellij-agent-workflow.mjs';

test('zellij workflow parses Linear-like task context', () => {
  const options = parseArgs([
    '--issue',
    'CRE-123',
    '--title',
    'Debug Whalesync template sync',
    '--description',
    'Use logs and repo evidence.',
    '--acceptance',
    'Identify owner',
    '--acceptance',
    'Return evidence',
    '--verification',
    'Run smoke check',
    '--policy',
    'Stop before deploy',
    '--autonomy-level',
    'A2',
    '--authority',
    'May repair local docs with rollback proof',
    '--receipt-contract',
    'intent authority action verification rollback proof',
    '--rollback',
    'revert the docs patch',
    '--escalation',
    'escalate if verification fails',
    '--json',
  ]);

  assert.equal(options.issue, 'CRE-123');
  assert.equal(options.title, 'Debug Whalesync template sync');
  assert.deepEqual(options.acceptance, ['Identify owner', 'Return evidence']);
  assert.deepEqual(options.verification, ['Run smoke check']);
  assert.deepEqual(options.policy, ['Stop before deploy']);
  assert.equal(options.autonomyLevel, 'A2');
  assert.equal(options.authority, 'May repair local docs with rollback proof');
  assert.equal(options.receiptContract, 'intent authority action verification rollback proof');
  assert.equal(options.rollback, 'revert the docs patch');
  assert.equal(options.escalation, 'escalate if verification fails');
  assert.equal(options.json, true);
  assert.equal(options.sessionName, 'cre-123-debug-whalesync-template-sync');
});

test('zellij workflow requires a stable issue or title', () => {
  assert.throws(() => parseArgs([]), /Provide --issue or --title/);
});

test('zellij workflow derives compact session slugs', () => {
  assert.equal(slugify('CRE-123: Ship Zellij Lane!'), 'cre-123-ship-zellij-lane');
  assert.equal(deriveSessionName('CRE-123', 'Ship the Zellij Linear agent workflow'), 'cre-123-ship-the-zellij-linear-agent-workflow');
});

test('zellij workflow prompt carries authority, acceptance, verification, and closeout', () => {
  const options = parseArgs([
    '--issue',
    'CRE-456',
    '--title',
    'Review agent lane',
    '--acceptance',
    'Board shows active lane',
    '--verification',
    'dump-screen returns output',
  ]);
  const prompt = buildPrompt(options);

  assert.match(prompt, /Linear: CRE-456/);
  assert.match(prompt, /## Agent-Run Operating Model/);
  assert.match(prompt, /agent-run-with-receipts business/);
  assert.match(prompt, /## Authority/);
  assert.match(prompt, /## Receipt Contract/);
  assert.match(prompt, /## Rollback/);
  assert.match(prompt, /## Escalation/);
  assert.match(prompt, /Board shows active lane/);
  assert.match(prompt, /dump-screen returns output/);
  assert.match(prompt, /Codex\/operator owns the done decision/);
  assert.match(prompt, /Do not mark the task done yourself/);
});

test('zellij workflow dry-run exposes launch, board, readback, send, and evidence commands', () => {
  const workflow = buildWorkflow(
    parseArgs([
      '--issue',
      'CRE-789',
      '--title',
      'Run visible worker',
      '--acceptance',
      'Return evidence',
      '--verification',
      'node --test',
    ]),
  );

  assert.equal(workflow.dryRun, true);
  assert.equal(workflow.session, 'cre-789-run-visible-worker');
  assert.equal(workflow.autonomyLevel, 'A1');
  assert.match(workflow.authority, /prepare and inspect evidence/);
  assert.match(workflow.receiptContract, /Intent, authority, source of truth/);
  assert.match(workflow.rollback, /No write authority by default/);
  assert.match(workflow.escalation, /Escalate when source of truth/);
  assert.match(workflow.commands.launch, /pnpm' 'zellij:agent/);
  assert.match(workflow.commands.board, /pnpm zellij:board/);
  assert.match(workflow.commands.inspect, /dump-screen/);
  assert.match(workflow.commands.streamJson, /subscribe/);
  assert.match(workflow.commands.sendPrompt, /CREATE SOMETHING Zellij Worker Packet/);
  assert.match(workflow.commands.sendEnter, /send-keys/);
  assert.match(workflow.commands.kill, /kill-session/);
  assert.match(workflow.commands.linearComment, /pnpm linear:comment/);
  assert.match(workflow.evidenceTemplate, /Zellij session/);
  assert.match(workflow.evidenceTemplate, /Autonomy level/);
  assert.match(workflow.evidenceTemplate, /Authority/);
  assert.match(workflow.evidenceTemplate, /Receipt contract/);
  assert.match(workflow.evidenceTemplate, /Rollback \/ recovery/);
  assert.match(workflow.evidenceTemplate, /Escalation condition/);
});

test('zellij workflow text render contains no legacy terminal dependency wording', () => {
  const workflow = buildWorkflow(parseArgs(['--title', 'Investigate visible lane']));
  const text = renderText(workflow);

  assert.match(text, /Zellij Linear Agent Workflow/);
  assert.match(text, /Autonomy: A1/);
  assert.doesNotMatch(text, /CMUX|Ghostty|cmux|ghostty/);
});
