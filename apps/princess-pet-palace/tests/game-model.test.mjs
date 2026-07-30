import assert from "node:assert/strict";
import test from "node:test";

import { SUCCESS_ADVANCE_DELAY_MS, TRY_AGAIN_DELAY_MS, countPetTap, createJourney } from "../app/game-model.ts";

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

test("gives counting rooms simple, natural instructions", () => {
  const journey = createJourney(() => 0.42);
  const countRooms = journey.filter((room) => room.kind === "count");

  assert.ok(countRooms.length > 0);
  assert.ok(countRooms.every((room) => /^Tap each [a-z]+!$/.test(room.prompt)));
  assert.ok(countRooms.every((room) => /^Let’s count one by one\. Tap each [a-z]+ to count them\.$/.test(room.spokenPrompt)));
});

test("gives every room a visible learning goal and skill-specific feedback", () => {
  const journey = createJourney(() => 0.42);

  assert.ok(journey.every((room) => room.skillLabel.length > 0));
  assert.ok(journey.every((room) => room.learningGoal.length > 0));
  assert.ok(journey.every((room) => room.successMessage.length > 0));
  assert.ok(journey.every((room) => room.tryAgainMessage.length > 0));

  const letterRoom = journey.find((room) => room.kind === "letter");
  const countRoom = journey.find((room) => room.kind === "count");
  const moveRoom = journey.find((room) => room.kind === "move");

  assert.equal(letterRoom.skillLabel, "Letter sounds");
  assert.match(letterRoom.spokenPrompt, /^Listen for [A-Z] at the start\./);
  assert.match(letterRoom.successMessage, /^[A-Z] is for [a-z]+!$/);
  assert.equal(countRoom.skillLabel, "Counting one by one");
  assert.match(countRoom.successMessage, /^You counted [3-6] [a-z]+!$/);
  assert.equal(moveRoom.skillLabel, "Balance and movement");
  assert.match(moveRoom.spokenPrompt, /^Make a little space\./);
  assert.match(moveRoom.successMessage, /^You moved for 5 seconds!$/);
  assert.ok(SUCCESS_ADVANCE_DELAY_MS >= 2000, "success feedback should remain long enough to hear");
  assert.ok(TRY_AGAIN_DELAY_MS >= 1500, "try-again guidance should not disappear too quickly");
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
