/**
 * Generate the deterministic CREATE SOMETHING workflow-film scores: the
 * 30-second "Proof in Motion" short or the purpose-composed 60-second
 * "Proof Over Time" flagship arrangement.
 *
 * The arrangement is deterministic and its structural hits share the reel's
 * 120 BPM / 15-frame beat grid. Its piano uses a compact, repo-owned subset of
 * Versilian Studios' CC0 VCSL Keys library; every other voice is original and
 * synthesized here. The generated MP3 is committed so Remotion renders remain
 * portable.
 *
 * Run: pnpm generate:workflow-score
 *      pnpm generate:workflow-day-score
 */

import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { WORKFLOW_DAY_REEL_SPEC } from '../src/commercials/workflow-day-reel/spec';
import { WORKFLOW_REEL_SPEC } from '../src/commercials/workflow-reel/spec';

const isDayScore = process.argv.includes('--day');
const SCORE_SPEC = isDayScore ? WORKFLOW_DAY_REEL_SPEC : WORKFLOW_REEL_SPEC;
const SAMPLE_RATE = 44_100;
const CHANNELS = 2;
const DURATION_SECONDS = SCORE_SPEC.durationInFrames / SCORE_SPEC.fps;
const TOTAL_SAMPLES = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const SECONDS_PER_BEAT = 60 / SCORE_SPEC.music.bpm;
const TAU = Math.PI * 2;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDirectory, '..');
const pianoRoot = join(packageRoot, 'public/audio/workflow-reel/instruments/vcsl-upright-knight');

type PianoFile = {
  localPath: string;
  sha256: string;
};

type PianoRelease = PianoFile & {
  keyCenter: number;
  tuneCents: number;
  offsetSamples: number;
};

type PianoRegion = {
  keyCenter: number;
  keyRange: readonly [number, number];
  tuneCents: number;
  offsetSamples: number;
  sustain: PianoFile;
  release: PianoRelease;
};

type PianoManifest = {
  license: { spdx: string };
  selection: { requiredMidiNotes: number[] };
  regions: PianoRegion[];
};

type DecodedSample = {
  interleaved: Float32Array;
  frames: number;
  peak: number;
};

const pianoManifest = JSON.parse(
  readFileSync(join(pianoRoot, 'manifest.json'), 'utf8')
) as PianoManifest;
// The real hammer transient reads clearly at low level; keep it subordinate to
// the pad and pulse so the score remains a product-film bed, not a piano lead.
const sampledPianoMixGain = 0.42;

if (pianoManifest.license.spdx !== 'CC0-1.0') {
  throw new Error(`Workflow piano must be CC0-1.0, received ${pianoManifest.license.spdx}`);
}

const decodedSampleCache = new Map<string, DecodedSample>();

const loadPianoSample = (file: PianoFile): DecodedSample => {
  const cached = decodedSampleCache.get(file.localPath);
  if (cached) return cached;

  const path = join(pianoRoot, file.localPath);
  const encoded = readFileSync(path);
  const hash = createHash('sha256').update(encoded).digest('hex');
  if (hash !== file.sha256) {
    throw new Error(`Workflow piano sample hash mismatch for ${file.localPath}`);
  }

  const decoded = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      path,
      '-f',
      'f32le',
      '-acodec',
      'pcm_f32le',
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      String(CHANNELS),
      'pipe:1'
    ],
    { encoding: null, maxBuffer: 256 * 1024 * 1024 }
  );

  if (decoded.status !== 0) {
    throw new Error(
      `ffmpeg failed to decode workflow piano sample ${file.localPath}: ${decoded.stderr.toString()}`
    );
  }
  if (decoded.stdout.byteLength % (Float32Array.BYTES_PER_ELEMENT * CHANNELS) !== 0) {
    throw new Error(`Unexpected decoded sample length for ${file.localPath}`);
  }

  const interleaved = new Float32Array(
    decoded.stdout.buffer,
    decoded.stdout.byteOffset,
    decoded.stdout.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
  let peak = 0;
  for (let index = 0; index < interleaved.length; index += 1) {
    peak = Math.max(peak, Math.abs(interleaved[index]));
  }
  const result = { interleaved, frames: interleaved.length / CHANNELS, peak };
  decodedSampleCache.set(file.localPath, result);
  return result;
};

