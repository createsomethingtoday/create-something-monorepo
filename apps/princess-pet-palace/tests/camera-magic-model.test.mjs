import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMERA_MAGIC_COPY,
  CAMERA_MAGIC_PREFERENCE_KEY,
  CAMERA_PENDING_COLLAPSE_MS,
  cameraErrorMessage,
  measureMotion,
  shouldCollapseCameraRequest,
  shouldCompactCamera,
  shouldAutoStartCamera,
} from "../app/camera-magic-model.ts";

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

test("starts camera magic automatically unless it was turned off", () => {
  assert.equal(CAMERA_MAGIC_PREFERENCE_KEY, "princess-pet-palace-camera-v1");
  assert.equal(shouldAutoStartCamera("unknown"), true);
  assert.equal(shouldAutoStartCamera("enabled"), true);
  assert.equal(shouldAutoStartCamera("disabled"), false);
  assert.equal(CAMERA_MAGIC_COPY.startLabel, "Try camera magic");
  assert.equal(CAMERA_MAGIC_COPY.requestingPrompt, "Princess is opening the magic mirror…");
  assert.doesNotMatch(CAMERA_MAGIC_COPY.idlePrompt, /tap the camera/i);
  assert.doesNotMatch(Object.values(CAMERA_MAGIC_COPY).join(" "), /grown-up|adult|unlock|privacy/i);
});

test("gets an unanswered browser camera prompt out of the child’s way", () => {
  assert.equal(CAMERA_PENDING_COLLAPSE_MS, 6500);
  assert.equal(shouldCollapseCameraRequest(6499, "requesting"), false);
  assert.equal(shouldCollapseCameraRequest(6500, "requesting"), true);
  assert.equal(shouldCollapseCameraRequest(9000, "active"), false);
  assert.match(CAMERA_MAGIC_COPY.collapsedPrompt, /keep playing/i);
  assert.equal(shouldCompactCamera("error", false, "unknown"), true);
  assert.equal(shouldCompactCamera("idle", false, "disabled"), true);
  assert.equal(shouldCompactCamera("idle", false, "unknown"), false);
});
