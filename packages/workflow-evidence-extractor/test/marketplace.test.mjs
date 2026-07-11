import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  extractWorkflowDefinitionProposal,
  loadWorkflowEvidenceSource,
} from '../dist/index.js';

const repoRoot = new URL('../../../', import.meta.url);
const baselineUrl = new URL(
  'packages/workflow-compiler/fixtures/marketplace/workflow.json',
  repoRoot,
);
const policyUrl = new URL('fixtures/marketplace/extraction-policy.json', new URL('../', import.meta.url));

test('proposes additive changes and surfaces real source conflicts without resolving them', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const before = JSON.stringify(baseline);
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const sources = await Promise.all([
    loadWorkflowEvidenceSource({
      id: 'marketplace-agent-contract',
      kind: 'agent_contract',
      path: new URL(
        'specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml',
        repoRoot,
      ).pathname,
    }),
    loadWorkflowEvidenceSource({
      id: 'marketplace-mcp-contract',
      kind: 'mcp_contract',
      path: new URL(
        'specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml',
        repoRoot,
      ).pathname,
    }),
    loadWorkflowEvidenceSource({
      id: 'marketplace-rule-catalog',
      kind: 'rule_catalog',
      path: new URL(
        'specs/webflow-marketplace/delivery/template-review-hub/rule-catalog.phase1.json',
        repoRoot,
      ).pathname,
    }),
  ]);

  const proposal = extractWorkflowDefinitionProposal({ baseline, sources, policy });

  assert.equal(JSON.stringify(baseline), before);
  assert.equal(proposal.operations.length, 6);
  assert.deepEqual(
    proposal.operations.map((operation) => operation.id),
    [
      'operation:add-evaluation:wf.template.code.no_legacy_ix2',
      'operation:add-evaluation:wf.template.runtime.site_accessible',
      'operation:add-evaluation:wf.template.utility.license_page_linked',
      'operation:add-system:create-something-mcp-hub',
      'operation:add-system:webflow-preview-and-published-sites',
      'operation:add-system:webflow-site-analyzer-mcp',
    ],
  );
  assert.ok(
    proposal.operations.every(
      (operation) =>
        operation.approvalRequired === true &&
        operation.status === 'proposed' &&
        operation.provenanceIds.length > 0 &&
        operation.confidence > 0 &&
        operation.confidence <= 1,
    ),
  );
  assert.deepEqual(
    proposal.conflicts.map((conflict) => ({
      targetPath: conflict.targetPath,
      values: conflict.claims.map((claim) => claim.value),
      resolution: conflict.resolution,
    })),
    [
      {
        targetPath: '/actions/approve_template/autonomy',
        values: ['approval_required', 'manual_only'],
        resolution: 'operator_required',
      },
      {
        targetPath: '/actions/publish_template/autonomy',
        values: ['approval_required', 'manual_only'],
        resolution: 'operator_required',
      },
    ],
  );
  assert.ok(
    proposal.evidence.every((record) =>
      proposal.sources.some((source) => source.hash === record.sourceHash),
    ),
  );
});
