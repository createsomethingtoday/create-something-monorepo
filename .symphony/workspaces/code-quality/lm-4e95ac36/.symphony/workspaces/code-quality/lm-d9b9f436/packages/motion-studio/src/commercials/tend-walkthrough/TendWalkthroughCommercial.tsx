/**
 * TendWalkthroughCommercial - Component-by-component walkthrough
 * 
 * A meditative exploration of Tend's interface components.
 * Each component appears isolated, with voiceover explaining
 * its purpose and how it serves the whole.
 * 
 * Philosophy: Hermeneutic circle — understanding parts requires
 * understanding the whole; understanding the whole emerges from parts.
 * 
 * Duration: ~3.5 minutes
 * Audio: ElevenLabs voiceover + Tone.js ambient soundscape
 */
import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { VoxTreatment } from '../shared/primitives';
import { AudioSync } from '../shared/audio';
import { WALKTHROUGH_SPEC } from './spec';

// Scene imports
import { IntroScene } from './scenes/IntroScene';
import { SourceCardScene } from './scenes/SourceCardScene';
import { ActivityFeedItemScene } from './scenes/ActivityFeedItemScene';
import { InboxItemScene } from './scenes/InboxItemScene';
import { MetricCardScene } from './scenes/MetricCardScene';
import { KeyboardHintScene } from './scenes/KeyboardHintScene';
import { AssemblyScene } from './scenes/AssemblyScene';
import { CloseScene } from './scenes/CloseScene';

// Audio imports
import { FullSoundscape } from './audio/WalkthroughSoundscape';

interface TendWalkthroughProps {
  /** Enable voiceover audio (default: true) */
  enableVoiceover?: boolean;
  /** Enable sound effects (default: true) */
  enableSound?: boolean;
  /** Master volume for voiceover (0-1, default: 1) */
  voiceoverVolume?: number;
  /** Master volume for sounds (0-1, default: 0.6) */
  soundVolume?: number;
}

export const TendWalkthroughCommercial: React.FC<TendWalkthroughProps> = ({
  enableVoiceover = true, // Voiceover generated via ElevenLabs
  enableSound = false, // Disabled until sound files are generated
  voiceoverVolume = 1,
  soundVolume = 0.6,
}) => {
  const { scenes, voxTreatment, colors } = WALKTHROUGH_SPEC;
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {/* Voiceover layer */}
      {enableVoiceover && (
        <Audio
          src={staticFile('audio/tend-walkthrough/voiceover.mp3')}
          volume={voiceoverVolume}
        />
      )}
      
      {/* Sound design layer */}
      {enableSound && <FullSoundscape />}
      
      {/* Base background */}
      <AbsoluteFill style={{ backgroundColor: colors.bgBase }} />
      
      {/* Scene 1: Introduction - The whole system (~20s) */}
      <Sequence
        from={scenes.intro.start}
        durationInFrames={scenes.intro.duration}
        name="Intro"
      >
        <IntroScene />
      </Sequence>
      
      {/* Scene 2: SourceCard - Data sources (~25s) */}
      <Sequence
        from={scenes.sourceCard.start}
        durationInFrames={scenes.sourceCard.duration}
        name="SourceCard"
      >
        <SourceCardScene />
      </Sequence>
      
      {/* Scene 3: ActivityFeedItem - Automation visibility (~25s) */}
      <Sequence
        from={scenes.activityFeedItem.start}
        durationInFrames={scenes.activityFeedItem.duration}
        name="ActivityFeedItem"
      >
        <ActivityFeedItemScene />
      </Sequence>
      
      {/* Scene 4: InboxItem - Human attention (~30s) */}
      <Sequence
        from={scenes.inboxItem.start}
        durationInFrames={scenes.inboxItem.duration}
        name="InboxItem"
      >
        <InboxItemScene />
      </Sequence>
      
      {/* Scene 5: MetricCard - Outcomes (~20s) */}
      <Sequence
        from={scenes.metricCard.start}
        durationInFrames={scenes.metricCard.duration}
        name="MetricCard"
      >
        <MetricCardScene />
      </Sequence>
      
      {/* Scene 6: KeyboardHint - Tactile efficiency (~15s) */}
      <Sequence
        from={scenes.keyboardHint.start}
        durationInFrames={scenes.keyboardHint.duration}
        name="KeyboardHint"
      >
        <KeyboardHintScene />
      </Sequence>
      
      {/* Scene 7: Assembly - Parts become whole (~30s) */}
      <Sequence
        from={scenes.assembly.start}
        durationInFrames={scenes.assembly.duration}
        name="Assembly"
      >
        <AssemblyScene />
      </Sequence>
      
      {/* Scene 8: Close - Brand reveal (~15s) */}
      <Sequence
        from={scenes.close.start}
        durationInFrames={scenes.close.duration}
        name="Close"
      >
        <CloseScene />
      </Sequence>
    </VoxTreatment>
  );
};

/**
 * Remotion composition configuration
 */
export const TEND_WALKTHROUGH_CONFIG = {
  id: 'TendWalkthrough',
  component: TendWalkthroughCommercial,
  durationInFrames: WALKTHROUGH_SPEC.durationInFrames,
  fps: WALKTHROUGH_SPEC.fps,
  width: WALKTHROUGH_SPEC.width,
  height: WALKTHROUGH_SPEC.height,
  defaultProps: {
    enableVoiceover: true, // Voiceover generated via ElevenLabs
    enableSound: false, // Enable when sound files are generated
    voiceoverVolume: 1,
    soundVolume: 0.6,
  },
};

export default TendWalkthroughCommercial;
