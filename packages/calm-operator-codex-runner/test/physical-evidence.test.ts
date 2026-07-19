import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PhysicalEvidenceError, PhysicalPassCollector } from '../src/index.js';

describe('Core Ink physical evidence collector', () => {
  it('accepts only a firmware-backed two-button sequence with one correlated terminal receipt', () => {
    const collector = new PhysicalPassCollector();
    collector.push('[ink] boot firmware=0.2.0', '2026-07-19T18:00:00.000Z');
    collector.push('[ink][codex] state=ready request= receipt=', '2026-07-19T18:00:01.000Z');
    collector.push('[ink][codex] physical_select source=B', '2026-07-19T18:00:02.000Z');
    collector.push('[ink][codex] armed task=task-1 action=action-1', '2026-07-19T18:00:02.010Z');
    collector.push('[ink][codex] physical_select source=B', '2026-07-19T18:00:03.000Z');
    collector.push(
      '[ink][codex] confirmed task=task-1 action=action-1 nonce=boot:press-1',
      '2026-07-19T18:00:03.010Z'
    );
    collector.push(
      '[ink][codex] state=queued request=11111111-1111-4111-8111-111111111111 receipt=',
      '2026-07-19T18:00:03.200Z'
    );
    collector.push(
      '[ink][codex] state=accepted request=11111111-1111-4111-8111-111111111111 receipt=accepted',
      '2026-07-19T18:00:05.000Z'
    );

    assert.equal(collector.done(), true);
    assert.deepEqual(collector.result(), {
      firmware_version: '0.2.0',
      task_id: 'task-1',
      action_id: 'action-1',
      device_nonce: 'boot:press-1',
      request_id: '11111111-1111-4111-8111-111111111111',
      receipt_status: 'accepted',
      physical_selects: 2,
      armed_at: '2026-07-19T18:00:02.010Z',
      confirmed_at: '2026-07-19T18:00:03.010Z',
      accepted_at: '2026-07-19T18:00:05.000Z',
      serial_events: collector.result().serial_events
    });
  });

  it('rejects a software-looking sequence without firmware and physical button evidence', () => {
    const collector = new PhysicalPassCollector();
    assert.throws(
      () => collector.push('[ink][codex] physical_select source=B', '2026-07-19T18:00:00.000Z'),
      (error: unknown) => error instanceof PhysicalEvidenceError && error.code === 'unverified_firmware'
    );
  });

  it('rejects expiry, changed actions, mismatched receipts, and extra physical selection', () => {
    const expired = primed();
    assert.throws(
      () => expired.push('[ink][codex] arm_expired', '2026-07-19T18:00:03.000Z'),
      (error: unknown) => error instanceof PhysicalEvidenceError && error.code === 'arm_expired'
    );

    const changed = primed();
    changed.push('[ink][codex] physical_select source=EXT', '2026-07-19T18:00:03.000Z');
    assert.throws(
      () => changed.push(
        '[ink][codex] confirmed task=task-1 action=action-2 nonce=boot:press-1',
        '2026-07-19T18:00:03.010Z'
      ),
      (error: unknown) => error instanceof PhysicalEvidenceError && error.code === 'action_changed'
    );

    const mismatch = confirmed();
    mismatch.push(
      '[ink][codex] state=queued request=11111111-1111-4111-8111-111111111111 receipt=',
      '2026-07-19T18:00:03.200Z'
    );
    assert.throws(
      () => mismatch.push(
        '[ink][codex] state=accepted request=22222222-2222-4222-8222-222222222222 receipt=accepted',
        '2026-07-19T18:00:05.000Z'
      ),
      (error: unknown) => error instanceof PhysicalEvidenceError && error.code === 'receipt_mismatch'
    );
  });
});

function primed(): PhysicalPassCollector {
  const collector = new PhysicalPassCollector();
  collector.push('[ink] boot firmware=0.2.0', '2026-07-19T18:00:00.000Z');
  collector.push('[ink][codex] physical_select source=B', '2026-07-19T18:00:02.000Z');
  collector.push('[ink][codex] armed task=task-1 action=action-1', '2026-07-19T18:00:02.010Z');
  return collector;
}

function confirmed(): PhysicalPassCollector {
  const collector = primed();
  collector.push('[ink][codex] physical_select source=B', '2026-07-19T18:00:03.000Z');
  collector.push(
    '[ink][codex] confirmed task=task-1 action=action-1 nonce=boot:press-1',
    '2026-07-19T18:00:03.010Z'
  );
  return collector;
}
