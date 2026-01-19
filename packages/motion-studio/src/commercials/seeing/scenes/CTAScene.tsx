/**
 * CTAScene - Call to action with installation commands
 * 
 * Shows the actual commands users will run.
 * "Free. 1,000 requests/day."
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { CommandDisplay, KineticHeadline, MotionTransition } from '../../shared/primitives';
import { colors } from '../../../styles';
import { SPEC } from '../spec';

export const CTAScene: React.FC = () => {
  const scene = SPEC.scenes.cta;
  
  return (
    <AbsoluteFill>
      {/* Commands - centered */}
      <Sequence from={0} durationInFrames={140}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MotionTransition type="slide-up" startFrame={0} duration={18}>
            <CommandDisplay
              commands={SPEC.commands}
              startFrame={0}
              staggerDelay={scene.commandStagger}
              entrance="slide-up"
              fontSize="1.75rem"
            />
          </MotionTransition>
        </AbsoluteFill>
      </Sequence>
      
      {/* "Free. 1,000 requests/day." - bottom */}
      <Sequence from={90} durationInFrames={90}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 120,
          }}
        >
          <MotionTransition type="scale-in" startFrame={0} duration={15}>
            <KineticHeadline
              text="Free. 1,000 requests/day."
              entrance="none"
              exit="none"
              startFrame={0}
              holdFrames={90}
              size="subhead"
              color={colors.neutral[400]}
            />
          </MotionTransition>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export default CTAScene;
