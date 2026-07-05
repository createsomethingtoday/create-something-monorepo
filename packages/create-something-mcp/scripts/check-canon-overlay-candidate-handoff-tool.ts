#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  getCanonOverlayCandidateReviewPacket,
  listCanonOverlayCandidateReviewPacketIds,
  renderCanonOverlayCandidateReviewHandoff
} from '../src/canon-overlay-candidate-handoff.js';

const ids = listCanonOverlayCandidateReviewPacketIds();

assert.equal(ids.length, 2, 'Expected the MCP handoff tool helper to see both generated packets');

const packet = getCanonOverlayCandidateReviewPacket(ids[0]!);

assert.ok(packet, 'Expected to resolve a generated Canon overlay candidate review packet');

const rendered = renderCanonOverlayCandidateReviewHandoff(packet);

assert.match(rendered, /^# .+ review packet/m);
assert.match(rendered, /## Source URIs/);
assert.match(rendered, /canon:\/\/overlays\/candidates\/.+\/handoff/);
assert.match(rendered, /## Approval Boundary/);
assert.match(rendered, /does not create Linear issues/);
assert.match(rendered, /Open promotion work only after explicit human approval/);
assert.match(rendered, /Stop before: automatically opening Linear work from the packet/);

const byCandidateId = getCanonOverlayCandidateReviewPacket(packet.candidateId);
const byPacketId = getCanonOverlayCandidateReviewPacket(packet.id);

assert.equal(byCandidateId?.intakeId, packet.intakeId);
assert.equal(byPacketId?.intakeId, packet.intakeId);

console.log('Canon overlay candidate handoff tool smoke passed.');