const left = new Float32Array(TOTAL_SAMPLES);
const right = new Float32Array(TOTAL_SAMPLES);
const pianoLeft = new Float32Array(TOTAL_SAMPLES);
const pianoRight = new Float32Array(TOTAL_SAMPLES);

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

const addPianoStereoPair = (
  sampleIndex: number,
  sampleLeft: number,
  sampleRight: number,
  pan = 0
): void => {
  if (sampleIndex < 0 || sampleIndex >= TOTAL_SAMPLES) return;
  pianoLeft[sampleIndex] += sampleLeft * (pan > 0 ? 1 - pan : 1);
  pianoRight[sampleIndex] += sampleRight * (pan < 0 ? 1 + pan : 1);
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

const addSampledPianoNote = (
  startBeat: number,
  durationBeats: number,
  midi: number,
  gain: number,
  pan = 0
): void => {
  const region = pianoManifest.regions.find(
    ({ keyRange }) => midi >= keyRange[0] && midi <= keyRange[1]
  );
  if (!region) throw new Error(`No VCSL Upright Knight region covers MIDI note ${midi}`);

  const sustain = loadPianoSample(region.sustain);
  const noteDuration = beatToSeconds(durationBeats);
  const sustainRatio = 2 ** ((midi - region.keyCenter - region.tuneCents / 100) / 12);
  let filteredLeft = 0;
  let filteredRight = 0;

  forEvent(beatToSeconds(startBeat), noteDuration, (time, _progress, sampleIndex) => {
    const sourcePosition = region.offsetSamples + time * SAMPLE_RATE * sustainRatio;
    const sourceFrame = Math.floor(sourcePosition);
    if (sourceFrame + 1 >= sustain.frames) return;
    const fraction = sourcePosition - sourceFrame;
    const sampleLeft =
      sustain.interleaved[sourceFrame * 2] * (1 - fraction) +
      sustain.interleaved[(sourceFrame + 1) * 2] * fraction;
    const sampleRight =
      sustain.interleaved[sourceFrame * 2 + 1] * (1 - fraction) +
      sustain.interleaved[(sourceFrame + 1) * 2 + 1] * fraction;
    // A gentle low-pass keeps the real hammer detail behind the product-film bed.
    filteredLeft += (sampleLeft - filteredLeft) * 0.2;
    filteredRight += (sampleRight - filteredRight) * 0.2;
    const envelope =
      Math.min(1, time / 0.016) * Math.min(1, Math.max(0, noteDuration - time) / 0.11);
    const level = (gain * sampledPianoMixGain) / Math.max(sustain.peak, 0.001);
    addPianoStereoPair(
      sampleIndex,
      filteredLeft * envelope * level,
      filteredRight * envelope * level,
      pan
    );
  });

  const release = loadPianoSample(region.release);
  const releaseRatio =
    2 ** ((midi - region.release.keyCenter - region.release.tuneCents / 100) / 12);
  const releaseDuration = Math.min(0.58, release.frames / SAMPLE_RATE / releaseRatio);
  let releaseLeft = 0;
  let releaseRight = 0;
  forEvent(
    beatToSeconds(startBeat) + noteDuration,
    releaseDuration,
    (time, progress, sampleIndex) => {
      const sourcePosition = region.release.offsetSamples + time * SAMPLE_RATE * releaseRatio;
      const sourceFrame = Math.floor(sourcePosition);
      if (sourceFrame + 1 >= release.frames) return;
      const fraction = sourcePosition - sourceFrame;
      const sampleLeft =
        release.interleaved[sourceFrame * 2] * (1 - fraction) +
        release.interleaved[(sourceFrame + 1) * 2] * fraction;
      const sampleRight =
        release.interleaved[sourceFrame * 2 + 1] * (1 - fraction) +
        release.interleaved[(sourceFrame + 1) * 2 + 1] * fraction;
      releaseLeft += (sampleLeft - releaseLeft) * 0.18;
      releaseRight += (sampleRight - releaseRight) * 0.18;
      const envelope = Math.min(1, time / 0.1) * Math.min(1, (1 - progress) / 0.24);
      const level = (gain * sampledPianoMixGain * 0.075) / Math.max(release.peak, 0.001);
      addPianoStereoPair(
        sampleIndex,
        releaseLeft * envelope * level,
        releaseRight * envelope * level,
        pan
      );
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
const shortSections: readonly ScoreSection[] = [
  [0, 10, [50, 57, 62, 66], 0.068, 0.12],
  [10, 12, [47, 54, 59, 62], 0.078, 0.28],
  [22, 12, [43, 50, 57, 59], 0.067, 0.14],
  [34, 10, [45, 52, 57, 62], 0.076, 0.3],
  [44, 8, [43, 50, 57, 62], 0.088, 0.36],
  [52, 8, [50, 57, 62, 66, 69], 0.096, 0.18]
];
const daySections: readonly ScoreSection[] = [
  [0, 12, [50, 57, 62, 66], 0.061, 0.1],
  [12, 16, [47, 54, 59, 62], 0.066, 0.18],
  [28, 16, [45, 52, 57, 62], 0.069, 0.2],
  [44, 14, [43, 50, 57, 59], 0.06, 0.1],
  [58, 14, [45, 52, 57, 62], 0.064, 0.18],
  [72, 16, [50, 57, 62, 66], 0.074, 0.26],
  [88, 16, [43, 50, 57, 62], 0.063, 0.12],
  [104, 8, [45, 52, 57, 62, 66], 0.082, 0.32],
  [112, 8, [50, 57, 62, 66, 69], 0.09, 0.16]
];
const sections = isDayScore ? daySections : shortSections;
const proofBeat = isDayScore ? 104 : 44;
const closeBeat = isDayScore ? 112 : 52;

for (const [beat, duration, notes, gain, lift] of sections) {
  addWarmPad(beat, duration, notes, gain, lift);
  addSpatialTexture(beat, duration, beat >= proofBeat ? 0.016 : 0.011);
}

const scoreBeats = Math.round(DURATION_SECONDS / SECONDS_PER_BEAT);
for (let beat = 0; beat < scoreBeats; beat += 1) {
  const shortIntensity =
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
  const dayIntensity =
    beat < 12
      ? 0.06
      : beat < 44
        ? 0.085
        : beat < 58
          ? 0.05
          : beat < 72
            ? 0.07
            : beat < 88
              ? 0.09
              : beat < 104
                ? 0.065
                : beat < 112
                  ? 0.1
                  : 0.075;
  const intensity = isDayScore ? dayIntensity : shortIntensity;
  addSoftPulse(beat, 38, intensity);
  const activeRun = isDayScore ? beat >= 12 && beat < 44 : beat >= 10 && beat < 22;
  if (activeRun && beat % 2 === 1) addSoftPulse(beat + 0.5, 45, 0.028);
}

// A wholly original three-note clarity motif: D, A, E. It is intentionally
// compact and neutral so the workflow—not the music—remains the protagonist.
const originalClarityMotif = [74, 69, 76] as const;
const addClarityMotif = (startBeat: number, gain: number): void => {
  const offsets = [0, 1.5, 3.5] as const;
  originalClarityMotif.forEach((note, index) => {
    addGlassNote(startBeat + offsets[index], 2.2, note, gain, index === 1 ? -0.18 : 0.16);
    addSampledPianoNote(
      startBeat + offsets[index],
      2,
      note - 12,
      gain * 0.36,
      index === 1 ? -0.1 : 0.08
    );
  });
};

const clarityMotifs: readonly (readonly [number, number])[] = isDayScore
  ? [
      [0.5, 0.026],
      [28, 0.028],
      [72, 0.032],
      [104, 0.036],
      [112, 0.038]
    ]
  : [
      [0.5, 0.03],
      [22.25, 0.034],
      [52, 0.04]
    ];
for (const [beat, gain] of clarityMotifs) addClarityMotif(beat, gain);

const pianoBackgroundGain = isDayScore ? 0.48 : 0.56;

const shortPianoNotes = [
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
] as const;
const dayPianoNotes = [
  [14, 59, 0.05, -0.12],
  [18, 62, 0.052, 0.1],
  [22, 66, 0.05, -0.08],
  [30, 62, 0.054, 0.12],
  [36, 57, 0.052, -0.12],
  [42, 62, 0.056, 0.1],
  [50, 57, 0.048, -0.12],
  [56, 62, 0.05, 0.1],
  [62, 64, 0.052, -0.08],
  [68, 62, 0.054, 0.12],
  [74, 59, 0.056, -0.12],
  [78, 62, 0.058, 0.1],
  [82, 66, 0.056, -0.08],
  [90, 57, 0.052, -0.12],
  [96, 62, 0.054, 0.1],
  [102, 64, 0.056, -0.08],
  [106, 62, 0.06, -0.12],
  [109, 66, 0.064, 0.1],
  [112.5, 69, 0.068, -0.08],
  [116, 74, 0.074, 0.12]
] as const;
const pianoNotes = isDayScore ? dayPianoNotes : shortPianoNotes;
for (const [beat, midi, gain, pan] of pianoNotes) {
  addSampledPianoNote(beat, 2.4, midi, gain * pianoBackgroundGain, pan);
}

const narrativeHitBeats = Object.values(SCORE_SPEC.music.hitFrames).map(
  (frame) => frame / SCORE_SPEC.music.beatFrames
);

for (const beat of narrativeHitBeats) {
  if (beat > 0) addAirSwell(beat - 0.8, 0.8, beat >= proofBeat ? 0.026 : 0.018);
  addSoftImpact(beat, beat === 0 ? 0.08 : beat >= proofBeat ? 0.135 : 0.105);
  if (beat >= proofBeat) addGlassNote(beat, 2, beat >= closeBeat ? 86 : 81, 0.022, 0.24);
}

let bedEnergy = 0;
let pianoEnergy = 0;
for (let index = 0; index < TOTAL_SAMPLES; index += 1) {
  bedEnergy += left[index] ** 2 + right[index] ** 2;
  pianoEnergy += pianoLeft[index] ** 2 + pianoRight[index] ** 2;
  left[index] += pianoLeft[index];
  right[index] += pianoRight[index];
}
const pianoToBedDb = 10 * Math.log10(pianoEnergy / Math.max(bedEnergy, Number.EPSILON));
if (pianoToBedDb > -14) {
  throw new Error(`Workflow piano is too prominent at ${pianoToBedDb.toFixed(1)} dB vs dry bed`);
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

const outputPath = join(packageRoot, 'public', SCORE_SPEC.music.asset);
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'workflow-score-'));
const temporaryWav = join(
  temporaryDirectory,
  isDayScore ? 'proof-over-time.wav' : 'proof-in-motion.wav'
);

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
    `title=${SCORE_SPEC.music.title}`,
    '-metadata',
    'artist=CREATE SOMETHING',
    '-metadata',
    `comment=${SCORE_SPEC.music.credit}`,
    outputPath
  ],
  { encoding: 'utf8' }
);

rmSync(temporaryDirectory, { recursive: true, force: true });

if (encode.status !== 0) {
  throw new Error(`ffmpeg failed to encode workflow score: ${encode.stderr || encode.stdout}`);
}

console.log(
  `generated ${SCORE_SPEC.music.title}: ${DURATION_SECONDS}s, ${SCORE_SPEC.music.bpm} BPM, piano ${pianoToBedDb.toFixed(1)} dB vs dry bed, ${outputPath}`
);
