/**
 * TEND Walkthrough Commercial
 * 
 * Component-by-component walkthrough with voiceover narration.
 * Uses Remotion for video, ElevenLabs for voice, Tone.js for sound design.
 */

// Main composition
export { TendWalkthroughCommercial, TEND_WALKTHROUGH_CONFIG } from './TendWalkthroughCommercial';
export { default } from './TendWalkthroughCommercial';

// Spec
export { WALKTHROUGH_SPEC } from './spec';
export type { WalkthroughSpec } from './spec';

// Scenes
export { IntroScene } from './scenes/IntroScene';
export { SourceCardScene } from './scenes/SourceCardScene';
export { ActivityFeedItemScene } from './scenes/ActivityFeedItemScene';
export { InboxItemScene } from './scenes/InboxItemScene';
export { MetricCardScene } from './scenes/MetricCardScene';
export { KeyboardHintScene } from './scenes/KeyboardHintScene';
export { AssemblyScene } from './scenes/AssemblyScene';
export { CloseScene } from './scenes/CloseScene';

// Audio
export { WalkthroughSoundscape, AmbientDrone, FullSoundscape } from './audio/WalkthroughSoundscape';
export { soundEngine, WalkthroughSoundEngine } from './audio/tones';
export type { SoundType } from './audio/tones';
