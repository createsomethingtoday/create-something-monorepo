import assert from "node:assert/strict";
import test from "node:test";

import {
  POST_NARRATION_PAUSE_MS,
  MOVEMENT_CAMERA_GRACE_MS,
  ROYAL_PLAYER_NAME,
  SUCCESS_ADVANCE_DELAY_MS,
  TRY_AGAIN_DELAY_MS,
  countPetTap,
  canUsePalaceHomeButton,
  createJourney,
  getPrincessCoachCue,
  getRoyalPlayerLabels,
  getLetterChoiceFeedback,
  getRoomInstructionCues,
  remainingNarrationHoldMs,
  shouldAcceptPoseCompletion,
  canInteractWithRoom,
} from "../app/game-model.ts";

test("makes Stella the princess's named play companion", () => {
  assert.equal(ROYAL_PLAYER_NAME, "Stella");
  assert.deepEqual(getRoyalPlayerLabels(), {
    greeting: "Hi, Stella!",
    party: "Stella's royal party",
    title: "Princess Stella",
    celebration: "Stella is a Palace Learning Star!",
  });
});

test("prevents an accidental palace exit in the middle of a room", () => {
  assert.equal(canUsePalaceHomeButton("home"), true);
  assert.equal(canUsePalaceHomeButton("celebrate"), true);
  assert.equal(canUsePalaceHomeButton("journey"), false);
});

test("accepts a matched movement only after the princess finishes the instruction", () => {
  assert.equal(shouldAcceptPoseCompletion({ instructionFinished: false, poseMatched: true, fallbackRunning: false, alreadyComplete: false }), false);
  assert.equal(shouldAcceptPoseCompletion({ instructionFinished: true, poseMatched: false, fallbackRunning: false, alreadyComplete: false }), false);
  assert.equal(shouldAcceptPoseCompletion({ instructionFinished: true, poseMatched: true, fallbackRunning: true, alreadyComplete: false }), false);
  assert.equal(shouldAcceptPoseCompletion({ instructionFinished: true, poseMatched: true, fallbackRunning: false, alreadyComplete: true }), false);
  assert.equal(shouldAcceptPoseCompletion({ instructionFinished: true, poseMatched: true, fallbackRunning: false, alreadyComplete: false }), true);
});

test("locks every room interaction while the princess is speaking", () => {
  assert.equal(canInteractWithRoom({ instructionPlaying: true, feedbackActive: false, turnNarrating: false }), false);
  assert.equal(canInteractWithRoom({ instructionPlaying: false, feedbackActive: true, turnNarrating: false }), false);
  assert.equal(canInteractWithRoom({ instructionPlaying: false, feedbackActive: false, turnNarrating: true }), false);
  assert.equal(canInteractWithRoom({ instructionPlaying: false, feedbackActive: false, turnNarrating: false }), true);
});

test("gives camera recognition a calm head start before the timer fallback appears", () => {
  assert.ok(MOVEMENT_CAMERA_GRACE_MS >= 4_000);
  assert.ok(MOVEMENT_CAMERA_GRACE_MS <= 6_000);
});

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
  assert.ok(
    journey.every((room, index) => index === 0 || room.kind !== journey[index - 1].kind),
    "a preschool journey should not repeat the same activity twice in a row",
  );
});

test("gives counting rooms simple, natural instructions", () => {
  const journey = createJourney(() => 0.42);
  const countRooms = journey.filter((room) => room.kind === "count");

  assert.ok(countRooms.length > 0);
  assert.ok(countRooms.every((room) => /^Tap each [a-z]+!$/.test(room.prompt)));
  assert.ok(countRooms.every((room) => /^Let’s count one by one\. Tap each [a-z]+ to count them\.$/.test(room.spokenPrompt)));
});

