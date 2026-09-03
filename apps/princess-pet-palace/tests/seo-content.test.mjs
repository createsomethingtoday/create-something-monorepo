import assert from "node:assert/strict";
import test from "node:test";

import { AI_VOICE_DISCLOSURE, faqItems } from "../app/seo-content.ts";

test("describes automatic camera play and the one browser permission", () => {
  const cameraGuide = faqItems.find((item) => item.question === "How does camera magic work?");

  assert.ok(cameraGuide);
  assert.match(cameraGuide.answer, /starts automatically/i);
  assert.match(cameraGuide.answer, /browser may ask once/i);
  assert.match(cameraGuide.answer, /recognizes the requested royal move/i);
  assert.match(cameraGuide.answer, /next room/i);
  assert.match(cameraGuide.answer, /video is not saved/i);
  assert.doesNotMatch(cameraGuide.answer, /grown-up|adult|unlock|privacy/i);
});

test("clearly identifies the generated narration voice", () => {
  assert.match(AI_VOICE_DISCLOSURE, /AI-generated voice/i);
  assert.match(AI_VOICE_DISCLOSURE, /not a human voice/i);
});
