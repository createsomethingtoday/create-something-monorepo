#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  getCanonOverlayCandidatePromotionPlan,
  listCanonOverlayCandidatePromotionPlanIds,
  renderCanonOverlayCandidatePromotionPlan
} from '../src/canon-overlay-candidate-promotion-plan.js';

const ids = listCanonOverlayCandidatePromotionPlanIds();

assert.ok(ids.length > 0, 'Expected the MCP promotion plan helper to see generated plans');

const plan = getCanonOverlayCandidatePromotionPlan(ids[0]!);

assert.ok(plan, 'Expected to resolve a generated Canon overlay candidate promotion plan');

const rendered = renderCanonOverlayCandidatePromotionPlan(plan);

assert.match(rendered, /^# .+ promotion plan/m);
assert.match(rendered, /Promotion plan: canon:\/\/overlays\/candidates\/.+\/promotion-plan/);
assert.match(rendered, /canon:\/\/overlays\/candidates\/.+\/promotion-plan/);
assert.match(rendered, /## Preconditions/);
assert.match(rendered, /Human maintainer approval/);
assert.match(rendered, /## Approval Boundary/);
assert.match(rendered, /does not approve implementation/);
assert.match(rendered, /Stop before creating Linear work automatically from this plan/);

const byCandidateId = getCanonOverlayCandidatePromotionPlan(plan.candidateId);
const byPacketId = getCanonOverlayCandidatePromotionPlan(plan.packetId);
const byPlanId = getCanonOverlayCandidatePromotionPlan(plan.id);

assert.equal(byCandidateId?.intakeId, plan.intakeId);
assert.equal(byPacketId?.intakeId, plan.intakeId);
assert.equal(byPlanId?.intakeId, plan.intakeId);

console.log('Canon overlay candidate promotion plan tool smoke passed.');