test("speaks letter choices from left to right before asking Stella to choose", () => {
  const journey = createJourney(() => 0.42);
  const letterRoom = journey.find((room) => room.kind === "letter");
  const cues = getRoomInstructionCues(letterRoom);

  assert.equal(cues[0], letterRoom.narration.prompt);
  assert.deepEqual(
    cues.slice(1, -1).map((cue) => cue.id),
    letterRoom.challenge.choices.map((choice) => `animal-${choice.name}`),
  );
  assert.equal(cues.at(-1).id, `letter-${letterRoom.challenge.answer.toLowerCase()}-question`);

  const countRoom = journey.find((room) => room.kind === "count");
  const moveRoom = journey.find((room) => room.kind === "move");
  assert.deepEqual(getRoomInstructionCues(countRoom), [countRoom.narration.prompt]);
  assert.deepEqual(getRoomInstructionCues(moveRoom), [moveRoom.narration.prompt]);
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
  assert.ok(moveRoom.challenge.poseEmoji.length > 0);
  assert.ok(moveRoom.challenge.poseLabel.length > 0);
  assert.match(getPrincessCoachCue(moveRoom, null).visual, new RegExp(moveRoom.challenge.poseEmoji));
  assert.match(moveRoom.spokenPrompt, /^Make a little space\./);
  assert.match(moveRoom.successMessage, /^You moved for 5 seconds!$/);
  assert.ok(moveRoom.challenge.rewardAnimal.length > 0);
  assert.ok(SUCCESS_ADVANCE_DELAY_MS >= 2000, "success feedback should remain long enough to hear");
  assert.ok(TRY_AGAIN_DELAY_MS >= 1500, "try-again guidance should not disappear too quickly");
});

test("every royal move adds an animal friend instead of a prop", () => {
  const seen = new Map();
  for (let seed = 1; seed <= 100; seed += 1) {
    for (const room of createJourney(() => (seed % 97) / 97)) {
      if (room.kind === "move") seen.set(room.challenge.id, room.challenge.rewardAnimal);
    }
  }

  assert.equal(seen.size, 4);
  assert.ok([...seen.values()].every((reward) => !["👑", "⭐", "🎀"].includes(reward)));
});

test("counts each pet once and completes only after every pet is tapped", () => {
  const first = countPetTap([], 2, 3);
  assert.deepEqual(first, { selected: [2], spokenNumber: 1, narrationCueId: "number-1", complete: false });

  const duplicate = countPetTap(first.selected, 2, 3);
  assert.deepEqual(duplicate, first);

  const second = countPetTap(first.selected, 0, 3);
  const third = countPetTap(second.selected, 1, 3);
  assert.deepEqual(third, { selected: [2, 0, 1], spokenNumber: 3, narrationCueId: "number-3", complete: true });
});

test("gives the princess a visual, no-reading-needed coaching cue in every state", () => {
  const journey = createJourney(() => 0.42);
  const letterRoom = journey.find((room) => room.kind === "letter");
  const countRoom = journey.find((room) => room.kind === "count");
  const moveRoom = journey.find((room) => room.kind === "move");

  assert.match(getPrincessCoachCue(letterRoom, null).visual, /👂/);
  assert.match(getPrincessCoachCue(countRoom, null).visual, /☝️/);
  assert.match(getPrincessCoachCue(moveRoom, null).visual, /✨/);
  assert.equal(getPrincessCoachCue(letterRoom, "success").visual, "👑 ✨");
  assert.equal(getPrincessCoachCue(letterRoom, "try").visual, "💜 ↻");
  assert.ok(journey.every((room) => getPrincessCoachCue(room, null).ariaLabel.length > 0));
});

test("keeps feedback visible through narration plus a short breathing pause", () => {
  assert.ok(POST_NARRATION_PAUSE_MS >= 350);
  assert.equal(remainingNarrationHoldMs(2200, 400), 1800);
  assert.equal(remainingNarrationHoldMs(2200, 3000), POST_NARRATION_PAUSE_MS);
});

test("turns a wrong letter choice into a concrete sound contrast", () => {
  const room = createJourney(() => 0.42).find((candidate) => candidate.kind === "letter");
  const challenge = room.challenge;
  const wrongIndex = challenge.choices.findIndex((choice) => choice.letter !== challenge.answer);
  const wrongChoice = challenge.choices[wrongIndex];
  const answerChoice = challenge.choices.find((choice) => choice.letter === challenge.answer);
  const feedback = getLetterChoiceFeedback(challenge, wrongIndex);

  assert.equal(feedback.title, `${wrongChoice.name[0].toUpperCase()}${wrongChoice.name.slice(1)} starts with ${wrongChoice.letter}`);
  assert.equal(feedback.message, `Listen for ${challenge.answer}: ${answerChoice.name}!`);
  assert.match(feedback.visual, new RegExp(`${wrongChoice.emoji}.*${wrongChoice.letter}`));
});
