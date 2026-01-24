/**
 * WalkthroughSoundscape - Tone.js integration with Remotion
 * 
 * Creates an ambient soundscape that responds to scene transitions
 * and component interactions.
 * 
 * Note: Tone.js runs in browser context. For Remotion rendering,
 * we use pre-rendered audio files generated from these definitions.
 * This component provides real-time preview functionality.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, staticFile, interpolate } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';

// Sound cue types for the walkthrough
interface SoundCue {
  frame: number;
  type: 'transition' | 'wireframe' | 'embodiment' | 'keypress' | 'success' | 'connection';
  volume?: number;
  note?: string;
}

/**
 * Generate sound cues from the spec
 */
const generateSoundCues = (): SoundCue[] => {
  const { scenes } = WALKTHROUGH_SPEC;
  const cues: SoundCue[] = [];
  
  // Scene transitions
  Object.entries(scenes).forEach(([name, scene]) => {
    // Transition sound at scene start
    cues.push({
      frame: scene.start,
      type: 'transition',
      volume: 0.08,
    });
    
    // Add specific cues based on scene phases
    if ('wireframeReveal' in scene.phases) {
      cues.push({
        frame: scene.start + (scene.phases as any).wireframeReveal.start,
        type: 'wireframe',
        volume: 0.05,
      });
    }
    
    if ('embodiment' in scene.phases) {
      cues.push({
        frame: scene.start + (scene.phases as any).embodiment.start,
        type: 'embodiment',
        volume: 0.1,
      });
    }
  });
  
  // Keyboard demo cues from InboxItem scene
  const inboxScene = scenes.inboxItem;
  const keyboardStart = inboxScene.start + inboxScene.phases.keyboardDemo.start;
  
  // A key
  cues.push({ frame: keyboardStart, type: 'keypress', volume: 0.06, note: 'C6' });
  // D key
  cues.push({ frame: keyboardStart + 60, type: 'keypress', volume: 0.06, note: 'D6' });
  // S key  
  cues.push({ frame: keyboardStart + 120, type: 'keypress', volume: 0.06, note: 'E6' });
  
  // Connection sounds in Assembly scene
  const assemblyScene = scenes.assembly;
  for (let i = 0; i < 4; i++) {
    cues.push({
      frame: assemblyScene.start + assemblyScene.phases.sourcesConnect.start + (i * 30),
      type: 'connection',
      volume: 0.07,
    });
  }
  
  // Success on metrics reveal
  cues.push({
    frame: scenes.metricCard.start + scenes.metricCard.phases.countUp.start + 90,
    type: 'success',
    volume: 0.08,
  });
  
  return cues.sort((a, b) => a.frame - b.frame);
};

// Map sound types to pre-rendered audio files
const SOUND_FILES: Record<SoundCue['type'], string> = {
  transition: 'sounds/whoosh-soft.wav',
  wireframe: 'sounds/tick-soft.wav',
  embodiment: 'sounds/shimmer.wav',
  keypress: 'sounds/micro-tick.wav',
  success: 'sounds/success-soft.wav',
  connection: 'sounds/pop-soft.wav',
};

/**
 * WalkthroughSoundscape Component
 * 
 * Plays sound cues synchronized to frame timing.
 * Uses pre-rendered WAV files for Remotion compatibility.
 */
export const WalkthroughSoundscape: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cues = useRef(generateSoundCues());
  
  // Track which cues have been triggered (for preview mode)
  const triggeredRef = useRef<Set<number>>(new Set());
  
  return (
    <>
      {cues.current.map((cue, index) => {
        // Calculate when this sound should play
        const startFrame = cue.frame;
        const endFrame = cue.frame + 30; // ~1 second duration
        
        // Only render audio elements for nearby cues
        if (frame < startFrame - 30 || frame > endFrame + 60) {
          return null;
        }
        
        // Calculate volume envelope
        const volume = interpolate(
          frame,
          [startFrame, startFrame + 5, endFrame - 5, endFrame],
          [0, cue.volume || 0.1, cue.volume || 0.1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        
        return (
          <Audio
            key={`${cue.type}-${index}`}
            src={staticFile(SOUND_FILES[cue.type])}
            startFrom={0}
            volume={volume}
          />
        );
      })}
    </>
  );
};

/**
 * Ambient Drone Component
 * 
 * Continuous low-frequency ambient bed.
 * Uses a pre-rendered ambient track.
 */
export const AmbientDrone: React.FC<{ volume?: number }> = ({ volume = 0.03 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Fade in at start, fade out at end
  const fadeVolume = interpolate(
    frame,
    [0, 90, durationInFrames - 90, durationInFrames],
    [0, volume, volume, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <Audio
      src={staticFile('sounds/ambient-drone.wav')}
      volume={fadeVolume}
      loop
    />
  );
};

/**
 * Combined soundscape export
 */
export const FullSoundscape: React.FC = () => {
  return (
    <>
      <AmbientDrone volume={0.03} />
      <WalkthroughSoundscape />
    </>
  );
};

export default WalkthroughSoundscape;
