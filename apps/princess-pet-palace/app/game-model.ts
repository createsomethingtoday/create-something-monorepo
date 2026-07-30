export type ActivityKind = "letter" | "count" | "move";

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
  prompt: string;
  spokenPrompt: string;
  challenge: Challenge;
};

export type CountTapResult = {
  selected: number[];
  spokenNumber: number;
  complete: boolean;
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
    return {
      kind: "letter",
      label: "Letter Garden",
      icon: "🌸",
      prompt: `Who starts with ${challenge.answer}?`,
      spokenPrompt: `Which pet starts with the letter ${challenge.answer}?`,
      challenge,
    };
  }

  if (challenge.type === "count") {
    return {
      kind: "count",
      label: "Pet Parade",
      icon: "🐾",
      prompt: `Tap each ${challenge.animalSingular}!`,
      spokenPrompt: `Tap each ${challenge.animalSingular} to count them.`,
      challenge,
    };
  }

  return {
    kind: "move",
    label: "Royal Gym",
    icon: "🎀",
    prompt: challenge.title,
    spokenPrompt: challenge.action,
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
