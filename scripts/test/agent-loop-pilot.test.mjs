import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAccountBasedLoopEnv, isModelApiKeyEnvName } from '../agent-loop-pilot.mjs';
import { agentWorkUnitContractPaths } from '../agent-loop-pilot.mjs';

test('isModelApiKeyEnvName detects OpenAI and common model provider API keys', () => {
  assert.equal(isModelApiKeyEnvName('OPENAI_API_KEY'), true);
  assert.equal(isModelApiKeyEnvName('WEBFLOW_OPENAI_API_KEY'), true);
  assert.equal(isModelApiKeyEnvName('ANTHROPIC_API_KEY'), true);
  assert.equal(isModelApiKeyEnvName('PERPLEXITY_API_KEY'), true);
  assert.equal(isModelApiKeyEnvName('LINEAR_API_KEY'), false);
  assert.equal(isModelApiKeyEnvName('CLOUDFLARE_API_TOKEN'), false);
});

test('buildAccountBasedLoopEnv strips model API keys but preserves coordination credentials', () => {
  const { env, removedKeys } = buildAccountBasedLoopEnv({
    OPENAI_API_KEY: 'sk-test',
    ANTHROPIC_API_KEY: 'anthropic-test',
    PERPLEXITY_API_KEY: 'pplx-test',
    LINEAR_API_KEY: 'linear-test',
    INFISICAL_TOKEN: 'infisical-test',
    PATH: '/usr/bin'
  });

  assert.deepEqual(removedKeys, [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY'
  ]);
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  assert.equal(env.PERPLEXITY_API_KEY, undefined);
  assert.equal(env.LINEAR_API_KEY, 'linear-test');
  assert.equal(env.INFISICAL_TOKEN, 'infisical-test');
  assert.equal(env.PATH, '/usr/bin');
});

test('agent loop pilot verifies the multi-agent work-unit contract examples before dispatch', () => {
  assert.deepEqual(agentWorkUnitContractPaths, [
    'automation/agent-contracts/examples/code-quality.work-unit.json',
    'automation/agent-contracts/examples/reviewer-integrator.work-unit.json',
    'automation/agent-contracts/examples/code-quality.evidence-receipt.json'
  ]);
});
