/**
 * ToolReceding - Animated visualization of Heidegger's "ready-to-hand" concept
 * 
 * The hammer disappears when hammering.
 * 
 * Animation sequence:
 * - Frame 0-30: Hammer visible, highlighted
 * - Frame 30-60: Focus shifts to nail
 * - Frame 60-90: Hammer fades, only nail and motion visible
 * - Frame 90-120: Text overlay with philosophy quote
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { KineticText } from '../../primitives/KineticText';
import { voxPresets, typography, colors } from '../../styles';

interface ToolRrecedingProps {
  theme?: keyof typeof voxPresets;
}

export const ToolReceding: React.FC<ToolRrecedingProps> = ({ theme = 'ltd' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palette = voxPresets[theme];

  // Animation phases
  const hammerOpacity = interpolate(frame, [0, 30, 60, 90], [1, 1, 0.3, 0], {
    extrapolateRight: 'clamp',
  });
  
  const hammerScale = interpolate(frame, [0, 30, 60], [1, 1, 0.8], {
    extrapolateRight: 'clamp',
  });

  const nailProgress = interpolate(frame, [30, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const focusBlur = interpolate(frame, [0, 30, 60], [0, 0, 4], {
    extrapolateRight: 'clamp',
  });

  const textOpacity = interpolate(frame, [90, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Hammer swing animation
  const swingAngle = interpolate(
    frame % 20,
    [0, 10, 20],
    [0, -15, 0],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      {/* Work surface */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 100,
          background: colors.neutral[900],
          borderRadius: 8,
        }}
      />

      {/* Nail */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 + (nailProgress * 60),
          left: '50%',
          transform: 'translateX(-50%)',
          width: 8,
          height: 80 - (nailProgress * 60),
          background: colors.neutral[400],
          borderRadius: '2px 2px 0 0',
        }}
      />

      {/* Nail head */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 + 80 - (nailProgress * 60),
          left: '50%',
          transform: 'translateX(-50%)',
          width: 20,
          height: 6,
          background: colors.neutral[300],
          borderRadius: 2,
        }}
      />

      {/* Hammer */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: '50%',
          transform: `translateX(-50%) rotate(${swingAngle}deg)`,
          transformOrigin: 'bottom center',
          opacity: hammerOpacity,
          filter: `blur(${focusBlur}px)`,
          scale: hammerScale,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 20,
            height: 200,
            background: `linear-gradient(to right, ${colors.neutral[700]}, ${colors.neutral[600]}, ${colors.neutral[700]})`,
            borderRadius: 4,
            margin: '0 auto',
          }}
        />
        {/* Head */}
        <div
          style={{
            width: 80,
            height: 40,
            background: colors.neutral[400],
            borderRadius: 4,
            position: 'absolute',
            top: -20,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Focus indicator - ring around nail area */}
      <div
        style={{
          position: 'absolute',
          bottom: 240,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 60,
          border: `2px solid ${colors.neutral[500]}`,
          borderRadius: '50%',
          opacity: interpolate(frame, [30, 50, 70, 90], [0, 0.5, 0.5, 0]),
        }}
      />

      {/* Philosophy quote overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: textOpacity,
        }}
      >
        <KineticText
          text="The hammer disappears when hammering."
          reveal="unconcealment"
          startFrame={90}
          duration={30}
          style="subhead"
          color={palette.foreground}
          align="center"
        />
      </div>

      {/* Phase labels */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.caption,
          color: palette.muted,
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
        }}
      >
        {frame < 30 && 'VORHANDENHEIT — Present-at-hand'}
        {frame >= 30 && frame < 90 && 'TRANSITION — Focus shifts'}
        {frame >= 90 && 'ZUHANDENHEIT — Ready-to-hand'}
      </div>
    </AbsoluteFill>
  );
};

export default ToolReceding;
