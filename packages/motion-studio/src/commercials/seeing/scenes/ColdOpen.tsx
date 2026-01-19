/**
 * ColdOpen Scene - "Same logic in three places. Now they're different."
 * 
 * Kinetic typography introduction to the problem.
 * Motion transitions: slide, scale - NEVER fade.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { KineticHeadline } from '../../shared/primitives';
import { colors } from '../../../styles';
import { SPEC } from '../spec';

export const ColdOpen: React.FC = () => {
  const scene = SPEC.scenes.coldOpen;
  
  return (
    <AbsoluteFill>
      {/* First line: "Same logic in three places." - absolutely positioned, centered */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <KineticHeadline
          text={scene.content.line1}
          entrance="slide-left"
          exit="scale-down"
          startFrame={15}
          entranceDuration={18}
          holdFrames={45}
          exitDuration={12}
          size="display"
          color={colors.neutral[50]}
        />
      </AbsoluteFill>
      
      {/* Second line: "Now they're different." - absolutely positioned, centered */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <KineticHeadline
          text={scene.content.line2}
          entrance="scale-up"
          exit="push-up"
          startFrame={75}
          entranceDuration={15}
          holdFrames={30}
          exitDuration={12}
          size="headline"
          color={colors.neutral[400]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ColdOpen;
