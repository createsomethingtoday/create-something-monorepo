#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  applyCanonOverlayCandidatePromotionApprovalTarget,
  buildCanonOverlayCandidatePromotionApprovalTargetTemplate,
  getCanonOverlayCandidatePromotionApprovalRecord,
  listCanonOverlayCandidatePromotionApprovalRecordIds,
  renderCanonOverlayCandidatePromotionApprovalRecord,
  renderCanonOverlayCandidatePromotionApprovalTargetTemplate,
  renderCanonOverlayCandidatePromotionApprovalValidationReport,
  validateCanonOverlayCandidatePromotionApprovalRecord
} from '../src/canon-overlay-candidate-promotion-approval-record.js';

const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();

assert.ok(ids.length > 0, 'Expected the MCP approval-record helper to see generated records');

const record = getCanonOverlayCandidatePromotionApprovalRecord(ids[0]!);

assert.ok(record, 'Expected to resolve a generated Canon overlay candidate promotion approval record');

const rendered = renderCanonOverlayCandidatePromotionApprovalRecord(record);

assert.match(rendered, /^# .+ approval record/m);
assert.match(rendered, /## Source URIs/);
assert.match(rendered, /canon:\/\/overlays\/candidates\/.+\/approval-record/);
assert.match(rendered, /Approval Owner/);
assert.match(rendered, /Current value: UNSET/);
assert.match(rendered, /## Target Hints/);
assert.match(rendered, /does not itself approve implementation/);
assert.match(rendered, /Stop before: automatically creating Linear work/);

const template = buildCanonOverlayCandidatePromotionApprovalTargetTemplate(record);
const renderedTemplate = renderCanonOverlayCandidatePromotionApprovalTargetTemplate(template);

assert.equal(template.targetTemplateUri, `${record.approvalUri}/target-template`);
assert.equal(Object.values(template.target).every((value) => value === null), true);
assert.ok(template.allowedValues.registryActions.includes('reuse-existing'));
assert.ok(template.allowedValues.maturityTargets.includes('candidate'));
assert.match(renderedTemplate, /Target JSON/);
assert.match(renderedTemplate, /"approvalOwner": null/);
assert.match(renderedTemplate, /Stop before: automatically filling target fields/);

const byCandidateId = getCanonOverlayCandidatePromotionApprovalRecord(record.candidateId);
const byPlanId = getCanonOverlayCandidatePromotionApprovalRecord(record.planId);
const byReadinessReportId = getCanonOverlayCandidatePromotionApprovalRecord(
  record.readinessReportId
);
const byRecordId = getCanonOverlayCandidatePromotionApprovalRecord(record.id);

assert.equal(byCandidateId?.intakeId, record.intakeId);
assert.equal(byPlanId?.intakeId, record.intakeId);
assert.equal(byReadinessReportId?.intakeId, record.intakeId);
assert.equal(byRecordId?.intakeId, record.intakeId);

const emptyValidation = validateCanonOverlayCandidatePromotionApprovalRecord(record);

assert.equal(emptyValidation.status, 'missing-required-fields');
assert.equal(emptyValidation.summary.readyForImplementation, false);
assert.equal(emptyValidation.summary.missingRequiredFields, 9);

const registryItem = record.targetHints.registryItems[0]!;
const exportPolicy = record.targetHints.exportPolicies[0]!;
const docsPath = record.targetHints.docsPaths[0]!;
const filledRecord = applyCanonOverlayCandidatePromotionApprovalTarget(record, {
  approvalOwner: 'Micah Johnson',
  approvalEvidence: 'Linear CRE-1012 MCP validation fixture',
  approvedAt: '2026-07-05',
  registryAction: 'reuse-existing',
  registryItemId: registryItem.id,
  exportPath: exportPolicy.exportPath,
  exportName: exportPolicy.exportName ?? null,
  docsPath,
  maturityTarget: 'candidate',
  implementationOwner: 'Canon implementation lane'
});
const readyValidation = validateCanonOverlayCandidatePromotionApprovalRecord(filledRecord);

assert.equal(readyValidation.status, 'ready-for-implementation');
assert.equal(readyValidation.summary.readyForImplementation, true);
assert.equal(readyValidation.summary.errorCount, 0);

const invalidRecord = applyCanonOverlayCandidatePromotionApprovalTarget(record, {
  approvalOwner: 'Micah Johnson',
  approvalEvidence: 'Linear CRE-1012 MCP invalid fixture',
  approvedAt: 'not a date',
  registryAction: 'delete-existing',
  registryItemId: registryItem.id,
  exportPath: exportPolicy.exportPath,
  exportName: exportPolicy.exportName ?? null,
  docsPath,
  maturityTarget: 'retired',
  implementationOwner: 'Canon implementation lane'
});
const invalidValidation = validateCanonOverlayCandidatePromotionApprovalRecord(invalidRecord);

assert.equal(invalidValidation.status, 'invalid-targets');
assert.deepEqual(invalidValidation.issues.map((issue) => issue.code), [
  'invalid-approved-at',
  'invalid-registry-action',
  'invalid-maturity-target'
]);

const renderedValidation = renderCanonOverlayCandidatePromotionApprovalValidationReport(emptyValidation);

assert.match(renderedValidation, /Missing required fields: 9/);
assert.match(renderedValidation, /Ready for implementation: no/);
assert.match(renderedValidation, /does not itself approve implementation/);
assert.match(renderedValidation, /Stop before: automatically creating Linear work/);

console.log('Canon overlay candidate promotion approval-record tool smoke passed.');
