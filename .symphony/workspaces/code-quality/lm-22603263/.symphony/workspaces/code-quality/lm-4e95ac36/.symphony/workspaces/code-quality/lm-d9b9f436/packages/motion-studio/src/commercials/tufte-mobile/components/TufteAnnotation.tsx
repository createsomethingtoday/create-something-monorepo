/**
 * TufteAnnotation - Principle callout annotation
 * 
 * Shows Tufte principle name and description during transformation.
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TUFTE_MOBILE_SPEC, type TuftePrinciple } from '../spec';

interface TufteAnnotationProps {
  principle: TuftePrinciple;
  startFrame: number;
  duration?: number;
}

export const TufteAnnotation: React.FC<TufteAnnotationProps> = ({
  principle,
  startFrame,
  duration = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, fonts } = TUFTE_MOBILE_SPEC;
  
  const relativeFrame = frame - startFrame;
  
  // Fade in/out
  const opacity = interpolate(
    relativeFrame,
    [0, 15, duration - 15, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Slide up
  const springValue = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 1 },
  });
  
  const translateY = interpolate(springValue, [0, 1], [20, 0]);
  
  if (relativeFrame < 0 || relativeFrame > duration) {
    return null;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY}px)`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 24px',
        borderRadius: 12,
        background: colors.annotationBg,
        border: `1px solid ${colors.borderDefault}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          fontWeight: 600,
          color: colors.annotation,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Tufte Principle
      </span>
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 18,
          fontWeight: 600,
          color: colors.fgPrimary,
        }}
      >
        {principle.name}
      </span>
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 13,
          color: colors.fgMuted,
        }}
      >
        {principle.description}
      </span>
    </div>
  );
};

export default TufteAnnotation;
