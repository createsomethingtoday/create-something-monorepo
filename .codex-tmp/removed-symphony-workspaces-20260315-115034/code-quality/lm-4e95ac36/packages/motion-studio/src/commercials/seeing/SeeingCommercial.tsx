/**
 * SeeingCommercial - 30-second commercial for learn.createsomething.space/seeing
 * 
 * Vox-style kinetic typography with motion transitions (slide, scale, wipe).
 * Cutting on twos (12fps posterize). Analog texture treatment.
 * 
 * Structure:
 * - Cold Open (0-4s): "Same logic in three places. Now they're different."
 * - Triad (4-14s): Three questions with /dry, /rams, /heidegger commands
 * - Demonstration (14-20s): Progressive erasure showing subtraction
 * - CTA (20-26s): Installation commands
 * - Close (26-30s): URL, tagline, logo
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { VoxTreatment } from '../shared/primitives';
import { ColdOpen, TriadScene, DemonstrationScene, CTAScene, CloseScene } from './scenes';
import { SPEC } from './spec';

export const SeeingCommercial: React.FC = () => {
  const { scenes, voxTreatment } = SPEC;
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {/* Cold Open: "Same logic in three places. Now they're different." */}
      <Sequence 
        from={scenes.coldOpen.start} 
        durationInFrames={scenes.coldOpen.duration}
        name="Cold Open"
      >
        <ColdOpen />
      </Sequence>
      
      {/* Triad: Three questions with commands */}
      <Sequence 
        from={scenes.triad.start} 
        durationInFrames={scenes.triad.duration}
        name="Triad"
      >
        <TriadScene />
      </Sequence>
      
      {/* Demonstration: Progressive erasure */}
      <Sequence 
        from={scenes.demonstration.start} 
        durationInFrames={scenes.demonstration.duration}
        name="Demonstration"
      >
        <DemonstrationScene />
      </Sequence>
      
      {/* CTA: Installation commands */}
      <Sequence 
        from={scenes.cta.start} 
        durationInFrames={scenes.cta.duration}
        name="CTA"
      >
        <CTAScene />
      </Sequence>
      
      {/* Close: URL, tagline, logo */}
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

export const SEEING_COMMERCIAL_CONFIG = {
  id: 'SeeingCommercial',
  component: SeeingCommercial,
  durationInFrames: SPEC.durationInFrames,
  fps: SPEC.fps,
  width: SPEC.width,
  height: SPEC.height,
};

export default SeeingCommercial;
