#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  getCanonOverlayCandidatePromotionApprovalRecord,
  listCanonOverlayCandidatePromotionApprovalRecordIds,
  renderCanonOverlayCandidatePromotionApprovalRecord
} from '../src/canon-overlay-candidate-promotion-approval-record.js';

const ids = listCanonOverlayCandidatePromotionApprovalRecordIds();

assert.equal(ids.length, 2, 'Expected the MCP approval-record helper to see both generated records');

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

console.log('Canon overlay candidate promotion approval-record tool smoke passed.');
