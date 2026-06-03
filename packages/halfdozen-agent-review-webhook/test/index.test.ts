import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBehavioralSmokeTests,
  canonicalPageContent,
  evaluateWorkerRubric,
  LIVE_TESTING_HANDOFF_GUIDANCE,
  notionMarkdownBlocks,
  parseDifyEvalAnswer,
  richTextPlain,
  shouldRunAutomatedEval
} from '../src/index.ts';

const deliveryReadyInstructions = [
  'You are Internal Agent Builder, a Half Dozen assistant for teammates.',
  '',
  'Primary goal: help teammates define useful, safe, and testable internal agents.',
  '',
  'Workflow:',
  '- Intake the request and restate the user asks.',
  '- Check for similar, duplicate, or existing agent workflows before creating a new one.',
  '- Recommend reuse, extend, or create based on the overlap.',
  '- Ask clarifying questions when required and document assumptions when information is missing.',
  '- Produce an Agent Spec, final instructions, enablement steps, and a test plan.',
  '- Do not create, update, archive, delete, or mutate Notion records unless explicitly requested.',
  '- Include acceptance criteria, pass/fail expectations, and scenarios for human testing.',
  '',
  'Output format:',
  '1. Agent Spec',
  '2. Final Instructions',
  '3. Enablement',
  '4. Test Plan',
  '5. External toolkit validation or auth requirements'
].join('\n');

test('canonicalPageContent extracts the latest final instructions section', () => {
  const content = [
    '# Agent Eval Update - 2026-06-03T00:00:00Z',
    '## Final Instructions',
    'old instructions',
    '## Archived Submitted Instructions',
    'old archived instructions',
    '# Agent Eval Update - 2026-06-03T01:00:00Z',
    '## Final Instructions',
    'new instructions',
    '## Archived Submitted Instructions',
    'new archived instructions'
  ].join('\n');

  assert.equal(canonicalPageContent(content), 'new instructions');
});

test('canonicalPageContent prefers canonical source content before eval history', () => {
  const content = [
    '# Overview',
    'You are an agent-building agent for the Half Dozen team.',
    '',
    '## Output rules',
    'Produce Agent Spec, Instructions, Build checklist, and Test plan.',
    '',
    '# Agent Eval Update - 2026-06-03T00:00:00Z',
    '## Final Instructions',
    'historical generated instructions'
  ].join('\n');

  assert.equal(
    canonicalPageContent(content),
    [
      '# Overview',
      'You are an agent-building agent for the Half Dozen team.',
      '',
      '## Output rules',
      'Produce Agent Spec, Instructions, Build checklist, and Test plan.'
    ].join('\n')
  );
});

test('canonicalPageContent ignores eval history without final instructions', () => {
  const content = [
    '# Agent Eval Update - 2026-06-03T00:00:00Z',
    '## Result',
    'Pass',
    '## Review Summary',
    'Prior report content only.'
  ].join('\n');

  assert.equal(canonicalPageContent(content), undefined);
});

test('evaluateWorkerRubric passes delivery-ready instructions and fails placeholders', () => {
  const passing = evaluateWorkerRubric(deliveryReadyInstructions);
  assert.equal(passing.status, 'pass');
  assert.equal(passing.checks_failed, 0);

  const failing = evaluateWorkerRubric('Build the thing later.');
  assert.equal(failing.status, 'fail');
  assert.ok(failing.critical_failed > 0);
});

test('evaluateWorkerRubric allows non-critical gaps while preserving caveat signal', () => {
  const missingSimilarityCheck = [
    'You are Internal Agent Builder, a Half Dozen assistant for teammates.',
    'Primary goal: help teammates define useful internal agents.',
    'Workflow: intake the request and ask clarifying questions when information is missing.',
    'Produce an Agent Spec, final instructions, enablement steps, output sections, and a test plan.',
    'Do not create, update, archive, delete, or mutate Notion records unless explicitly requested.',
    'Include acceptance criteria, pass/fail expectations, and test scenarios.'
  ].join('\n');
  const result = evaluateWorkerRubric(missingSimilarityCheck);

  assert.equal(result.status, 'pass');
  assert.equal(result.critical_failed, 0);
  assert.ok(result.checks_failed > 0);
});

test('buildBehavioralSmokeTests reports covered and missing scenarios', () => {
  const covered = buildBehavioralSmokeTests(deliveryReadyInstructions);
  assert.equal(covered.every((item) => item.covered), true);

  const gaps = buildBehavioralSmokeTests('You are a simple helper.');
  assert.equal(gaps.some((item) => !item.covered), true);
});

