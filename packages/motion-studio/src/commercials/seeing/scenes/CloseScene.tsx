/**
 * CloseScene - Final branding and URL
 * 
 * URL, tagline, logo. Silence. Hold.
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { KineticHeadline, MotionTransition } from '../../shared/primitives';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

export const CloseScene: React.FC = () => {
  const scene = SPEC.scenes.close;
  
  return (
    <AbsoluteFill>
      {/* Centered content container */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {/* URL */}
        <Sequence from={0} durationInFrames={120}>
          <MotionTransition type="slide-up" startFrame={0} duration={15}>
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: '1.5rem',
                color: colors.neutral[400],
                letterSpacing: '0.02em',
              }}
            >
              {scene.url}
            </div>
          </MotionTransition>
        </Sequence>
        
        {/* Tagline */}
        <Sequence from={20} durationInFrames={100}>
          <MotionTransition type="scale-in" startFrame={0} duration={12}>
            <KineticHeadline
              text={scene.tagline}
              entrance="none"
              exit="none"
              startFrame={0}
              holdFrames={100}
              size="subhead"
              color={colors.neutral[300]}
            />
          </MotionTransition>
        </Sequence>
        
        {/* Logo */}
        <Sequence from={40} durationInFrames={80}>
          <MotionTransition type="scale-in" startFrame={0} duration={15}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: '3.5rem',
                  fontWeight: 700,
                  color: colors.neutral[50],
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                }}
              >
                CREATE SOMETHING
              </div>
              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: '1.25rem',
                  color: colors.neutral[500],
                  letterSpacing: '0.1em',
                }}
              >
                .learn
              </div>
            </div>
          </MotionTransition>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default CloseScene;
