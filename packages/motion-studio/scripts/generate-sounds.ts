/**
 * Generate UI Sounds for Remotion Videos
 * 
 * Uses pure Node.js to synthesize sounds mathematically.
 * Exports WAV files to public/sounds/ for use in Remotion compositions.
 * 
 * Sound Design Philosophy:
 * - Subtle, not attention-grabbing
 * - Consistent tonal palette
 * - Short durations (< 300ms for most)
 * - Clean, digital aesthetic matching Canon
 * 
 * Run: pnpm generate-sounds
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../public/sounds');
const SAMPLE_RATE = 44100;

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================
// AUDIO UTILITIES
// ============================================

/**
 * Create a Float32Array buffer of silence
 */
function createBuffer(durationSeconds: number): Float32Array {
  return new Float32Array(Math.floor(SAMPLE_RATE * durationSeconds));
}

/**
 * Convert frequency in Hz to radians per sample
 */
function freqToRad(freq: number): number {
  return (2 * Math.PI * freq) / SAMPLE_RATE;
}

/**
 * Note name to frequency (A4 = 440Hz)
 */
function noteToFreq(note: string): number {
  const notes: Record<string, number> = {
    'C1': 32.70, 'D1': 36.71, 'E1': 41.20, 'F1': 43.65, 'G1': 49.00, 'A1': 55.00, 'B1': 61.74,
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00,
  };
  return notes[note] || 440;
}

/**
 * ADSR envelope
 */
function envelope(
  sample: number,
  totalSamples: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number
): number {
  const attackSamples = Math.floor(SAMPLE_RATE * attack);
  const decaySamples = Math.floor(SAMPLE_RATE * decay);
  const releaseSamples = Math.floor(SAMPLE_RATE * release);
  const sustainSamples = totalSamples - attackSamples - decaySamples - releaseSamples;
  
  if (sample < attackSamples) {
    return sample / attackSamples;
  } else if (sample < attackSamples + decaySamples) {
    const decayProgress = (sample - attackSamples) / decaySamples;
    return 1 - (1 - sustain) * decayProgress;
  } else if (sample < attackSamples + decaySamples + sustainSamples) {
    return sustain;
  } else {
    const releaseProgress = (sample - attackSamples - decaySamples - sustainSamples) / releaseSamples;
    return sustain * (1 - releaseProgress);
  }
}

/**
 * Simple exponential decay envelope
 */
function expDecay(sample: number, decayRate: number): number {
  return Math.exp(-sample / (SAMPLE_RATE * decayRate));
}

/**
 * Oscillators
 */
function sine(phase: number): number {
  return Math.sin(phase);
}

function square(phase: number): number {
  return Math.sin(phase) >= 0 ? 1 : -1;
}

function triangle(phase: number): number {
  const t = (phase / (2 * Math.PI)) % 1;
  return 4 * Math.abs(t - 0.5) - 1;
}

function noise(): number {
  return Math.random() * 2 - 1;
}

/**
 * Mix samples together
 */
function mix(buffer: Float32Array, samples: Float32Array, volume: number = 1): void {
  const len = Math.min(buffer.length, samples.length);
  for (let i = 0; i < len; i++) {
    buffer[i] += samples[i] * volume;
  }
}

/**
 * Apply gain
 */
function gain(buffer: Float32Array, amount: number): Float32Array {
  return buffer.map(s => s * amount);
}

/**
 * Simple lowpass filter (one-pole)
 */
function lowpass(buffer: Float32Array, cutoff: number): Float32Array {
  const result = new Float32Array(buffer.length);
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  
  result[0] = buffer[0];
  for (let i = 1; i < buffer.length; i++) {
    result[i] = result[i - 1] + alpha * (buffer[i] - result[i - 1]);
  }
  return result;
}

/**
 * Highpass filter (one-pole)
 */
function highpass(buffer: Float32Array, cutoff: number): Float32Array {
  const result = new Float32Array(buffer.length);
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SAMPLE_RATE;
  const alpha = rc / (rc + dt);
  
  result[0] = buffer[0];
  for (let i = 1; i < buffer.length; i++) {
    result[i] = alpha * (result[i - 1] + buffer[i] - buffer[i - 1]);
  }
  return result;
}

/**
 * Normalize to prevent clipping
 */
function normalize(buffer: Float32Array, targetPeak: number = 0.9): Float32Array {
  const max = Math.max(...buffer.map(Math.abs));
  if (max === 0) return buffer;
  const scale = targetPeak / max;
  return buffer.map(s => s * scale);
}

/**
 * Convert Float32Array to WAV file buffer
 */
function toWav(samples: Float32Array): Buffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Audio data
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intSample), 44 + i * 2);
  }
  
  return buffer;
}

// ============================================
// SOUND GENERATORS
// ============================================

interface SoundGenerator {
  name: string;
  generate: () => Float32Array;
}

