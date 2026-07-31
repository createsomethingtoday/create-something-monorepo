import assert from "node:assert/strict";
import test from "node:test";

import {
  createPoseMatchState,
  evaluatePoseFrame,
} from "../app/pose-match-model.ts";

const visible = (x, y) => ({ x, y, z: 0, visibility: 0.98 });

function pose(overrides = {}) {
  const landmarks = Array.from({ length: 33 }, () => visible(0.5, 0.5));
  const points = {
    11: visible(0.4, 0.35),
    12: visible(0.6, 0.35),
    13: visible(0.32, 0.48),
    14: visible(0.68, 0.48),
    15: visible(0.26, 0.62),
    16: visible(0.74, 0.62),
    23: visible(0.44, 0.62),
    24: visible(0.56, 0.62),
    25: visible(0.44, 0.78),
    26: visible(0.56, 0.78),
    27: visible(0.44, 0.94),
    28: visible(0.56, 0.94),
    ...overrides,
  };
  for (const [index, point] of Object.entries(points)) landmarks[Number(index)] = point;
  return landmarks;
}

function runFrames(challengeId, frames) {
  return frames.reduce(
    (result, landmarks) => evaluatePoseFrame(challengeId, landmarks, result.state),
    { state: createPoseMatchState(), progress: 0, matched: false },
  );
}

test("matches a star only after both raised arms are held", () => {
  const star = pose({
    13: visible(0.3, 0.27),
    14: visible(0.7, 0.27),
    15: visible(0.18, 0.17),
    16: visible(0.82, 0.17),
  });

  assert.equal(runFrames("move-star", [star, star, star]).matched, false);
  assert.equal(runFrames("move-star", [star, star, star, star]).matched, true);
  assert.equal(runFrames("move-star", [pose(), pose(), pose(), pose()]).matched, false);
});

test("matches butterfly wings only after repeated up and down movement", () => {
  const wingsUp = pose({
    13: visible(0.3, 0.37),
    14: visible(0.7, 0.37),
    15: visible(0.2, 0.34),
    16: visible(0.8, 0.34),
  });
  const wingsDown = pose({
    13: visible(0.31, 0.48),
    14: visible(0.69, 0.48),
    15: visible(0.22, 0.67),
    16: visible(0.78, 0.67),
  });

  assert.equal(runFrames("move-butterfly", [wingsUp, wingsUp, wingsUp]).matched, false);
  assert.equal(runFrames("move-butterfly", [wingsUp, wingsDown, wingsUp, wingsDown]).matched, true);
});

test("matches a flamingo balance only after one foot stays lifted", () => {
  const balance = pose({ 27: visible(0.44, 0.75), 28: visible(0.56, 0.94) });

  assert.equal(runFrames("move-flamingo", [balance, balance, balance, balance]).matched, false);
  assert.equal(runFrames("move-flamingo", [balance, balance, balance, balance, balance]).matched, true);
});

test("matches a crown walk only after alternating royal steps", () => {
  const leftStep = pose({ 25: visible(0.44, 0.7), 27: visible(0.44, 0.82) });
  const rightStep = pose({ 26: visible(0.56, 0.7), 28: visible(0.56, 0.82) });

  assert.equal(runFrames("move-crown", [leftStep, rightStep, leftStep]).matched, false);
  assert.equal(runFrames("move-crown", [leftStep, rightStep, leftStep, rightStep]).matched, true);
});
