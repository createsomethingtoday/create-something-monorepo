import assert from 'node:assert/strict';
import test from 'node:test';

import {
  automatedWorkflowComment,
  buildBehavioralSmokeTests,
  buildTestingTaskHandoffBlocks,
  buildTestingTaskHandoffProperties,
  buildTestReportProperties,
  canonicalPageContent,
  enrichReviewWithNotionContent,
  evaluateWorkerRubric,
  LIVE_TESTING_HANDOFF_GUIDANCE,
  normalizeReviewRequest,
  notionMarkdownBlocks,
  parseDifyEvalAnswer,
  richTextPlain,
  shouldRunAutomatedEval,
  submittedInstructionsForDify
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

test('normalizeReviewRequest extracts a Notion trigger page reference when the automation includes it', () => {
  const review = normalizeReviewRequest({
    trigger: {
      page: {
        id: '34f01918-7ac5-8095-8ff2-dc2fa49f11fe',
        url: 'https://www.notion.so/halfdozen/Internal-Agent-Builder-34f019187ac580958ff2dc2fa49f11fe'
      }
    },
    properties: {
      Name: { title: [{ plain_text: 'Internal Agent Builder' }] },
      Status: { status: { name: 'Updating' } }
    }
  });

  assert.equal(review.agentName, 'Internal Agent Builder');
  assert.equal(review.status, 'Updating');
  assert.equal(review.pageId, '34f01918-7ac5-8095-8ff2-dc2fa49f11fe');
  assert.equal(
    review.pageUrl,
    'https://www.notion.so/halfdozen/Internal-Agent-Builder-34f019187ac580958ff2dc2fa49f11fe'
  );
});

test('enrichReviewWithNotionContent recovers a source page by exact title when the webhook omits a page URL', async () => {
  const originalFetch = globalThis.fetch;
  const sourcePageId = '34f01918-7ac5-8095-8ff2-dc2fa49f11fe';
  const sourcePageUrl = 'https://www.notion.so/halfdozen/Internal-Agent-Builder-34f019187ac580958ff2dc2fa49f11fe';

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = String(input);

    if (url.endsWith('/search')) {
      return Response.json({
        results: [
          {
            object: 'page',
            id: sourcePageId,
            url: sourcePageUrl,
            properties: {
              Name: {
                type: 'title',
                title: [{ type: 'text', plain_text: 'Internal Agent Builder', text: { content: 'Internal Agent Builder' } }]
              }
            }
          }
        ]
      });
    }

    if (url.endsWith(`/pages/${sourcePageId}`)) {
      return Response.json({
        properties: {
          Name: {
            type: 'title',
            title: [{ type: 'text', plain_text: 'Internal Agent Builder', text: { content: 'Internal Agent Builder' } }]
          },
          Status: { type: 'status', status: { name: 'Updating' } }
        }
      });
    }

    if (url.includes(`/blocks/${sourcePageId}/children`)) {
      return Response.json({
        results: [
          {
            type: 'heading_1',
            heading_1: {
              rich_text: [{ type: 'text', plain_text: 'Overview', text: { content: 'Overview' } }]
            }
          },
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  plain_text: 'You are Internal Agent Builder. Produce Agent Spec, Instructions, Build checklist, and Test plan.',
                  text: {
                    content:
                      'You are Internal Agent Builder. Produce Agent Spec, Instructions, Build checklist, and Test plan.'
                  }
                }
              ]
            }
          }
        ],
        next_cursor: null
      });
    }

    return Response.json({ message: `Unexpected URL ${url}` }, { status: 500 });
  }) as typeof fetch;

  try {
    const review = normalizeReviewRequest({
      properties: {
        Name: { title: [{ plain_text: 'Internal Agent Builder' }] },
        Status: { status: { name: 'Updating' } },
        'Agent Description': 'Short description only.'
      }
    });

    const enriched = await enrichReviewWithNotionContent({ NOTION_API_KEY: 'test-token' }, review);

    assert.equal(enriched.enrichment?.notionPageId, sourcePageId);
    assert.equal(enriched.enrichment?.notionPageUrl, sourcePageUrl);
    assert.match(enriched.enrichment?.warning ?? '', /exact Notion title search/);
    assert.match(enriched.enrichment?.pageContent ?? '', /Produce Agent Spec/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submittedInstructionsForDify excerpts long source pages while preserving edge context', () => {
  const review = {
    requestId: 'req-1',
    receivedAt: '2026-06-03T00:00:00.000Z',
    agentName: 'Internal Agent Builder',
    properties: {},
    enrichment: {
      pageContent: ['start instructions', 'middle '.repeat(1000), 'end instructions'].join('\n')
    }
  };

  const result = submittedInstructionsForDify(review, 1200);

  assert.equal(result.truncated, true);
  assert.ok(result.inputCharacters > result.sentCharacters);
  assert.ok(result.sentCharacters <= 1200);
  assert.match(result.text, /Bounded Dify eval excerpt/);
  assert.match(result.text, /start instructions/);
  assert.match(result.text, /end instructions/);
  assert.match(result.text, /OMITTED MIDDLE/);
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

test('buildTestReportProperties links Test Reports back to source agent and client relations', () => {
  const properties = buildTestReportProperties(
    {
      Report: { type: 'title' },
      Date: { type: 'date' },
      Score: { type: 'number' },
      Agent: { type: 'relation' },
      Client: { type: 'relation' },
      Notes: { type: 'rich_text' }
    },
    {
      requestId: 'req-relations',
      receivedAt: '2026-06-03T00:00:00.000Z',
      agentName: 'Internal Agent Builder',
      properties: {},
      enrichment: {
        notionPageId: '34f01918-7ac5-8095-8ff2-dc2fa49f11fe',
        relationIds: {
          Client: ['client-page-id-1']
        }
      }
    },
    {
      success: true,
      generated_at: '2026-06-03T05:21:24.314Z',
      summary: {
        status: 'pass',
        scenarios: 4,
        checks_total: 27,
        checks_passed: 27,
        checks_failed: 0
      },
      worker_rubric: {
        checks_total: 9,
        checks_passed: 9
      },
      notion_test_report: {
        title: 'Half Dozen Agent Eval - Internal Agent Builder',
        status: 'pass',
        beta_dependency: 'Dify fallback completed.',
        source: 'Cloudflare Worker webhook automation',
        database_name: 'Test Reports [OS]',
        markdown: ''
      }
    } as any
  );

  assert.deepEqual(properties?.Agent, {
    relation: [{ id: '34f01918-7ac5-8095-8ff2-dc2fa49f11fe' }]
  });
  assert.deepEqual(properties?.Client, {
    relation: [{ id: 'client-page-id-1' }]
  });
});

test('buildTestingTaskHandoffProperties links task handoff to source agent, client, and eval report', () => {
  const properties = buildTestingTaskHandoffProperties(
    {
      Task: { type: 'title' },
      Date: { type: 'date' },
      Status: { type: 'status' },
      Agent: { type: 'relation' },
      Client: { type: 'relation' },
      'Test Report': { type: 'url' },
      Notes: { type: 'rich_text' }
    },
    {
      requestId: 'req-task',
      receivedAt: '2026-06-03T00:00:00.000Z',
      agentName: 'Internal Agent Builder',
      properties: {},
      enrichment: {
        notionPageId: '34f01918-7ac5-8095-8ff2-dc2fa49f11fe',
        relationIds: {
          Client: ['client-page-id-1']
        }
      }
    },
    {
      generated_at: '2026-06-03T05:21:24.314Z',
      summary: {
        status: 'pass',
        checks_total: 27,
        checks_passed: 27
      },
      worker_rubric: {
        checks_total: 9,
        checks_passed: 9
      }
    } as any,
    {
      ok: true,
      status: 'published',
      pageUrl: 'https://notion.so/test-report'
    }
  );

  assert.deepEqual(properties?.Task, {
    title: [{ type: 'text', text: { content: 'Agent Test Report - @Internal Agent Builder' } }]
  });
  assert.deepEqual(properties?.Status, { status: { name: 'To Do' } });
  assert.deepEqual(properties?.Agent, {
    relation: [{ id: '34f01918-7ac5-8095-8ff2-dc2fa49f11fe' }]
  });
  assert.deepEqual(properties?.Client, {
    relation: [{ id: 'client-page-id-1' }]
  });
  assert.deepEqual(properties?.['Test Report'], { url: 'https://notion.so/test-report' });
  assert.match(JSON.stringify(properties?.Notes), /Eval pass/);
});

test('buildTestingTaskHandoffBlocks make the live testing paste boundary obvious', () => {
  const blocks = buildTestingTaskHandoffBlocks(
    {
      requestId: 'req-task-blocks',
      receivedAt: '2026-06-03T00:00:00.000Z',
      agentName: 'Internal Agent Builder',
      pageUrl: 'https://notion.so/source-page',
      properties: {}
    },
    {
      generated_at: '2026-06-03T05:21:24.314Z',
      summary: {
        status: 'pass',
        checks_total: 27,
        checks_passed: 27
      },
      review_summary: 'Ready for live Notion testing.',
      recommended_upgrades: ['Keep linked Notion references intact.'],
      live_testing_checklist: [
        {
          label: 'Happy path',
          prompt: 'I need an agent that prepares a Notion-native spec.',
          expected_behavior: 'Returns an Agent Spec, Instructions, Build checklist, and Test plan.'
        }
      ]
    } as any,
    {
      ok: true,
      status: 'published',
      pageUrl: 'https://notion.so/test-report'
    },
    {
      ok: true,
      status: 'updated',
      pageUrl: 'https://notion.so/source-page',
      statusUpdated: true
    }
  );
  const serialized = JSON.stringify(blocks);

  assert.match(serialized, /Full Eval\/Test Report/);
  assert.match(serialized, /https:\/\/notion\.so\/test-report/);
  assert.match(serialized, /paste only the text after/);
  assert.match(serialized, /Prompt to paste: I need an agent/);
  assert.match(serialized, /Record pass\/fail/);
  assert.match(serialized, /move Status back to Updating/);
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

test('automatedWorkflowComment stays compact and points to the full Notion eval report', () => {
  const comment = automatedWorkflowComment(
    {
      requestId: 'req-compact',
      receivedAt: '2026-06-03T00:00:00.000Z',
      agentName: 'Internal Agent Builder',
      status: 'Updating',
      properties: {}
    },
    {
      id: 'issue-1',
      identifier: 'CRE-469',
      title: 'Review Half Dozen agent build',
      url: 'https://linear.app/create-something/issue/CRE-469'
    },
    [
      {
        id: 'issue-2',
        identifier: 'CRE-502',
        title: 'Run and share Half Dozen agent eval',
        url: 'https://linear.app/create-something/issue/CRE-502',
        step: 'eval',
        reused: true
      }
    ],
    {
      success: true,
      generated_at: '2026-06-03T00:00:00.000Z',
      eval_scope: 'instruction-readiness',
      claim_boundary: 'Does not prove live Notion runtime behavior.',
      execution_target: 'dify-agent-builder-eval-with-worker-notion-linear-writeback',
      summary: {
        status: 'pass',
        scenarios: 4,
        checks_total: 27,
        checks_passed: 27,
        checks_failed: 0
      },
      review_summary: 'Ready for live Notion testing. '.repeat(100),
      recommended_upgrades: Array.from({ length: 8 }, (_, index) => `Upgrade ${index + 1}: ${'detail '.repeat(80)}`),
      proposed_patch: {
        status_transition: {
          from: 'Updating',
          to: 'Testing',
          allowed: true
        }
      },
      patch_application: {
        applied: true,
        mode: 'append_versioned_handoff'
      },
      worker_rubric: {
        checks_total: 7,
        checks_passed: 7
      },
      caveats: Array.from({ length: 8 }, (_, index) => `Caveat ${index + 1}: ${'detail '.repeat(80)}`),
      live_testing_checklist: [
        {
          label: 'Complete request',
          prompt: 'I need an agent that turns rough automation requests into Notion-native instructions.',
          expected_behavior: 'Returns Agent Spec, Instructions, Build checklist, and Test plan.'
        }
      ],
      dify_eval: {
        status: 'used',
        message_id: 'msg-1',
        input_characters: 18000,
        sent_characters: 5000,
        input_truncated: true
      },
      notion_test_report: {
        markdown: ['## Full Review JSON', 'x'.repeat(12000)].join('\n')
      }
    } as any,
    {
      ok: true,
      status: 'published',
      pageUrl: 'https://notion.so/test-report'
    },
    {
      ok: true,
      status: 'updated',
      pageUrl: 'https://notion.so/source-page',
      statusUpdated: true
    }
  );

  assert.ok(comment.length <= 6000);
  assert.match(comment, /Automated Half Dozen webhook workflow completed/);
  assert.match(comment, /Dify input: excerpted 5000\/18000 characters/);
  assert.match(comment, /Full eval details, final instructions, archived submitted instructions, and raw JSON/);
  assert.match(comment, /Paste only the full text after "Prompt to paste"/);
  assert.doesNotMatch(comment, /Full Review JSON/);
  assert.doesNotMatch(comment, /x{1000}/);
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

test('parseDifyEvalAnswer accepts compact output without archived instructions or duplicate patch markdown', () => {
  const parsed = parseDifyEvalAnswer(
    JSON.stringify({
      status: 'pass',
      review_summary: 'Ready for testing with compact Dify output.',
      recommended_upgrades: ['Keep the live testing handoff explicit.'],
      final_instructions: 'Compact final instructions.',
      proposed_patch: {
        replace_section: {
          heading: 'Current Instructions'
        },
        append_report: {
          summary: 'Compact report summary.',
          rubric: ['Rubric passed.'],
          test_plan: ['Paste the prompt into the live Notion agent.']
        },
        status_transition: {
          from: 'Updating',
          to: 'Testing',
          allowed: true,
          reason: 'Compact response passed the eval.'
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

  assert.equal(parsed.output.archived_instructions, '');
  assert.equal(parsed.output.final_instructions, 'Compact final instructions.');
  assert.equal(parsed.output.proposed_patch.replace_section.heading, 'Current Instructions');
  assert.equal(parsed.output.proposed_patch.replace_section.markdown, 'Compact final instructions.');
  assert.equal(parsed.output.proposed_patch.append_report.summary, 'Compact report summary.');
});
