/**
 * Audio utilities for commercials
 */

export { AudioSync, useAudioSync, useMarkerReached, useMarkerProgress } from './AudioSync';
export type { TimingMarker } from './AudioSync';

export { 
  SoundCues, 
  SOUND_LIBRARY, 
  createCascade, 
  createRapidFire 
} from './SoundCues';
export type { SoundCue, SoundName } from './SoundCues';
