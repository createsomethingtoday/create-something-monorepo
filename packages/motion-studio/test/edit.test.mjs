import assert from 'node:assert/strict';
import test from 'node:test';

import { planEdit } from '../dist/scene/index.js';

test('rerenders only the changed beat cell and its downstream beats', () => {
  const edit = planEdit(
    {
      id: 'create-something.signal-decision-proof.v3',
      format: {
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        deliveryDurationSeconds: 18,
        authoredFps: 12,
        deliveryFps: 24,
        burnedInCaptions: false,
      },
      elements: [
        { id: 'signal', asset: 'signal.v1', role: 'input', editable: true },
        { id: 'proof-receipt', asset: 'proof.v1', role: 'evidence', editable: true },
      ],
      beats: [
        {
          id: 'proof',
          startSeconds: 0,
          endSeconds: 10,
          focus: ['signal', 'proof-receipt'],
          renderCell: 'existing',
        },
        {
          id: 'proof-resolution',
          startSeconds: 10,
          endSeconds: 16,
          focus: ['proof-receipt'],
          dependsOn: ['proof'],
          renderCell: 'resolution',
        },
        {
          id: 'terminal-hold',
          startSeconds: 16,
          endSeconds: 18,
          focus: ['proof-receipt'],
          dependsOn: ['proof-resolution'],
          renderCell: 'resolution',
        },
      ],
      renderCells: [
        {
          id: 'existing',
          startSeconds: 0,
          endSeconds: 10,
          source: 'existing.mp4',
          generation: 'cached',
        },
        {
          id: 'resolution',
          startSeconds: 10,
          endSeconds: 18,
          source: 'resolution.mp4',
          generation: 'sora',
          durationSeconds: 8,
          draftModel: 'sora-2',
          finalModel: 'sora-2-pro',
        },
      ],
      policy: {
        draft: {
          model: 'sora-2',
          maximumAttemptsPerCell: 2,
          maximumSceneSpendUsd: 1.6,
        },
        final: {
          model: 'sora-2-pro',
          rerenderInvalidatedCellsOnly: true,
          requiresApprovalAboveUsd: 1.2,
          maximumSceneSpendUsd: 3.6,
        },
      },
    },
    { beatId: 'proof-resolution', quality: 'draft' }
  );

  assert.deepEqual(edit.invalidatedBeatIds, ['proof-resolution', 'terminal-hold']);
  assert.deepEqual(edit.invalidatedCellIds, ['resolution']);
  assert.equal(edit.estimatedSpendUsd, 0.8);
  assert.equal(edit.withinBudget, true);
});
