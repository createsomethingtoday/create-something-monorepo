import assert from "node:assert/strict";
import test from "node:test";

import { CAMERA_MAGIC_COPY, cameraErrorMessage, measureMotion } from "../app/camera-magic-model.ts";

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

test("lets a child start camera magic without a grown-up gate", () => {
  assert.equal(CAMERA_MAGIC_COPY.startLabel, "Make camera magic");
  assert.equal(CAMERA_MAGIC_COPY.idlePrompt, "Tap the camera, then wave to make sparkles!");
  assert.doesNotMatch(Object.values(CAMERA_MAGIC_COPY).join(" "), /grown-up|adult|unlock|privacy/i);
});
