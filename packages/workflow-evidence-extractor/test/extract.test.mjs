import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { extractWorkflowDefinitionProposal } from '../dist/index.js';

const baselineUrl = new URL(
  '../../workflow-compiler/fixtures/marketplace/workflow.json',
  import.meta.url,
);

test('extracts deterministic field-level provenance without mutating the baseline', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const before = JSON.stringify(baseline);
  const input = {
    baseline,
    sources: [
      {
        id: 'marketplace-agent-contract',
        kind: 'agent_contract',
        path: 'specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml',
        document: {
          ownership: {
            workflow_owner: 'Marketplace review lead',
            policy_owner: 'Senior Systems Architect',
            technical_owner: 'Senior Systems Architect',
          },
        },
      },
    ],
  };

  const first = extractWorkflowDefinitionProposal(input);
  const second = extractWorkflowDefinitionProposal(input);

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(baseline), before);
  assert.match(first.baselineHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(first.proposalHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.sources.length, 1);
  assert.match(first.sources[0].hash, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    first.evidence.map((record) => ({
      claimType: record.claimType,
      targetPath: record.targetPath,
      normalizedValue: record.normalizedValue,
      confidence: record.confidence,
      sourcePointer: record.sourcePointer,
    })),
    [
      {
        claimType: 'owner',
        targetPath: '/owners/policy',
        normalizedValue: 'senior-systems-architect',
        confidence: 1,
        sourcePointer: '/ownership/policy_owner',
      },
      {
        claimType: 'owner',
        targetPath: '/owners/technical',
        normalizedValue: 'senior-systems-architect',
        confidence: 1,
        sourcePointer: '/ownership/technical_owner',
      },
      {
        claimType: 'owner',
        targetPath: '/owners/workflow',
        normalizedValue: 'marketplace-review-lead',
        confidence: 1,
        sourcePointer: '/ownership/workflow_owner',
      },
    ],
  );
});
