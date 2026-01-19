/**
 * DemonstrationScene - Progressive erasure showing subtraction in action
 * 
 * "Show, don't tell" - the animation IS the explanation.
 * Corporate fluff gets struck through and collapses, leaving only the essence.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ProgressiveErasure, MotionTransition } from '../../shared/primitives';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

export const DemonstrationScene: React.FC = () => {
  const scene = SPEC.scenes.demonstration;
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
      }}
    >
      <MotionTransition type="slide-up" startFrame={0} duration={20}>
        <ProgressiveErasure
          text={scene.fullText}
          keepWords={scene.keepWords}
          startFrame={20}
          duration={120}
          holdFrames={40}
          color={colors.neutral[50]}
          strikeColor={colors.neutral[600]}
          fontSize="2.5rem"
        />
      </MotionTransition>
    </AbsoluteFill>
  );
};

export default DemonstrationScene;
