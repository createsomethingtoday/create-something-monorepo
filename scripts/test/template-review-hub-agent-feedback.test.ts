import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDifyQuery,
  extractFormattedAgentFeedbackFromToolCalls,
  extractReturnedSaveAgentFeedback,
  extractSavedAgentFeedbackFromToolCalls,
  REQUIRED_MANUAL_CHECK_TOPICS,
  retryTransientOperation,
  waitForAgentReviewFeedback
} from '../template-review-hub-agent-feedback.ts';

const candidate = {
  version: {
    versionId: 'recVersion',
    assetId: 'recAsset',
    reviewStatus: '🆕Ready for Review'
  },
  asset: {
    assetId: 'recAsset',
    templateName: 'Sample Template',
    websiteUrl: 'https://example.webflow.io/',
    previewSiteUrl: 'https://preview.webflow.com/preview/sample'
  }
} as any;

test('buildDifyQuery requires every formatter manual-check topic', () => {
  const query = buildDifyQuery(candidate, true);

  for (const topic of REQUIRED_MANUAL_CHECK_TOPICS) {
    assert.match(query, new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }

  assert.match(query, /missing_manual_check_topics/i);
  assert.match(query, /correct the packet and retry/i);
  assert.match(query, /template_review_save_agent_feedback/i);
  assert.match(query, /Never end by returning a raw JSON object/i);
});

test('buildDifyQuery keeps dry-run formatter retry guidance without save authorization', () => {
  const query = buildDifyQuery(candidate, false);

  assert.match(query, /Do not execute any write-capable tool/i);
  assert.match(query, /correct the packet and retry before replying/i);
  assert.doesNotMatch(query, /Only reply with SAVED_AGENT_REVIEW_FEEDBACK/i);
});

test('extractReturnedSaveAgentFeedback accepts only validated save payloads for the expected version', () => {
  const feedback = [
    'Supplemental agent initial review evidence for Sample Template (version recVersion).',
    'Manual checks remaining',
    '- components and variables remain manual.',
    'Decision boundary',
    'This is not an official review decision.'
  ].join('\n');

  const payload = JSON.stringify({
    proxyToolName: 'webflow-template-review-mcp__template_review_save_agent_feedback',
    args: {
      version_id: 'recVersion',
      agent_review_feedback: feedback
    }
  });

  assert.equal(extractReturnedSaveAgentFeedback(payload, 'recVersion'), feedback);
  assert.equal(
    extractReturnedSaveAgentFeedback(`${payload}\nBLOCKER: trailing Dify narrative`, 'recVersion'),
    feedback
  );
  assert.equal(extractReturnedSaveAgentFeedback(payload, 'recOther'), null);
  assert.equal(extractReturnedSaveAgentFeedback('not json', 'recVersion'), null);
  assert.equal(
    extractReturnedSaveAgentFeedback(
      JSON.stringify({
        proxyToolName: 'webflow-template-review-mcp__template_review_update_version_review',
        args: {
          version_id: 'recVersion',
          agent_review_feedback: feedback
        }
      }),
      'recVersion'
    ),
    null
  );
});

test('extractFormattedAgentFeedbackFromToolCalls accepts formatter observations for the expected version', () => {
  const feedback = [
    'Supplemental agent initial review evidence for Sample Template (version recVersion).',
    'Manual checks remaining',
    '- components and variables remain manual.',
    'Decision boundary',
    'This is not an official review decision.'
  ].join('\n');

  const toolCalls = [
    {
      tool: 'hub_execute_proxy_tool',
      toolInput:
        '{"hub_execute_proxy_tool":{"proxyToolName":"webflow-template-review-mcp__template_review_format_agent_review_feedback","args":{}}}',
      observation: JSON.stringify({
        hub_execute_proxy_tool: JSON.stringify({
          ok: true,
          data: {
            contract_version: 'template-review-comprehensive-evidence.v1',
            agent_review_feedback: feedback
          }
        })
      })
    }
  ];

  assert.equal(extractFormattedAgentFeedbackFromToolCalls(toolCalls, 'recVersion'), feedback);
  assert.equal(extractFormattedAgentFeedbackFromToolCalls(toolCalls, 'recOther'), null);
});

test('extractSavedAgentFeedbackFromToolCalls accepts confirmed save observations for the expected version', () => {
  const feedback = [
    'Supplemental agent initial review evidence for Sample Template (version recVersion).',
    'Manual checks remaining',
    '- components and variables remain manual.',
    'Decision boundary',
    'This is not an official review decision.'
  ].join('\n');

  const toolCalls = [
    {
      tool: 'hub_execute_proxy_tool',
      toolInput: JSON.stringify({
        hub_execute_proxy_tool: {
          proxyToolName: 'webflow-template-review-mcp__template_review_save_agent_feedback',
          args: {
            version_id: 'recVersion',
            agent_review_feedback: feedback
          }
        }
      }),
      observation: JSON.stringify({
        hub_execute_proxy_tool: JSON.stringify({
          ok: true,
          data: {
            updated_version: {
              versionId: 'recVersion',
              agentReviewFeedback: feedback
            }
          }
        })
      })
    }
  ];

  assert.equal(extractSavedAgentFeedbackFromToolCalls(toolCalls, 'recVersion'), feedback);
  assert.equal(extractSavedAgentFeedbackFromToolCalls(toolCalls, 'recOther'), null);
});

test('extractSavedAgentFeedbackFromToolCalls rejects failed save observations', () => {
  const feedback = [
    'Supplemental agent initial review evidence for Sample Template (version recVersion).',
    'Manual checks remaining',
    '- components and variables remain manual.',
    'Decision boundary',
    'This is not an official review decision.'
  ].join('\n');

  const toolCalls = [
    {
      tool: 'hub_execute_proxy_tool',
      toolInput: JSON.stringify({
        hub_execute_proxy_tool: {
          proxyToolName: 'webflow-template-review-mcp__template_review_save_agent_feedback',
          args: {
            version_id: 'recVersion',
            agent_review_feedback: feedback
          }
        }
      }),
      observation: JSON.stringify({
        hub_execute_proxy_tool: JSON.stringify({
          ok: false,
          error: {
            code: 'AIRTABLE_WRITE_FAILED',
            message: 'write failed'
          }
        })
      })
    }
  ];

  assert.equal(extractSavedAgentFeedbackFromToolCalls(toolCalls, 'recVersion'), null);
});

test('retryTransientOperation retries failed reads with bounded backoff', async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await retryTransientOperation(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error(`temporary failure ${attempts}`);
      return 'ok';
    },
    {
      attempts: 3,
      delayMs: 100,
      label: 'test_read',
      sleep: async (ms) => {
        delays.push(ms);
      }
    }
  );

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [100, 200]);
});

test('waitForAgentReviewFeedback polls until Airtable readback exposes saved feedback', async () => {
  let reads = 0;
  const delays: number[] = [];

  const feedback = await waitForAgentReviewFeedback(
    async () => {
      reads += 1;
      return {
        agentReviewFeedback: reads < 3 ? '   ' : 'Saved feedback'
      } as any;
    },
    {
      attempts: 3,
      delayMs: 50,
      label: 'test_feedback_readback',
      sleep: async (ms) => {
        delays.push(ms);
      }
    }
  );

  assert.equal(feedback, 'Saved feedback');
  assert.equal(reads, 3);
  assert.deepEqual(delays, [50, 100]);
});

test('waitForAgentReviewFeedback returns null after bounded blank readback attempts', async () => {
  let reads = 0;

  const feedback = await waitForAgentReviewFeedback(
    async () => {
      reads += 1;
      return { agentReviewFeedback: '' } as any;
    },
    {
      attempts: 2,
      delayMs: 50,
      label: 'test_feedback_readback_empty',
      sleep: async () => {}
    }
  );

  assert.equal(feedback, null);
  assert.equal(reads, 2);
});
