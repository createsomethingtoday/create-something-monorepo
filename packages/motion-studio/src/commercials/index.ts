/**
 * CREATE SOMETHING Commercials
 * 
 * Vox-style kinetic typography commercials.
 * Motion transitions (slide, scale, wipe) - NEVER fade.
 * Cutting on twos. Analog texture treatment.
 */

// Seeing Commercial
export { 
  SeeingCommercial, 
  SEEING_COMMERCIAL_CONFIG,
  SEEING_SPEC,
} from './seeing';

// Shared primitives
export {
  KineticHeadline,
  MotionTransition,
  ProgressiveErasure,
  VoxTreatment,
  CommandDisplay,
} from './shared/primitives';

// Audio utilities
export {
  AudioSync,
  useAudioSync,
  useMarkerReached,
  useMarkerProgress,
} from './shared/audio';
export type { TimingMarker } from './shared/audio';
