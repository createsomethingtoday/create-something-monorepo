import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  createMcpToolCallPlan,
  createOpenAIResponsesRequestPlan,
  replayWorkflow
} from '../dist/index.js';

const workflowUrl = new URL('../fixtures/release-promotion/workflow.json', import.meta.url);
const casesUrl = new URL('../fixtures/release-promotion/cases.json', import.meta.url);

async function releaseFixture() {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  const bundle = compileWorkflowDefinition(definition);
  const { report } = replayWorkflow(bundle, manifest);
  return { bundle, manifest, report };
}

test('second vertical proves pass, wait, and stop through the provider-neutral MCP plan', async () => {
  const { bundle, manifest, report } = await releaseFixture();

  assert.deepEqual(report.counts, { pass: 1, approval_required: 1, blocked: 1 });
  assert.equal(report.allExpectationsMatched, true);

  const plans = report.cases.map((result) =>
    createMcpToolCallPlan(
      bundle,
      manifest.cases.find((entry) => entry.caseId === result.caseId)
    )
  );

  assert.deepEqual(
    plans.map((plan) => ({
      caseId: plan.caseId,
      disposition: plan.disposition,
      reasonCode: plan.reasonCode,
      canInvoke: plan.canInvoke,
      hasInvocation: 'invocation' in plan
    })),
    [
      {
        caseId: 'complete-verification-passes',
        disposition: 'pass',
        reasonCode: 'TOOL_CALL_READY',
        canInvoke: true,
        hasInvocation: true
      },
      {
        caseId: 'policy-bypass-stops',
        disposition: 'stop',
        reasonCode: 'GOVERNANCE_BLOCKED',
        canInvoke: false,
        hasInvocation: false
      },
      {
        caseId: 'production-promotion-waits',
        disposition: 'wait',
        reasonCode: 'APPROVAL_REQUIRED',
        canInvoke: false,
        hasInvocation: false
      }
    ]
  );

  assert.deepEqual(plans[0].invocation, {
    operation: 'tools/call',
    targetSystemId: 'release-ci',
    tool: {
      name: 'release_verify',
      arguments: {
        artifact_digest: 'sha256:fixture-release-artifact',
        commit_sha: '0123456789abcdef0123456789abcdef01234567',
        test_receipt: 'release-tests-fixture-001'
      }
    }
  });
});

test('OpenAI Responses plan forces the same governed tool without transport or credentials', async () => {
  const { bundle, manifest, report } = await releaseFixture();
  const replayCase = manifest.cases.find(
    (entry) => entry.caseId === 'complete-verification-passes'
  );

  const first = createOpenAIResponsesRequestPlan(bundle, replayCase, {
    model: 'caller-selected-model'
  });
  const second = createOpenAIResponsesRequestPlan(bundle, replayCase, {
    model: 'caller-selected-model'
  });

  assert.deepEqual(first, second);
  assert.equal(first.disposition, 'pass');
  assert.equal(first.canInvoke, true);
  assert.deepEqual(first.request, {
    model: 'caller-selected-model',
    instructions:
      'Call exactly release_verify with the supplied governed arguments. Do not add, remove, or substitute an action. Return tool errors to the caller without retrying a side effect.',
    input:
      '{"workflow_id":"software.release.promotion","action_id":"verify_release","correlation_id":"complete-verification-passes","arguments":{"artifact_digest":"sha256:fixture-release-artifact","commit_sha":"0123456789abcdef0123456789abcdef01234567","test_receipt":"release-tests-fixture-001"}}',
    tools: [
      {
        type: 'function',
        name: 'release_verify',
        description:
          'Verify release candidate through release-ci. Returns receipt fields: action_id, correlation_id, evidence_refs, outcome, workflow_id. Tool errors must be returned without retrying side effects.',
        parameters: {
          type: 'object',
          properties: {
            artifact_digest: {
              type: 'string',
              description: 'Immutable digest of the release artifact.'
            },
            commit_sha: {
              type: 'string',
              description: 'Protected source commit represented by the artifact.'
            },
            test_receipt: {
              type: 'string',
              description: 'Identifier for the completed release test receipt.'
            }
          },
          required: ['artifact_digest', 'commit_sha', 'test_receipt'],
          additionalProperties: false
        },
        strict: true
      }
    ],
    tool_choice: { type: 'function', name: 'release_verify' },
    parallel_tool_calls: false,
    store: false
  });
  assert.equal('apiKey' in first.request, false);
  assert.equal('url' in first.request, false);
});

