/**
 * WalkthroughSoundscape - Pre-rendered audio cues for the walkthrough
 *
 * Uses the shared declarative cue renderer so renders stay deterministic.
 */
import React from 'react';
import { Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import {
  SoundCues,
  SOUND_LIBRARY,
  type SoundCue as BaseSoundCue,
  type SoundName,
} from '../../shared/audio/SoundCues';

// Sound cue types for the walkthrough
interface SoundCue {
  frame: number;
  type: 'transition' | 'wireframe' | 'embodiment' | 'keypress' | 'success' | 'connection';
  volume?: number;
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
  cues.push({ frame: keyboardStart, type: 'keypress', volume: 0.06 });
  // D key
  cues.push({ frame: keyboardStart + 60, type: 'keypress', volume: 0.06 });
  // S key  
  cues.push({ frame: keyboardStart + 120, type: 'keypress', volume: 0.06 });
  
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
const SOUND_FILES: Record<SoundCue['type'], SoundName> = {
  transition: 'whoosh-soft',
  wireframe: 'tick-soft',
  embodiment: 'shimmer',
  keypress: 'micro-tick',
  success: 'success-soft',
  connection: 'pop-soft',
};

const WALKTHROUGH_CUES: BaseSoundCue[] = generateSoundCues().map((cue) => ({
  frame: cue.frame,
  sound: SOUND_FILES[cue.type],
  volume: cue.volume,
}));

/**
 * WalkthroughSoundscape Component
 * 
 * Plays sound cues synchronized to frame timing.
 * Uses pre-rendered WAV files for Remotion compatibility.
 */
export const WalkthroughSoundscape: React.FC = () => {
  return <SoundCues cues={WALKTHROUGH_CUES} />;
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
      src={staticFile(SOUND_LIBRARY['ambient-drone'])}
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
