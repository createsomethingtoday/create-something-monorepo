/**
 * CloseScene - Final product-first branding and URL.
 */
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = SPEC.scenes.close;

  const heroSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });

  const urlSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.85 },
  });

  return (
    <AbsoluteFill
      style={{
        padding: '100px 110px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          color: colors.neutral[500],
          fontFamily: typography.fontFamily.mono,
          fontSize: '0.9rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        <span>Seeing</span>
        <span>Learn to See</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          opacity: heroSpring,
          transform: `translateY(${interpolate(heroSpring, [0, 1], [34, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '7rem',
            fontWeight: 700,
            lineHeight: 0.92,
            letterSpacing: '-0.06em',
            color: colors.neutral[50],
            textTransform: 'uppercase',
          }}
        >
          Seeing
        </div>
        <div
          style={{
            width: 180,
            height: 1,
            backgroundColor: colors.neutral[800],
          }}
        />
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '2rem',
            fontWeight: 500,
            color: colors.neutral[300],
            maxWidth: 620,
          }}
        >
          {scene.tagline}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            opacity: urlSpring,
            transform: `translateY(${interpolate(urlSpring, [0, 1], [24, 0])}px)`,
            padding: '18px 22px',
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: `1px solid ${colors.neutral[800]}`,
            fontFamily: typography.fontFamily.mono,
            fontSize: '1.15rem',
            letterSpacing: '0.04em',
            color: colors.neutral[300],
          }}
        >
          {scene.url}
        </div>

        <div
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '0.92rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: colors.neutral[600],
          }}
        >
          Create Something .learn
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default CloseScene;
