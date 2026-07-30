import assert from "node:assert/strict";
import test from "node:test";

import { cameraErrorMessage, measureMotion } from "../app/camera-magic-model.ts";

test("turns local frame changes into a bounded motion level", () => {
  const still = new Uint8ClampedArray([20, 20, 20, 255, 90, 90, 90, 255]);
  const moved = new Uint8ClampedArray([220, 220, 220, 255, 10, 10, 10, 255]);

  assert.equal(measureMotion(still, still), 0);
  assert.ok(measureMotion(still, moved) > 50);
  assert.equal(measureMotion(new Uint8ClampedArray(), moved), 0);
  assert.ok(measureMotion(still, moved) <= 100);
});

test("keeps camera errors friendly and preserves camera-free play", () => {
  assert.match(cameraErrorMessage("NotAllowedError"), /wasn.t allowed/i);
  assert.match(cameraErrorMessage("NotFoundError"), /No camera was found/i);
  assert.match(cameraErrorMessage("UnknownError"), /without it/i);
});
