import { getNarrationCue, type NarrationCue } from "./speech-guide.ts";

export type ActivityKind = "letter" | "count" | "move";

export const SUCCESS_ADVANCE_DELAY_MS = 2200;
export const TRY_AGAIN_DELAY_MS = 1800;
export const POST_NARRATION_PAUSE_MS = 400;

export function remainingNarrationHoldMs(minimumMs: number, elapsedMs: number): number {
  return Math.max(POST_NARRATION_PAUSE_MS, minimumMs - elapsedMs);
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
  complete: boolean;
};

export type PrincessCoachCue = {
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
  { type: "move", id: "move-star", emoji: "⭐", title: "Star stretch", action: "Reach up and out like a sparkly star!", seconds: 5 },
  { type: "move", id: "move-flamingo", emoji: "🦩", title: "Flamingo balance", action: "Stand tall and lift one foot like a flamingo!", seconds: 5 },
  { type: "move", id: "move-butterfly", emoji: "🦋", title: "Butterfly wings", action: "Flap your arms slowly like a butterfly!", seconds: 5 },
  { type: "move", id: "move-crown", emoji: "👑", title: "Crown walk", action: "Take five tiny royal steps with a tall back!", seconds: 5 },
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
    return { selected, spokenNumber: selected.length, complete: selected.length === total };
  }

  const nextSelected = [...selected, petIndex];
  return {
    selected: nextSelected,
    spokenNumber: nextSelected.length,
    complete: nextSelected.length === total,
  };
}

export function getPrincessCoachCue(
  room: JourneyRoom | undefined,
  feedback: "success" | "try" | null,
): PrincessCoachCue {
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
    visual: `${room.challenge.emoji} ✨`,
    ariaLabel: `The princess shows the ${room.challenge.title} move`,
  };
}

export function createJourney(random: () => number = Math.random): JourneyRoom[] {
  const kinds = shuffled<ActivityKind>(["letter", "count", "move", "letter", "count", "move"], random);
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
