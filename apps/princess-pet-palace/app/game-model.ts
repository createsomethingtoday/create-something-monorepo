import { getNarrationCue, type NarrationCue } from "./speech-guide.ts";

export type ActivityKind = "letter" | "count" | "move";
export type GameScreen = "home" | "journey" | "celebrate";

export const SUCCESS_ADVANCE_DELAY_MS = 2200;
export const TRY_AGAIN_DELAY_MS = 1800;
export const POST_NARRATION_PAUSE_MS = 400;
export const MOVEMENT_CAMERA_GRACE_MS = 4500;
export const ROYAL_PLAYER_NAME = "Stella";

export function getRoyalPlayerLabels(playerName: string = ROYAL_PLAYER_NAME) {
  return {
    greeting: `Hi, ${playerName}!`,
    party: `${playerName}'s royal party`,
    title: `Princess ${playerName}`,
    celebration: `${playerName} is a Palace Learning Star!`,
  } as const;
}

export function remainingNarrationHoldMs(minimumMs: number, elapsedMs: number): number {
  return Math.max(POST_NARRATION_PAUSE_MS, minimumMs - elapsedMs);
}

export function canUsePalaceHomeButton(screen: GameScreen): boolean {
  return screen !== "journey";
}

export function shouldAcceptPoseCompletion(input: {
  instructionFinished: boolean;
  poseMatched: boolean;
  fallbackRunning: boolean;
  alreadyComplete: boolean;
}): boolean {
  return input.instructionFinished && input.poseMatched && !input.fallbackRunning && !input.alreadyComplete;
}

export function canInteractWithRoom(input: {
  instructionPlaying: boolean;
  feedbackActive: boolean;
  turnNarrating: boolean;
}): boolean {
  return !input.instructionPlaying && !input.feedbackActive && !input.turnNarrating;
}

export type AnimalChoice = {
  emoji: string;
  name: string;
  letter: string;
};

export type LetterChallenge = {
  type: "letter";
  id: string;
  answer: string;
  choices: AnimalChoice[];
};

export type CountChallenge = {
  type: "count";
  id: string;
  animal: string;
  animalSingular: string;
  animalName: string;
  total: number;
};

export type MoveChallenge = {
  type: "move";
  id: string;
  emoji: string;
  rewardAnimal: string;
  poseEmoji: string;
  poseLabel: string;
  title: string;
  action: string;
  seconds: number;
};

export type Challenge = LetterChallenge | CountChallenge | MoveChallenge;

export type JourneyRoom = {
  id: string;
  kind: ActivityKind;
  label: string;
  icon: string;
  skillIcon: string;
  skillLabel: string;
  learningGoal: string;
  prompt: string;
  spokenPrompt: string;
  successMessage: string;
  tryAgainMessage: string;
  narration: {
    prompt: NarrationCue;
    success: NarrationCue;
    tryAgain: NarrationCue;
  };
  challenge: Challenge;
};

export type CountTapResult = {
  selected: number[];
  spokenNumber: number;
  narrationCueId: string;
  complete: boolean;
};

export type PrincessCoachCue = {
  visual: string;
  ariaLabel: string;
};

export type LetterChoiceFeedback = {
  title: string;
  message: string;
  visual: string;
  ariaLabel: string;
};

const animals: AnimalChoice[] = [
  { emoji: "🐰", name: "bunny", letter: "B" },
  { emoji: "🐱", name: "cat", letter: "C" },
  { emoji: "🐶", name: "puppy", letter: "P" },
  { emoji: "🦊", name: "fox", letter: "F" },
  { emoji: "🦁", name: "lion", letter: "L" },
  { emoji: "🐯", name: "tiger", letter: "T" },
];

const letterChallenges: LetterChallenge[] = animals.map((animal, index) => ({
  type: "letter",
  id: `letter-${animal.letter.toLowerCase()}`,
  answer: animal.letter,
  choices: [animal, animals[(index + 2) % animals.length], animals[(index + 4) % animals.length]],
}));

