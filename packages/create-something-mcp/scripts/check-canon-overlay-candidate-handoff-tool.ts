#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  getCanonOverlayCandidateReviewPacket,
  listCanonOverlayCandidateReviewPacketIds,
  renderCanonOverlayCandidateReviewHandoff
} from '../src/canon-overlay-candidate-handoff.js';

const ids = listCanonOverlayCandidateReviewPacketIds();

assert.ok(ids.length > 0, 'Expected the MCP handoff tool helper to see generated packets');

const packet = getCanonOverlayCandidateReviewPacket(ids[0]!);

assert.ok(packet, 'Expected to resolve a generated Canon overlay candidate review packet');

const rendered = renderCanonOverlayCandidateReviewHandoff(packet);

assert.match(rendered, /^# .+ review packet/m);
assert.match(rendered, /Candidate resource: canon:\/\/overlays\/candidates\/.+/);
assert.match(rendered, /## Approval Boundary/);
assert.match(rendered, /does not create Linear issues/);
assert.match(rendered, /Open promotion work only after explicit human approval/);
assert.match(rendered, /Do not mark stable until every stop-before-stable item is resolved/);

const byCandidateId = getCanonOverlayCandidateReviewPacket(packet.candidateId);
const byPacketId = getCanonOverlayCandidateReviewPacket(packet.id);

assert.equal(byCandidateId?.intakeId, packet.intakeId);
assert.equal(byPacketId?.intakeId, packet.intakeId);

console.log('Canon overlay candidate handoff tool smoke passed.');
