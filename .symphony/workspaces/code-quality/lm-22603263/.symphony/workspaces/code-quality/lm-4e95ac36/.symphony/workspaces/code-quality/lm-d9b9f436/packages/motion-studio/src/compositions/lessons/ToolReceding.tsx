/**
 * ToolReceding - Remotion composition for Heidegger's "ready-to-hand" concept
 * 
 * Renders from shared animation spec for consistency with Svelte version.
 * The hammer disappears when hammering.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { KineticText } from '../../primitives/KineticText';
import { voxPresets, typography, colors } from '../../styles';
import { toolRrecedingSpec } from '../../specs/tool-receding';

interface ToolRrecedingProps {
  theme?: keyof typeof voxPresets;
}

// Convert progress (0-1) to frame-based interpolation
function progressToFrame(progress: number, fps: number, duration: number): number {
  return progress * (duration / 1000) * fps;
}

export const ToolReceding: React.FC<ToolRrecedingProps> = ({ theme = 'ltd' }) => {
  const frame = useCurrentFrame();
  const palette = voxPresets[theme];
  
  // Use spec values
  const spec = toolRrecedingSpec;
  const totalFrames = (spec.duration / 1000) * (spec.fps ?? 30);
  const progress = frame / totalFrames;

  // Animation phases from spec
  const currentPhase = spec.phases.find(p => progress >= p.start && progress < p.end) 
    ?? spec.phases[spec.phases.length - 1];

  // Hammer animation - matches spec keyframes
  const hammerOpacity = interpolate(progress, [0, 0.2, 0.6, 1], [1, 1, 0.3, 0], {
    extrapolateRight: 'clamp',
  });
  
  const hammerScale = interpolate(progress, [0, 0.2, 0.6], [1, 1, 0.8], {
    extrapolateRight: 'clamp',
  });

  const hammerBlur = interpolate(progress, [0, 0.2, 0.6], [0, 0, 8], {
    extrapolateRight: 'clamp',
  });

  // Nail progress - matches spec keyframes
  const nailProgress = interpolate(progress, [0.2, 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Focus ring - matches spec keyframes
  const focusRingOpacity = interpolate(
    progress, 
    [0, 0.2, 0.4, 0.6, 0.8], 
    [0, 0, 0.6, 0.6, 0]
  );

  // Reveal text - from spec
  const textOpacity = spec.reveal 
    ? interpolate(progress, [spec.reveal.startPhase, 1], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: spec.canvas.background }}>
      {/* Work surface */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 40,
          background: colors.neutral[900],
          borderRadius: 4,
        }}
      />

      {/* Nail */}
      <div
        style={{
          position: 'absolute',
          bottom: 140 + (nailProgress * 50),
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: 70 - (nailProgress * 50),
          background: colors.neutral[400],
          borderRadius: '2px 2px 0 0',
        }}
      />

      {/* Nail head */}
      <div
        style={{
          position: 'absolute',
          bottom: 140 + 70 - (nailProgress * 50),
          left: '50%',
          transform: 'translateX(-50%)',
          width: 16,
          height: 5,
          background: colors.neutral[300],
          borderRadius: 2,
        }}
      />

      {/* Hammer */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: '50%',
          transform: `translateX(-50%) scale(${hammerScale})`,
          transformOrigin: 'bottom center',
          opacity: hammerOpacity,
          filter: `blur(${hammerBlur}px)`,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 14,
            height: 120,
            background: `linear-gradient(to right, ${colors.neutral[700]}, #8b6914, ${colors.neutral[700]})`,
            borderRadius: 3,
            margin: '0 auto',
          }}
        />
        {/* Head */}
        <div
          style={{
            width: 60,
            height: 30,
            background: colors.neutral[500],
            borderRadius: 4,
            position: 'absolute',
            top: -15,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Focus indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 190,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 50,
          height: 50,
          border: `2px solid ${colors.neutral[100]}`,
          borderRadius: '50%',
          opacity: focusRingOpacity,
        }}
      />

      {/* Philosophy quote overlay */}
      {spec.reveal && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: textOpacity,
          }}
        >
          <KineticText
            text={spec.reveal.text}
            reveal="fade"
            startFrame={Math.floor(spec.reveal.startPhase * totalFrames)}
            duration={30}
            style="subhead"
            color={palette.foreground}
            align="center"
          />
        </div>
      )}

      {/* Phase labels */}
      <div
        style={{
          position: 'absolute',
          top: 24,
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
        {currentPhase?.label}
      </div>
    </AbsoluteFill>
  );
};

export default ToolReceding;
