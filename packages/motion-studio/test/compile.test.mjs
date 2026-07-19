import assert from "node:assert/strict";
import test from "node:test";

import { compileScene } from "../dist/scene/index.js";

test("compiles a 15-20 second scene into addressable render cells", () => {
  const plan = compileScene({
    id: "create-something.signal-decision-proof.v3",
    format: {
      width: 1280,
      height: 720,
      aspectRatio: "16:9",
      deliveryDurationSeconds: 18,
      authoredFps: 12,
      deliveryFps: 24,
      burnedInCaptions: false
    },
    elements: [
      { id: "signal", asset: "signal.v1", role: "input", editable: true },
      { id: "proof-receipt", asset: "proof.v1", role: "evidence", editable: true }
    ],
    beats: [
      {
        id: "signal",
        startSeconds: 0,
        endSeconds: 10,
        focus: ["signal"],
        renderCell: "existing"
      },
      {
        id: "proof-resolution",
        startSeconds: 10,
        endSeconds: 18,
        focus: ["proof-receipt"],
        dependsOn: ["signal"],
        renderCell: "resolution"
      }
    ],
    renderCells: [
      {
        id: "existing",
        startSeconds: 0,
        endSeconds: 10,
        source: "existing.mp4",
        generation: "cached"
      },
      {
        id: "resolution",
        startSeconds: 10,
        endSeconds: 18,
        source: "resolution.mp4",
        generation: "sora",
        durationSeconds: 8,
        draftModel: "sora-2",
        finalModel: "sora-2-pro"
      }
    ],
    policy: {
      draft: {
        model: "sora-2",
        maximumAttemptsPerCell: 2,
        maximumSceneSpendUsd: 1.6
      },
      final: {
        model: "sora-2-pro",
        rerenderInvalidatedCellsOnly: true,
        requiresApprovalAboveUsd: 1.2,
        maximumSceneSpendUsd: 3.6
      }
    }
  });

  assert.equal(plan.sceneId, "create-something.signal-decision-proof.v3");
  assert.equal(plan.durationSeconds, 18);
  assert.deepEqual(
    plan.cells.map((cell) => ({ id: cell.id, generation: cell.generation })),
    [
      { id: "existing", generation: "cached" },
      { id: "resolution", generation: "sora" }
    ]
  );
});
