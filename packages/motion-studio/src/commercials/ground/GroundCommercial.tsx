/**
 * GroundCommercial - 30-second commercial for Ground MCP
 * 
 * Pure terminal experience. Show don't tell.
 * 
 * Flow:
 * 1. Agent tries to claim "95% similar" → Ground blocks
 * 2. Agent runs comparison → gets real data
 * 3. Agent makes grounded claim → succeeds
 * 4. Installation command
 * 5. Logo + tagline
 * 
 * Product: github.com/createsomethingtoday/ground
 * Tagline: "No hallucination. Just evidence."
 */
import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { VoxTreatment } from '../shared/primitives';
import { 
  FailedClaimScene, 
  ComparisonScene, 
  SuccessScene,
  CTAScene, 
  CloseScene 
} from './scenes';
import { SPEC } from './spec';

interface GroundCommercialProps {
  /** Path to voiceover audio file (optional) */
  voiceoverPath?: string;
}

export const GroundCommercial: React.FC<GroundCommercialProps> = ({
  voiceoverPath,
}) => {
  const { scenes, voxTreatment } = SPEC;
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {/* Voiceover audio (if provided) */}
      {voiceoverPath && (
        <Audio src={staticFile(voiceoverPath)} />
      )}
      
      {/* Failed Claim: Agent tries to claim without evidence */}
      <Sequence 
        from={scenes.failedClaim.start} 
        durationInFrames={scenes.failedClaim.duration}
        name="Failed Claim"
      >
        <FailedClaimScene />
      </Sequence>
      
      {/* Comparison: Agent runs ground compare */}
      <Sequence 
        from={scenes.comparison.start} 
        durationInFrames={scenes.comparison.duration}
        name="Comparison"
      >
        <ComparisonScene />
      </Sequence>
      
      {/* Success: Claim now succeeds with evidence */}
      <Sequence 
        from={scenes.success.start} 
        durationInFrames={scenes.success.duration}
        name="Success"
      >
        <SuccessScene />
      </Sequence>
      
      {/* CTA: Installation command */}
      <Sequence 
        from={scenes.cta.start} 
        durationInFrames={scenes.cta.duration}
        name="CTA"
      >
        <CTAScene />
      </Sequence>
      
      {/* Close: Logo, tagline, URL */}
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

export const GROUND_COMMERCIAL_CONFIG = {
  id: 'GroundCommercial',
  component: GroundCommercial,
  durationInFrames: SPEC.durationInFrames,
  fps: SPEC.fps,
  width: SPEC.width,
  height: SPEC.height,
  defaultProps: {
    voiceoverPath: undefined,
  },
};

export default GroundCommercial;