test('OpenAI adapter preserves wait and stop without constructing a provider request', async () => {
  const { bundle, manifest, report } = await releaseFixture();

  for (const [caseId, disposition] of [
    ['production-promotion-waits', 'wait'],
    ['policy-bypass-stops', 'stop']
  ]) {
    const replayCase = manifest.cases.find((entry) => entry.caseId === caseId);
    const plan = createOpenAIResponsesRequestPlan(bundle, replayCase, {
      model: 'caller-selected-model'
    });
    assert.equal(plan.disposition, disposition);
    assert.equal(plan.canInvoke, false);
    assert.equal('request' in plan, false);
  }
});

test('an explicit owner approval advances the waiting promotion into a tool call', async () => {
  const { bundle, manifest } = await releaseFixture();
  const waiting = manifest.cases.find((entry) => entry.caseId === 'production-promotion-waits');
  const approved = {
    ...waiting,
    approvals: ['release-manager'],
    expectedOutcome: 'pass',
    expectedState: 'production'
  };

  const plan = createMcpToolCallPlan(bundle, approved);
  assert.equal(plan.disposition, 'pass');
  assert.equal(plan.canInvoke, true);
  assert.deepEqual(plan.invocation, {
    operation: 'tools/call',
    targetSystemId: 'production-deployer',
    tool: {
      name: 'release_promote',
      arguments: {
        artifact_digest: 'sha256:fixture-release-artifact',
        deployment_target: 'production'
      }
    }
  });
});

test('adapter replays the same input it maps and fails closed before invocation', async () => {
  const { bundle, manifest, report } = await releaseFixture();
  const replayCase = manifest.cases.find(
    (entry) => entry.caseId === 'complete-verification-passes'
  );

  const missing = createMcpToolCallPlan(bundle, {
    ...replayCase,
    evidence: { artifact_digest: 'sha256:value', commit_sha: 'abc' },
    expectedOutcome: 'blocked',
    expectedState: 'candidate'
  });
  assert.equal(missing.disposition, 'stop');
  assert.equal(missing.reasonCode, 'GOVERNANCE_BLOCKED');
  assert.equal(missing.governanceReasonCode, 'INSUFFICIENT_EVIDENCE');
  assert.equal('invocation' in missing, false);

  const wrongType = createMcpToolCallPlan(bundle, {
    ...replayCase,
    evidence: {
      artifact_digest: 'sha256:value',
      commit_sha: 'abc',
      test_receipt: 42
    }
  });
  assert.equal(wrongType.disposition, 'stop');
  assert.equal(wrongType.reasonCode, 'INVALID_TOOL_ARGUMENTS');
  assert.equal(wrongType.canInvoke, false);
  assert.equal('invocation' in wrongType, false);
  assert.deepEqual(
    wrongType.diagnostics.map((entry) => entry.code),
    ['INVALID_TOOL_ARGUMENT_TYPE']
  );
});

test('adapter preserves legacy schema compatibility but requires an explicit parameter contract', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  delete definition.actions[0].tool.parameters;
  const bundle = compileWorkflowDefinition(definition);

  const plan = createMcpToolCallPlan(bundle, manifest.cases[0]);
  assert.equal(plan.disposition, 'stop');
  assert.equal(plan.reasonCode, 'MISSING_TOOL_PARAMETER_CONTRACT');
  assert.equal(plan.canInvoke, false);
  assert.equal('invocation' in plan, false);
});

test('OpenAI adapter requires and normalizes caller-owned model selection', async () => {
  const { bundle, manifest } = await releaseFixture();
  const replayCase = manifest.cases.find(
    (entry) => entry.caseId === 'complete-verification-passes'
  );

  assert.throws(
    () => createOpenAIResponsesRequestPlan(bundle, replayCase, { model: '   ' }),
    (error) =>
      error.name === 'WorkflowAdapterError' && error.code === 'INVALID_ADAPTER_CONFIGURATION'
  );
  const plan = createOpenAIResponsesRequestPlan(bundle, replayCase, {
    model: '  caller-selected-model  '
  });
  assert.equal(plan.request.model, 'caller-selected-model');
});
