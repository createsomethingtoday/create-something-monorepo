import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

import { createJourney } from "../app/game-model.ts";
import { NARRATION_CATALOG, getNarrationCue } from "../app/speech-guide.ts";

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

test("every randomized room points to static narration with matching fallback copy", () => {
  const seenChallenges = new Set();

  for (let seed = 1; seed <= 120; seed += 1) {
    for (const room of createJourney(seededRandom(seed))) {
      seenChallenges.add(room.challenge.id);
      for (const cue of Object.values(room.narration)) {
        assert.deepEqual(getNarrationCue(cue.id), cue);
        assert.equal(cue.src, `/audio/narration/${cue.id}.mp3`);
        assert.ok(cue.text.length > 0);
      }
    }
  }

  assert.equal(seenChallenges.size, 15, "covers every available learning challenge");
});

test("shared game moments and spoken numbers have static narration", () => {
  const requiredIds = [
    "stella-welcome",
    "sound-on",
    "stella-grand-ballroom",
    "cheer-palace-magic",
    "cheer-you-found-it",
    "cheer-wonderful",
    "cheer-sparkle-power",
    "number-1",
    "number-2",
    "number-3",
    "number-4",
    "number-5",
    "number-6",
  ];

  for (const id of requiredIds) {
    assert.ok(NARRATION_CATALOG[id], `missing narration cue ${id}`);
  }

  assert.match(getNarrationCue("stella-welcome").text, /Stella/);
  assert.match(getNarrationCue("stella-grand-ballroom").text, /Stella/);
});

test("every narration cue ships as a non-empty MP3 asset", async () => {
  for (const cue of Object.values(NARRATION_CATALOG)) {
    const audioPath = new URL(`../public${cue.src}`, import.meta.url);
    const audioStat = await stat(audioPath);
    assert.ok(audioStat.size > 1_000, `${cue.id} should contain generated speech audio`);
  }
});
