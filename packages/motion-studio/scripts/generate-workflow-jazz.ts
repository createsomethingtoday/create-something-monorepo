/**
 * Generate "Proof in Motion", an original 30-second modal tenor-quartet cue
 * for the CREATE SOMETHING workflow reel.
 *
 * The arrangement is deterministic and its structural hits share the reel's
 * 120 BPM / 15-frame beat grid. No sampled or third-party musical material is
 * used. The generated MP3 is committed so Remotion renders do not need ffmpeg
 * during bundling.
 *
 * Run: pnpm generate:workflow-jazz
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

const smoothEnvelope = (progress: number, attack = 0.04, release = 0.2): number => {
  const attackGain = Math.min(1, progress / attack);
  const releaseGain = Math.min(1, (1 - progress) / release);
  return Math.max(0, Math.min(attackGain, releaseGain));
};

const addPianoNote = (
  startBeat: number,
  durationBeats: number,
  midi: number,
  gain: number,
  pan: number
): void => {
  const frequency = midiToFrequency(midi);
  const duration = beatToSeconds(durationBeats);
  forEvent(beatToSeconds(startBeat), duration, (time, progress, sampleIndex) => {
    const envelope = smoothEnvelope(progress, 0.018, 0.24) * (0.34 + Math.exp(-time * 1.1) * 0.66);
    const tone =
      Math.sin(TAU * frequency * time) * 0.62 +
      Math.sin(TAU * frequency * 2 * time + 0.12) * 0.22 * Math.exp(-time * 0.8) +
      Math.sin(TAU * frequency * 3 * time + 0.31) * 0.11 * Math.exp(-time * 1.6) +
      Math.sin(TAU * frequency * 4 * time + 0.48) * 0.05 * Math.exp(-time * 2.8);
    addStereo(sampleIndex, tone * envelope * gain, pan);
  });
};

const addQuartalPianoChord = (
  startBeat: number,
  durationBeats: number,
  notes: readonly number[],
  gain: number,
  spread = 0.46
): void => {
  notes.forEach((note, index) => {
    const position = notes.length === 1 ? 0 : index / (notes.length - 1);
    addPianoNote(
      startBeat,
      durationBeats,
      note,
      gain / Math.sqrt(notes.length),
      (position * 2 - 1) * spread
    );
  });
};

const addTenorNote = (
  startBeat: number,
  durationBeats: number,
  midi: number,
  gain: number,
  intensity = 0.5
): void => {
  const frequency = midiToFrequency(midi);
  let phase = 0;
  let previousBreath = 0;

  forEvent(
    beatToSeconds(startBeat),
    beatToSeconds(durationBeats),
    (time, progress, sampleIndex) => {
      const vibratoEntrance = Math.min(1, Math.max(0, (time - 0.16) / 0.24));
      const pitchScoop = 1 - Math.exp(-time * 17) * 0.018;
      const vibrato = Math.sin(TAU * 5.1 * time) * 0.0032 * vibratoEntrance;
      const growl = Math.sin(TAU * 27 * time) * 0.0012 * intensity;
      phase += (TAU * frequency * (pitchScoop + vibrato + growl)) / SAMPLE_RATE;

      const reed =
        Math.sin(phase) * 0.54 +
        Math.sin(phase * 2 + 0.2) * 0.27 +
        Math.sin(phase * 3 + 0.47) * 0.13 +
        Math.sin(phase * 4 + 0.7) * 0.06;
      const breath = deterministicNoise();
      const breathEdge = breath - previousBreath * 0.74;
      previousBreath = breath;
      const envelope =
        smoothEnvelope(progress, 0.045, 0.18) *
        Math.min(1, time / 0.035) *
        (0.86 + Math.sin(TAU * 0.82 * time) * 0.05);
      const tone = Math.tanh(reed * (1.35 + intensity * 0.38)) * 0.94 + breathEdge * 0.06;
      addStereo(sampleIndex, tone * envelope * gain, 0.06);
    }
  );
};

const addBass = (startBeat: number, midi: number, gain: number): void => {
  const frequency = midiToFrequency(midi);
  forEvent(beatToSeconds(startBeat), beatToSeconds(0.92), (time, progress, sampleIndex) => {
    const attack = Math.min(1, time / 0.012);
    const decay = Math.exp(-time * 3.05);
    const release = Math.min(1, (1 - progress) / 0.16);
    const body =
      Math.sin(TAU * frequency * time) * 0.78 +
      Math.sin(TAU * frequency * 2 * time + 0.12) * 0.17 +
      Math.sin(TAU * frequency * 3 * time) * 0.05;
    addStereo(sampleIndex, body * attack * decay * release * gain, -0.08);
  });
};

const addKick = (beat: number, gain: number): void => {
  forEvent(beatToSeconds(beat), 0.32, (time, _progress, sampleIndex) => {
    const frequency = 54 + 76 * Math.exp(-time * 20);
    const body = Math.sin(TAU * frequency * time) * Math.exp(-time * 13);
    addStereo(sampleIndex, body * gain, 0);
  });
};

const addTom = (beat: number, frequency: number, gain: number, pan: number): void => {
  forEvent(beatToSeconds(beat), 0.38, (time, _progress, sampleIndex) => {
    const pitch = frequency * (1 + Math.exp(-time * 18) * 0.34);
    const body = Math.sin(TAU * pitch * time) * 0.82 + Math.sin(TAU * pitch * 1.52 * time) * 0.18;
    addStereo(sampleIndex, body * Math.exp(-time * 8.5) * gain, pan);
  });
};

const addBrush = (beat: number, gain: number, pan: number): void => {
  let previousNoise = 0;
  forEvent(beatToSeconds(beat), 0.42, (time, _progress, sampleIndex) => {
    const noise = deterministicNoise();
    const high = noise - previousNoise * 0.78;
    previousNoise = noise;
    const sweep = Math.exp(-time * 6.6) * (0.78 + Math.sin(TAU * 9 * time) * 0.22);
    addStereo(sampleIndex, high * sweep * gain, pan);
  });
};

const addRide = (beat: number, gain: number, pan: number): void => {
  forEvent(beatToSeconds(beat), 0.24, (time, _progress, sampleIndex) => {
    const envelope = Math.exp(-time * 14);
    const metal =
      Math.sin(TAU * 4_780 * time) * 0.45 +
      Math.sin(TAU * 6_920 * time + 0.7) * 0.32 +
      deterministicNoise() * 0.23;
    addStereo(sampleIndex, metal * envelope * gain, pan);
  });
};

const addRim = (beat: number, gain: number): void => {
  forEvent(beatToSeconds(beat), 0.12, (time, _progress, sampleIndex) => {
    const envelope = Math.exp(-time * 34);
    const click = Math.sin(TAU * 1_760 * time) * 0.62 + deterministicNoise() * 0.38;
    addStereo(sampleIndex, click * envelope * gain, 0.24);
  });
};

const addCymbal = (beat: number, gain: number): void => {
  let previousNoise = 0;
  forEvent(beatToSeconds(beat), 1.35, (time, _progress, sampleIndex) => {
    const noise = deterministicNoise();
    const high = noise - previousNoise * 0.9;
    previousNoise = noise;
    const shimmer =
      high * 0.66 + Math.sin(TAU * 7_430 * time) * 0.2 + Math.sin(TAU * 9_180 * time) * 0.14;
    addStereo(sampleIndex, shimmer * Math.exp(-time * 2.9) * gain, -0.28);
  });
};

type HarmonyChange = {
  beat: number;
  root: number;
  chord: readonly number[];
  accent?: boolean;
};

const harmony: HarmonyChange[] = [
  // D pedal with fourth-stacked voicings: modal movement instead of a tune-based progression.
  { beat: 0, root: 38, chord: [57, 62, 67, 72], accent: true },
  { beat: 4, root: 38, chord: [55, 60, 65, 70] },
  { beat: 8, root: 38, chord: [58, 63, 68, 73] },
  { beat: 10, root: 38, chord: [58, 63, 68, 73], accent: true },
  { beat: 14, root: 38, chord: [60, 65, 70, 75] },
  { beat: 18, root: 38, chord: [57, 62, 67, 72] },
  { beat: 22, root: 38, chord: [57, 62, 67, 72], accent: true },
  { beat: 26, root: 38, chord: [55, 60, 65, 70] },
  { beat: 30, root: 38, chord: [57, 62, 67, 72] },
  { beat: 34, root: 38, chord: [60, 65, 70, 75], accent: true },
  { beat: 38, root: 38, chord: [58, 63, 68, 73] },
  { beat: 40, root: 38, chord: [57, 62, 67, 72], accent: true },
  { beat: 44, root: 38, chord: [57, 62, 67, 72], accent: true },
  { beat: 48, root: 38, chord: [55, 60, 65, 70], accent: true },
  { beat: 52, root: 38, chord: [57, 62, 67, 72], accent: true },
  { beat: 56, root: 38, chord: [57, 62, 67, 72], accent: true },
  { beat: 58, root: 38, chord: [57, 62, 67, 71, 74], accent: true }
];

for (let index = 0; index < harmony.length; index += 1) {
  const change = harmony[index];
  const nextBeat = harmony[index + 1]?.beat ?? 60;
  const duration = Math.max(1, nextBeat - change.beat);
  addQuartalPianoChord(change.beat, duration, change.chord, change.accent ? 0.17 : 0.12);

  if (duration >= 3) {
    addQuartalPianoChord(
      change.beat + 2 + 2 / 3,
      Math.min(1.1, duration - 2.5),
      change.chord.slice(1),
      0.065,
      0.34
    );
  }

  for (let beat = change.beat; beat < nextBeat; beat += 1) {
    const step = beat - change.beat;
    const pedalFigure = [0, 12, 7, 10][step % 4];
    addBass(beat, change.root + pedalFigure, change.accent && beat === change.beat ? 0.2 : 0.155);
  }
}

for (let beat = 0; beat < 60; beat += 1) {
  const barBeat = beat % 4;
  const intensity =
    beat < 10
      ? 0.58
      : beat < 22
        ? 0.88
        : beat < 34
          ? 0.72
          : beat < 44
            ? 0.9
            : beat < 52
              ? 1.1
              : 0.82;
  if (barBeat === 0 || barBeat === 2) addKick(beat, 0.2 * intensity);
  if (barBeat === 1 || barBeat === 3) {
    addBrush(beat, 0.1 * intensity, barBeat === 1 ? -0.22 : 0.2);
  }
  addRide(beat, 0.058 * intensity, 0.32);
  addRide(beat + 2 / 3, 0.043 * intensity, 0.38);
  if (beat >= 44 && beat < 52) addRide(beat + 1 / 3, 0.026 * intensity, 0.26);
}

for (const [beat, frequency, gain, pan] of [
  [34 + 2 / 3, 128, 0.14, -0.22],
  [38 + 1 / 3, 108, 0.13, 0.2],
  [39 + 2 / 3, 146, 0.16, -0.14],
  [44 + 1 / 3, 122, 0.15, 0.18],
  [45 + 2 / 3, 154, 0.14, -0.2],
  [47 + 1 / 3, 112, 0.16, 0.22],
  [48 + 2 / 3, 144, 0.16, -0.18],
  [50 + 1 / 3, 104, 0.17, 0.24],
  [51 + 2 / 3, 164, 0.18, -0.2]
] as const) {
  addTom(beat, frequency, gain, pan);
}

// Original D-Dorian tenor line. Sparse calls become triplet momentum through
// friction, open again over the map, then crest across proof and the CTA.
const tenorLine: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1, 1.5, 62, 0.15, 0.42],
  [3 + 1 / 3, 2 / 3, 65, 0.14, 0.46],
  [4, 1 + 1 / 3, 67, 0.15, 0.48],
  [6 + 2 / 3, 1, 72, 0.16, 0.52],
  [8 + 2 / 3, 2 / 3, 61, 0.13, 0.58],
  [10, 2 / 3, 62, 0.16, 0.62],
  [10 + 2 / 3, 2 / 3, 65, 0.15, 0.64],
  [11 + 1 / 3, 1 + 1 / 3, 69, 0.17, 0.68],
  [13, 2 / 3, 72, 0.17, 0.72],
  [13 + 2 / 3, 2 / 3, 69, 0.15, 0.7],
  [14 + 1 / 3, 1 + 2 / 3, 67, 0.17, 0.72],
  [16 + 2 / 3, 2 / 3, 65, 0.15, 0.76],
  [17 + 1 / 3, 2 / 3, 68, 0.15, 0.8],
  [18, 2 / 3, 67, 0.16, 0.78],
  [18 + 2 / 3, 2 / 3, 65, 0.15, 0.74],
  [19 + 1 / 3, 1 + 1 / 3, 62, 0.17, 0.7],
  [21, 2 / 3, 61, 0.14, 0.66],
  [22, 1.5, 69, 0.17, 0.56],
  [24 + 1 / 3, 2 / 3, 67, 0.14, 0.52],
  [25, 1, 65, 0.15, 0.5],
  [26 + 2 / 3, 1 + 1 / 3, 62, 0.16, 0.48],
  [29 + 1 / 3, 2 / 3, 65, 0.14, 0.52],
  [30, 1, 69, 0.16, 0.56],
  [32, 1.5, 72, 0.17, 0.58],
  [34, 1.5, 74, 0.18, 0.68],
  [36 + 2 / 3, 2 / 3, 72, 0.15, 0.7],
  [37 + 1 / 3, 2 / 3, 69, 0.15, 0.72],
  [38, 1, 68, 0.16, 0.82],
  [39 + 1 / 3, 2 / 3, 61, 0.15, 0.78],
  [40, 1 + 2 / 3, 62, 0.19, 0.7],
  [42 + 1 / 3, 2 / 3, 65, 0.15, 0.72],
  [43, 1, 69, 0.17, 0.76],
  [44, 2 / 3, 74, 0.18, 0.88],
  [44 + 2 / 3, 2 / 3, 72, 0.17, 0.88],
  [45 + 1 / 3, 2 / 3, 69, 0.17, 0.9],
  [46, 2 / 3, 67, 0.16, 0.9],
  [46 + 2 / 3, 2 / 3, 65, 0.16, 0.92],
  [47 + 1 / 3, 2 / 3, 62, 0.17, 0.9],
  [48, 2 / 3, 65, 0.17, 0.9],
  [48 + 2 / 3, 2 / 3, 67, 0.17, 0.92],
  [49 + 1 / 3, 2 / 3, 69, 0.18, 0.94],
  [50, 2 / 3, 72, 0.18, 0.94],
  [50 + 2 / 3, 2 / 3, 74, 0.18, 0.96],
  [51 + 1 / 3, 2 / 3, 77, 0.19, 0.98],
  [52, 1 + 1 / 3, 74, 0.18, 0.72],
  [54, 2 / 3, 72, 0.15, 0.64],
  [54 + 2 / 3, 2 / 3, 69, 0.15, 0.62],
  [55 + 1 / 3, 2 / 3, 67, 0.15, 0.6],
  [56, 1 + 1 / 3, 69, 0.18, 0.64],
  [57 + 2 / 3, 1 / 3, 73, 0.14, 0.58],
  [58, 1.8, 74, 0.2, 0.54]
];

for (const [beat, duration, midi, gain, intensity] of tenorLine) {
  addTenorNote(beat, duration, midi, gain, intensity);
}

const narrativeHitBeats = Object.values(WORKFLOW_REEL_SPEC.music.hitFrames).map(
  (frame) => frame / WORKFLOW_REEL_SPEC.music.beatFrames
);

for (const beat of narrativeHitBeats) {
  if (beat > 0) {
    addRim(beat, beat >= 52 ? 0.12 : 0.09);
    addCymbal(beat, beat >= 52 ? 0.055 : 0.035);
  }
}

// Small deterministic room: crossed early reflections keep the quartet
// cohesive without washing out the frame-accurate narrative attacks.
const leftDelay = Math.round(SAMPLE_RATE * 0.071);
const rightDelay = Math.round(SAMPLE_RATE * 0.109);
for (let index = rightDelay; index < TOTAL_SAMPLES; index += 1) {
  left[index] += right[index - rightDelay] * 0.055;
  right[index] += left[index - leftDelay] * 0.048;
}

let peak = 0;
for (let index = 0; index < TOTAL_SAMPLES; index += 1) {
  const seconds = index / SAMPLE_RATE;
  const fadeIn = Math.min(1, seconds / 0.12);
  const fadeOut = Math.min(1, (DURATION_SECONDS - seconds) / 1.1);
  const master = Math.max(0, Math.min(fadeIn, fadeOut));
  left[index] = Math.tanh(left[index] * 1.18) * master;
  right[index] = Math.tanh(right[index] * 1.18) * master;
  peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
}

const normalization = peak === 0 ? 1 : 0.88 / peak;
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
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'workflow-jazz-'));
const temporaryWav = join(temporaryDirectory, 'proof-in-motion-jazz.wav');

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
  throw new Error(`ffmpeg failed to encode workflow jazz cue: ${encode.stderr || encode.stdout}`);
}

console.log(
  `generated ${WORKFLOW_REEL_SPEC.music.title}: ${DURATION_SECONDS}s, ${WORKFLOW_REEL_SPEC.music.bpm} BPM, ${outputPath}`
);
