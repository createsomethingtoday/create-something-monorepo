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

// Ground Commercial
export {
  GroundCommercial,
  GROUND_COMMERCIAL_CONFIG,
  SPEC as GROUND_SPEC,
} from './ground';

// GitHub History Commercial
export {
  GitHubHistoryCommercial,
  GITHUB_HISTORY_COMMERCIAL_CONFIG,
  GITHUB_HISTORY_SPEC,
} from './github-history';

// Outerfields Commercial
export {
  OuterfieldsCommercial,
  OUTERFIELDS_COMMERCIAL_CONFIG,
  SPEC as OUTERFIELDS_SPEC,
} from './outerfields';

// TEND Commercial
export {
  TendCommercial,
  TEND_COMMERCIAL_CONFIG,
  SPEC as TEND_SPEC,
} from './tend';

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
