#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerResources } from '../src/resources.js';
import { search } from '../src/search.js';
import {
  buildCanonOverlayCandidatePromotionApprovalTargetTemplateCollection
} from '../src/canon-overlay-candidate-promotion-approval-record.js';

type RegisteredResource = {
  name: string;
  uri: string;
  metadata: {
    description?: string;
    mimeType?: string;
  };
  handler: (uri: URL) => Promise<{
    contents: Array<{
      text: string;
    }>;
  }>;
};

const resources: RegisteredResource[] = [];
const server = {
  resource(
    name: string,
    uri: string,
    metadata: RegisteredResource['metadata'],
    handler: RegisteredResource['handler']
  ) {
    resources.push({ name, uri, metadata, handler });
  }
};

registerResources(server as unknown as McpServer);

const templates = buildCanonOverlayCandidatePromotionApprovalTargetTemplateCollection();

assert.equal(templates.id, 'canon-overlay-candidate-promotion-approval-target-templates');
assert.equal(templates.entries.length, 2);
assert.equal(templates.summary.total, templates.entries.length);

const candidateList = requireResource('canon://overlays/candidates/list');
const candidateListPayload = JSON.parse(
  (await candidateList.handler(new URL(candidateList.uri))).contents[0]!.text
) as Array<{ approvalTargetTemplateUri?: string }>;

assert.equal(
  candidateListPayload.every((entry) => entry.approvalTargetTemplateUri?.endsWith('/target-template')),
  true
);

const collectionResource = requireResource('canon://overlays/candidates/approval-target-templates');
const collectionPayload = JSON.parse(
  (await collectionResource.handler(new URL(collectionResource.uri))).contents[0]!.text
) as ReturnType<typeof buildCanonOverlayCandidatePromotionApprovalTargetTemplateCollection>;

assert.equal(collectionPayload.id, templates.id);
assert.equal(collectionPayload.entries.length, templates.entries.length);
assert.match(collectionPayload.description, /fillable target templates/);
assert.match(collectionPayload.agentContract.stopBefore.join('\n'), /automatically filling target fields/);

const firstTemplate = collectionPayload.entries[0]!;
assert.equal(Object.values(firstTemplate.target).every((value) => value === null), true);
assert.equal(firstTemplate.fields.every((field) => field.value === null), true);
assert.ok(firstTemplate.allowedValues.registryActions.includes('reuse-existing'));
assert.ok(firstTemplate.allowedValues.maturityTargets.includes('candidate'));

const templateResource = requireResource(firstTemplate.targetTemplateUri);
const templatePayload = JSON.parse(
  (await templateResource.handler(new URL(templateResource.uri))).contents[0]!.text
) as typeof firstTemplate;

assert.equal(templatePayload.id, firstTemplate.id);
assert.equal(templatePayload.targetTemplateUri, firstTemplate.targetTemplateUri);
assert.equal(Object.values(templatePayload.target).every((value) => value === null), true);
assert.match(templatePayload.approvalBoundary.join('\n'), /does not approve implementation/);

const searchResults = search('approval target template null approvalOwner fill validation', {
  type: 'canon-registry',
  property: 'ltd',
  limit: 20
});

assert.ok(
  searchResults.some((result) =>
    result.item.id === 'canon-overlay-candidate-promotion-approval-target-template:collection'
  ),
  'Expected search to include the approval target template collection'
);
assert.ok(
  searchResults.some((result) =>
    result.item.id === `canon-overlay-candidate-promotion-approval-target-template:${firstTemplate.intakeId}`
  ),
  'Expected search to include a per-candidate approval target template'
);

console.log('Canon overlay candidate promotion approval target-template resources smoke passed.');

function requireResource(uri: string) {
  const resource = resources.find((entry) => entry.uri === uri);
  assert.ok(resource, `Expected MCP resource to be registered: ${uri}`);
  return resource;
}
