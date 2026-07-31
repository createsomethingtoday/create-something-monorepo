export type VoiceCandidate = {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
};

export const FRIENDLY_SPEECH_SETTINGS = {
  rate: 1,
  pitch: 1.01,
  volume: 0.95,
} as const;

export const STATIC_NARRATION_PLAYBACK_RATE = 1.04;

export type NarrationCue = {
  id: string;
  text: string;
  src: string;
};

function narrationCue(id: string, text: string): NarrationCue {
  return { id, text, src: `/audio/narration/${id}.mp3` };
}

const narrationLines = [
  ["palace-open", "The palace doors are open!"],
  ["stella-welcome", "Hi, Stella! The palace doors are open. Let’s play together!"],
  ["sound-on", "Sound on!"],
  ["grand-ballroom", "The grand ballroom is open! You finished the whole palace adventure!"],
  ["stella-grand-ballroom", "Stella, the grand ballroom is open! You finished the whole palace adventure. I’m so proud of you!"],
  ["cheer-palace-magic", "Palace magic!"],
  ["cheer-you-found-it", "You found it!"],
  ["cheer-wonderful", "Wonderful!"],
  ["cheer-sparkle-power", "Sparkle power!"],
  ["number-1", "One"],
  ["number-2", "Two"],
  ["number-3", "Three"],
  ["number-4", "Four"],
  ["number-5", "Five"],
  ["number-6", "Six"],
  ["letter-b-prompt", "Listen for B at the start. Which pet starts with B?"],
  ["letter-b-success", "B is for bunny!"],
  ["letter-b-try", "Listen for B. Which pet starts the same way?"],
  ["letter-c-prompt", "Listen for C at the start. Which pet starts with C?"],
  ["letter-c-success", "C is for cat!"],
  ["letter-c-try", "Listen for C. Which pet starts the same way?"],
  ["letter-p-prompt", "Listen for P at the start. Which pet starts with P?"],
  ["letter-p-success", "P is for puppy!"],
  ["letter-p-try", "Listen for P. Which pet starts the same way?"],
  ["letter-f-prompt", "Listen for F at the start. Which pet starts with F?"],
  ["letter-f-success", "F is for fox!"],
  ["letter-f-try", "Listen for F. Which pet starts the same way?"],
  ["letter-l-prompt", "Listen for L at the start. Which pet starts with L?"],
  ["letter-l-success", "L is for lion!"],
  ["letter-l-try", "Listen for L. Which pet starts the same way?"],
  ["letter-t-prompt", "Listen for T at the start. Which pet starts with T?"],
  ["letter-t-success", "T is for tiger!"],
  ["letter-t-try", "Listen for T. Which pet starts the same way?"],
  ["count-bunnies-prompt", "Let’s count one by one. Tap each bunny to count them."],
  ["count-bunnies-success", "You counted 3 bunnies!"],
  ["count-kittens-prompt", "Let’s count one by one. Tap each kitten to count them."],
  ["count-kittens-success", "You counted 4 kittens!"],
  ["count-unicorns-prompt", "Let’s count one by one. Tap each unicorn to count them."],
  ["count-unicorns-success", "You counted 5 unicorns!"],
  ["count-puppies-prompt", "Let’s count one by one. Tap each puppy to count them."],
  ["count-puppies-success", "You counted 6 puppies!"],
  ["count-butterflies-prompt", "Let’s count one by one. Tap each butterfly to count them."],
  ["count-butterflies-success", "You counted 4 butterflies!"],
  ["count-try", "Tap one pet at a time and say each number."],
  ["move-star-prompt", "Make a little space. Reach up and out like a sparkly star!"],
  ["move-star-start", "Reach up and out like a sparkly star! Ready, go!"],
  ["move-flamingo-prompt", "Make a little space. Stand tall and lift one foot like a flamingo!"],
  ["move-flamingo-start", "Stand tall and lift one foot like a flamingo! Ready, go!"],
  ["move-butterfly-prompt", "Make a little space. Flap your arms slowly like a butterfly!"],
  ["move-butterfly-start", "Flap your arms slowly like a butterfly! Ready, go!"],
  ["move-crown-prompt", "Make a little space. Take five tiny royal steps with a tall back!"],
  ["move-crown-start", "Take five tiny royal steps with a tall back! Ready, go!"],
  ["move-success", "You moved for 5 seconds!"],
  ["move-try", "Make a little space, then copy the royal move."],
] as const;

export const NARRATION_CATALOG: Readonly<Record<string, NarrationCue>> = Object.fromEntries(
  narrationLines.map(([id, text]) => [id, narrationCue(id, text)]),
);

export function getNarrationCue(id: string): NarrationCue {
  const cue = NARRATION_CATALOG[id];
  if (!cue) throw new Error(`Unknown narration cue: ${id}`);
  return cue;
}

const warmVoiceNames = [
  /siri/i,
  /ava/i,
  /samantha/i,
  /allison/i,
  /zoe/i,
  /serena/i,
  /karen/i,
  /moira/i,
  /tessa/i,
  /aria/i,
  /jenny/i,
  /google us english/i,
];

function voiceScore(voice: VoiceCandidate): number {
  const preferredIndex = warmVoiceNames.findIndex((pattern) => pattern.test(voice.name));
  const preferredScore = preferredIndex === -1 ? 0 : 160 - preferredIndex * 5;
  const qualityScore = /enhanced|premium|natural/i.test(voice.name) ? 24 : 0;
  const localeScore = /^en[-_]US$/i.test(voice.lang) ? 14 : 0;
  const defaultScore = voice.default ? 4 : 0;
  const compactPenalty = /compact/i.test(voice.name) ? 30 : 0;
  return preferredScore + qualityScore + localeScore + defaultScore - compactPenalty;
}

export function pickFriendlyVoice<T extends VoiceCandidate>(voices: readonly T[]): T | undefined {
  const englishVoices = voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
  const localVoices = englishVoices.filter((voice) => voice.localService);
  const candidates = localVoices.length > 0 ? localVoices : englishVoices;

  return [...candidates].sort((first, second) => voiceScore(second) - voiceScore(first))[0];
}