test('LIVE_TESTING_HANDOFF_GUIDANCE makes the paste boundary explicit', () => {
  assert.match(LIVE_TESTING_HANDOFF_GUIDANCE, /Paste only the full text after "Prompt to paste"/);
  assert.match(LIVE_TESTING_HANDOFF_GUIDANCE, /Do not paste the scenario label/);
  assert.match(LIVE_TESTING_HANDOFF_GUIDANCE, /move it back to Updating/);
});

test('shouldRunAutomatedEval only allows Updating status to trigger eval', () => {
  assert.equal(shouldRunAutomatedEval({ status: 'Updating' }), true);
  assert.equal(shouldRunAutomatedEval({ status: 'updating' }), true);
  assert.equal(shouldRunAutomatedEval({ status: 'Testing' }), false);
  assert.equal(shouldRunAutomatedEval({ status: 'Validated' }), false);
  assert.equal(shouldRunAutomatedEval({ status: undefined }), false);
});

test('notionMarkdownBlocks preserves core report structure', () => {
  const blocks = notionMarkdownBlocks([
    '# Title',
    '',
    'Paragraph body.',
    '',
    '- [ ] Todo',
    '- Bullet',
    '1. Numbered',
    '',
    '```json',
    '{"ok":true}',
    '```'
  ].join('\n'));
  const types = blocks.map((block) => block.type);

  assert.deepEqual(types, ['heading_1', 'paragraph', 'to_do', 'bulleted_list_item', 'numbered_list_item', 'code']);
});

test('richTextPlain preserves Notion mention hrefs as Markdown links', () => {
  const text = richTextPlain([
    {
      type: 'mention',
      plain_text: 'AI Toolkits [HD]',
      href: 'https://www.notion.so/halfdozen/AI-Toolkits-HD-1234567890abcdef1234567890abcdef',
      mention: {
        type: 'database',
        database: {
          id: '12345678-90ab-cdef-1234-567890abcdef'
        }
      }
    },
    {
      type: 'text',
      plain_text: ' reference'
    }
  ]);

  assert.equal(
    text,
    '[AI Toolkits [HD]](https://www.notion.so/halfdozen/AI-Toolkits-HD-1234567890abcdef1234567890abcdef) reference'
  );
});

test('parseDifyEvalAnswer preserves an advisory proposed patch', () => {
  const parsed = parseDifyEvalAnswer(
    JSON.stringify({
      status: 'pass',
      review_summary: 'Ready for human testing after worker-controlled writeback.',
      recommended_upgrades: ['Clarify mutation guardrails.'],
      final_instructions: 'Final instructions from Dify.',
      archived_instructions: 'Submitted instructions.',
      proposed_patch: {
        replace_section: {
          heading: 'Final Instructions',
          markdown: 'Patch instructions from Dify.'
        },
        append_report: {
          summary: 'Patch summary.',
          rubric: ['Rubric item.'],
          test_plan: ['Run one live Notion prompt.']
        },
        status_transition: {
          from: 'Updating',
          to: 'Testing',
          allowed: true,
          reason: 'Instructions passed the eval and Worker rubric should decide final writeback.'
        }
      },
      checks: {
        scenarios: 4,
        checks_total: 27,
        checks_passed: 27,
        checks_failed: 0
      },
      caveats: []
    })
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.output.proposed_patch.replace_section.heading, 'Final Instructions');
  assert.equal(parsed.output.proposed_patch.replace_section.markdown, 'Patch instructions from Dify.');
  assert.equal(parsed.output.proposed_patch.append_report.test_plan[0], 'Run one live Notion prompt.');
  assert.equal(parsed.output.proposed_patch.status_transition.allowed, true);
});

test('parseDifyEvalAnswer backfills proposed patch for the legacy JSON contract', () => {
  const parsed = parseDifyEvalAnswer(
    JSON.stringify({
      status: 'pass',
      review_summary: 'Ready for testing.',
      recommended_upgrades: ['Keep linked Notion references intact.'],
      final_instructions: 'Legacy final instructions.',
      archived_instructions: 'Legacy submitted instructions.',
      checks: {
        scenarios: 4,
        checks_total: 27,
        checks_passed: 27,
        checks_failed: 0
      },
      caveats: []
    })
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.output.proposed_patch.replace_section.heading, 'Current Instructions');
  assert.equal(parsed.output.proposed_patch.replace_section.markdown, 'Legacy final instructions.');
  assert.deepEqual(parsed.output.proposed_patch.append_report.rubric, [
    'Keep linked Notion references intact.'
  ]);
  assert.equal(parsed.output.proposed_patch.status_transition.from, 'Updating');
  assert.equal(parsed.output.proposed_patch.status_transition.to, 'Testing');
  assert.equal(parsed.output.proposed_patch.status_transition.allowed, true);
});
