/**
 * Tone.js Synth Definitions for Tend Walkthrough
 * 
 * Ambient soundscape with gentle, meditative tones.
 * Designed to complement calm voiceover pacing.
 * 
 * Sound design philosophy: Felt, not heard.
 * Sounds should support understanding, not distract from it.
 */

import * as Tone from 'tone';

// Base frequencies for ambient pad (C major - peaceful, resolved)
const AMBIENT_FREQUENCIES = {
  C3: 130.81,
  G3: 196.00,
  C4: 261.63,
  E4: 329.63,
  G4: 392.00,
};

// Sound types for different events
export type SoundType = 
  | 'ambient-pad'
  | 'transition-sweep'
  | 'wireframe-click'
  | 'embodiment-shimmer'
  | 'key-tick'
  | 'success-resolve'
  | 'connection-pulse';

/**
 * Create the ambient pad synth
 * Continuous drone with gentle chord
 */
export const createAmbientPad = () => {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 4,
      decay: 2,
      sustain: 0.8,
      release: 6,
    },
  });
  
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 800,
    rolloff: -24,
  });
  
  const reverb = new Tone.Reverb({
    decay: 8,
    wet: 0.5,
  });
  
  const gain = new Tone.Gain(0.03);
  
  synth.chain(filter, reverb, gain, Tone.getDestination());
  
  return {
    synth,
    filter,
    reverb,
    gain,
    play: (notes: string[] = ['C3', 'G3', 'C4']) => {
      synth.triggerAttack(notes, Tone.now());
    },
    stop: () => {
      synth.triggerRelease(['C3', 'G3', 'C4', 'E4', 'G4'], Tone.now());
    },
    setVolume: (vol: number) => {
      gain.gain.rampTo(vol, 0.5);
    },
  };
};

/**
 * Create transition sweep synth
 * Low frequency sweep for scene changes
 */
export const createTransitionSweep = () => {
  const synth = new Tone.Synth({
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.5,
      decay: 1.5,
      sustain: 0,
      release: 2,
    },
  });
  
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 400,
    rolloff: -12,
  });
  
  const reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.6,
  });
  
  const gain = new Tone.Gain(0.08);
  
  synth.chain(filter, reverb, gain, Tone.getDestination());
  
  return {
    synth,
    play: (note: string = 'C2') => {
      synth.triggerAttackRelease(note, '2n', Tone.now());
    },
  };
};

/**
 * Create wireframe reveal click
 * Soft, subtle click for wireframe appearance
 */
export const createWireframeClick = () => {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 2,
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
  });
  
  const filter = new Tone.Filter({
    type: 'highpass',
    frequency: 1000,
  });
  
  const gain = new Tone.Gain(0.05);
  
  synth.chain(filter, gain, Tone.getDestination());
  
  return {
    synth,
    play: () => {
      synth.triggerAttackRelease('C4', '32n', Tone.now());
    },
  };
};

/**
 * Create embodiment shimmer
 * Harmonic shimmer for wireframe → styled transition
 */
export const createEmbodimentShimmer = () => {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'triangle',
    },
    envelope: {
      attack: 0.1,
      decay: 0.5,
      sustain: 0.3,
      release: 1.5,
    },
  });
  
  const chorus = new Tone.Chorus({
    frequency: 2,
    delayTime: 3.5,
    depth: 0.7,
    wet: 0.5,
  });
  
  const reverb = new Tone.Reverb({
    decay: 3,
    wet: 0.4,
  });
  
  const gain = new Tone.Gain(0.1);
  
  synth.chain(chorus, reverb, gain, Tone.getDestination());
  
  return {
    synth,
    play: () => {
      // Rising arpeggio shimmer
      const now = Tone.now();
      synth.triggerAttackRelease('C5', '8n', now);
      synth.triggerAttackRelease('E5', '8n', now + 0.05);
      synth.triggerAttackRelease('G5', '8n', now + 0.1);
      synth.triggerAttackRelease('C6', '8n', now + 0.15);
    },
  };
};

/**
 * Create key press tick
 * Soft tick for keyboard demonstration
 */