const sounds: SoundGenerator[] = [
  // ---- POPS & THUDS ----
  {
    name: 'pop-soft',
    generate: () => {
      const buffer = createBuffer(0.15);
      const freq = noteToFreq('C2');
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        // Pitch drops rapidly (membrane synth effect)
        const pitchEnv = Math.exp(-t * 40);
        const currentFreq = freq * (1 + 3 * pitchEnv);
        const phase = freqToRad(currentFreq) * i;
        const amp = expDecay(i, 0.05);
        buffer[i] = sine(phase) * amp * 0.6;
      }
      
      return normalize(buffer, 0.7);
    },
  },
  {
    name: 'pop-medium',
    generate: () => {
      const buffer = createBuffer(0.12);
      const freq = noteToFreq('G2');
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        const pitchEnv = Math.exp(-t * 50);
        const currentFreq = freq * (1 + 4 * pitchEnv);
        const phase = freqToRad(currentFreq) * i;
        const amp = expDecay(i, 0.04);
        buffer[i] = sine(phase) * amp * 0.8;
      }
      
      return normalize(buffer, 0.8);
    },
  },
  {
    name: 'thud-soft',
    generate: () => {
      const buffer = createBuffer(0.2);
      const freq = noteToFreq('E1');
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        const pitchEnv = Math.exp(-t * 20);
        const currentFreq = freq * (1 + 2 * pitchEnv);
        const phase = freqToRad(currentFreq) * i;
        const amp = expDecay(i, 0.08);
        buffer[i] = sine(phase) * amp * 0.5;
      }
      
      return lowpass(normalize(buffer, 0.6), 200);
    },
  },

  // ---- TICKS & CLICKS ----
  {
    name: 'tick-soft',
    generate: () => {
      const buffer = createBuffer(0.05);
      
      for (let i = 0; i < buffer.length; i++) {
        const amp = expDecay(i, 0.008);
        buffer[i] = noise() * amp * 0.4;
      }
      
      return highpass(normalize(buffer, 0.5), 2000);
    },
  },
  {
    name: 'tick-medium',
    generate: () => {
      const buffer = createBuffer(0.04);
      
      for (let i = 0; i < buffer.length; i++) {
        const amp = expDecay(i, 0.006);
        buffer[i] = noise() * amp * 0.6;
      }
      
      return highpass(normalize(buffer, 0.6), 3000);
    },
  },
  {
    name: 'click-mechanical',
    generate: () => {
      const buffer = createBuffer(0.08);
      const clickFreq = noteToFreq('C5');
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        // Noise component (attack)
        const noiseAmp = expDecay(i, 0.003);
        const noiseComp = noise() * noiseAmp * 0.7;
        
        // Pitched click component
        const clickAmp = expDecay(i, 0.01);
        const phase = freqToRad(clickFreq) * i;
        const clickComp = square(phase) * clickAmp * 0.3;
        
        buffer[i] = noiseComp + clickComp;
      }
      
      return normalize(buffer, 0.85);
    },
  },
  {
    name: 'micro-tick',
    generate: () => {
      const buffer = createBuffer(0.025);
      
      for (let i = 0; i < buffer.length; i++) {
        const amp = expDecay(i, 0.004);
        buffer[i] = noise() * amp * 0.3;
      }
      
      return lowpass(highpass(normalize(buffer, 0.4), 1000), 8000);
    },
  },

  // ---- SUCCESS / APPROVAL ----
  {
    name: 'success-chime',
    generate: () => {
      const buffer = createBuffer(0.35);
      const freq1 = noteToFreq('E5');
      const freq2 = noteToFreq('G5');
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        
        // First note (E5)
        const amp1 = t < 0.08 ? expDecay(i, 0.1) : expDecay(i - 0.08 * SAMPLE_RATE, 0.08) * 0.5;
        const phase1 = freqToRad(freq1) * i;
        const note1 = sine(phase1) * amp1 * (t < 0.12 ? 1 : 0.3);
        
        // Second note (G5) - starts at 80ms
        const note2Start = Math.floor(0.08 * SAMPLE_RATE);
        let note2 = 0;
        if (i >= note2Start) {
          const localI = i - note2Start;
          const amp2 = expDecay(localI, 0.12);
          const phase2 = freqToRad(freq2) * localI;
          note2 = sine(phase2) * amp2;
        }
        
        buffer[i] = (note1 + note2) * 0.5;
      }
      
      return normalize(buffer, 0.75);
    },
  },
  {
    name: 'success-soft',
    generate: () => {
      const buffer = createBuffer(0.2);
      const freq = noteToFreq('G5');
      
      for (let i = 0; i < buffer.length; i++) {
        const env = envelope(i, buffer.length, 0.01, 0.08, 0.3, 0.05);
        const phase = freqToRad(freq) * i;
        buffer[i] = sine(phase) * env * 0.6;
      }
      
      return normalize(buffer, 0.65);
    },
  },

  // ---- DISMISS / WARNING ----
  {
    name: 'dismiss-soft',
    generate: () => {
      const buffer = createBuffer(0.15);
      const freq = noteToFreq('D4');
      
      for (let i = 0; i < buffer.length; i++) {
        const amp = expDecay(i, 0.06);
        const phase = freqToRad(freq) * i;
        buffer[i] = sine(phase) * amp * 0.5;
      }
      
      return normalize(buffer, 0.55);
    },
  },
  {
    name: 'warning-tone',
    generate: () => {
      const buffer = createBuffer(0.2);
      const freq = noteToFreq('F#4');
      
      for (let i = 0; i < buffer.length; i++) {
        const env = envelope(i, buffer.length, 0.01, 0.1, 0.2, 0.05);
        const phase = freqToRad(freq) * i;
        buffer[i] = triangle(phase) * env * 0.5;
      }
      
      return normalize(buffer, 0.6);
    },
  },

  // ---- TRANSITIONS ----
  {
    name: 'whoosh-soft',
    generate: () => {
      const buffer = createBuffer(0.25);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        // Amplitude envelope - rises then falls
        const amp = Math.sin(t / 0.25 * Math.PI) * 0.4;
        buffer[i] = noise() * amp;
      }
      
      // Sweep the filter frequency
      const result = new Float32Array(buffer.length);
      let filterState = 0;
      for (let i = 0; i < buffer.length; i++) {
        const t = i / SAMPLE_RATE;
        // Cutoff sweeps from 200 to 2000 and back
        const sweepProgress = Math.sin(t / 0.25 * Math.PI);
        const cutoff = 200 + sweepProgress * 1800;
        const rc = 1 / (2 * Math.PI * cutoff);
        const dt = 1 / SAMPLE_RATE;
        const alpha = dt / (rc + dt);
        filterState = filterState + alpha * (buffer[i] - filterState);
        result[i] = filterState;
      }
      
      return normalize(result, 0.5);
    },
  },
  {
    name: 'shimmer',
    generate: () => {
      const buffer = createBuffer(0.35);
      const freqs = [noteToFreq('C5'), noteToFreq('E5'), noteToFreq('G5')];
      
      for (let i = 0; i < buffer.length; i++) {
        const env = envelope(i, buffer.length, 0.02, 0.15, 0.2, 0.1);
        let sample = 0;
        
        for (const freq of freqs) {
          const phase = freqToRad(freq) * i;
          sample += sine(phase) * 0.3;
        }
        
        buffer[i] = sample * env;
      }
      
      return normalize(buffer, 0.55);
    },
  },

  // ---- UI SELECTION ----
  {
    name: 'select',
    generate: () => {
      const buffer = createBuffer(0.06);
      const freq = noteToFreq('A4');
      
      for (let i = 0; i < buffer.length; i++) {
        const amp = expDecay(i, 0.02);
        const phase = freqToRad(freq) * i;
        buffer[i] = sine(phase) * amp * 0.5;
      }
      
      return normalize(buffer, 0.6);
    },
  },
  {
    name: 'focus',
    generate: () => {
      const buffer = createBuffer(0.1);
      const freq = noteToFreq('E4');
      
      for (let i = 0; i < buffer.length; i++) {
        const env = envelope(i, buffer.length, 0.005, 0.04, 0.1, 0.03);
        const phase = freqToRad(freq) * i;
        buffer[i] = triangle(phase) * env * 0.5;
      }
      
      return normalize(buffer, 0.65);
    },
  },

  // ---- AMBIENT / RESOLUTION ----
  {
    name: 'resolve',
    generate: () => {
      const buffer = createBuffer(0.5);
      const freqs = [noteToFreq('C4'), noteToFreq('G4')];
      
      for (let i = 0; i < buffer.length; i++) {
        const env = envelope(i, buffer.length, 0.1, 0.2, 0.15, 0.1);
        let sample = 0;
        
        for (const freq of freqs) {
          const phase = freqToRad(freq) * i;
          sample += sine(phase) * 0.4;
        }
        
        buffer[i] = sample * env;
      }
      
      return normalize(buffer, 0.5);
    },
  },
];

// ============================================
// MAIN
// ============================================

function main() {
  console.log('🎵 Generating UI sounds...\n');
  
  for (const sound of sounds) {
    try {
      console.log(`  Generating: ${sound.name}`);
      
      const samples = sound.generate();
      const wav = toWav(samples);
      
      const outputPath = join(OUTPUT_DIR, `${sound.name}.wav`);
      writeFileSync(outputPath, wav);
      
      const durationMs = Math.round((samples.length / SAMPLE_RATE) * 1000);
      console.log(`  ✓ Saved: ${sound.name}.wav (${durationMs}ms)`);
    } catch (error) {
      console.error(`  ✗ Failed: ${sound.name}`, error);
    }
  }
  
  console.log('\n✅ Sound generation complete!');
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Files: ${sounds.length} WAV files`);
}

main();
