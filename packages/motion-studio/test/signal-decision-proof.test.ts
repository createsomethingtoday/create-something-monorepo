import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SIGNAL_DECISION_PROOF_CONFIG,
  getSignalDecisionProofState,
} from '../src/compositions/SignalDecisionProof';

test('moves one signal monotonically through the gate before issuing proof', () => {
  let previousX = Number.NEGATIVE_INFINITY;

  for (let frame = 0; frame < SIGNAL_DECISION_PROOF_CONFIG.durationInFrames; frame += 1) {
    const state = getSignalDecisionProofState(frame);
    assert.ok(state.signalX >= previousX, `signal reversed at frame ${frame}`);
    previousX = state.signalX;
  }

  const atDecision = getSignalDecisionProofState(8 * SIGNAL_DECISION_PROOF_CONFIG.fps);
  assert.equal(atDecision.phase, 'decision');
  assert.equal(atDecision.receiptProgress, 0);

  const afterGate = getSignalDecisionProofState(14 * SIGNAL_DECISION_PROOF_CONFIG.fps);
  assert.equal(afterGate.phase, 'action');
  assert.ok(afterGate.signalX > SIGNAL_DECISION_PROOF_CONFIG.gateX);
  assert.equal(afterGate.receiptProgress, 0);

  const terminal = getSignalDecisionProofState(19 * SIGNAL_DECISION_PROOF_CONFIG.fps);
  assert.equal(terminal.phase, 'terminal-hold');
  assert.ok(terminal.signalX > SIGNAL_DECISION_PROOF_CONFIG.gateX);
  assert.equal(terminal.receiptProgress, 1);
});