export const createKeyTick = () => {
  const synth = new Tone.Synth({
    oscillator: {
      type: 'square',
    },
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
      release: 0.05,
    },
  });
  
  const filter = new Tone.Filter({
    type: 'bandpass',
    frequency: 2000,
    Q: 2,
  });
  
  const gain = new Tone.Gain(0.06);
  
  synth.chain(filter, gain, Tone.getDestination());
  
  return {
    synth,
    play: (pitch: string = 'C6') => {
      synth.triggerAttackRelease(pitch, '64n', Tone.now());
    },
  };
};

/**
 * Create success resolve tone
 * Gentle resolution for completed actions
 */
export const createSuccessResolve = () => {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.2,
      release: 1,
    },
  });
  
  const reverb = new Tone.Reverb({
    decay: 2,
    wet: 0.3,
  });
  
  const gain = new Tone.Gain(0.08);
  
  synth.chain(reverb, gain, Tone.getDestination());
  
  return {
    synth,
    play: () => {
      const now = Tone.now();
      synth.triggerAttackRelease(['G4', 'B4', 'D5'], '4n', now);
    },
  };
};

/**
 * Create connection pulse
 * Subtle pulse for source connections
 */
export const createConnectionPulse = () => {
  const synth = new Tone.Synth({
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.05,
      decay: 0.2,
      sustain: 0,
      release: 0.5,
    },
  });
  
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 600,
  });
  
  const gain = new Tone.Gain(0.07);
  
  synth.chain(filter, gain, Tone.getDestination());
  
  return {
    synth,
    play: (note: string = 'G3') => {
      synth.triggerAttackRelease(note, '8n', Tone.now());
    },
  };
};

/**
 * Sound engine - manages all synths
 */
export class WalkthroughSoundEngine {
  private ambientPad: ReturnType<typeof createAmbientPad> | null = null;
  private transitionSweep: ReturnType<typeof createTransitionSweep> | null = null;
  private wireframeClick: ReturnType<typeof createWireframeClick> | null = null;
  private embodimentShimmer: ReturnType<typeof createEmbodimentShimmer> | null = null;
  private keyTick: ReturnType<typeof createKeyTick> | null = null;
  private successResolve: ReturnType<typeof createSuccessResolve> | null = null;
  private connectionPulse: ReturnType<typeof createConnectionPulse> | null = null;
  
  private initialized = false;
  
  async init() {
    if (this.initialized) return;
    
    await Tone.start();
    
    this.ambientPad = createAmbientPad();
    this.transitionSweep = createTransitionSweep();
    this.wireframeClick = createWireframeClick();
    this.embodimentShimmer = createEmbodimentShimmer();
    this.keyTick = createKeyTick();
    this.successResolve = createSuccessResolve();
    this.connectionPulse = createConnectionPulse();
    
    this.initialized = true;
  }
  
  play(type: SoundType, options?: { note?: string }) {
    if (!this.initialized) return;
    
    switch (type) {
      case 'ambient-pad':
        this.ambientPad?.play();
        break;
      case 'transition-sweep':
        this.transitionSweep?.play(options?.note);
        break;
      case 'wireframe-click':
        this.wireframeClick?.play();
        break;
      case 'embodiment-shimmer':
        this.embodimentShimmer?.play();
        break;
      case 'key-tick':
        this.keyTick?.play(options?.note);
        break;
      case 'success-resolve':
        this.successResolve?.play();
        break;
      case 'connection-pulse':
        this.connectionPulse?.play(options?.note);
        break;
    }
  }
  
  stopAmbient() {
    this.ambientPad?.stop();
  }
  
  setAmbientVolume(vol: number) {
    this.ambientPad?.setVolume(vol);
  }
  
  dispose() {
    this.ambientPad?.synth.dispose();
    this.transitionSweep?.synth.dispose();
    this.wireframeClick?.synth.dispose();
    this.embodimentShimmer?.synth.dispose();
    this.keyTick?.synth.dispose();
    this.successResolve?.synth.dispose();
    this.connectionPulse?.synth.dispose();
    this.initialized = false;
  }
}

// Singleton instance
export const soundEngine = new WalkthroughSoundEngine();
