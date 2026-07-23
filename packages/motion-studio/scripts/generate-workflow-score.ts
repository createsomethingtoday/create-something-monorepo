/**
 * Generate "Proof in Motion", an original 30-second minimal product-film score
 * for the CREATE SOMETHING workflow reel.
 *
 * The arrangement is deterministic and its structural hits share the reel's
 * 120 BPM / 15-frame beat grid. It uses no samples or third-party musical
 * material. The generated MP3 is committed so Remotion renders remain portable.
 *
 * Run: pnpm generate:workflow-score
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { WORKFLOW_REEL_SPEC } from '../src/commercials/workflow-reel/spec';

const SAMPLE_RATE = 44_100;
const CHANNELS = 2;
const DURATION_SECONDS = WORKFLOW_REEL_SPEC.durationInFrames / WORKFLOW_REEL_SPEC.fps;
const TOTAL_SAMPLES = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const SECONDS_PER_BEAT = 60 / WORKFLOW_REEL_SPEC.music.bpm;
const TAU = Math.PI * 2;

const left = new Float32Array(TOTAL_SAMPLES);
const right = new Float32Array(TOTAL_SAMPLES);

let randomState = 0x43524541;
const deterministicNoise = (): number => {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return (randomState / 0x1_0000_0000) * 2 - 1;
};

const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
const beatToSeconds = (beat: number): number => beat * SECONDS_PER_BEAT;

const addStereo = (sampleIndex: number, sample: number, pan = 0): void => {
  if (sampleIndex < 0 || sampleIndex >= TOTAL_SAMPLES) return;
  const angle = ((pan + 1) * Math.PI) / 4;
  left[sampleIndex] += sample * Math.cos(angle);
  right[sampleIndex] += sample * Math.sin(angle);
};

const forEvent = (
  startSeconds: number,
  durationSeconds: number,
  render: (time: number, progress: number, sampleIndex: number) => void
): void => {
  const startSample = Math.max(0, Math.floor(startSeconds * SAMPLE_RATE));
  const eventSamples = Math.floor(durationSeconds * SAMPLE_RATE);
  const endSample = Math.min(TOTAL_SAMPLES, startSample + eventSamples);
  for (let sampleIndex = startSample; sampleIndex < endSample; sampleIndex += 1) {
    const localSample = sampleIndex - startSample;
    render(localSample / SAMPLE_RATE, localSample / Math.max(1, eventSamples - 1), sampleIndex);
  }
};

const smoothEnvelope = (progress: number, attack = 0.08, release = 0.22): number => {
  const attackGain = Math.min(1, progress / attack);
  const releaseGain = Math.min(1, (1 - progress) / release);
  return Math.max(0, Math.min(attackGain, releaseGain));
};

const addWarmPadNote = (
  startBeat: number,
  durationBeats: number,
  midi: number,
  gain: number,
  pan: number,
  lift: number
): void => {
  const frequency = midiToFrequency(midi);
  let phase = 0;
  let phaseWide = 0;

  forEvent(
    beatToSeconds(startBeat),
    beatToSeconds(durationBeats),
    (time, progress, sampleIndex) => {
      const drift = 1 + Math.sin(TAU * 0.17 * time + midi) * 0.0011;
      phase += (TAU * frequency * drift) / SAMPLE_RATE;
      phaseWide += (TAU * frequency * 1.0032 * drift) / SAMPLE_RATE;
      const tone =
        Math.sin(phase) * 0.62 +
        Math.sin(phaseWide) * 0.24 +
        Math.sin(phase * 2 + 0.2) * 0.1 +
        Math.sin(phase * 3 + 0.43) * 0.04;
      const envelope = smoothEnvelope(progress, 0.15, 0.28) * (0.76 + progress * lift);
      addStereo(sampleIndex, Math.tanh(tone) * envelope * gain, pan);
    }
  );
};

const addWarmPad = (
  startBeat: number,
  durationBeats: number,
  notes: readonly number[],
  gain: number,
  lift = 0.16
): void => {
  notes.forEach((note, index) => {
    const position = notes.length === 1 ? 0 : index / (notes.length - 1);
    addWarmPadNote(
      startBeat,
      durationBeats,
      note,
      gain / Math.sqrt(notes.length),
      (position * 2 - 1) * 0.58,
      lift
    );
  });
};

const addFeltPianoNote = (
  startBeat: number,
  durationBeats: number,
  midi: number,
  gain: number,
  pan = 0
): void => {
  const frequency = midiToFrequency(midi);
  const tripleStringDetune = [-0.00072, 0, 0.00064] as const;
  const inharmonicity = 0.00013 + Math.max(0, midi - 60) * 0.000004;
  const damping = 0.88 + Math.max(0, midi - 48) * 0.016;
  let feltHammer = 0;
  forEvent(
    beatToSeconds(startBeat),
    beatToSeconds(durationBeats),
    (time, progress, sampleIndex) => {
      const stringFundamental =
        tripleStringDetune.reduce(
          (sum, detune, stringIndex) =>
            sum + Math.sin(TAU * frequency * (1 + detune) * time + stringIndex * 0.045),
          0
        ) / tripleStringDetune.length;
      const secondPartial = Math.sin(
        TAU * frequency * 2 * Math.sqrt(1 + inharmonicity * 4) * time + 0.13
      );
      const thirdPartial = Math.sin(
        TAU * frequency * 3 * Math.sqrt(1 + inharmonicity * 9) * time + 0.31
      );
      feltHammer = feltHammer * 0.82 + deterministicNoise() * 0.18;
      const hammerTransient = feltHammer * Math.exp(-time * 29) * 0.018;
      const soundboardResonance =
        Math.sin(TAU * frequency * 0.5 * time + 0.21) * Math.exp(-time * 0.54) * 0.052 +
        Math.sin(TAU * 92 * time + midi * 0.07) * Math.exp(-time * 1.25) * 0.018;
      const tone =
        stringFundamental * 0.81 +
        secondPartial * 0.125 * Math.exp(-time * 2.7) +
        thirdPartial * 0.032 * Math.exp(-time * 5.4);
      const envelope =
        Math.min(1, time / 0.018) * Math.exp(-time * damping) * Math.min(1, (1 - progress) / 0.15);
      addStereo(sampleIndex, (tone + hammerTransient) * envelope * gain, pan);
      addStereo(sampleIndex, soundboardResonance * envelope * gain * 0.42, pan * -0.45);
    }
  );
};

const addGlassNote = (
  startBeat: number,
  durationBeats: number,
  midi: number,
  gain: number,
  pan: number
): void => {
  const frequency = midiToFrequency(midi);
  forEvent(
    beatToSeconds(startBeat),
    beatToSeconds(durationBeats),
    (time, progress, sampleIndex) => {
      const tone =
        Math.sin(TAU * frequency * time) * 0.82 +
        Math.sin(TAU * frequency * 2.01 * time + 0.1) * 0.13 +
        Math.sin(TAU * frequency * 3.96 * time + 0.36) * 0.05;
      const envelope =
        Math.min(1, time / 0.008) * Math.exp(-time * 2.05) * Math.min(1, (1 - progress) / 0.16);
      addStereo(sampleIndex, tone * envelope * gain, pan);
    }
  );
};

const addSoftPulse = (beat: number, midi: number, gain: number): void => {
  const frequency = midiToFrequency(midi);
  forEvent(beatToSeconds(beat), 0.42, (time, _progress, sampleIndex) => {
    const pitch = frequency * (1 + Math.exp(-time * 20) * 0.045);
    const body = Math.sin(TAU * pitch * time) * 0.82 + Math.sin(TAU * pitch * 2 * time) * 0.18;
    const envelope = Math.min(1, time / 0.012) * Math.exp(-time * 7.4);
    addStereo(sampleIndex, body * envelope * gain, 0);
  });
};

const addSoftImpact = (beat: number, gain: number): void => {
  forEvent(beatToSeconds(beat), 1.1, (time, _progress, sampleIndex) => {
    const frequency = 42 + Math.exp(-time * 14) * 24;
    const body = Math.sin(TAU * frequency * time) * Math.exp(-time * 3.5);
    addStereo(sampleIndex, body * gain, 0);
  });
};

const addAirSwell = (startBeat: number, durationBeats: number, gain: number): void => {
  let previousNoise = 0;
  forEvent(
    beatToSeconds(startBeat),
    beatToSeconds(durationBeats),
    (_time, progress, sampleIndex) => {
      const noise = deterministicNoise();
      const air = noise - previousNoise * 0.92;
      previousNoise = noise;
      const envelope = progress ** 2.4 * Math.min(1, (1 - progress) / 0.035);
      addStereo(sampleIndex, air * envelope * gain, 0.2);
    }
  );
};

// Restrained spatial texture: slow filtered air keeps the score dimensional
// without adding a genre-defining rhythm or melody.
const addSpatialTexture = (startBeat: number, durationBeats: number, gain: number): void => {
  let smoothLeft = 0;
  let smoothRight = 0;
  forEvent(
    beatToSeconds(startBeat),
    beatToSeconds(durationBeats),
    (time, progress, sampleIndex) => {
      smoothLeft = smoothLeft * 0.992 + deterministicNoise() * 0.008;
      smoothRight = smoothRight * 0.989 + deterministicNoise() * 0.011;
      const breathe = 0.48 + Math.sin(TAU * 0.09 * time) * 0.14;
      const envelope = smoothEnvelope(progress, 0.08, 0.1);
      addStereo(sampleIndex, smoothLeft * breathe * envelope * gain, -0.72);
      addStereo(sampleIndex, smoothRight * breathe * envelope * gain, 0.72);
    }
  );
};

type ScoreSection = readonly [number, number, readonly number[], number, number];
const sections: readonly ScoreSection[] = [
  [0, 10, [50, 57, 62, 66], 0.068, 0.12],
  [10, 12, [47, 54, 59, 62], 0.078, 0.28],
  [22, 12, [43, 50, 57, 59], 0.067, 0.14],
  [34, 10, [45, 52, 57, 62], 0.076, 0.3],
  [44, 8, [43, 50, 57, 62], 0.088, 0.36],
  [52, 8, [50, 57, 62, 66, 69], 0.096, 0.18]
];

for (const [beat, duration, notes, gain, lift] of sections) {
  addWarmPad(beat, duration, notes, gain, lift);
  addSpatialTexture(beat, duration, beat >= 44 ? 0.016 : 0.011);
}

for (let beat = 0; beat < 60; beat += 1) {
  const intensity =
    beat < 10
      ? 0.075
      : beat < 22
        ? 0.105
        : beat < 34
          ? 0.082
          : beat < 44
            ? 0.098
            : beat < 52
              ? 0.112
              : 0.085;
  addSoftPulse(beat, 38, intensity);
  if (beat >= 10 && beat < 22 && beat % 2 === 1) addSoftPulse(beat + 0.5, 45, 0.028);
}

// A wholly original three-note clarity motif: D, A, E. It is intentionally
// compact and neutral so the workflow—not the music—remains the protagonist.
const originalClarityMotif = [74, 69, 76] as const;
const addClarityMotif = (startBeat: number, gain: number): void => {
  const offsets = [0, 1.5, 3.5] as const;
  originalClarityMotif.forEach((note, index) => {
    addGlassNote(startBeat + offsets[index], 2.2, note, gain, index === 1 ? -0.18 : 0.16);
    addFeltPianoNote(
      startBeat + offsets[index],
      2,
      note - 12,
      gain * 0.36,
      index === 1 ? -0.1 : 0.08
    );
  });
};

addClarityMotif(0.5, 0.03);
addClarityMotif(22.25, 0.034);
addClarityMotif(52, 0.04);

const pianoBackgroundGain = 0.56;

for (const [beat, midi, gain, pan] of [
  [11, 59, 0.055, -0.12],
  [13, 62, 0.058, 0.1],
  [15.5, 66, 0.055, -0.08],
  [18, 62, 0.06, 0.12],
  [34.5, 57, 0.064, -0.12],
  [36.5, 62, 0.066, 0.1],
  [39, 64, 0.068, -0.08],
  [44.5, 62, 0.07, -0.12],
  [46, 66, 0.073, 0.1],
  [47.5, 69, 0.076, -0.08],
  [49, 74, 0.082, 0.12],
  [56, 69, 0.078, -0.1],
  [58, 74, 0.09, 0.1]
] as const) {
  addFeltPianoNote(beat, 2.4, midi, gain * pianoBackgroundGain, pan);
}

const narrativeHitBeats = Object.values(WORKFLOW_REEL_SPEC.music.hitFrames).map(
  (frame) => frame / WORKFLOW_REEL_SPEC.music.beatFrames
);

for (const beat of narrativeHitBeats) {
  if (beat > 0) addAirSwell(beat - 0.8, 0.8, beat >= 44 ? 0.026 : 0.018);
  addSoftImpact(beat, beat === 0 ? 0.08 : beat >= 44 ? 0.135 : 0.105);
  if (beat >= 44) addGlassNote(beat, 2, beat >= 52 ? 86 : 81, 0.022, 0.24);
}

// Short, quiet early reflections preserve precise attacks while adding depth.
const leftDelay = Math.round(SAMPLE_RATE * 0.061);
const rightDelay = Math.round(SAMPLE_RATE * 0.097);
for (let index = rightDelay; index < TOTAL_SAMPLES; index += 1) {
  left[index] += right[index - rightDelay] * 0.042;
  right[index] += left[index - leftDelay] * 0.036;
}

let peak = 0;
for (let index = 0; index < TOTAL_SAMPLES; index += 1) {
  const seconds = index / SAMPLE_RATE;
  const fadeIn = Math.min(1, seconds / 0.14);
  const fadeOut = Math.min(1, (DURATION_SECONDS - seconds) / 1.15);
  const master = Math.max(0, Math.min(fadeIn, fadeOut));
  left[index] = Math.tanh(left[index] * 2.6) * master;
  right[index] = Math.tanh(right[index] * 2.6) * master;
  peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
}

const normalization = peak === 0 ? 1 : 0.84 / peak;
for (let index = 0; index < TOTAL_SAMPLES; index += 1) {
  left[index] *= normalization;
  right[index] *= normalization;
}

const wavDataSize = TOTAL_SAMPLES * CHANNELS * 2;
const wav = Buffer.alloc(44 + wavDataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + wavDataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(CHANNELS, 22);
wav.writeUInt32LE(SAMPLE_RATE, 24);
wav.writeUInt32LE(SAMPLE_RATE * CHANNELS * 2, 28);
wav.writeUInt16LE(CHANNELS * 2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(wavDataSize, 40);

for (let index = 0; index < TOTAL_SAMPLES; index += 1) {
  const offset = 44 + index * CHANNELS * 2;
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[index])) * 32_767), offset);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[index])) * 32_767), offset + 2);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDirectory, '..');
const outputPath = join(packageRoot, 'public', WORKFLOW_REEL_SPEC.music.asset);
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'workflow-score-'));
const temporaryWav = join(temporaryDirectory, 'proof-in-motion.wav');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(temporaryWav, wav);

const encode = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    temporaryWav,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '192k',
    '-ar',
    String(SAMPLE_RATE),
    '-metadata',
    `title=${WORKFLOW_REEL_SPEC.music.title}`,
    '-metadata',
    'artist=CREATE SOMETHING',
    '-metadata',
    `comment=${WORKFLOW_REEL_SPEC.music.credit}`,
    outputPath
  ],
  { encoding: 'utf8' }
);

rmSync(temporaryDirectory, { recursive: true, force: true });

if (encode.status !== 0) {
  throw new Error(`ffmpeg failed to encode workflow score: ${encode.stderr || encode.stdout}`);
}

console.log(
  `generated ${WORKFLOW_REEL_SPEC.music.title}: ${DURATION_SECONDS}s, ${WORKFLOW_REEL_SPEC.music.bpm} BPM, ${outputPath}`
);
