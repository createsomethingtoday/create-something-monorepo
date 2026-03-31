import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNotionHubToolCallRequest, buildNotionHubTraceContext } from '../src/notion.ts';

test('buildNotionHubTraceContext applies deterministic defaults for live sync traces', () => {
  const traceContext = buildNotionHubTraceContext(
    {},
    {
      dedupKey: 'Meeting / 2026-03-31',
    },
    {
      runId: 42,
      replay: false,
    },
  );

  assert.deepEqual(traceContext, {
    correlationId: 'halfdozen_zoom_transcript_sync:run_42:meeting_2026-03-31',
    requestIdBase: 'halfdozen_zoom_transcript_sync:notion_hub:run_42:meeting_2026-03-31',
    experimentId: 'halfdozen-zoom-transcript-sync',
    candidateId: 'production',
    cohort: 'scheduled',
    phase: 'production',
  });
});

test('buildNotionHubToolCallRequest emits experiment headers and MCP _meta payload', () => {
  const traceContext = buildNotionHubTraceContext(
    {
      NOTION_HUB_EXPERIMENT_ID: 'exp_halfdozen_hub',
      NOTION_HUB_CANDIDATE_ID: 'candidate_v2',
      NOTION_HUB_BASELINE_ID: 'candidate_v1',
      NOTION_HUB_COHORT: 'holdout',
      NOTION_HUB_PHASE: 'candidate',
    },
    {
      dedupKey: 'dedup-key-1',
    },
    {
      replay: true,
    },
  );

  const request = buildNotionHubToolCallRequest({
    hubToken: 'secret-token',
    toolName: 'hub_execute_proxy_tool',
    toolArgs: {
      proxyToolName: 'notion__query_database',
      args: {
        action: 'query_database',
        args: {
          database_id: 'db_123',
        },
      },
    },
    action: 'query_database',
    traceContext,
    requestSequence: 2,
  });

  assert.equal(
    request.requestId,
    'halfdozen_zoom_transcript_sync:notion_hub:replay:dedup-key-1:query_database:2',
  );
  assert.equal(request.headers.Authorization, 'Bearer secret-token');
  assert.equal(
    request.headers['X-Correlation-ID'],
    'halfdozen_zoom_transcript_sync:replay:dedup-key-1',
  );
  assert.equal(request.headers['X-Request-ID'], request.requestId);
  assert.equal(request.headers['X-Experiment-ID'], 'exp_halfdozen_hub');
  assert.equal(request.headers['X-Candidate-ID'], 'candidate_v2');
  assert.equal(request.headers['X-Baseline-ID'], 'candidate_v1');
  assert.equal(request.headers['X-Experiment-Cohort'], 'holdout');
  assert.equal(request.headers['X-Experiment-Phase'], 'candidate');
  assert.equal(request.body.id, request.requestId);
  assert.equal(request.body.params.name, 'hub_execute_proxy_tool');
  assert.equal(request.body.params._meta.experimentId, 'exp_halfdozen_hub');
  assert.equal(request.body.params._meta.candidateId, 'candidate_v2');
  assert.equal(request.body.params._meta.baselineId, 'candidate_v1');
  assert.equal(request.body.params._meta.cohort, 'holdout');
  assert.equal(request.body.params._meta.phase, 'candidate');
  assert.equal(request.body.params._meta.progressToken, request.requestId);
  assert.deepEqual(request.body.params._meta['io.modelcontextprotocol/related-task'], {
    taskId: traceContext.correlationId,
  });
});
