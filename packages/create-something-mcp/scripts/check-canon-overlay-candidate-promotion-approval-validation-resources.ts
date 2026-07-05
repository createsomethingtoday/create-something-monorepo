#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  buildCanonOverlayCandidatePromotionApprovalValidationReportCollection
} from '../src/canon-overlay-candidate-promotion-approval-record.js';
import { registerResources } from '../src/resources.js';
import { search } from '../src/search.js';

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

const reports = buildCanonOverlayCandidatePromotionApprovalValidationReportCollection();

assert.equal(reports.id, 'canon-overlay-candidate-promotion-approval-validation-reports');
assert.equal(reports.entries.length, 2);
assert.equal(reports.summary.total, reports.entries.length);
assert.equal(reports.summary.missingRequiredFields, reports.entries.length);
assert.equal(reports.summary.readyForImplementation, 0);

const candidateList = requireResource('canon://overlays/candidates/list');
const candidateListPayload = JSON.parse(
  (await candidateList.handler(new URL(candidateList.uri))).contents[0]!.text
) as Array<{ approvalValidationUri?: string }>;

assert.equal(
  candidateListPayload.every((entry) => entry.approvalValidationUri?.endsWith('/validation')),
  true
);

const collectionResource = requireResource('canon://overlays/candidates/approval-validation-reports');
const collectionPayload = JSON.parse(
  (await collectionResource.handler(new URL(collectionResource.uri))).contents[0]!.text
) as ReturnType<typeof buildCanonOverlayCandidatePromotionApprovalValidationReportCollection>;

assert.equal(collectionPayload.id, reports.id);
assert.equal(collectionPayload.entries.length, reports.entries.length);
assert.match(collectionPayload.description, /validation reports/);
assert.match(collectionPayload.agentContract.stopBefore.join('\n'), /automatically filling approval-record fields/);

const firstReport = collectionPayload.entries[0]!;
assert.equal(firstReport.status, 'missing-required-fields');
assert.equal(firstReport.summary.readyForImplementation, false);
assert.equal(firstReport.summary.missingRequiredFields, 9);
assert.match(firstReport.approvalBoundary.join('\n'), /does not itself approve implementation/);

const reportResource = requireResource(firstReport.validationUri);
const reportPayload = JSON.parse(
  (await reportResource.handler(new URL(reportResource.uri))).contents[0]!.text
) as typeof firstReport;

assert.equal(reportPayload.id, firstReport.id);
assert.equal(reportPayload.validationUri, firstReport.validationUri);
assert.equal(reportPayload.status, 'missing-required-fields');
assert.equal(reportPayload.summary.readyForImplementation, false);
assert.ok(reportPayload.issues.some((issue) => issue.code === 'missing-required-field'));

const searchResults = search('approval validation missing required fields ready implementation boundary', {
  type: 'canon-registry',
  property: 'ltd',
  limit: 20
});

assert.ok(
  searchResults.some((result) =>
    result.item.id === 'canon-overlay-candidate-promotion-approval-validation:collection'
  ),
  'Expected search to include the approval validation report collection'
);
assert.ok(
  searchResults.some((result) =>
    result.item.id === `canon-overlay-candidate-promotion-approval-validation:${firstReport.intakeId}`
  ),
  'Expected search to include a per-candidate approval validation report'
);

console.log('Canon overlay candidate promotion approval validation resources smoke passed.');

function requireResource(uri: string) {
  const resource = resources.find((entry) => entry.uri === uri);
  assert.ok(resource, `Expected MCP resource to be registered: ${uri}`);
  return resource;
}