const countChallenges: CountChallenge[] = [
  { type: "count", id: "count-bunnies", animal: "🐰", animalSingular: "bunny", animalName: "bunnies", total: 3 },
  { type: "count", id: "count-kittens", animal: "🐱", animalSingular: "kitten", animalName: "kittens", total: 4 },
  { type: "count", id: "count-unicorns", animal: "🦄", animalSingular: "unicorn", animalName: "unicorns", total: 5 },
  { type: "count", id: "count-puppies", animal: "🐶", animalSingular: "puppy", animalName: "puppies", total: 6 },
  { type: "count", id: "count-butterflies", animal: "🦋", animalSingular: "butterfly", animalName: "butterflies", total: 4 },
];

const moveChallenges: MoveChallenge[] = [
  { type: "move", id: "move-star", emoji: "⭐", rewardAnimal: "🦄", poseEmoji: "🙆‍♀️", poseLabel: "reach up and out", title: "Star stretch", action: "Reach up and out like a sparkly star!", seconds: 5 },
  { type: "move", id: "move-flamingo", emoji: "🦩", rewardAnimal: "🦩", poseEmoji: "🧘‍♀️", poseLabel: "balance on one foot", title: "Flamingo balance", action: "Stand tall and lift one foot like a flamingo!", seconds: 5 },
  { type: "move", id: "move-butterfly", emoji: "🦋", rewardAnimal: "🦋", poseEmoji: "🧚‍♀️", poseLabel: "flap both arms", title: "Butterfly wings", action: "Flap your arms slowly like a butterfly!", seconds: 5 },
  { type: "move", id: "move-crown", emoji: "👑", rewardAnimal: "🐴", poseEmoji: "🚶‍♀️", poseLabel: "take tiny steps", title: "Crown walk", action: "Take five tiny royal steps with a tall back!", seconds: 5 },
];

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function describeRoom(challenge: Challenge): Omit<JourneyRoom, "id"> {
  if (challenge.type === "letter") {
    const cuePrefix = `letter-${challenge.answer.toLowerCase()}`;
    const narration = {
      prompt: getNarrationCue(`${cuePrefix}-prompt`),
      success: getNarrationCue(`${cuePrefix}-success`),
      tryAgain: getNarrationCue(`${cuePrefix}-try`),
    };
    return {
      kind: "letter",
      label: "Letter Garden",
      icon: "🌸",
      skillIcon: "🔤",
      skillLabel: "Letter sounds",
      learningGoal: `Listen for ${challenge.answer} at the start`,
      prompt: `Who starts with ${challenge.answer}?`,
      spokenPrompt: narration.prompt.text,
      successMessage: narration.success.text,
      tryAgainMessage: narration.tryAgain.text,
      narration,
      challenge,
    };
  }

  if (challenge.type === "count") {
    const narration = {
      prompt: getNarrationCue(`${challenge.id}-prompt`),
      success: getNarrationCue(`${challenge.id}-success`),
      tryAgain: getNarrationCue("count-try"),
    };
    return {
      kind: "count",
      label: "Pet Parade",
      icon: "🐾",
      skillIcon: "🔢",
      skillLabel: "Counting one by one",
      learningGoal: `Count ${challenge.total} ${challenge.animalName}`,
      prompt: `Tap each ${challenge.animalSingular}!`,
      spokenPrompt: narration.prompt.text,
      successMessage: narration.success.text,
      tryAgainMessage: narration.tryAgain.text,
      narration,
      challenge,
    };
  }

  const narration = {
    prompt: getNarrationCue(`${challenge.id}-prompt`),
    success: getNarrationCue("move-success"),
    tryAgain: getNarrationCue("move-try"),
  };
  return {
    kind: "move",
    label: "Royal Gym",
    icon: "🎀",
    skillIcon: "🤸‍♀️",
    skillLabel: "Balance and movement",
    learningGoal: `Move for ${challenge.seconds} seconds`,
    prompt: challenge.title,
    spokenPrompt: narration.prompt.text,
    successMessage: narration.success.text,
    tryAgainMessage: narration.tryAgain.text,
    narration,
    challenge,
  };
}

