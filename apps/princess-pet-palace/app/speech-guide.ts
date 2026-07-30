export type VoiceCandidate = {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
};

export const FRIENDLY_SPEECH_SETTINGS = {
  rate: 0.92,
  pitch: 1.01,
  volume: 0.95,
} as const;

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
