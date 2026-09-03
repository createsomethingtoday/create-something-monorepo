import assert from "node:assert/strict";
import test from "node:test";

import { FRIENDLY_SPEECH_SETTINGS, STATIC_NARRATION_PLAYBACK_RATE, pickFriendlyVoice } from "../app/speech-guide.ts";

test("prefers a warm device-local English voice", () => {
  const voices = [
    { name: "Remote Ava", lang: "en-US", localService: false, default: true },
    { name: "Compact English", lang: "en-US", localService: true, default: true },
    { name: "Samantha (Enhanced)", lang: "en-US", localService: true, default: false },
    { name: "Amelie", lang: "fr-FR", localService: true, default: false },
  ];

  assert.equal(pickFriendlyVoice(voices)?.name, "Samantha (Enhanced)");
});

test("uses calm, natural speech settings", () => {
  assert.ok(FRIENDLY_SPEECH_SETTINGS.rate >= 0.98);
  assert.ok(FRIENDLY_SPEECH_SETTINGS.rate <= 1.05);
  assert.ok(FRIENDLY_SPEECH_SETTINGS.pitch >= 0.98);
  assert.ok(FRIENDLY_SPEECH_SETTINGS.pitch <= 1.04);
  assert.ok(STATIC_NARRATION_PLAYBACK_RATE >= 1.02);
  assert.ok(STATIC_NARRATION_PLAYBACK_RATE <= 1.06);
});