export function countPetTap(selected: number[], petIndex: number, total: number): CountTapResult {
  if (selected.includes(petIndex)) {
    return { selected, spokenNumber: selected.length, narrationCueId: `number-${selected.length}`, complete: selected.length === total };
  }

  const nextSelected = [...selected, petIndex];
  return {
    selected: nextSelected,
    spokenNumber: nextSelected.length,
    narrationCueId: `number-${nextSelected.length}`,
    complete: nextSelected.length === total,
  };
}

export function getLetterChoiceFeedback(
  challenge: LetterChallenge,
  choiceIndex: number,
): LetterChoiceFeedback {
  const choice = challenge.choices[choiceIndex];
  const answerChoice = challenge.choices.find((candidate) => candidate.letter === challenge.answer);
  const choiceName = `${choice.name[0].toUpperCase()}${choice.name.slice(1)}`;

  return {
    title: `${choiceName} starts with ${choice.letter}`,
    message: `Listen for ${challenge.answer}: ${answerChoice?.name ?? challenge.answer}!`,
    visual: `${choice.emoji} → ${choice.letter} · 👂 → ${challenge.answer}`,
    ariaLabel: `${choiceName} starts with ${choice.letter}. Listen for ${challenge.answer}.`,
  };
}

export function getPrincessCoachCue(
  room: JourneyRoom | undefined,
  feedback: "success" | "try" | null,
  listening = false,
): PrincessCoachCue {
  if (listening) {
    return { visual: "🔊 ✨", ariaLabel: "Listen to the princess" };
  }
  if (feedback === "success") {
    return { visual: "👑 ✨", ariaLabel: "The princess celebrates with you" };
  }

  if (feedback === "try") {
    return { visual: "💜 ↻", ariaLabel: "The princess encourages you to try again" };
  }

  if (!room) return { visual: "✨", ariaLabel: "The princess is ready to help" };

  if (room.challenge.type === "letter") {
    return {
      visual: `👂 → ${room.challenge.answer}`,
      ariaLabel: `The princess says to listen for the ${room.challenge.answer} sound`,
    };
  }

  if (room.challenge.type === "count") {
    return {
      visual: `☝️ → ${room.challenge.animal}`,
      ariaLabel: `The princess says to tap and count each ${room.challenge.animalSingular}`,
    };
  }

  return {
    visual: `👸 → ${room.challenge.poseEmoji} ✨`,
    ariaLabel: `The princess shows you how to ${room.challenge.poseLabel}`,
  };
}

export function getRoomInstructionCues(room: JourneyRoom): NarrationCue[] {
  if (room.challenge.type !== "letter") return [room.narration.prompt];

  return [
    room.narration.prompt,
    ...room.challenge.choices.map((choice) => getNarrationCue(`animal-${choice.name}`)),
    getNarrationCue(`letter-${room.challenge.answer.toLowerCase()}-question`),
  ];
}

export function createJourney(random: () => number = Math.random): JourneyRoom[] {
  const firstRound = shuffled<ActivityKind>(["letter", "count", "move"], random);
  const secondRound = shuffled<ActivityKind>(["letter", "count", "move"], random);
  if (secondRound[0] === firstRound[firstRound.length - 1]) {
    const swapIndex = secondRound.findIndex((kind) => kind !== firstRound[firstRound.length - 1]);
    [secondRound[0], secondRound[swapIndex]] = [secondRound[swapIndex], secondRound[0]];
  }
  const kinds = [...firstRound, ...secondRound];
  const letters = shuffled(letterChallenges, random);
  const counts = shuffled(countChallenges, random);
  const moves = shuffled(moveChallenges, random);
  const positions: Record<ActivityKind, number> = { letter: 0, count: 0, move: 0 };

  return kinds.map((kind, index) => {
    const challenge =
      kind === "letter"
        ? letters[positions.letter++]
        : kind === "count"
          ? counts[positions.count++]
          : moves[positions.move++];
    const room = describeRoom(challenge);
    return { ...room, id: `room-${index + 1}-${challenge.id}` };
  });
}
