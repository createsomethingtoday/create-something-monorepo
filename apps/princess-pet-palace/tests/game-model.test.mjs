import assert from "node:assert/strict";
import test from "node:test";

import { countPetTap, createJourney } from "../app/game-model.ts";

test("creates a varied six-room palace journey with every activity", () => {
  const randomValues = [0.12, 0.76, 0.34, 0.91, 0.48, 0.63];
  let index = 0;
  const journey = createJourney(() => randomValues[index++ % randomValues.length]);

  assert.equal(journey.length, 6);
  assert.deepEqual(
    journey.map((room) => room.kind).sort(),
    ["count", "count", "letter", "letter", "move", "move"],
  );
  assert.equal(new Set(journey.map((room) => room.id)).size, journey.length);
  assert.ok(journey.every((room) => room.prompt.length > 0));
  assert.ok(journey.every((room) => room.spokenPrompt.length > 0));
});

test("counts each pet once and completes only after every pet is tapped", () => {
  const first = countPetTap([], 2, 3);
  assert.deepEqual(first, { selected: [2], spokenNumber: 1, complete: false });

  const duplicate = countPetTap(first.selected, 2, 3);
  assert.deepEqual(duplicate, first);

  const second = countPetTap(first.selected, 0, 3);
  const third = countPetTap(second.selected, 1, 3);
  assert.deepEqual(third, { selected: [2, 0, 1], spokenNumber: 3, complete: true });
});
