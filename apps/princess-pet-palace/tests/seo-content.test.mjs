import assert from "node:assert/strict";
import test from "node:test";

import { AI_VOICE_DISCLOSURE, faqItems } from "../app/seo-content.ts";

test("describes direct camera play without an adult unlock", () => {
  const cameraGuide = faqItems.find((item) => item.question === "How does camera magic work?");

  assert.ok(cameraGuide);
  assert.match(cameraGuide.answer, /Tap Make camera magic/i);
  assert.doesNotMatch(cameraGuide.answer, /grown-up|adult|unlock|privacy/i);
});

test("clearly identifies the generated narration voice", () => {
  assert.match(AI_VOICE_DISCLOSURE, /AI-generated voice/i);
  assert.match(AI_VOICE_DISCLOSURE, /not a human voice/i);
});
