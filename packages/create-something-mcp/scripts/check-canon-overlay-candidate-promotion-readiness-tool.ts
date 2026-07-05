#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  getCanonOverlayCandidatePromotionReadinessReport,
  listCanonOverlayCandidatePromotionReadinessReportIds,
  renderCanonOverlayCandidatePromotionReadinessReport
} from '../src/canon-overlay-candidate-promotion-readiness.js';

const ids = listCanonOverlayCandidatePromotionReadinessReportIds();

assert.ok(ids.length > 0, 'Expected the MCP readiness helper to see generated reports');

const report = getCanonOverlayCandidatePromotionReadinessReport(ids[0]!);

assert.ok(
  report,
  'Expected to resolve a generated Canon overlay candidate promotion readiness report'
);

const rendered = renderCanonOverlayCandidatePromotionReadinessReport(report);

assert.match(rendered, /^# .+ readiness report/m);
assert.match(rendered, /Readiness report: canon:\/\/overlays\/candidates\/.+\/readiness/);
assert.match(rendered, /canon:\/\/overlays\/candidates\/.+\/readiness/);
assert.match(rendered, /## Checks/);
assert.match(rendered, /Human Approval/);
assert.match(rendered, /## Related Registry Items/);
assert.match(rendered, /## Candidate Export Policies/);
assert.match(rendered, /does not approve implementation/);
assert.match(rendered, /Stop before: automatically creating Linear issues/);

const byCandidateId = getCanonOverlayCandidatePromotionReadinessReport(report.candidateId);
const byPlanId = getCanonOverlayCandidatePromotionReadinessReport(report.planId);
const byReportId = getCanonOverlayCandidatePromotionReadinessReport(report.id);

assert.equal(byCandidateId?.intakeId, report.intakeId);
assert.equal(byPlanId?.intakeId, report.intakeId);
assert.equal(byReportId?.intakeId, report.intakeId);

console.log('Canon overlay candidate promotion readiness tool smoke passed.');
