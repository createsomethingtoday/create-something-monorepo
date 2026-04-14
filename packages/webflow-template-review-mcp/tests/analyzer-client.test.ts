import assert from 'node:assert/strict';
import test from 'node:test';

import { createAnalyzerClient } from '../src/analyzer-client.js';

test('enqueueTemplateReview sends the analyzer Accept header expected by the remote worker', async () => {
  const requests: Array<{ headers: Headers; body: string }> = [];
  const client = createAnalyzerClient({
    baseUrl: 'https://analyzer.example.test/mcp',
    apiKey: 'secret',
    fetchFn: async (_input, init) => {
      requests.push({
        headers: new Headers(init?.headers),
        body: String(init?.body ?? ''),
      });

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          result: {
            structuredContent: {
              jobId: 'template-review-123',
              status: 'queued',
            },
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  jobId: 'template-review-123',
                  status: 'queued',
                }),
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    },
  });

  const result = await client.enqueueTemplateReview({
    previewUrl: 'https://preview.example.test',
    publishedUrl: 'https://published.example.test',
  });

  assert.equal(result.jobId, 'template-review-123');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.headers.get('accept'), 'application/json, text/event-stream');
  assert.equal(requests[0]?.headers.get('authorization'), 'Bearer secret');

  const rpc = JSON.parse(requests[0]?.body ?? '{}') as {
    params?: { name?: string; arguments?: Record<string, unknown> };
  };
  assert.equal(rpc.params?.name, 'enqueue_template_review');
  assert.deepEqual(rpc.params?.arguments, {
    previewUrl: 'https://preview.example.test',
    publishedUrl: 'https://published.example.test',
  });
});
