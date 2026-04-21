import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerPrompts } from '../src/prompts.js';

type PromptResult = {
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
};

type PromptHandler = (args: Record<string, unknown>) => Promise<PromptResult>;

function createPromptHarness() {
  const handlers = new Map<string, PromptHandler>();

  const server = {
    prompt(name: string, _description: string, _schema: unknown, handler: PromptHandler) {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;

  return { handlers, server };
}

test('template_review_workflow prompt documents the cross-server analyzer lane and price handoff', async () => {
  const { handlers, server } = createPromptHarness();

  registerPrompts(server);

  const result = await handlers.get('template_review_workflow')?.({});

  assert.ok(result);
  const text = result.messages[0]?.content.text ?? '';

  assert.match(text, /webflow-site-analyzer-mcp/);
  assert.match(text, /enqueue_template_review/);
  assert.match(text, /get_template_review_job/);
  assert.match(text, /list_template_review_jobs/);
  assert.match(text, /run_template_review/);
  assert.match(text, /template_review_set_price/);
  assert.match(text, /publishing_context\.mrp_id/);
  assert.match(text, /⚠️Satisfactory/);
  assert.equal(text.includes('template_review_enqueue_analyzer_review'), false);
  assert.equal(text.includes('template_review_get_analyzer_review'), false);
  assert.equal(text.includes('template_review_list_analyzer_reviews'), false);
});
