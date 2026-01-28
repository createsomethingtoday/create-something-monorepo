/**
 * TufteMobileCommercial - Main composition
 * 
 * Demonstrates responsive design through Edward Tufte's principles.
 * Story: Wireframe → Desktop → Mobile Constraint → Tufte Transform → Success
 * 
 * Style: Vox kinetic typography with film grain and posterized time
 */
import React from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { VoxTreatment } from '../shared/primitives/VoxTreatment';
import { TUFTE_MOBILE_SPEC } from './spec';

// Scenes
import { WireframeScene } from './scenes/WireframeScene';
import { DesktopScene } from './scenes/DesktopScene';
import { ConstraintScene } from './scenes/ConstraintScene';
import { TransformScene } from './scenes/TransformScene';
import { MobileScene } from './scenes/MobileScene';
import { CloseScene } from './scenes/CloseScene';

export const TUFTE_MOBILE_CONFIG = {
  durationInFrames: TUFTE_MOBILE_SPEC.durationInFrames,
  fps: TUFTE_MOBILE_SPEC.fps,
  width: TUFTE_MOBILE_SPEC.width,
  height: TUFTE_MOBILE_SPEC.height,
  defaultProps: {},
};

export const TufteMobileCommercial: React.FC = () => {
  const { scenes, voxTreatment } = TUFTE_MOBILE_SPEC;
  
  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      <AbsoluteFill>
        {/* Scene 1: Wireframe Introduction */}
        <Sequence
          from={scenes.wireframeIntro.start}
          durationInFrames={scenes.wireframeIntro.duration}
        >
          <WireframeScene />
        </Sequence>
        
        {/* Scene 2: Desktop Embodiment */}
        <Sequence
          from={scenes.desktopEmbodiment.start}
          durationInFrames={scenes.desktopEmbodiment.duration}
        >
          <DesktopScene />
        </Sequence>
        
        {/* Scene 3: The Constraint */}
        <Sequence
          from={scenes.constraint.start}
          durationInFrames={scenes.constraint.duration}
        >
          <ConstraintScene />
        </Sequence>
        
        {/* Scene 4: Tufte Transformation */}
        <Sequence
          from={scenes.tufteTransform.start}
          durationInFrames={scenes.tufteTransform.duration}
        >
          <TransformScene />
        </Sequence>
        
        {/* Scene 5: Mobile Embodiment */}
        <Sequence
          from={scenes.mobileEmbodiment.start}
          durationInFrames={scenes.mobileEmbodiment.duration}
        >
          <MobileScene />
        </Sequence>
        
        {/* Scene 6: Close */}
        <Sequence
          from={scenes.close.start}
          durationInFrames={scenes.close.duration}
        >
          <CloseScene />
        </Sequence>
      </AbsoluteFill>
    </VoxTreatment>
  );
};

export default TufteMobileCommercial;
