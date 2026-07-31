import assert from "node:assert/strict";
import test from "node:test";

import { POSE_MODEL_URL, POSE_WASM_ROOT } from "../app/pose-landmarker.ts";

test("pins the browser-local pose runtime and model assets", () => {
  assert.match(POSE_WASM_ROOT, /@mediapipe\/tasks-vision@1\.0\.0\/wasm$/);
  assert.match(POSE_MODEL_URL, /pose_landmarker_lite\/float16\/1\/pose_landmarker_lite\.task$/);
  assert.doesNotMatch(`${POSE_WASM_ROOT} ${POSE_MODEL_URL}`, /latest/);
});
