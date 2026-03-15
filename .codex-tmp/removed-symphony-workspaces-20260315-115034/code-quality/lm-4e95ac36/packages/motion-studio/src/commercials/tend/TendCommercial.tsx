/**
 * TendCommercial - 60-second dashboard UI commercial
 * 
 * Visual storytelling through wireframe → styled transitions.
 * No voiceover - the unconcealment IS the narrative.
 * 
 * Story Arc:
 * 1. Sources - 8 disconnected data sources (fragmentation)
 * 2. Connection - Sources animate to connected (unity)
 * 3. Activity - Real-time feed populating (automation)
 * 4. Triage - Keyboard-driven item actions (human focus)
 * 5. Metrics - Final stats reveal (payoff)
 * 6. Close - TEND logo (brand)
 * 
 * Product: createsomething.agency/tend
 * Tagline: "Tend to what matters."
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { VoxTreatment } from '../shared/primitives';
import {
  SourcesScene,
  ConnectionScene,
  ActivityScene,
  TriageScene,
  MetricsScene,
  CloseScene,
} from './scenes';
import { TendSoundCues } from './audio';
import { SPEC } from './spec';

interface TendCommercialProps {
  /** Enable sound effects (default: true) */
  enableSound?: boolean;
  /** Master volume for sounds (0-1, default: 0.8) */
  soundVolume?: number;
}

export const TendCommercial: React.FC<TendCommercialProps> = ({
  enableSound = true,
  soundVolume = 0.8,
}) => {
  const { scenes, voxTreatment, colors } = SPEC;
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {/* Sound design layer */}
      <TendSoundCues enabled={enableSound} masterVolume={soundVolume} />
      
      {/* Base background */}
      <AbsoluteFill style={{ backgroundColor: colors.bgBase }} />
      
      {/* Scene 1: Sources Grid (0-12s) */}
      <Sequence
        from={scenes.sources.start}
        durationInFrames={scenes.sources.duration}
        name="Sources"
      >
        <SourcesScene />
      </Sequence>
      
      {/* Scene 2: Connection (12-21s) */}
      <Sequence
        from={scenes.connection.start}
        durationInFrames={scenes.connection.duration}
        name="Connection"
      >
        <ConnectionScene />
      </Sequence>
      
      {/* Scene 3: Activity Feed (21-33s) */}
      <Sequence
        from={scenes.activity.start}
        durationInFrames={scenes.activity.duration}
        name="Activity"
      >
        <ActivityScene />
      </Sequence>
      
      {/* Scene 4: Inbox Triage (33-48s) */}
      <Sequence
        from={scenes.triage.start}
        durationInFrames={scenes.triage.duration}
        name="Triage"
      >
        <TriageScene />
      </Sequence>
      
      {/* Scene 5: Metrics (48-54s) */}
      <Sequence
        from={scenes.metrics.start}
        durationInFrames={scenes.metrics.duration}
        name="Metrics"
      >
        <MetricsScene />
      </Sequence>
      
      {/* Scene 6: Close (54-60s) */}
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

export const TEND_COMMERCIAL_CONFIG = {
  id: 'TendCommercial',
  component: TendCommercial,
  durationInFrames: SPEC.durationInFrames,
  fps: SPEC.fps,
  width: SPEC.width,
  height: SPEC.height,
  defaultProps: {
    enableSound: true,
    soundVolume: 0.8,
  },
};

export default TendCommercial;
